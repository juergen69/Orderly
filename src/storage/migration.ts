import type { DataGraph, Repository } from './Repository';
import type { Todo } from '../domain/types';
import { nowIso } from '../domain/time';

export interface MigrationResult {
  migrated: Todo[];
}

export function createMigrator(repo: Repository) {
  return {
    async migrate(): Promise<MigrationResult> {
      const graph = await repo.exportAll();
      const migratedTodos: Todo[] = [];

      for (const todo of graph.todos) {
        const migrated = migrateTodo(todo);
        if (migrated !== todo) {
          migratedTodos.push(migrated);
        }
      }

      if (migratedTodos.length > 0) {
        const updatedGraph: DataGraph = {
          projects: graph.projects,
          todos: graph.todos.map((t) => {
            const migrated = migratedTodos.find((m) => m.id === t.id);
            return migrated ?? t;
          }),
          subSteps: graph.subSteps,
        };
        await repo.replaceAll(updatedGraph);
      }

      return { migrated: migratedTodos };
    },
  };
}

function migrateTodo(todo: Todo): Todo {
  let changed = false;
  const updates: Partial<Todo> = {};

  // Handle undefined additive fields (legacy records missing new fields)
  if (todo.recurrence === undefined) {
    updates.recurrence = 'none';
    changed = true;
  }

  if (todo.doneAt === undefined) {
    updates.doneAt = null;
    changed = true;
  }

  if (todo.tags === undefined) {
    updates.tags = [];
    changed = true;
  }

  if (todo.isFrog === undefined) {
    updates.isFrog = false;
    changed = true;
  }

  // Legacy done todos missing doneAt → backfill via fallback chain
  // doneAt is null means it was explicitly set, which is fine
  // doneAt is undefined means legacy record missing the field
  if (todo.status === 'done' && todo.doneAt === undefined) {
    updates.doneAt = computeDoneAtFallback(todo);
    changed = true;
  }

  if (!changed) return todo;

  return { ...todo, ...updates };
}

function computeDoneAtFallback(todo: Pick<Todo, 'doneAt' | 'updatedAt' | 'createdAt'>): string {
  if (todo.doneAt !== undefined && todo.doneAt !== null) {
    return todo.doneAt;
  }
  if (todo.updatedAt) {
    return todo.updatedAt;
  }
  if (todo.createdAt) {
    return todo.createdAt;
  }
  return nowIso();
}