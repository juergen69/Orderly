import { describe, it, expect } from 'vitest';
import { progress } from './progress';

describe('progress', () => {
  it('reports 0/0 for an empty list', () => {
    const p = progress([]);
    expect(p).toEqual({ done: 0, total: 0, label: '0/0' });
  });

  it('reports partial completion', () => {
    const p = progress([{ done: true }, { done: false }, { done: true }]);
    expect(p.done).toBe(2);
    expect(p.total).toBe(3);
    expect(p.label).toBe('2/3');
  });

  it('reports all done', () => {
    const p = progress([{ done: true }, { done: true }]);
    expect(p).toEqual({ done: 2, total: 2, label: '2/2' });
  });

  it('reports none done', () => {
    const p = progress([{ done: false }, { done: false }]);
    expect(p.label).toBe('0/2');
  });
});
