const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const INITIAL_KEY = 'm';
const MAX_KEY_LENGTH = 50;

function charValue(c: string): number {
  return ALPHABET.indexOf(c);
}

function valueChar(v: number): string {
  return ALPHABET[v];
}

export function first(): string {
  return INITIAL_KEY;
}

export function last(existing: string[]): string {
  if (existing.length === 0) {
    return INITIAL_KEY;
  }
  const sorted = [...existing].sort();
  const lastKey = sorted[sorted.length - 1]!;
  return after(lastKey);
}

export function between(a: string | undefined, b: string | undefined): string {
  if (a === undefined && b === undefined) {
    return INITIAL_KEY;
  }
  if (a === undefined) {
    return before(b!);
  }
  if (b === undefined) {
    return after(a);
  }
  return midpoint(a, b);
}

function midpoint(a: string, b: string): string {
  if (a >= b) {
    throw new Error(`Invalid order: ${a} >= ${b}`);
  }
  
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) {
    i++;
  }
  
  if (i === a.length) {
    return a + 'm';
  }
  
  const aVal = charValue(a[i]!);
  const bVal = charValue(b[i]!);
  
  if (bVal - aVal > 1) {
    const midVal = Math.floor((aVal + bVal) / 2);
    return a.substring(0, i) + valueChar(midVal);
  } else {
    const aRest = a.substring(i + 1);
    const midRest = aRest.length > 0 ? midpoint(aRest, 'zzzzzzzzzz') : 'm';
    return a.substring(0, i + 1) + midRest;
  }
}

function after(key: string): string {
  return key + 'm';
}

function before(key: string): string {
  for (let i = key.length - 1; i >= 0; i--) {
    const char = key[i]!;
    const val = charValue(char);
    if (val > 0) {
      return key.substring(0, i) + valueChar(val - 1) + 'z'.repeat(key.length - i - 1);
    }
  }
  throw new Error('Cannot generate key before all-a key');
}

export function needsRebalance(keys: string[]): boolean {
  return keys.some(k => k.length > MAX_KEY_LENGTH);
}

export function rebalance(keys: string[]): string[] {
  const n = keys.length;
  if (n === 0) return [];
  
  const result: string[] = [];
  for (let i = 0; i < n; i++) {
    const value = (i + 1) / (n + 1);
    result.push(valueToKey(value));
  }
  return result;
}

function valueToKey(value: number): string {
  let result = '';
  let remaining = value;
  for (let i = 0; i < 10; i++) {
    remaining *= ALPHABET.length;
    const digit = Math.floor(remaining);
    result += valueChar(digit);
    remaining -= digit;
    if (remaining === 0) break;
  }
  return result;
}
