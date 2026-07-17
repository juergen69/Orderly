import { normalizeTags } from './validation';

export function normalizeTagList(tags: string[]): string[] {
  return normalizeTags(tags);
}

export function sortTagsForSidebar(tags: string[]): string[] {
  const normalized = normalizeTags(tags);
  const counts = new Map<string, number>();
  for (const tag of normalized) {
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  const unique = Array.from(counts.keys());
  unique.sort((a, b) => {
    const ca = counts.get(a) ?? 0;
    const cb = counts.get(b) ?? 0;
    if (ca !== cb) {
      return cb - ca;
    }
    return a < b ? -1 : a > b ? 1 : 0;
  });

  return unique;
}
