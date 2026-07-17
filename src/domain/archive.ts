import type { Todo } from './types';
import { parseDate, startOfDay } from './time';

export const ARCHIVE_THRESHOLD_DAYS = 3;

export interface ArchiveSplit {
  recent: Todo[];
  archived: Todo[];
}

function daysBetween(earlier: Date, later: Date): number {
  const ms = later.getTime() - earlier.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function splitArchived(doneTodos: Todo[], today: string): ArchiveSplit {
  let todayDate: Date | null = null;
  try {
    todayDate = startOfDay(parseDate(today));
  } catch {
    todayDate = null;
  }

  const recent: Todo[] = [];
  const archived: Todo[] = [];

  for (const todo of doneTodos) {
    const doneAt = todo.doneAt;
    if (doneAt === null || doneAt === '' || todo.status !== 'done') {
      recent.push(todo);
      continue;
    }

    let doneDate: Date;
    try {
      doneDate = startOfDay(parseDate(doneAt));
    } catch {
      recent.push(todo);
      continue;
    }

    const age = todayDate === null ? -1 : daysBetween(doneDate, todayDate);
    if (age >= ARCHIVE_THRESHOLD_DAYS) {
      archived.push(todo);
    } else {
      recent.push(todo);
    }
  }

  return { recent, archived };
}
