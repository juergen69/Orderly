import { describe, it, expect } from 'vitest';
import { findUrls, URL_REGEX } from './url-utils';

describe('findUrls', () => {
  it('returns an empty array for empty input', () => {
    expect(findUrls('')).toEqual([]);
  });

  it('finds a single https URL', () => {
    const result = findUrls('visit https://example.com now');
    expect(result).toEqual([
      { start: 6, end: 25, value: 'https://example.com' },
    ]);
  });

  it('finds a www URL', () => {
    const result = findUrls('go to www.example.com/path today');
    expect(result[0]?.value).toBe('www.example.com/path');
  });

  it('finds multiple URLs', () => {
    const result = findUrls('a https://a.com b http://b.org/x c');
    expect(result.map((u) => u.value)).toEqual([
      'https://a.com',
      'http://b.org/x',
    ]);
  });

  it('ignores trailing punctuation', () => {
    const result = findUrls('see https://example.com. and http://x.org, done');
    expect(result.map((u) => u.value)).toEqual([
      'https://example.com',
      'http://x.org',
    ]);
  });

  it('returns nothing for text without URLs', () => {
    expect(findUrls('just some plain words here')).toEqual([]);
  });

  it('does not catastrophically backtrack on adversarial input', () => {
    const adversarial = 'a'.repeat(5000) + '!';
    const start = Date.now();
    const result = findUrls(adversarial);
    const elapsed = Date.now() - start;
    expect(result).toEqual([]);
    expect(elapsed).toBeLessThan(1000);
  });

  it('handles long URLs without runaway', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(20000);
    const start = Date.now();
    const result = findUrls(longUrl);
    const elapsed = Date.now() - start;
    expect(result).toHaveLength(1);
    expect(elapsed).toBeLessThan(1000);
  });

  it('exposes a reusable, stateless regex', () => {
    expect(URL_REGEX.global).toBe(true);
    expect(URL_REGEX.source).toContain('https?:');
  });
});
