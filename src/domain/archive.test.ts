import { describe, it, expect } from 'vitest';
import { splitArchived, ARCHIVE_THRESHOLD_DAYS } from './archive';
import type { Todo } from './types';

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 't1',
    projectId: null,
    title: 'task',
    description: '',
    status: 'done',
    dueDate: null,
    boardOrder: 'a0',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    doneAt: null,
    recurrence: 'none',
    reminderAt: null,
    reminderLead: null,
    tags: [],
    isFrog: false,
    ...overrides,
  };
}

describe('splitArchived', () => {
  it('exposes the three-day threshold', () => {
    expect(ARCHIVE_THRESHOLD_DAYS).toBe(3);
  });

  it('treats doneAt exactly 3 days ago as archived', () => {
    const todos = [makeTodo({ id: 'a', doneAt: '2025-01-01' })];
    const { recent, archived } = splitArchived(todos, '2025-01-04');
    expect(archived).toHaveLength(1);
    expect(recent).toHaveLength(0);
  });

  it('keeps a todo done 2 days ago as recent', () => {
    const todos = [makeTodo({ id: 'a', doneAt: '2025-01-02' })];
    const { recent, archived } = splitArchived(todos, '2025-01-04');
    expect(recent).toHaveLength(1);
    expect(archived).toHaveLength(0);
  });

  it('keeps a todo with no doneAt as recent', () => {
    const todos = [makeTodo({ id: 'a', doneAt: null })];
    const { recent, archived } = splitArchived(todos, '2025-01-04');
    expect(recent).toHaveLength(1);
    expect(archived).toHaveLength(0);
  });

  it('excludes non-done todos from archived', () => {
    const todos = [makeTodo({ id: 'a', status: 'todo', doneAt: '2025-01-01' })];
    const { recent, archived } = splitArchived(todos, '2025-01-10');
    expect(recent).toHaveLength(1);
    expect(archived).toHaveLength(0);
  });

  it('handles malformed doneAt gracefully as recent', () => {
    const todos = [makeTodo({ id: 'a', doneAt: 'not-a-date' })];
    const { recent, archived } = splitArchived(todos, '2025-01-10');
    expect(recent).toHaveLength(1);
    expect(archived).toHaveLength(0);
  });

  it('falls back to today when the clock date is malformed', () => {
    const todos = [makeTodo({ id: 'a', doneAt: '2020-01-01' })];
    const { archived } = splitArchived(todos, 'garbage');
    expect(archived).toHaveLength(0);
  });

  it('splits a mixed list correctly', () => {
    const todos = [
      makeTodo({ id: 'old', doneAt: '2025-01-01' }),
      makeTodo({ id: 'new', doneAt: '2025-01-03' }),
    ];
    const { recent, archived } = splitArchived(todos, '2025-01-04');
    expect(archived.map((t) => t.id)).toEqual(['old']);
    expect(recent.map((t) => t.id)).toEqual(['new']);
  });
});
