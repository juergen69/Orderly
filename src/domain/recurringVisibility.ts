import type { Todo } from './types';
import { parseDate, startOfDay, todayIso } from './time';

/**
 * Recurring todos with a due date more than this many days in the future are
 * hidden by default (the "Soon" view) to reduce clutter. Non-recurring todos
 * and recurring todos due within the window are always shown.
 */
export const RECURRING_SOON_WINDOW_DAYS = 7;

function daysBetween(fromIso: string, toIso: string): number | null {
  let from: Date;
  let to: Date;
  try {
    from = startOfDay(parseDate(fromIso));
    to = startOfDay(parseDate(toIso));
  } catch {
    return null;
  }
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/**
 * Returns true when the todo should be visible given the recurring-visibility
 * setting.
 *
 * - `showAll === true`: everything is visible.
 * - Non-recurring todos: always visible.
 * - Recurring todos: visible when they have no due date, are overdue/within the
 *   next {@link RECURRING_SOON_WINDOW_DAYS} days; hidden when due further out.
 */
export function isRecurringVisible(
  todo: Todo,
  showAll: boolean,
  today: string = todayIso(),
): boolean {
  if (showAll) return true;
  if (todo.recurrence === 'none') return true;
  if (todo.dueDate === null || todo.dueDate === '') return true;

  const delta = daysBetween(today, todo.dueDate);
  if (delta === null) return true;
  return delta <= RECURRING_SOON_WINDOW_DAYS;
}

export function filterRecurringVisible(
  todos: Todo[],
  showAll: boolean,
  today: string = todayIso(),
): Todo[] {
  return todos.filter((t) => isRecurringVisible(t, showAll, today));
}
