import type {
  DataGraph,
  DeleteProjectOptions,
  Repository,
} from './Repository';
import type { Project, SubStep, Todo } from '../domain/types';

export class InMemoryRepository implements Repository {
  private projects = new Map<string, Project>();
  private todos = new Map<string, Todo>();
  private subSteps = new Map<string, SubStep>();

  async getProjects(): Promise<Project[]> {
    return [...this.projects.values()];
  }

  async getProject(id: string): Promise<Project | null> {
    return this.projects.get(id) ?? null;
  }

  async createProject(project: Project): Promise<Project> {
    this.projects.set(project.id, project);
    return project;
  }

  async updateProject(project: Project): Promise<Project> {
    this.projects.set(project.id, project);
    return project;
  }

  async deleteProject(id: string, options: DeleteProjectOptions): Promise<void> {
    if (options.mode === 'cascade') {
      const projectTodos = [...this.todos.values()].filter(
        (t) => t.projectId === id,
      );
      for (const todo of projectTodos) {
        for (const sub of [...this.subSteps.values()]) {
          if (sub.todoId === todo.id) {
            this.subSteps.delete(sub.id);
          }
        }
        this.todos.delete(todo.id);
      }
    } else {
      const projectTodos = [...this.todos.values()].filter(
        (t) => t.projectId === id,
      );
      for (const todo of projectTodos) {
        this.todos.set(todo.id, { ...todo, projectId: options.reassignTo ?? null });
      }
    }
    this.projects.delete(id);
  }

  async getTodos(): Promise<Todo[]> {
    return [...this.todos.values()];
  }

  async getTodosByProject(projectId: string | null): Promise<Todo[]> {
    return [...this.todos.values()].filter((t) => t.projectId === projectId);
  }

  async getTodo(id: string): Promise<Todo | null> {
    return this.todos.get(id) ?? null;
  }

  async createTodo(todo: Todo): Promise<Todo> {
    this.todos.set(todo.id, todo);
    return todo;
  }

  async updateTodo(todo: Todo): Promise<Todo> {
    this.todos.set(todo.id, todo);
    return todo;
  }

  async deleteTodo(id: string): Promise<void> {
    for (const sub of [...this.subSteps.values()]) {
      if (sub.todoId === id) {
        this.subSteps.delete(sub.id);
      }
    }
    this.todos.delete(id);
  }

  async getSubSteps(): Promise<SubStep[]> {
    return [...this.subSteps.values()];
  }

  async getSubStepsByTodo(todoId: string): Promise<SubStep[]> {
    return [...this.subSteps.values()].filter((s) => s.todoId === todoId);
  }

  async createSubStep(subStep: SubStep): Promise<SubStep> {
    this.subSteps.set(subStep.id, subStep);
    return subStep;
  }

  async updateSubStep(subStep: SubStep): Promise<SubStep> {
    this.subSteps.set(subStep.id, subStep);
    return subStep;
  }

  async deleteSubStep(id: string): Promise<void> {
    this.subSteps.delete(id);
  }

  async exportAll(): Promise<DataGraph> {
    return {
      projects: [...this.projects.values()],
      todos: [...this.todos.values()],
      subSteps: [...this.subSteps.values()],
    };
  }

  async replaceAll(data: DataGraph): Promise<void> {
    const nextProjects = new Map<string, Project>();
    for (const p of data.projects) nextProjects.set(p.id, p);
    const nextTodos = new Map<string, Todo>();
    for (const t of data.todos) nextTodos.set(t.id, t);
    const nextSubSteps = new Map<string, SubStep>();
    for (const s of data.subSteps) nextSubSteps.set(s.id, s);

    this.projects = nextProjects;
    this.todos = nextTodos;
    this.subSteps = nextSubSteps;
  }
}
