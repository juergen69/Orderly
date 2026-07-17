import { describe, it, expect } from 'vitest';
import { first, last, between, needsRebalance, rebalance } from './ordering';

describe('ordering', () => {
  describe('first()', () => {
    it('returns a valid initial key', () => {
      const key = first();
      expect(key).toBe('m');
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });

    it('never returns null or undefined', () => {
      expect(first()).not.toBeNull();
      expect(first()).not.toBeUndefined();
    });
  });

  describe('last()', () => {
    it('returns initial key for empty list', () => {
      expect(last([])).toBe(first());
    });

    it('returns a key greater than the last sorted key', () => {
      const keys = ['a', 'b', 'c'];
      const result = last(keys);
      expect(result > 'c').toBe(true);
    });

    it('handles unsorted input', () => {
      const keys = ['c', 'a', 'b'];
      const result = last(keys);
      expect(result > 'c').toBe(true);
    });

    it('returns a key greater than single element', () => {
      const result = last(['m']);
      expect(result > 'm').toBe(true);
    });
  });

  describe('between()', () => {
    it('returns initial key when both args are undefined', () => {
      expect(between(undefined, undefined)).toBe(first());
    });

    it('returns a key before b when a is undefined', () => {
      const result = between(undefined, 'm');
      expect(result < 'm').toBe(true);
    });

    it('returns a key after a when b is undefined', () => {
      const result = between('m', undefined);
      expect(result > 'm').toBe(true);
    });

    it('returns a key strictly between a and b', () => {
      const result = between('a', 'z');
      expect(result > 'a').toBe(true);
      expect(result < 'z').toBe(true);
    });

    it('handles adjacent keys', () => {
      const result = between('m', 'n');
      expect(result > 'm').toBe(true);
      expect(result < 'n').toBe(true);
    });

    it('handles keys with common prefix', () => {
      const result = between('ma', 'mb');
      expect(result > 'ma').toBe(true);
      expect(result < 'mb').toBe(true);
    });

    it('throws when a >= b', () => {
      expect(() => between('z', 'a')).toThrow('Invalid order');
      expect(() => between('m', 'm')).toThrow('Invalid order');
    });
  });

  describe('ordering correctness', () => {
    it('maintains order with repeated midpoint inserts', () => {
      let keys = [first()];
      
      for (let i = 0; i < 10; i++) {
        const lastKey = keys[keys.length - 1]!;
        const newKey = between(lastKey, undefined);
        keys.push(newKey);
        keys.sort();
        
        for (let j = 0; j < keys.length - 1; j++) {
          expect(keys[j]! < keys[j + 1]!).toBe(true);
        }
      }
    });

    it('maintains order with insertions at start', () => {
      let keys = [first()];
      
      for (let i = 0; i < 10; i++) {
        const firstKey = keys[0]!;
        const newKey = between(undefined, firstKey);
        keys.unshift(newKey);
        keys.sort();
        
        for (let j = 0; j < keys.length - 1; j++) {
          expect(keys[j]! < keys[j + 1]!).toBe(true);
        }
      }
    });

    it('maintains order with insertions in middle', () => {
      let keys = ['a', 'm', 'z'];
      
      for (let i = 0; i < 10; i++) {
        const midIdx = Math.floor(keys.length / 2);
        const a = keys[midIdx - 1]!;
        const b = keys[midIdx]!;
        const newKey = between(a, b);
        keys.splice(midIdx, 0, newKey);
        keys.sort();
        
        for (let j = 0; j < keys.length - 1; j++) {
          expect(keys[j]! < keys[j + 1]!).toBe(true);
        }
      }
    });

    it('one-record-write guarantee: between() only depends on neighbors', () => {
      const keys = ['a', 'm', 'z'];
      const midIdx = 1;
      const a = keys[midIdx - 1]!;
      const b = keys[midIdx + 1]!;
      
      const result1 = between(a, b);
      const result2 = between(a, b);
      
      expect(result1).toBe(result2);
      expect(result1 > a).toBe(true);
      expect(result1 < b).toBe(true);
    });
  });

  describe('deep convergence', () => {
    it('handles repeated midpoint inserts between same keys', () => {
      const a = 'm';
      const b = 'n';
      const keys = [a];
      
      let current = a;
      for (let i = 0; i < 20; i++) {
        const newKey = between(current, b);
        keys.push(newKey);
        current = newKey;
      }
      
      keys.sort();
      
      for (let i = 0; i < keys.length - 1; i++) {
        expect(keys[i]! < keys[i + 1]!).toBe(true);
      }
      
      expect(keys[0]).toBe(a);
      expect(keys[keys.length - 1]! < b).toBe(true);
    });

    it('handles deep convergence with alternating inserts', () => {
      let keys = ['a', 'z'];
      
      for (let i = 0; i < 15; i++) {
        const midIdx = Math.floor(keys.length / 2);
        const a = keys[midIdx - 1]!;
        const b = keys[midIdx]!;
        const newKey = between(a, b);
        keys.splice(midIdx, 0, newKey);
        keys.sort();
      }
      
      for (let i = 0; i < keys.length - 1; i++) {
        expect(keys[i]! < keys[i + 1]!).toBe(true);
      }
    });
  });

  describe('rebalance', () => {
    it('needsRebalance returns false for short keys', () => {
      expect(needsRebalance(['a', 'm', 'z'])).toBe(false);
    });

    it('needsRebalance returns true for long keys', () => {
      const longKey = 'a'.repeat(51);
      expect(needsRebalance([longKey])).toBe(true);
    });

    it('rebalance redistributes keys evenly', () => {
      const keys = ['a', 'b', 'c', 'd', 'e'];
      const rebalanced = rebalance(keys);
      
      expect(rebalanced.length).toBe(keys.length);
      
      for (let i = 0; i < rebalanced.length - 1; i++) {
        expect(rebalanced[i]! < rebalanced[i + 1]!).toBe(true);
      }
      
      for (const key of rebalanced) {
        expect(key.length).toBeLessThanOrEqual(10);
      }
    });

    it('rebalance handles empty list', () => {
      expect(rebalance([])).toEqual([]);
    });

    it('rebalance handles single key', () => {
      const result = rebalance(['m']);
      expect(result.length).toBe(1);
      expect(result[0]!.length).toBeLessThanOrEqual(10);
    });
  });

  describe('edge cases', () => {
    it('handles empty list for last()', () => {
      const result = last([]);
      expect(result).toBe(first());
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('handles single element list', () => {
      const result = last(['m']);
      expect(result > 'm').toBe(true);
    });

    it('handles between with very close keys', () => {
      const a = 'ma';
      const b = 'mb';
      const result = between(a, b);
      expect(result > a).toBe(true);
      expect(result < b).toBe(true);
    });

    it('handles between with long keys', () => {
      const a = 'm' + 'a'.repeat(20);
      const b = 'm' + 'z'.repeat(20);
      const result = between(a, b);
      expect(result > a).toBe(true);
      expect(result < b).toBe(true);
    });
  });
});
