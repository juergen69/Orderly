import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createStore } from '../../store/store';
import { InMemoryRepository } from '../../storage/InMemoryRepository';
import { setActiveStore } from '../../store/storeInstance';

describe('eat-the-frog rules', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(async () => {
    store = createStore({ repository: new InMemoryRepository() });
    setActiveStore(store);
    await store.getState().hydrate();
  });

  afterEach(() => setActiveStore(null));

  it('only one frog exists board-wide (new frog clears the previous)', async () => {
    const a = await store.getState().createTodo({ projectId: null, title: 'A' });
    const b = await store.getState().createTodo({ projectId: null, title: 'B' });

    await store.getState().toggleFrog(a.id);
    expect(store.getState().todos.find((t) => t.id === a.id)!.isFrog).toBe(true);

    await store.getState().toggleFrog(b.id);
    const frogs = store.getState().todos.filter((t) => t.isFrog);
    expect(frogs).toHaveLength(1);
    expect(frogs[0]!.id).toBe(b.id);
  });

  it('tapping the active frog clears it', async () => {
    const a = await store.getState().createTodo({ projectId: null, title: 'A' });
    await store.getState().toggleFrog(a.id);
    expect(store.getState().todos.find((t) => t.id === a.id)!.isFrog).toBe(true);
    await store.getState().toggleFrog(a.id);
    expect(store.getState().todos.find((t) => t.id === a.id)!.isFrog).toBe(false);
  });

  it('auto-clears the frog when moved to Done', async () => {
    const a = await store.getState().createTodo({ projectId: null, title: 'A' });
    await store.getState().toggleFrog(a.id);
    await store.getState().moveTodo(a.id, 'done', undefined, undefined);
    expect(store.getState().todos.find((t) => t.id === a.id)!.isFrog).toBe(false);
  });
});
