import { describe, it, expect } from 'vitest';
import { monthGrid, groupByDueDate, CalendarDay } from './calendar';
import type { Todo } from './types';

describe('monthGrid', () => {
  it('returns a 6x7 grid', () => {
    const grid = monthGrid(2025, 5);
    expect(grid).toHaveLength(6);
    for (const week of grid) {
      expect(week).toHaveLength(7);
    }
  });

  it('starts each week on a Monday', () => {
    const grid = monthGrid(2025, 5);
    for (const week of grid) {
      expect(week[0]!.date.getDay()).toBe(1);
    }
  });

  it('includes the target month and marks spillover cells', () => {
    const grid = monthGrid(2025, 5);
    const all = grid.flat();
    const inMonth = all.filter((d: CalendarDay) => d.inMonth);
    const outOfMonth = all.filter((d: CalendarDay) => !d.inMonth);
    expect(inMonth).toHaveLength(30);
    expect(outOfMonth.length).toBeGreaterThan(0);
  });

  it('places the first of the month on the correct weekday', () => {
    const grid = monthGrid(2025, 5);
    const first = grid.flat().find((d: CalendarDay) => d.date.getDate() === 1 && d.inMonth);
    expect(first).toBeDefined();
    expect(first?.date.getDay()).toBe(0);
  });

  it('handles a month that starts on a Monday with no leading spillover', () => {
    const grid = monthGrid(2025, 8);
    const first = grid[0][0]!;
    expect(first.date.getDate()).toBe(1);
    expect(first.inMonth).toBe(true);
  });

  it('handles February in a leap year', () => {
    const grid = monthGrid(2024, 1);
    const inMonth = grid.flat().filter((d: CalendarDay) => d.inMonth);
    expect(inMonth).toHaveLength(29);
  });
});

describe('groupByDueDate', () => {
  const makeTodo = (overrides: Partial<Todo>): Todo => ({
    id: 'id',
    projectId: null,
    title: 't',
    description: '',
    status: 'todo',
    dueDate: null,
    boardOrder: 'a',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    doneAt: null,
    recurrence: 'none',
    reminderAt: null,
    reminderLead: null,
    tags: [],
    isFrog: false,
    ...overrides,
  });

  it('orders todos by boardOrder', () => {
    const todos = [
      makeTodo({ id: '2', dueDate: '2025-06-15', boardOrder: 'b' }),
      makeTodo({ id: '1', dueDate: '2025-06-15', boardOrder: 'a' }),
    ];
    const grouped = groupByDueDate(todos);
    expect(grouped['2025-06-15']!.map((t) => t.id)).toEqual(['1', '2']);
  });

  it('falls back to createdAt when boardOrder is equal', () => {
    const todos = [
      makeTodo({ id: '2', dueDate: '2025-06-15', boardOrder: 'a', createdAt: '2025-01-02T00:00:00.000Z' }),
      makeTodo({ id: '1', dueDate: '2025-06-15', boardOrder: 'a', createdAt: '2025-01-01T00:00:00.000Z' }),
    ];
    const grouped = groupByDueDate(todos);
    expect(grouped['2025-06-15']!.map((t) => t.id)).toEqual(['1', '2']);
  });

  it('excludes todos with null dueDate', () => {
    const todos = [makeTodo({ id: '1', dueDate: null })];
    const grouped = groupByDueDate(todos);
    expect(Object.keys(grouped)).toHaveLength(0);
  });

  it('excludes todos with malformed dueDate', () => {
    const todos = [makeTodo({ id: '1', dueDate: '2025-13-40' })];
    const grouped = groupByDueDate(todos);
    expect(Object.keys(grouped)).toHaveLength(0);
  });

  it('groups multiple todos on the same day', () => {
    const todos = [
      makeTodo({ id: '1', dueDate: '2025-06-15' }),
      makeTodo({ id: '2', dueDate: '2025-06-15' }),
      makeTodo({ id: '3', dueDate: '2025-06-16' }),
    ];
    const grouped = groupByDueDate(todos);
    expect(grouped['2025-06-15']).toHaveLength(2);
    expect(grouped['2025-06-16']).toHaveLength(1);
  });
});
