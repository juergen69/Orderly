import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createStore } from '../../store/store';
import { InMemoryRepository } from '../../storage/InMemoryRepository';
import { setActiveStore } from '../../store/storeInstance';
import { useRecurrenceTicker } from './recurrenceTicker';

describe('useRecurrenceTicker', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(async () => {
    store = createStore({ repository: new InMemoryRepository() });
    setActiveStore(store);
    await store.getState().hydrate();
  });

  afterEach(() => {
    setActiveStore(null);
  });

  it('spawns exactly one frog-free successor and demotes the original to none', async () => {
    const todo = await store.getState().createTodo({
      projectId: null,
      title: 'Water plants',
      dueDate: '2020-05-01',
      recurrence: 'weekly',
      isFrog: true,
      status: 'done',
    });
    const { result } = renderHook(() => useRecurrenceTicker());
    await act(async () => {
      await result.current.runTick();
    });

    const todos = store.getState().todos;
    expect(todos).toHaveLength(2);

    const original = todos.find((t) => t.id === todo.id);
    const successor = todos.find((t) => t.id !== todo.id);
    expect(original?.recurrence).toBe('none');
    expect(successor?.title).toBe('Water plants');
    expect(successor?.isFrog).toBe(false);
    expect(successor?.status).toBe('todo');
    expect(successor?.dueDate).not.toBe('2020-05-01');
    expect(new Date(successor?.dueDate ?? '') >= new Date()).toBe(true);
    expect(successor?.projectId).toBeNull();
  });

  it('copies the original sub-steps into the successor as fresh incomplete copies', async () => {
    const todo = await store.getState().createTodo({
      projectId: null,
      title: 'Report',
      dueDate: '2020-04-01',
      recurrence: 'monthly',
    });
    await store.getState().createSubStep(todo.id, 'draft');
    await store.getState().createSubStep(todo.id, 'review');
    await store.getState().toggleSubStep(
      store.getState().subSteps.find((s) => s.todoId === todo.id)!.id,
    );

    const { result } = renderHook(() => useRecurrenceTicker());
    await act(async () => {
      await result.current.runTick();
    });

    const successor = store.getState().todos.find((t) => t.id !== todo.id)!;
    const copied = store
      .getState()
      .subSteps.filter((s) => s.todoId === successor.id)
      .sort((a, b) => (a.order < b.order ? -1 : 1));
    expect(copied).toHaveLength(2);
    expect(copied.map((s) => s.title)).toEqual(['draft', 'review']);
    expect(copied.every((s) => s.done === false)).toBe(true);
    expect(copied.every((s) => s.id !== todo.id)).toBe(true);

    const originalSubs = store.getState().subSteps.filter((s) => s.todoId === todo.id);
    expect(originalSubs).toHaveLength(2);
    expect(originalSubs.some((s) => s.done === true)).toBe(true);
  });

  it('leaves non-overdue recurring todos untouched', async () => {
    await store.getState().createTodo({
      projectId: null,
      title: 'Future',
      dueDate: '2099-06-01',
      recurrence: 'weekly',
    });
    const { result } = renderHook(() => useRecurrenceTicker());
    await act(async () => {
      await result.current.runTick();
    });
    expect(store.getState().todos).toHaveLength(1);
  });
});
