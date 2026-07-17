import { Recurrence } from './types';
import { parseDate, formatDate } from './time';

export const ROLL_FORWARD_MAX_ITERATIONS = 4000;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(date.getDate(), lastDay));
  return d;
}

function addYears(date: Date, years: number): Date {
  const targetYear = date.getFullYear() + years;
  const lastDay = new Date(targetYear, date.getMonth() + 1, 0).getDate();
  return new Date(targetYear, date.getMonth(), Math.min(date.getDate(), lastDay));
}

export function advance(dueDate: string, rule: Recurrence): string {
  if (rule === 'none') {
    return dueDate;
  }
  const date = parseDate(dueDate);
  let next: Date;
  switch (rule) {
    case 'daily':
      next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      break;
    case 'weekly':
      next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
      break;
    case 'monthly':
      next = addMonths(date, 1);
      break;
    case 'yearly':
      next = addYears(date, 1);
      break;
  }
  return formatDate(next);
}

export function rollForward(dueDate: string, rule: Recurrence, today: string): string {
  if (rule === 'none') {
    return dueDate;
  }
  const todayDate = parseDate(today);
  let current = parseDate(dueDate);
  let iterations = 0;
  while (current.getTime() < todayDate.getTime() && iterations < ROLL_FORWARD_MAX_ITERATIONS) {
    current = parseDate(advance(formatDate(current), rule));
    iterations += 1;
  }
  return formatDate(current);
}
