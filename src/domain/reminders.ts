import { parseDate, formatDate, startOfDay } from './time';

export const REMINDER_LEAD_ON_DUE = 'onDue';
export const REMINDER_LEAD_1_DAY = '1d';
export const REMINDER_LEAD_1_WEEK = '7d';
export const REMINDER_LEAD_2_WEEKS = '14d';

const PRESET_OFFSETS: Record<string, number> = {
  [REMINDER_LEAD_ON_DUE]: 0,
  [REMINDER_LEAD_1_DAY]: 1,
  [REMINDER_LEAD_1_WEEK]: 7,
  [REMINDER_LEAD_2_WEEKS]: 14,
};

function isValidLead(lead: string): boolean {
  if (lead in PRESET_OFFSETS) {
    return true;
  }
  const match = /^(-?\d+)d$/.exec(lead);
  if (match) {
    return match[1] !== undefined;
  }
  return false;
}

function offsetDays(lead: string): number {
  if (lead in PRESET_OFFSETS) {
    return PRESET_OFFSETS[lead] ?? 0;
  }
  const match = /^(-?\d+)d$/.exec(lead);
  if (match && match[1] !== undefined) {
    return Number(match[1]);
  }
  return 0;
}

export function resolveReminder(dueDate: string | null, lead: string | null): string | null {
  if (dueDate === null || dueDate === '' || lead === null || lead === '') {
    return null;
  }
  if (!isValidLead(lead)) {
    return null;
  }

  let due: Date;
  try {
    due = parseDate(dueDate);
  } catch {
    return null;
  }

  const reminder = startOfDay(due);
  reminder.setDate(reminder.getDate() - offsetDays(lead));
  return formatDate(reminder);
}
