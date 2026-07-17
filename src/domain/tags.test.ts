import { describe, it, expect } from 'vitest';
import { normalizeTagList, sortTagsForSidebar } from './tags';

describe('normalizeTagList', () => {
  it('lowercases, trims, and dedupes', () => {
    expect(normalizeTagList([' Work ', 'work', 'URGENT'])).toEqual(['work', 'urgent']);
  });

  it('drops empty tags', () => {
    expect(normalizeTagList(['', '  ', 'x'])).toEqual(['x']);
  });

  it('returns an empty array for empty input', () => {
    expect(normalizeTagList([])).toEqual([]);
  });
});

describe('sortTagsForSidebar', () => {
  it('sorts by frequency then alpha', () => {
    const tags = ['b', 'a', 'b', 'c', 'a', 'a'];
    expect(sortTagsForSidebar(tags)).toEqual(['a', 'b', 'c']);
  });

  it('falls back to alpha when frequencies tie', () => {
    const tags = ['zebra', 'apple', 'mango'];
    expect(sortTagsForSidebar(tags)).toEqual(['apple', 'mango', 'zebra']);
  });

  it('normalizes before sorting', () => {
    const tags = ['Work', 'work', 'home'];
    const result = sortTagsForSidebar(tags);
    expect(result).toEqual(['home', 'work']);
  });

  it('handles an empty list', () => {
    expect(sortTagsForSidebar([])).toEqual([]);
  });
});
