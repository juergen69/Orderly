import type { Project } from './types';
import { parseDate, formatDate } from './time';

export interface QuickAddResult {
  title: string;
  tags: string[];
  projectId: string | null;
  dueDate: string | null;
}

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
type DayName = (typeof DAY_NAMES)[number];

function nextWeekday(from: Date, target: number): Date {
  const result = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const diff = (target - result.getDay() + 7) % 7;
  result.setDate(result.getDate() + (diff === 0 ? 7 : diff));
  return result;
}

function resolveDueToken(token: string, today: Date): string | null {
  const lower = token.toLowerCase();
  if (lower === '!today') {
    return formatDate(today);
  }
  if (lower === '!tomorrow') {
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    return formatDate(t);
  }
  if (lower.startsWith('!') && lower.length > 1) {
    const candidate = lower.slice(1);
    if (DAY_NAMES.includes(candidate as DayName)) {
      const target = DAY_NAMES.indexOf(candidate as DayName);
      return formatDate(nextWeekday(today, target));
    }
  }
  return null;
}

function safeParseDate(iso: string): Date | null {
  try {
    return parseDate(iso);
  } catch {
    return null;
  }
}

function addTag(token: string, result: QuickAddResult, titleParts: string[]): void {
  const tag = token.slice(1).trim().toLowerCase();
  if (tag.length > 0 && !result.tags.includes(tag)) {
    result.tags.push(tag);
  } else if (tag.length === 0) {
    titleParts.push(token);
  }
}

function matchProject(
  startIndex: number,
  tokens: string[],
  projects: Project[],
): { projectId: string; advance: number } | null {
  const name = tokens[startIndex]!.slice(1).trim();
  let bestMatch: Project | undefined;
  let bestLen = 0;

  for (let len = 1; startIndex + len <= tokens.length; len++) {
    const parts = [name];
    for (let j = 1; j < len; j++) {
      parts.push(tokens[startIndex + j]!);
    }
    const candidate = parts.join(' ');
    const found = projects.find(
      (p) => p.name.trim().toLowerCase() === candidate.toLowerCase(),
    );
    if (found) {
      bestMatch = found;
      bestLen = len;
    }
  }

  if (bestMatch) {
    return { projectId: bestMatch.id, advance: bestLen };
  }
  return null;
}

function addProjectReference(
  index: number,
  tokens: string[],
  projects: Project[],
  result: QuickAddResult,
  titleParts: string[],
): number {
  const match = matchProject(index, tokens, projects);
  if (match) {
    result.projectId = match.projectId;
    return match.advance;
  }
  titleParts.push(tokens[index]!);
  return 1;
}

function addDueDate(token: string, today: Date, result: QuickAddResult, titleParts: string[]): number {
  const due = resolveDueToken(token, today);
  if (due !== null) {
    result.dueDate = due;
    return 1;
  }
  titleParts.push(token);
  return 1;
}

function processToken(
  token: string,
  index: number,
  tokens: string[],
  projects: Project[],
  today: Date,
  result: QuickAddResult,
  titleParts: string[],
): number {
  if (token.startsWith('#')) {
    addTag(token, result, titleParts);
    return 1;
  }
  if (token.startsWith('@')) {
    return addProjectReference(index, tokens, projects, result, titleParts);
  }
  if (token.startsWith('!')) {
    return addDueDate(token, today, result, titleParts);
  }
  titleParts.push(token);
  return 1;
}

export function parseQuickAdd(
  input: string,
  projects: Project[],
  todayIso: string,
): QuickAddResult {
  const today = safeParseDate(todayIso) ?? new Date();

  const result: QuickAddResult = {
    title: '',
    tags: [],
    projectId: null,
    dueDate: null,
  };

  if (typeof input !== 'string' || input.trim().length === 0) {
    return result;
  }

  const tokens = input.split(/\s+/).filter((token): token is string => token !== undefined);
  const titleParts: string[] = [];

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i]!;
    const advance = processToken(token, i, tokens, projects, today, result, titleParts);
    i += advance;
  }

  result.title = titleParts.join(' ').trim();
  return result;
}
