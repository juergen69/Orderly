import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from '../../store/store';
import { InMemoryRepository } from '../../storage/InMemoryRepository';
import { setActiveStore } from '../../store/storeInstance';
import { downloadJson, isOversize, ImportExport } from './ImportExport';
import type { ImportPayload } from '../../domain/validation';

function makePayload(): ImportPayload {
  return {
    schemaVersion: 1,
    projects: [
      {
        id: 'p1',
        name: 'Imported',
        order: 'm',
        boardOrder: 'm',
        color: '#22d3ee',
        createdAt: '',
        updatedAt: '',
      },
    ],
    todos: [
      {
        id: 't1',
        projectId: 'p1',
        title: 'Imported todo',
        description: '',
        status: 'todo',
        dueDate: null,
        boardOrder: 'm',
        createdAt: '',
        updatedAt: '',
        doneAt: null,
        recurrence: 'none',
        reminderAt: null,
        reminderLead: null,
        tags: [],
        isFrog: false,
      },
    ],
    subSteps: [],
  };
}

describe('downloadJson', () => {
  it('creates an object URL and triggers a download', () => {
    const create = vi.fn(() => 'blob:url');
    const revoke = vi.fn();
    const click = vi.fn();
    (URL as unknown as { createObjectURL: typeof URL.createObjectURL }).createObjectURL =
      create;
    (URL as unknown as { revokeObjectURL: typeof URL.revokeObjectURL }).revokeObjectURL =
      revoke;
    const origCreate = document.createElement.bind(document);
    const anchor = origCreate('a');
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        anchor.click = click;
        return anchor;
      }
      return origCreate(tag);
    });

    const ok = downloadJson('out.json', '{"a":1}');
    expect(ok).toBe(true);
    expect(create).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:url');
    expect(anchor.getAttribute('download')).toBe('out.json');
  });
});

describe('isOversize', () => {
  it('flags files above the cap', () => {
    expect(isOversize(6 * 1024 * 1024)).toBe(true);
    expect(isOversize(1024)).toBe(false);
  });
});

describe('ImportExport', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(async () => {
    store = createStore({ repository: new InMemoryRepository() });
    setActiveStore(store);
    await store.getState().hydrate();
    await store.getState().createTodo({ projectId: null, title: 'Existing' });
  });

  afterEach(() => {
    cleanup();
    setActiveStore(null);
  });

  it('export downloads JSON excluding focus areas', async () => {
    const spy = vi.fn(() => 'blob:url');
    (URL as unknown as { createObjectURL: typeof URL.createObjectURL }).createObjectURL =
      spy;
    (URL as unknown as { revokeObjectURL: typeof URL.revokeObjectURL }).revokeObjectURL =
      vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ImportExport />);
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    // exportAll is async; wait a tick.
    await new Promise((r) => setTimeout(r, 10));
    expect(spy).toHaveBeenCalled();
  });

  it('imports and replaces data after confirmation', async () => {
    render(<ImportExport />);
    const file = new File([JSON.stringify(makePayload())], 'data.json', {
      type: 'application/json',
    });
    await userEvent.upload(screen.getByLabelText('Import JSON file'), file);

    // Confirmation dialog appears.
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Import' }));

    const state = store.getState();
    expect(state.projects.map((p) => p.name)).toEqual(['Imported']);
    expect(state.todos.map((t) => t.title)).toEqual(['Imported todo']);
  });

  it('rejects version mismatch with a specific message', async () => {
    render(<ImportExport />);
    const bad = new File([JSON.stringify({ schemaVersion: 2, projects: [], todos: [], subSteps: [] })], 'bad.json', {
      type: 'application/json',
    });
    await userEvent.upload(screen.getByLabelText('Import JSON file'), bad);

    expect(await screen.findByRole('alert')).toHaveTextContent(/schema version/i);
    // Data untouched.
    expect(store.getState().todos.map((t) => t.title)).toEqual(['Existing']);
  });

  it('rejects a malformed payload with a generic message and keeps data', async () => {
    render(<ImportExport />);
    const bad = new File([JSON.stringify({ schemaVersion: 1, projects: 'nope' })], 'bad.json', {
      type: 'application/json',
    });
    await userEvent.upload(screen.getByLabelText('Import JSON file'), bad);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Import failed/i);
    expect(store.getState().todos.map((t) => t.title)).toEqual(['Existing']);
  });

  it('rejects an oversize file before reading it', async () => {
    render(<ImportExport />);
    const valid = makePayload();
    const file = new File([JSON.stringify(valid)], 'big.json', {
      type: 'application/json',
    });
    // Force a size above the 5MB cap (jsdom derives size from content length).
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });

    await userEvent.upload(screen.getByLabelText('Import JSON file'), file);
    expect(await screen.findByRole('alert')).toHaveTextContent(/too large/i);
    // Nothing imported.
    expect(store.getState().todos.map((t) => t.title)).toEqual(['Existing']);
  });
});
