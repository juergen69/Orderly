import type { Todo, SubStep, Project } from '../domain/types';
import { groupByDueDate } from '../domain/calendar';
import { splitArchived } from '../domain/archive';
import { sortTagsForSidebar } from '../domain/tags';
import { progress } from '../domain/progress';

function compareStrings(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function compareByBoardOrderThenCreated(a: Todo, b: Todo): number {
  if (a.boardOrder !== b.boardOrder) {
    return a.boardOrder < b.boardOrder ? -1 : 1;
  }
  return compareStrings(a.createdAt, b.createdAt);
}

function sortTagsByFrequencyThenName(a: { tag: string; count: number }, b: { tag: string; count: number }): number {
  if (a.count !== b.count) return b.count - a.count;
  return compareStrings(a.tag, b.tag);
}

export function selectTodosByProject(todos: Todo[], projectId: string | null): Todo[] {
  return todos.filter((t) => t.projectId === projectId);
}

export function selectTodosByStatus(todos: Todo[], status: Todo['status']): Todo[] {
  return todos
    .filter((t) => t.status === status)
    .sort(compareByBoardOrderThenCreated);
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
  // Sort by frequency (desc), then alphabetically. `sortTagsForSidebar` dedupes
  // and alpha-sorts the names but would lose the per-todo counts, so we apply
  // the frequency ordering here against the real counts.
  const sortedTags = sortTagsForSidebar([...counts.keys()]);
  return sortedTags
    .map((tag) => ({ tag, count: counts.get(tag) ?? 0 }))
    .sort(sortTagsByFrequencyThenName);
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
    return compareStrings(a.createdAt, b.createdAt);
  });
}
