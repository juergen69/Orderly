import { describe, it, expect } from 'vitest';
import { advance, rollForward, ROLL_FORWARD_MAX_ITERATIONS } from './recurrence';

describe('advance', () => {
  it('returns the same date for rule none', () => {
    expect(advance('2025-01-15', 'none')).toBe('2025-01-15');
  });

  it('advances daily by one day', () => {
    expect(advance('2025-01-15', 'daily')).toBe('2025-01-16');
  });

  it('advances weekly by seven days', () => {
    expect(advance('2025-01-15', 'weekly')).toBe('2025-01-22');
  });

  it('advances monthly across a year boundary', () => {
    expect(advance('2025-12-15', 'monthly')).toBe('2026-01-15');
  });

  it('advances yearly by one year', () => {
    expect(advance('2025-01-15', 'yearly')).toBe('2026-01-15');
  });

  it('clamps month-end: Jan 31 plus one month', () => {
    expect(advance('2025-01-31', 'monthly')).toBe('2025-02-28');
  });

  it('clamps to Feb 29 on leap year month-end', () => {
    expect(advance('2024-01-31', 'monthly')).toBe('2024-02-29');
  });

  it('clamps year-end: Jan 29 2024 plus one year', () => {
    expect(advance('2024-01-29', 'yearly')).toBe('2025-01-29');
  });

  it('clamps Feb 29 plus one year to Feb 28', () => {
    expect(advance('2024-02-29', 'yearly')).toBe('2025-02-28');
  });
});

describe('rollForward', () => {
  it('returns the same date for rule none', () => {
    expect(rollForward('2025-01-15', 'none', '2025-03-01')).toBe('2025-01-15');
  });

  it('returns dueDate when already >= today', () => {
    expect(rollForward('2025-03-01', 'daily', '2025-03-01')).toBe('2025-03-01');
    expect(rollForward('2025-03-02', 'daily', '2025-03-01')).toBe('2025-03-02');
  });

  it('rolls forward daily until >= today', () => {
    expect(rollForward('2025-01-01', 'daily', '2025-01-05')).toBe('2025-01-05');
  });

  it('rolls forward weekly until >= today', () => {
    expect(rollForward('2025-01-01', 'weekly', '2025-01-22')).toBe('2025-01-22');
  });

  it('rolls forward monthly until >= today', () => {
    expect(rollForward('2025-01-31', 'monthly', '2025-03-15')).toBe('2025-03-28');
  });

  it('rolls forward over a ~10-year daily gap', () => {
    const result = rollForward('2015-01-01', 'daily', '2025-01-01');
    expect(result >= '2025-01-01').toBe(true);
  });

  it('stops at the cap and returns last computed date without throwing', () => {
    const farPast = '1000-01-01';
    const result = rollForward(farPast, 'daily', '3000-01-01');
    expect(typeof result).toBe('string');
    expect(result.length).toBe(10);
  });

  it('exposes the iteration cap constant', () => {
    expect(ROLL_FORWARD_MAX_ITERATIONS).toBe(4000);
  });
});
