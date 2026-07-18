import type { Todo, SubStep, Project } from '../domain/types';
import { groupByDueDate } from '../domain/calendar';
import { splitArchived } from '../domain/archive';
import { sortTagsForSidebar } from '../domain/tags';
import { progress } from '../domain/progress';

export function selectTodosByProject(todos: Todo[], projectId: string | null): Todo[] {
  return todos.filter((t) => t.projectId === projectId);
}

export function selectTodosByStatus(todos: Todo[], status: Todo['status']): Todo[] {
  return todos
    .filter((t) => t.status === status)
    .sort((a, b) => {
      if (a.boardOrder !== b.boardOrder) {
        return a.boardOrder < b.boardOrder ? -1 : 1;
      }
      return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
    });
}

export function selectTodosByDate(todos: Todo[], dateIso: string): Todo[] {
  return groupByDueDate(todos)[dateIso] ?? [];
}

export function selectTagFrequencies(todos: Todo[]): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const todo of todos) {
    for (const tag of todo.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return sortTagsForSidebar([...counts.keys()]).map((tag) => ({
    tag,
    count: counts.get(tag) ?? 0,
  }));
}

export function selectTodoProgress(subSteps: SubStep[], todoId: string) {
  return progress(subSteps.filter((s) => s.todoId === todoId));
}

export function selectArchivedSplit(todos: Todo[], todayIso: string) {
  const doneTodos = todos.filter((t) => t.status === 'done');
  return splitArchived(doneTodos, todayIso);
}

export function selectProjectsSorted(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order < b.order ? -1 : 1;
    }
    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
  });
}
