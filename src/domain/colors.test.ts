import { describe, it, expect } from 'vitest';
import { colorForTag, PALETTE, DEFAULT_COLOR } from './colors';

describe('colors', () => {
  it('exposes a cyan default', () => {
    expect(DEFAULT_COLOR).toBe('#22d3ee');
  });

  it('provides ~12 palette entries', () => {
    expect(PALETTE.length).toBeGreaterThanOrEqual(12);
  });

  it('returns the default for an empty tag', () => {
    expect(colorForTag('')).toBe(DEFAULT_COLOR);
    expect(colorForTag('   ')).toBe(DEFAULT_COLOR);
  });

  it('is stable for the same tag', () => {
    expect(colorForTag('Work')).toBe(colorForTag('work'));
    expect(colorForTag('urgent')).toBe(colorForTag('urgent'));
  });

  it('only returns colors from the palette', () => {
    for (const tag of ['a', 'b', 'ProjectX', 'hello world', '123']) {
      expect(PALETTE).toContain(colorForTag(tag));
    }
  });

  it('distributes across the palette for varied tags', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      seen.add(colorForTag(`tag-${i}`));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
