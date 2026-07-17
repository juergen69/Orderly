export interface UrlToken {
  start: number;
  end: number;
  value: string;
}

const URL_PROTOCOL = '(https?:\\/\\/|www\\.)';
const URL_BODY = '[^\\s<>""()]+';

const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

export const URL_REGEX = new RegExp(`${URL_PROTOCOL}${URL_BODY}`, 'gi');

export function findUrls(text: string): UrlToken[] {
  const tokens: UrlToken[] = [];
  if (typeof text !== 'string' || text.length === 0) {
    return tokens;
  }

  URL_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = URL_REGEX.exec(text)) !== null) {
    const start = match.index;
    let value = match[0];
    let end = start + value.length;
    const trailing = TRAILING_PUNCTUATION.exec(value);
    if (trailing) {
      value = value.slice(0, trailing.index);
      end = start + value.length;
    }
    if (value.length > 0) {
      tokens.push({ start, end, value });
    }
    if (match.index === URL_REGEX.lastIndex) {
      URL_REGEX.lastIndex += 1;
    }
  }

  return tokens;
}
