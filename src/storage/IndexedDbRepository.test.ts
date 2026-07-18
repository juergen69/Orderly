import { describe, expect, it } from 'vitest';
import { IndexedDbRepository } from './IndexedDbRepository';
import { repositoryContractTest } from './contract.test';
import { createMigrator } from './migration';
import type { Todo } from '../domain/types';

// Required for fake-indexeddb to work with jsdom - must be imported before any IndexedDB usage
import 'fake-indexeddb/auto';

describe('IndexedDbRepository contract', () => {
  repositoryContractTest(
    () => new IndexedDbRepository(),
    () =>
      new (class extends IndexedDbRepository {
        async replaceAll(): Promise<void> {
          throw new Error('simulated failure');
        }
      })(),
  );
});

describe('Migration', () => {
  it('backfills doneAt from updatedAt for done todos missing doneAt', async () => {
    const repo = new IndexedDbRepository();
    const { migrate } = createMigrator(repo);

    const now = new Date().toISOString();
    const earlier = new Date(Date.now() - 3600000).toISOString();

    await repo.replaceAll({
      projects: [],
      todos: [
        {
          id: 't1',
          projectId: null,
          title: 'done todo',
          description: '',
          status: 'done',
          dueDate: null,
          boardOrder: 'a',
          createdAt: earlier,
          updatedAt: now,
          doneAt: undefined as unknown as null,
          recurrence: 'none',
          reminderAt: null,
          reminderLead: null,
          tags: [],
          isFrog: false,
        },
      ],
      subSteps: [],
    });

    await migrate();

    const todo = await repo.getTodo('t1');
    expect(todo?.doneAt).toBe(now);
  });

  it('backfills doneAt from createdAt when done todo missing doneAt and updatedAt', async () => {
    const repo = new IndexedDbRepository();
    const { migrate } = createMigrator(repo);

    const createdAt = new Date(Date.now() - 7200000).toISOString();

    await repo.createTodo({
      id: 't1',
      projectId: null,
      title: 'done todo',
      description: '',
      status: 'done',
      dueDate: null,
      boardOrder: 'a',
      createdAt,
      updatedAt: createdAt,
      doneAt: undefined as unknown as null,
      recurrence: 'none',
      reminderAt: null,
      reminderLead: null,
      tags: [],
      isFrog: false,
    } as Todo);

    await migrate();

    const todo = await repo.getTodo('t1');
    expect(todo?.doneAt).toBe(createdAt);
  });

  it('backfills doneAt using nowIso() as final safety net when no dates available', async () => {
    const repo = new IndexedDbRepository();
    const { migrate } = createMigrator(repo);

    const beforeMigration = new Date().toISOString();

    await repo.createTodo({
      id: 't1',
      projectId: null,
      title: 'done todo',
      description: '',
      status: 'done',
      dueDate: null,
      boardOrder: 'a',
      createdAt: '',
      updatedAt: '',
      doneAt: undefined as unknown as null,
      recurrence: 'none',
      reminderAt: null,
      reminderLead: null,
      tags: [],
      isFrog: false,
    } as Todo);

    await migrate();

    const todo = await repo.getTodo('t1');
    expect(todo?.doneAt).toBeTruthy();
    expect(typeof todo?.doneAt).toBe('string');
    const doneAtTime = new Date(todo!.doneAt!).getTime();
    const beforeTime = new Date(beforeMigration).getTime();
    expect(doneAtTime).toBeGreaterThanOrEqual(beforeTime - 5000);
  });

  it('adds default values for additive fields on todos missing them', async () => {
    const repo = new IndexedDbRepository();
    const { migrate } = createMigrator(repo);

    await repo.createTodo({
      id: 't1',
      projectId: null,
      title: 'todo without optional fields',
      description: '',
      status: 'todo',
      dueDate: null,
      boardOrder: 'a',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      doneAt: null,
      recurrence: 'none',
      reminderAt: null,
      reminderLead: null,
      tags: [],
      isFrog: false,
    });

    await migrate();

    const todo = await repo.getTodo('t1');
    expect(todo?.recurrence).toBe('none');
    expect(todo?.doneAt).toBe(null);
    expect(todo?.tags).toEqual([]);
    expect(todo?.isFrog).toBe(false);
  });
});