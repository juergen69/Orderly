import { z } from 'zod';
import type { Project, Todo, SubStep } from './types';

export const statusSchema = z.enum(['todo', 'inProgress', 'done']);
export const recurrenceSchema = z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']);

export const projectNameSchema = z.string().trim().min(1, 'Project name is required');
export const todoTitleSchema = z.string().trim().min(1, 'Title is required');
export const descriptionSchema = z.string().max(2000, 'Description must be at most 2000 characters');
export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color format');

const singleTagSchema = z.string().trim().toLowerCase().max(24, 'Tag must be at most 24 characters');
export const tagsSchema = z.array(singleTagSchema).max(10, 'Maximum 10 tags allowed');

function isValidCalendarDate(s: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export const dueDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
  .refine(isValidCalendarDate, { message: 'Invalid calendar date' })
  .nullable();

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const normalized = tag.trim().toLowerCase();
    if (normalized.length > 0 && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}

export interface ImportPayload {
  schemaVersion: 1;
  projects: Project[];
  todos: Todo[];
  subSteps: SubStep[];
}

const projectImportSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  order: z.string(),
  boardOrder: z.string(),
});

const todoImportSchema = z.object({
  id: z.string(),
  projectId: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  status: statusSchema,
  dueDate: z.string().nullable(),
  boardOrder: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  doneAt: z.string().nullable(),
  recurrence: recurrenceSchema,
  reminderAt: z.string().nullable(),
  reminderLead: z.string().nullable(),
  tags: z.array(z.string()),
  isFrog: z.boolean(),
});

const subStepImportSchema = z.object({
  id: z.string(),
  todoId: z.string(),
  title: z.string(),
  done: z.boolean(),
  order: z.string(),
  createdAt: z.string(),
});

export const importSchema = z.object({
  schemaVersion: z.literal(1),
  projects: z.array(projectImportSchema),
  todos: z.array(todoImportSchema),
  subSteps: z.array(subStepImportSchema),
}).strip();

export type ImportError =
  | { kind: 'version-mismatch'; message: string }
  | { kind: 'invalid-shape'; issues: Array<{ path: string; message: string }> };

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: ImportError };

export function parseImport(data: unknown): ParseResult<ImportPayload> {
  if (data !== null && typeof data === 'object' && 'schemaVersion' in data) {
    const version = (data as Record<string, unknown>)['schemaVersion'];
    if (version !== 1) {
      return {
        success: false,
        error: {
          kind: 'version-mismatch',
          message: `Expected schema version 1, got ${String(version)}`,
        },
      };
    }
  }

  const result = importSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: {
      kind: 'invalid-shape',
      issues: result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    },
  };
}
