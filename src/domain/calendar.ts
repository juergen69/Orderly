import type { Todo } from './types';
import { parseDate, formatDate, startOfDay } from './time';

export interface CalendarDay {
  date: Date;
  iso: string;
  inMonth: boolean;
}

const DAYS_IN_WEEK = 7;
const WEEKS_IN_GRID = 6;

function mondayFirstStart(year: number, month: number): Date {
  const firstOfMonth = new Date(year, month, 1);
  const dayOfWeek = firstOfMonth.getDay();
  const daysToMonday = (dayOfWeek + 6) % 7;
  const start = new Date(year, month, 1 - daysToMonday);
  return startOfDay(start);
}

export function monthGrid(year: number, month: number): CalendarDay[][] {
  const start = mondayFirstStart(year, month);
  const grid: CalendarDay[][] = [];

  for (let week = 0; week < WEEKS_IN_GRID; week++) {
    const row: CalendarDay[] = [];
    for (let day = 0; day < DAYS_IN_WEEK; day++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + week * DAYS_IN_WEEK + day);
      row.push({
        date,
        iso: formatDate(date),
        inMonth: date.getMonth() === month,
      });
    }
    grid.push(row);
  }

  return grid;
}

function validDueDate(todo: Todo): string | null {
  if (todo.dueDate === null || todo.dueDate === '') {
    return null;
  }
  try {
    parseDate(todo.dueDate);
    return todo.dueDate;
  } catch {
    return null;
  }
}

export interface GroupedByDueDate {
  [iso: string]: Todo[];
}

function compareByBoardOrderThenCreated(a: Todo, b: Todo): number {
  if (a.boardOrder !== b.boardOrder) {
    return a.boardOrder < b.boardOrder ? -1 : 1;
  }
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

export function groupByDueDate(todos: Todo[]): GroupedByDueDate {
  const grouped: GroupedByDueDate = {};

  for (const todo of todos) {
    const iso = validDueDate(todo);
    if (iso === null) {
      continue;
    }
    if (!grouped[iso]) {
      grouped[iso] = [];
    }
    grouped[iso].push(todo);
  }

  for (const iso of Object.keys(grouped)) {
    (grouped[iso] ?? []).sort(compareByBoardOrderThenCreated);
  }

  return grouped;
}
