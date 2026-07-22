import { findUrls } from './url-utils';

export const DEFAULT_TRUNCATE_LIMIT = 120;

export function truncate(text: string, limit: number = DEFAULT_TRUNCATE_LIMIT): string {
  if (text.length <= limit) {
    return text;
  }

  const urls = findUrls(text);
  const urlSpans = urls.map((u) => ({ start: u.start, end: u.end }));

  function isInsideUrl(index: number): boolean {
    return urlSpans.some((s) => index >= s.start && index <= s.end);
  }

  const cutoff = limit - 1;
  let boundary = cutoff;
  while (boundary > 0 && !/\s/.test(text[boundary - 1] ?? '')) {
    boundary -= 1;
  }
  if (boundary === 0) {
    boundary = cutoff;
  }

  if (isInsideUrl(boundary)) {
    const span = urlSpans.find((s) => boundary >= s.start && boundary <= s.end);
    if (span) {
      boundary = span.end;
    }
  }

  let result = text.slice(0, boundary).trimEnd();
  if (result.length === 0) {
    result = text.slice(0, limit);
  }
  return `${result}…`;
}
