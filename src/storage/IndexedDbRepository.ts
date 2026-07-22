import type {
  DataGraph,
  DeleteProjectOptions,
  Repository,
} from './Repository';
import type { Project, SubStep, Todo } from '../domain/types';

let dbCounter = 0;

function getNextDBName(): string {
  return `orderly-db-${++dbCounter}`;
}

const STORES = ['projects', 'todos', 'subSteps'] as const;

type StoreName = (typeof STORES)[number];

class IndexedDbRepository implements Repository {
  private dbName: string;
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(dbName?: string) {
    this.dbName = dbName ?? getNextDBName();
  }

  private async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
        projectStore.createIndex('projectId', 'projectId', { unique: false });
        projectStore.createIndex('status', 'status', { unique: false });
        projectStore.createIndex('dueDate', 'dueDate', { unique: false });

        const todoStore = db.createObjectStore('todos', { keyPath: 'id' });
        todoStore.createIndex('projectId', 'projectId', { unique: false });
        todoStore.createIndex('status', 'status', { unique: false });
        todoStore.createIndex('dueDate', 'dueDate', { unique: false });

        const subStepStore = db.createObjectStore('subSteps', { keyPath: 'id' });
        subStepStore.createIndex('todoId', 'todoId', { unique: false });
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error ?? new Error('IndexedDB request failed'));
      };
    });

    return this.dbPromise;
  }

  async getProjects(): Promise<Project[]> {
    const db = await this.open();
    return this.getAllFromStore(db, 'projects');
  }

  async getProject(id: string): Promise<Project | null> {
    const db = await this.open();
    return this.getFromStore(db, 'projects', id);
  }

  async createProject(project: Project): Promise<Project> {
    const db = await this.open();
    await this.putToStore(db, 'projects', project);
    return project;
  }

  async updateProject(project: Project): Promise<Project> {
    return this.createProject(project);
  }

  async deleteProject(id: string, options: DeleteProjectOptions): Promise<void> {
    const db = await this.open();

    const todos = await this.getAllFromIndexByKey<Todo>(db, 'todos', 'projectId', id);

    if (options.mode === 'cascade') {
      const subStepIds: string[] = [];
      for (const todo of todos) {
        const subs = await this.getAllFromIndexByKey<SubStep>(db, 'subSteps', 'todoId', todo.id);
        for (const sub of subs) {
          subStepIds.push(sub.id);
        }
      }

      const tx = db.transaction(['todos', 'subSteps', 'projects'], 'readwrite');
      for (const todo of todos) {
        tx.objectStore('todos').delete(todo.id);
      }
      for (const subId of subStepIds) {
        tx.objectStore('subSteps').delete(subId);
      }
      tx.objectStore('projects').delete(id);
      await this.waitForTransaction(tx);
    } else {
      const tx = db.transaction(['todos', 'projects'], 'readwrite');
      for (const todo of todos) {
        tx.objectStore('todos').put({ ...todo, projectId: options.reassignTo ?? null });
      }
      tx.objectStore('projects').delete(id);
      await this.waitForTransaction(tx);
    }
  }

  async getTodos(): Promise<Todo[]> {
    const db = await this.open();
    return this.getAllFromStore(db, 'todos');
  }

  async getTodosByProject(projectId: string | null): Promise<Todo[]> {
    const db = await this.open();
    return this.getAllFromIndexByKey(db, 'todos', 'projectId', projectId);
  }

  async getTodo(id: string): Promise<Todo | null> {
    const db = await this.open();
    return this.getFromStore(db, 'todos', id);
  }

  async createTodo(todo: Todo): Promise<Todo> {
    const db = await this.open();
    await this.putToStore(db, 'todos', todo);
    return todo;
  }

  async updateTodo(todo: Todo): Promise<Todo> {
    return this.createTodo(todo);
  }

  async deleteTodo(id: string): Promise<void> {
    const db = await this.open();
    const subSteps = await this.getAllFromIndexByKey<SubStep>(db, 'subSteps', 'todoId', id);

    const tx = db.transaction(['todos', 'subSteps'], 'readwrite');
    tx.objectStore('todos').delete(id);
    for (const sub of subSteps) {
      tx.objectStore('subSteps').delete(sub.id);
    }
    await this.waitForTransaction(tx);
  }

  async getSubSteps(): Promise<SubStep[]> {
    const db = await this.open();
    return this.getAllFromStore(db, 'subSteps');
  }

  async getSubStepsByTodo(todoId: string): Promise<SubStep[]> {
    const db = await this.open();
    return this.getAllFromIndexByKey(db, 'subSteps', 'todoId', todoId);
  }

  async createSubStep(subStep: SubStep): Promise<SubStep> {
    const db = await this.open();
    await this.putToStore(db, 'subSteps', subStep);
    return subStep;
  }

  async updateSubStep(subStep: SubStep): Promise<SubStep> {
    return this.createSubStep(subStep);
  }

  async deleteSubStep(id: string): Promise<void> {
    const db = await this.open();
    await this.deleteFromStore(db, 'subSteps', id);
  }

  async exportAll(): Promise<DataGraph> {
    const db = await this.open();
    return {
      projects: await this.getAllFromStore(db, 'projects'),
      todos: await this.getAllFromStore(db, 'todos'),
      subSteps: await this.getAllFromStore(db, 'subSteps'),
    };
  }

  async replaceAll(data: DataGraph): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(STORES, 'readwrite');

    // Clear all stores first for atomicity
    for (const store of STORES) {
      tx.objectStore(store).clear();
    }

    // Then put all data with proper type guards
    for (const store of STORES) {
      const storeData = data[store];
      if (storeData && Array.isArray(storeData)) {
        for (const item of storeData as Array<{ id: string }>) {
          tx.objectStore(store).put(item);
        }
      }
    }

    await this.waitForTransaction(tx);
  }

  private getAllFromStore<T>(db: IDBDatabase, storeName: StoreName): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const request = db
        .transaction(storeName, 'readonly')
        .objectStore(storeName)
        .getAll();

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    });
  }

  private getFromStore<T>(
    db: IDBDatabase,
    storeName: StoreName,
    id: string,
  ): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const request = db
        .transaction(storeName, 'readonly')
        .objectStore(storeName)
        .get(id);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    });
  }

  private getAllFromIndexByKey<T>(
    db: IDBDatabase,
    storeName: StoreName,
    indexName: string,
    value: string | null,
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const request = db
        .transaction(storeName, 'readonly')
        .objectStore(storeName)
        .index(indexName)
        .getAll(IDBKeyRange.only(value));

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    });
  }

  private putToStore<T>(db: IDBDatabase, storeName: StoreName, item: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = db
        .transaction(storeName, 'readwrite')
        .objectStore(storeName)
        .put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    });
  }

  private deleteFromStore(db: IDBDatabase, storeName: StoreName, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = db
        .transaction(storeName, 'readwrite')
        .objectStore(storeName)
        .delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    });
  }

  private waitForTransaction(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction error'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    });
  }
}

export { IndexedDbRepository };