import { describe, expect, it } from 'vitest';
import { nextTodoTier } from './Board';
import type { Todo } from '../../domain/types';

function makeTodo(tier?: Todo['tier']): Todo {
  return {
    id: crypto.randomUUID(),
    projectId: null,
    title: '',
    description: '',
    status: 'todo',
    dueDate: null,
    boardOrder: '',
    createdAt: '',
    updatedAt: '',
    doneAt: null,
    recurrence: 'none',
    reminderAt: null,
    reminderLead: null,
    tags: [],
    isFrog: false,
    tier,
  };
}

describe('nextTodoTier edge cases', () => {
  it('returns null for tier 1', () => {
    expect(nextTodoTier(1, [])).toBeNull();
  });

  it('returns 1 for tier 3', () => {
    expect(nextTodoTier(3, [])).toBe(1);
  });

  it('returns 3 for tier 5', () => {
    expect(nextTodoTier(5, [])).toBe(3);
  });

  it('returns first available tier for undefined', () => {
    expect(nextTodoTier(undefined, [])).toBe(5);
  });

  it('returns null for null current', () => {
    expect(nextTodoTier(null as any, [])).toBeNull();
  });

  it('returns null for string current', () => {
    expect(nextTodoTier('1' as any, [])).toBeNull();
    expect(nextTodoTier('5' as any, [])).toBeNull();
  });

  it('returns null for 0 current', () => {
    expect(nextTodoTier(0 as any, [])).toBeNull();
  });

  it('enforces tier 1 capacity when cycling from tier 3', () => {
    const todos = [makeTodo(1)];
    expect(nextTodoTier(3, todos)).toBeNull();
  });

  it('skips to tier 1 when tier 3 is full but tier 1 is available', () => {
    const todos = [makeTodo(3), makeTodo(3), makeTodo(3)];
    expect(nextTodoTier(5, todos)).toBe(1);
  });

  it('returns null when both tier 3 and tier 1 are full', () => {
    const todos = [makeTodo(3), makeTodo(3), makeTodo(3), makeTodo(1)];
    expect(nextTodoTier(5, todos)).toBeNull();
  });

  it('returns null when all tiers are full', () => {
    const todos = [makeTodo(5), makeTodo(5), makeTodo(5), makeTodo(5), makeTodo(5), makeTodo(3), makeTodo(3), makeTodo(3), makeTodo(1)];
    expect(nextTodoTier(undefined, todos)).toBeNull();
  });
});
