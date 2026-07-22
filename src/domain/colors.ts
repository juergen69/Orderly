export const DEFAULT_COLOR = '#22d3ee';

export const PALETTE: readonly string[] = [
  '#22d3ee',
  '#a3e635',
  '#f472b6',
  '#fbbf24',
  '#818cf8',
  '#34d399',
  '#fb7185',
  '#c084fc',
  '#facc15',
  '#38bdf8',
  '#f97316',
  '#4ade80',
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.codePointAt(i)!;
    hash = Math.trunc(hash);
  }
  return Math.abs(hash);
}

export function colorForTag(tag: string): string {
  const normalized = tag.trim().toLowerCase();
  if (normalized.length === 0) {
    return DEFAULT_COLOR;
  }
  const index = hashString(normalized) % PALETTE.length;
  return PALETTE[index] ?? DEFAULT_COLOR;
}
