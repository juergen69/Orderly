import { describe, expect, it } from 'vitest';
import { nextTodoTier } from './Board';

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
});
