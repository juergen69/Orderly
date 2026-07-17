import { describe, it, expect } from 'vitest';
import {
  todayIso,
  nowIso,
  formatDate,
  parseDate,
  startOfDay,
  isBefore,
  isAfter,
  isSameDay,
  isToday,
  isBeforeToday,
  isAfterToday,
} from './time';

describe('todayIso', () => {
  it('returns YYYY-MM-DD for a fixed date', () => {
    const fixed = new Date(2025, 0, 15);
    expect(todayIso(fixed)).toBe('2025-01-15');
  });

  it('zero-pads single-digit month and day', () => {
    const fixed = new Date(2025, 2, 5);
    expect(todayIso(fixed)).toBe('2025-03-05');
  });

  it('handles December correctly', () => {
    const fixed = new Date(2025, 11, 31);
    expect(todayIso(fixed)).toBe('2025-12-31');
  });
});

describe('nowIso', () => {
  it('returns an ISO 8601 string', () => {
    const fixed = new Date('2025-06-15T10:30:00.000Z');
    expect(nowIso(fixed)).toBe('2025-06-15T10:30:00.000Z');
  });
});

describe('formatDate', () => {
  it('formats a Date as YYYY-MM-DD', () => {
    expect(formatDate(new Date(2025, 5, 1))).toBe('2025-06-01');
  });
});

describe('parseDate', () => {
  it('parses YYYY-MM-DD into a local Date', () => {
    const d = parseDate('2025-06-15');
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(15);
  });

  it('throws on invalid format', () => {
    expect(() => parseDate('not-a-date')).toThrow();
    expect(() => parseDate('2025/06/15')).toThrow();
  });
});

describe('startOfDay', () => {
  it('zeros out time components', () => {
    const d = new Date(2025, 5, 15, 14, 30, 45, 123);
    const result = startOfDay(d);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });
});

describe('isBefore', () => {
  it('returns true when a is before b', () => {
    expect(isBefore(new Date(2025, 0, 1), new Date(2025, 0, 2))).toBe(true);
  });

  it('returns false when a equals b', () => {
    const d = new Date(2025, 0, 1);
    expect(isBefore(d, new Date(d.getTime()))).toBe(false);
  });

  it('returns false when a is after b', () => {
    expect(isBefore(new Date(2025, 0, 2), new Date(2025, 0, 1))).toBe(false);
  });
});

describe('isAfter', () => {
  it('returns true when a is after b', () => {
    expect(isAfter(new Date(2025, 0, 2), new Date(2025, 0, 1))).toBe(true);
  });

  it('returns false when a equals b', () => {
    const d = new Date(2025, 0, 1);
    expect(isAfter(d, new Date(d.getTime()))).toBe(false);
  });
});

describe('isSameDay', () => {
  it('returns true for same calendar day', () => {
    const a = new Date(2025, 5, 15, 8, 0);
    const b = new Date(2025, 5, 15, 20, 30);
    expect(isSameDay(a, b)).toBe(true);
  });

  it('returns false for different days', () => {
    expect(isSameDay(new Date(2025, 5, 15), new Date(2025, 5, 16))).toBe(false);
  });
});

describe('isToday', () => {
  it('returns true for today string', () => {
    const now = new Date(2025, 5, 15);
    expect(isToday('2025-06-15', now)).toBe(true);
  });

  it('returns false for yesterday', () => {
    const now = new Date(2025, 5, 15);
    expect(isToday('2025-06-14', now)).toBe(false);
  });

  it('returns false for tomorrow', () => {
    const now = new Date(2025, 5, 15);
    expect(isToday('2025-06-16', now)).toBe(false);
  });
});

describe('isBeforeToday', () => {
  it('returns true for a past date', () => {
    const now = new Date(2025, 5, 15);
    expect(isBeforeToday('2025-06-14', now)).toBe(true);
  });

  it('returns false for today', () => {
    const now = new Date(2025, 5, 15);
    expect(isBeforeToday('2025-06-15', now)).toBe(false);
  });

  it('returns false for a future date', () => {
    const now = new Date(2025, 5, 15);
    expect(isBeforeToday('2025-06-16', now)).toBe(false);
  });
});

describe('isAfterToday', () => {
  it('returns true for a future date', () => {
    const now = new Date(2025, 5, 15);
    expect(isAfterToday('2025-06-16', now)).toBe(true);
  });

  it('returns false for today', () => {
    const now = new Date(2025, 5, 15);
    expect(isAfterToday('2025-06-15', now)).toBe(false);
  });

  it('returns false for a past date', () => {
    const now = new Date(2025, 5, 15);
    expect(isAfterToday('2025-06-14', now)).toBe(false);
  });
});
