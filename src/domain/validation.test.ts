import { describe, it, expect } from 'vitest';
import {
  projectNameSchema,
  todoTitleSchema,
  descriptionSchema,
  colorSchema,
  tagsSchema,
  dueDateSchema,
  normalizeTags,
  parseImport,
  statusSchema,
  recurrenceSchema,
} from './validation';

describe('validation', () => {
  describe('projectNameSchema', () => {
    it('accepts valid name', () => {
      const result = projectNameSchema.safeParse('My Project');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('My Project');
      }
    });

    it('trims whitespace', () => {
      const result = projectNameSchema.safeParse('  My Project  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('My Project');
      }
    });

    it('rejects empty string', () => {
      const result = projectNameSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('rejects whitespace-only string', () => {
      const result = projectNameSchema.safeParse('   ');
      expect(result.success).toBe(false);
    });
  });

  describe('todoTitleSchema', () => {
    it('accepts valid title', () => {
      const result = todoTitleSchema.safeParse('Buy groceries');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('Buy groceries');
      }
    });

    it('trims whitespace', () => {
      const result = todoTitleSchema.safeParse('  Buy groceries  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('Buy groceries');
      }
    });

    it('rejects empty string', () => {
      const result = todoTitleSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('rejects whitespace-only string', () => {
      const result = todoTitleSchema.safeParse('   ');
      expect(result.success).toBe(false);
    });
  });

  describe('descriptionSchema', () => {
    it('accepts valid description', () => {
      const result = descriptionSchema.safeParse('This is a description');
      expect(result.success).toBe(true);
    });

    it('accepts empty string', () => {
      const result = descriptionSchema.safeParse('');
      expect(result.success).toBe(true);
    });

    it('accepts exactly 2000 characters', () => {
      const result = descriptionSchema.safeParse('a'.repeat(2000));
      expect(result.success).toBe(true);
    });

    it('rejects over 2000 characters', () => {
      const result = descriptionSchema.safeParse('a'.repeat(2001));
      expect(result.success).toBe(false);
    });
  });

  describe('colorSchema', () => {
    it.each([
      ['#ff0000', 'lowercase'],
      ['#FF0000', 'uppercase'],
      ['#Ff00aA', 'mixed case'],
    ])('accepts valid hex color (%s)', (input) => {
      const result = colorSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it.each([
      ['#fff', '3 digits'],
      ['ff0000', 'missing #'],
      ['#gg0000', 'invalid chars'],
      ['', 'empty string'],
    ])('rejects invalid hex (%s)', (input) => {
      const result = colorSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects whitespace-only string', () => {
      const result = colorSchema.safeParse('   ');
      expect(result.success).toBe(false);
    });
  });

  describe('tagsSchema', () => {
    it('accepts valid tags', () => {
      const result = tagsSchema.safeParse(['work', 'urgent']);
      expect(result.success).toBe(true);
    });

    it('accepts empty array', () => {
      const result = tagsSchema.safeParse([]);
      expect(result.success).toBe(true);
    });

    it('accepts exactly 10 tags', () => {
      const tags = Array.from({ length: 10 }, (_, i) => `tag${i}`);
      const result = tagsSchema.safeParse(tags);
      expect(result.success).toBe(true);
    });

    it('rejects more than 10 tags', () => {
      const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
      const result = tagsSchema.safeParse(tags);
      expect(result.success).toBe(false);
    });

    it('accepts tag with exactly 24 characters', () => {
      const result = tagsSchema.safeParse(['a'.repeat(24)]);
      expect(result.success).toBe(true);
    });

    it('rejects tag over 24 characters', () => {
      const result = tagsSchema.safeParse(['a'.repeat(25)]);
      expect(result.success).toBe(false);
    });

    it('normalizes tags to lowercase', () => {
      const result = tagsSchema.safeParse(['WORK', 'Urgent']);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(['work', 'urgent']);
      }
    });

    it('trims whitespace from tags', () => {
      const result = tagsSchema.safeParse(['  work  ', '  urgent  ']);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(['work', 'urgent']);
      }
    });
  });

  describe('normalizeTags', () => {
    it('normalizes to lowercase', () => {
      expect(normalizeTags(['WORK', 'Urgent'])).toEqual(['work', 'urgent']);
    });

    it('trims whitespace', () => {
      expect(normalizeTags(['  work  ', '  urgent  '])).toEqual(['work', 'urgent']);
    });

    it('removes duplicates', () => {
      expect(normalizeTags(['work', 'WORK', '  work  '])).toEqual(['work']);
    });

    it('removes empty strings', () => {
      expect(normalizeTags(['work', '', '  ', 'urgent'])).toEqual(['work', 'urgent']);
    });

    it('handles empty array', () => {
      expect(normalizeTags([])).toEqual([]);
    });
  });

  describe('dueDateSchema', () => {
    it('accepts valid date', () => {
      const result = dueDateSchema.safeParse('2024-01-15');
      expect(result.success).toBe(true);
    });

    it('accepts null', () => {
      const result = dueDateSchema.safeParse(null);
      expect(result.success).toBe(true);
    });

    it.each([
      ['2024/01/15', false],
      ['2024-01', false],
      ['2024-02-30', false],
      ['2024-04-31', false],
      ['2024-02-29', true],
      ['2023-02-29', false],
      ['2024-13-01', false],
    ])('validates due date %s correctly', (input, expected) => {
      const result = dueDateSchema.safeParse(input);
      expect(result.success).toBe(expected);
    });

    it('rejects invalid day', () => {
      const result = dueDateSchema.safeParse('2024-01-32');
      expect(result.success).toBe(false);
    });
  });

  describe('statusSchema', () => {
    it('accepts valid statuses', () => {
      expect(statusSchema.safeParse('todo').success).toBe(true);
      expect(statusSchema.safeParse('inProgress').success).toBe(true);
      expect(statusSchema.safeParse('done').success).toBe(true);
    });

    it('rejects invalid status', () => {
      expect(statusSchema.safeParse('invalid').success).toBe(false);
    });
  });

  describe('recurrenceSchema', () => {
    it('accepts valid recurrences', () => {
      expect(recurrenceSchema.safeParse('none').success).toBe(true);
      expect(recurrenceSchema.safeParse('daily').success).toBe(true);
      expect(recurrenceSchema.safeParse('weekly').success).toBe(true);
      expect(recurrenceSchema.safeParse('monthly').success).toBe(true);
      expect(recurrenceSchema.safeParse('yearly').success).toBe(true);
    });

    it('rejects invalid recurrence', () => {
      expect(recurrenceSchema.safeParse('invalid').success).toBe(false);
    });
  });

  describe('parseImport', () => {
    const validImport = {
      schemaVersion: 1,
      projects: [
        {
          id: 'p1',
          name: 'Project 1',
          color: '#ff0000',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          order: 'a0',
          boardOrder: 'a0',
        },
      ],
      todos: [
        {
          id: 't1',
          projectId: 'p1',
          title: 'Todo 1',
          description: 'Description',
          status: 'todo',
          dueDate: null,
          boardOrder: 'a0',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          doneAt: null,
          recurrence: 'none',
          reminderAt: null,
          reminderLead: null,
          tags: [],
          isFrog: false,
        },
      ],
      subSteps: [
        {
          id: 's1',
          todoId: 't1',
          title: 'SubStep 1',
          done: false,
          order: 'a0',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
    };

    it('accepts valid import payload', () => {
      const result = parseImport(validImport);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.schemaVersion).toBe(1);
        expect(result.data.projects).toHaveLength(1);
        expect(result.data.todos).toHaveLength(1);
        expect(result.data.subSteps).toHaveLength(1);
      }
    });

    it('strips unknown top-level keys', () => {
      const result = parseImport({
        ...validImport,
        unknownKey: 'should be stripped',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as unknown as Record<string, unknown>).unknownKey).toBeUndefined();
      }
    });

    it('returns version-mismatch error for wrong version', () => {
      const result = parseImport({
        ...validImport,
        schemaVersion: 2,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.kind).toBe('version-mismatch');
        expect((result.error as { message: string }).message).toContain('2');
      }
    });

    it('returns version-mismatch error for string version', () => {
      const result = parseImport({
        ...validImport,
        schemaVersion: '1',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.kind).toBe('version-mismatch');
      }
    });

    it('returns invalid-shape error for missing schemaVersion', () => {
      const result = parseImport({
        projects: [],
        todos: [],
        subSteps: [],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.kind).toBe('invalid-shape');
      }
    });

    it('returns invalid-shape error for missing projects', () => {
      const result = parseImport({
        schemaVersion: 1,
        todos: [],
        subSteps: [],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.kind).toBe('invalid-shape');
        expect((result.error as { issues: unknown[] }).issues.length).toBeGreaterThan(0);
      }
    });

    it('returns invalid-shape error for invalid todo structure', () => {
      const result = parseImport({
        schemaVersion: 1,
        projects: [],
        todos: [{ id: 't1' }],
        subSteps: [],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.kind).toBe('invalid-shape');
        expect((result.error as { issues: unknown[] }).issues.length).toBeGreaterThan(0);
      }
    });

    it('returns invalid-shape error for non-object input', () => {
      const result = parseImport('not an object');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.kind).toBe('invalid-shape');
      }
    });

    it('returns invalid-shape error for null input', () => {
      const result = parseImport(null);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.kind).toBe('invalid-shape');
      }
    });
  });
});
