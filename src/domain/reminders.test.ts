import { describe, it, expect } from 'vitest';
import {
  resolveReminder,
  REMINDER_LEAD_ON_DUE,
  REMINDER_LEAD_1_DAY,
  REMINDER_LEAD_1_WEEK,
  REMINDER_LEAD_2_WEEKS,
} from './reminders';

describe('resolveReminder', () => {
  it('returns the due date for the on-due preset', () => {
    expect(resolveReminder('2025-06-15', REMINDER_LEAD_ON_DUE)).toBe('2025-06-15');
  });

  it('returns one day before for the 1d preset', () => {
    expect(resolveReminder('2025-06-15', REMINDER_LEAD_1_DAY)).toBe('2025-06-14');
  });

  it('returns one week before for the 7d preset', () => {
    expect(resolveReminder('2025-06-15', REMINDER_LEAD_1_WEEK)).toBe('2025-06-08');
  });

  it('returns two weeks before for the 14d preset', () => {
    expect(resolveReminder('2025-06-15', REMINDER_LEAD_2_WEEKS)).toBe('2025-06-01');
  });

  it('supports a custom numeric day offset', () => {
    expect(resolveReminder('2025-06-15', '3d')).toBe('2025-06-12');
  });

  it('supports a negative day offset', () => {
    expect(resolveReminder('2025-06-15', '-1d')).toBe('2025-06-16');
  });

  it('handles month boundaries when subtracting days', () => {
    expect(resolveReminder('2025-06-01', REMINDER_LEAD_1_DAY)).toBe('2025-05-31');
  });

  it('returns null when dueDate is null', () => {
    expect(resolveReminder(null, REMINDER_LEAD_1_DAY)).toBeNull();
  });

  it('returns null when lead is null', () => {
    expect(resolveReminder('2025-06-15', null)).toBeNull();
  });

  it('returns null for empty strings', () => {
    expect(resolveReminder('', REMINDER_LEAD_1_DAY)).toBeNull();
    expect(resolveReminder('2025-06-15', '')).toBeNull();
  });

  it('returns null for an unrecognized lead preset without throwing', () => {
    expect(resolveReminder('2025-06-15', 'bogus')).toBeNull();
  });

  it('returns null for a malformed dueDate without throwing', () => {
    expect(resolveReminder('not-a-date', REMINDER_LEAD_1_DAY)).toBeNull();
    expect(resolveReminder('2025-13-40', REMINDER_LEAD_1_DAY)).toBeNull();
  });
});
