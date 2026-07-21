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

export function parseQuickAdd(
  input: string,
  projects: Project[],
  todayIso: string,
): QuickAddResult {
  let today: Date;
  try {
    today = parseDate(todayIso);
  } catch {
    today = new Date();
  }

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
    const token = tokens[i];

    if (token!.startsWith('#')) {
      const tag = token!.slice(1).trim().toLowerCase();
      if (tag.length > 0 && !result.tags.includes(tag)) {
        result.tags.push(tag);
      } else if (tag.length === 0) {
        titleParts.push(token!);
      }
      i++;
      continue;
    }

    if (token!.startsWith('@')) {
      const name = token!.slice(1).trim();
      if (name.length > 0) {
        let bestMatch: Project | undefined;
        let bestLen = 0;

        for (let len = 1; i + len <= tokens.length; len++) {
          const parts = [name];
          for (let j = 1; j < len; j++) {
            parts.push(tokens[i + j]!);
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
          result.projectId = bestMatch.id;
          i += bestLen;
          continue;
        }

        titleParts.push(token!);
      } else {
        titleParts.push(token!);
      }
      i++;
      continue;
    }

    if (token!.startsWith('!')) {
      const due = resolveDueToken(token!, today);
      if (due !== null) {
        result.dueDate = due;
        i++;
        continue;
      }
    }

    titleParts.push(token!);
    i++;
  }

  result.title = titleParts.join(' ').trim();
  return result;
}
