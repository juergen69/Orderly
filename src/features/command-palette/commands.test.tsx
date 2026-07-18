import { describe, expect, it } from 'vitest';
import { fuzzyScore } from './commands';

describe('fuzzyScore', () => {
  it('returns null when query is not a subsequence', () => {
    expect(fuzzyScore('xyz', 'new todo')).toBeNull();
  });

  it('matches a substring subsequence', () => {
    expect(fuzzyScore('todo', 'new todo')).not.toBeNull();
  });

  it('scores an exact prefix higher than a scattered match', () => {
    const prefix = fuzzyScore('new', 'new todo')!;
    const scattered = fuzzyScore('nw', 'new todo')!;
    expect(prefix).toBeGreaterThan(scattered);
  });

  it('returns 0 for an empty query', () => {
    expect(fuzzyScore('', 'new todo')).toBe(0);
  });

  it('is case-insensitive', () => {
    expect(fuzzyScore('NEW', 'new todo')).not.toBeNull();
  });
});
