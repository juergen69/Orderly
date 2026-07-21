import { describe, it, expect } from 'vitest';
import { parseQuickAdd } from './quick-add';

const projects = [
  { id: 'p1', name: 'Work', color: '#000', createdAt: '', updatedAt: '', order: 'a', boardOrder: 'a' },
  { id: 'p2', name: 'Personal', color: '#111', createdAt: '', updatedAt: '', order: 'b', boardOrder: 'b' },
  { id: 'p3', name: 'My Project', color: '#222', createdAt: '', updatedAt: '', order: 'c', boardOrder: 'c' },
  { id: 'p4', name: 'My Project Management', color: '#333', createdAt: '', updatedAt: '', order: 'd', boardOrder: 'd' },
];

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

  it('preserves unmatched @ tokens in the title', () => {
    const r = parseQuickAdd('call @dentist', projects, TODAY);
    expect(r.projectId).toBeNull();
    expect(r.title).toBe('call @dentist');
  });

  it('matches a multi-word project name', () => {
    const r = parseQuickAdd('review @My Project specs !today', projects, TODAY);
    expect(r.projectId).toBe('p3');
    expect(r.title).toBe('review specs');
    expect(r.dueDate).toBe('2025-01-15');
  });

  it('longest match wins when multiple projects share a prefix', () => {
    const r = parseQuickAdd('review @My Project Management docs', projects, TODAY);
    expect(r.projectId).toBe('p4');
    expect(r.title).toBe('review docs');
  });

  it('preserves partial multi-word @ tokens as literal text', () => {
    const r = parseQuickAdd('note @My Proj here', projects, TODAY);
    expect(r.projectId).toBeNull();
    expect(r.title).toBe('note @My Proj here');
  });

  it('does not treat mid-word @ as a project reference', () => {
    const r = parseQuickAdd('email boss@work', projects, TODAY);
    expect(r.projectId).toBeNull();
    expect(r.title).toBe('email boss@work');
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
