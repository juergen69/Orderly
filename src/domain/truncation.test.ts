import { describe, it, expect } from 'vitest';
import { truncate, DEFAULT_TRUNCATE_LIMIT } from './truncation';

describe('truncate', () => {
  it('returns the text unchanged when under the limit', () => {
    expect(truncate('short')).toBe('short');
  });

  it('uses the default limit of 120', () => {
    expect(DEFAULT_TRUNCATE_LIMIT).toBe(120);
  });

  it('truncates at a word boundary with an ellipsis', () => {
    const text = 'the quick brown fox jumps over the lazy dog';
    const result = truncate(text, 20);
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(21);
    expect(result).toBe('the quick brown…');
  });

  it('never cuts a detected URL in half', () => {
    const text = 'see https://example.com/page for details about the topic';
    const result = truncate(text, 30);
    expect(result).toContain('https://example.com/page');
    expect(result.endsWith('…')).toBe(true);
  });

  it('preserves a URL that is at the start of the text', () => {
    const text = 'https://example.com/a/very/long/path that continues with more words';
    const result = truncate(text, 25);
    expect(result.startsWith('https://example.com/a/very/long/path')).toBe(true);
  });

  it('truncates a single long word when no boundary is available', () => {
    const text = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const result = truncate(text, 15);
    expect(result).toBe('abcdefghijklmn…');
  });

  it('respects a custom limit', () => {
    expect(truncate('hello world foo bar', 8)).toBe('hello…');
  });
});
