import { describe, expect, it } from 'vitest';
import type { Todo } from './types';
import {
  isRecurringVisible,
  filterRecurringVisible,
  RECURRING_SOON_WINDOW_DAYS,
} from './recurringVisibility';

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'id',
    projectId: null,
    title: 't',
    description: '',
    status: 'todo',
    dueDate: null,
    boardOrder: 'm',
    createdAt: '',
    updatedAt: '',
    doneAt: null,
    recurrence: 'none',
    reminderAt: null,
    reminderLead: null,
    tags: [],
    isFrog: false,
    ...overrides,
  };
}

const TODAY = '2025-06-10';

describe('isRecurringVisible', () => {
  it('shows everything when showAll is true', () => {
    const todo = makeTodo({ recurrence: 'weekly', dueDate: '2025-12-31' });
    expect(isRecurringVisible(todo, true, TODAY)).toBe(true);
  });

  it('always shows non-recurring todos', () => {
    const todo = makeTodo({ recurrence: 'none', dueDate: '2025-12-31' });
    expect(isRecurringVisible(todo, false, TODAY)).toBe(true);
  });

  it('shows recurring todos with no due date', () => {
    const todo = makeTodo({ recurrence: 'daily', dueDate: null });
    expect(isRecurringVisible(todo, false, TODAY)).toBe(true);
  });

  it('shows recurring todos due within the window', () => {
    const todo = makeTodo({ recurrence: 'weekly', dueDate: '2025-06-17' }); // +7d
    expect(isRecurringVisible(todo, false, TODAY)).toBe(true);
  });

  it('hides recurring todos due beyond the window', () => {
    const todo = makeTodo({ recurrence: 'weekly', dueDate: '2025-06-18' }); // +8d
    expect(isRecurringVisible(todo, false, TODAY)).toBe(false);
  });

  it('shows overdue recurring todos', () => {
    const todo = makeTodo({ recurrence: 'monthly', dueDate: '2025-06-01' });
    expect(isRecurringVisible(todo, false, TODAY)).toBe(true);
  });

  it('uses a 7-day window', () => {
    expect(RECURRING_SOON_WINDOW_DAYS).toBe(7);
  });
});

describe('filterRecurringVisible', () => {
  it('filters out only far-future recurring todos in Soon mode', () => {
    const todos = [
      makeTodo({ id: 'a', recurrence: 'none', dueDate: '2025-12-31' }),
      makeTodo({ id: 'b', recurrence: 'weekly', dueDate: '2025-06-12' }),
      makeTodo({ id: 'c', recurrence: 'weekly', dueDate: '2025-09-01' }),
    ];
    const soon = filterRecurringVisible(todos, false, TODAY).map((t) => t.id);
    expect(soon).toEqual(['a', 'b']);

    const all = filterRecurringVisible(todos, true, TODAY).map((t) => t.id);
    expect(all).toEqual(['a', 'b', 'c']);
  });
});
