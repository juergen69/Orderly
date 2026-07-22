const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const INITIAL_KEY = 'm';
const MAX_KEY_LENGTH = 50;

function charValue(c: string): number {
  return ALPHABET.indexOf(c);
}

function valueChar(v: number): string {
  return ALPHABET[v] ?? 'a';
}

export function first(): string {
  return INITIAL_KEY;
}

export function last(existing: string[]): string {
  if (existing.length === 0) {
    return INITIAL_KEY;
  }
  const sorted = [...existing].sort((a, b) => a.localeCompare(b));
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
  while (i < a.length && a[i] === b[i]) {
    i++;
  }

  // If `a` is exhausted at this point (a is a proper prefix of b), there is
  // no character of `a` to compare at index `i`; treat it as "below the
  // minimum" so the general midpoint math below still applies.
  const aVal = i < a.length ? charValue(a[i]!) : -1;
  // `b` is guaranteed to have a character at `i` here: if `a < b` held and
  // the loop above only stops early due to length, it must be because `a`
  // (not `b`) ran out first (otherwise `b` would be a prefix of `a`, making
  // `b <= a`, which contradicts the check above).
  const bVal = charValue(b[i]!);

  if (bVal - aVal > 1) {
    const midVal = Math.floor((aVal + bVal) / 2);
    return a.substring(0, i) + valueChar(midVal);
  }

  if (aVal === -1 && bVal === 0) {
    // `a` is a proper prefix of `b`, and `b`'s next character is the
    // minimal character ('a'). There is mathematically no string strictly
    // between them (e.g. between('m', 'ma') or between('a', 'aa')): any
    // extension of `a` that matches `b`'s next char either equals `b` or
    // must be shorter than `b`, which is not > a's needed extension either.
    throw new Error(
      `Cannot generate key between "${a}" and "${b}": no key exists strictly between a prefix and its immediate minimal-suffix successor`
    );
  }

  const aRest = a.substring(i + 1);
  const midRest = aRest.length > 0 ? midpoint(aRest, 'zzzzzzzzzz') : 'm';
  return a.substring(0, i + 1) + midRest;
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
  // `key` is composed entirely of the minimal character ('a'). The alphabet
  // has no character below 'a', so the only strings lexicographically less
  // than an all-minimal key are its shorter all-minimal prefixes (e.g. 'aa'
  // -> 'a', 'a' -> ''). Drop the last character to move one step lower.
  if (key.length === 0) {
    throw new Error('Cannot generate a key before the empty key');
  }
  return key.substring(0, key.length - 1);
}

export function needsRebalance(keys: string[]): boolean {
  return keys.some(k => k.length > MAX_KEY_LENGTH);
}

export function rebalance(keys: string[]): string[] {
  const n = keys.length;
  if (n === 0) return [];

  // Do not assume `keys` arrives pre-sorted. Rank each entry by its current
  // value, generate evenly spaced replacement keys by rank, and scatter them
  // back into an output array aligned with the *original* input order/index
  // so callers can still map `keys[i]` -> `result[i]`.
  const order = keys.map((_, idx) => idx).sort((x, y) => {
    const kx = keys[x]!;
    const ky = keys[y]!;
    return kx < ky ? -1 : kx > ky ? 1 : 0;
  });

  // Use enough digits of precision that adjacent generated values cannot
  // collide after truncation, even for large `n` (need base^digits > n+1).
  const digits = Math.max(10, Math.ceil(Math.log(n + 2) / Math.log(ALPHABET.length)) + 4);

  const result = new Array<string>(n);
  for (let rank = 0; rank < n; rank++) {
    const value = (rank + 1) / (n + 1);
    result[order[rank]!] = valueToKey(value, digits);
  }
  return result;
}

function valueToKey(value: number, digits = 10): string {
  let result = '';
  let remaining = value;
  for (let i = 0; i < digits; i++) {
    remaining *= ALPHABET.length;
    const digit = Math.floor(remaining);
    result += valueChar(digit);
    remaining -= digit;
    if (remaining === 0) break;
  }
  return result;
}
