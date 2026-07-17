import { describe, it, expect } from 'vitest';
import { parseQuickAdd } from './quick-add';

const projects = [
  { id: 'p1', name: 'Work', color: '#000', createdAt: '', updatedAt: '', order: 'a', boardOrder: 'a' },
  { id: 'p2', name: 'Personal', color: '#111', createdAt: '', updatedAt: '', order: 'b', boardOrder: 'b' },
] as const;

const TODAY = '2025-01-15';

describe('parseQuickAdd', () => {
  it('extracts hash tags', () => {
    const r = parseQuickAdd('buy milk #home #urgent', projects, TODAY);
    expect(r.title).toBe('buy milk');
    expect(r.tags).toEqual(['home', 'urgent']);
  });

  it('matches a project case-insensitively via @', () => {
    const r = parseQuickAdd('email boss @work', projects, TODAY);
    expect(r.projectId).toBe('p1');
    expect(r.title).toBe('email boss');
  });

  it('returns null when project is unmatched', () => {
    const r = parseQuickAdd('call @dentist', projects, TODAY);
    expect(r.projectId).toBeNull();
  });

  it('keeps a bare # token in the title', () => {
    const r = parseQuickAdd('note # here', projects, TODAY);
    expect(r.title).toBe('note # here');
    expect(r.tags).toEqual([]);
  });

  it('keeps a bare @ token in the title', () => {
    const r = parseQuickAdd('ping @ someone', projects, TODAY);
    expect(r.title).toBe('ping @ someone');
    expect(r.projectId).toBeNull();
  });

  it('parses !today', () => {
    const r = parseQuickAdd('standup !today', projects, TODAY);
    expect(r.dueDate).toBe('2025-01-15');
  });

  it('parses !tomorrow', () => {
    const r = parseQuickAdd('standup !tomorrow', projects, TODAY);
    expect(r.dueDate).toBe('2025-01-16');
  });

  it('parses weekday tokens', () => {
    const r = parseQuickAdd('review !fri', projects, TODAY);
    expect(r.dueDate).toBe('2025-01-17');
  });

  it('strips all recognized tokens from the title', () => {
    const r = parseQuickAdd('#a @work !today do the thing #b', projects, TODAY);
    expect(r.title).toBe('do the thing');
    expect(r.tags).toEqual(['a', 'b']);
  });

  it('returns empty result for blank input without throwing', () => {
    const r = parseQuickAdd('   ', projects, TODAY);
    expect(r.title).toBe('');
    expect(r.tags).toEqual([]);
    expect(r.projectId).toBeNull();
    expect(r.dueDate).toBeNull();
  });

  it('does not throw on malformed today date', () => {
    expect(() => parseQuickAdd('#x !today', projects, 'garbage')).not.toThrow();
  });

  it('treats unknown ! tokens as literal title words', () => {
    const r = parseQuickAdd('alert !soon', projects, TODAY);
    expect(r.title).toBe('alert !soon');
    expect(r.dueDate).toBeNull();
  });
});
