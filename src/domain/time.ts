export function todayIso(now: Date = new Date()): string {
  return formatDate(now);
}

export function nowIso(now: Date = new Date()): string {
  return now.toISOString();
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(iso: string): Date {
  const parts = iso.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${iso}`);
  }
  const [year, month, day] = parts.map(Number);
  if (year === undefined || month === undefined || day === undefined ||
      Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    throw new Error(`Invalid date format: ${iso}`);
  }
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}`);
  }
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    throw new Error(`Invalid day: ${day} for month ${month}`);
  }
  return new Date(year, month - 1, day);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function shiftDays(date: Date, days: number): Date {
  const result = startOfDay(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

export function isAfter(a: Date, b: Date): boolean {
  return a.getTime() > b.getTime();
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(iso: string, now: Date = new Date()): boolean {
  const today = todayIso(now);
  return iso === today;
}

export function isBeforeToday(iso: string, now: Date = new Date()): boolean {
  const today = todayIso(now);
  return iso < today;
}

export function isAfterToday(iso: string, now: Date = new Date()): boolean {
  const today = todayIso(now);
  return iso > today;
}
