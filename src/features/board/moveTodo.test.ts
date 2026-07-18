import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { createStore } from '../../store/store';
import { InMemoryRepository } from '../../storage/InMemoryRepository';
import { setActiveStore } from '../../store/storeInstance';

describe('board moveTodo semantics', () => {
  let store: ReturnType<typeof createStore>;
  let repo: InMemoryRepository;

  beforeEach(async () => {
    repo = new InMemoryRepository();
    store = createStore({ repository: repo });
    setActiveStore(store);
    await store.getState().hydrate();
  });

  afterEach(() => {
    setActiveStore(null);
    vi.restoreAllMocks();
  });

  it('writes exactly one record when moving/reordering a card', async () => {
    const a = await store.getState().createTodo({ projectId: null, title: 'A', status: 'todo' });
    const b = await store.getState().createTodo({ projectId: null, title: 'B', status: 'todo' });
    await store.getState().createTodo({ projectId: null, title: 'C', status: 'todo' });

    const spy = vi.spyOn(repo, 'updateTodo');
    // Move A to sit between B and C (single fractional write).
    await store.getState().moveTodo(a.id, 'todo', b.id, undefined);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0].id).toBe(a.id);
  });

  it('clears the frog flag when a card is moved to done', async () => {
    const todo = await store
      .getState()
      .createTodo({ projectId: null, title: 'Frog', status: 'todo', isFrog: true });
    expect(store.getState().todos[0]!.isFrog).toBe(true);

    await store.getState().moveTodo(todo.id, 'done', undefined, undefined);

    const moved = store.getState().todos.find((t) => t.id === todo.id)!;
    expect(moved.status).toBe('done');
    expect(moved.isFrog).toBe(false);
    expect(moved.doneAt).not.toBeNull();
  });

  it('moving across columns updates status with a single write', async () => {
    const todo = await store
      .getState()
      .createTodo({ projectId: null, title: 'Move me', status: 'todo' });
    const spy = vi.spyOn(repo, 'updateTodo');

    await store.getState().moveTodo(todo.id, 'inProgress', undefined, undefined);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(store.getState().todos[0]!.status).toBe('inProgress');
  });
});
