import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createStore } from '../../store/store';
import { InMemoryRepository } from '../../storage/InMemoryRepository';
import { setActiveStore } from '../../store/storeInstance';
import { useReminderTicker } from './reminderTicker';

describe('useReminderTicker', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-10T12:00:00.000Z'));
    store = createStore({ repository: new InMemoryRepository() });
    setActiveStore(store);
    await store.getState().hydrate();
  });

  afterEach(() => {
    setActiveStore(null);
    vi.useRealTimers();
  });

  it('fires a toast when reminderAt <= now', async () => {
    await store.getState().createTodo({
      projectId: null,
      title: 'Call mom',
      dueDate: '2024-05-09',
      reminderLead: '1d',
    });
    const { result } = renderHook(() => useReminderTicker());
    await act(async () => {});
    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0]?.title).toBe('Call mom');
  });

  it('does not re-fire an already-seen reminder', async () => {
    await store.getState().createTodo({
      projectId: null,
      title: 'Seen',
      dueDate: '2024-05-09',
      reminderLead: '1d',
    });
    const { result, rerender } = renderHook(() => useReminderTicker());
    await act(async () => {});
    expect(result.current.toasts.length).toBe(1);
    act(() => {
      rerender();
    });
    expect(result.current.toasts.length).toBe(1);
  });

  it('dismiss clears reminderAt on the todo', async () => {
    const todo = await store.getState().createTodo({
      projectId: null,
      title: 'Dismiss me',
      dueDate: '2024-05-09',
      reminderLead: '1d',
    });
    const { result } = renderHook(() => useReminderTicker());
    await act(async () => {});
    expect(result.current.toasts.length).toBe(1);
    await act(async () => {
      await result.current.dismiss(todo.id);
    });
    expect(result.current.toasts.length).toBe(0);
    expect(store.getState().todos.find((t) => t.id === todo.id)?.reminderAt).toBeNull();
  });

  it('snooze pushes reminderAt ~10 minutes into the future', async () => {
    const todo = await store.getState().createTodo({
      projectId: null,
      title: 'Snooze me',
      dueDate: '2024-05-09',
      reminderLead: '1d',
    });
    const { result } = renderHook(() => useReminderTicker());
    await act(async () => {});
    await act(async () => {
      await result.current.snooze(todo.id);
    });
    const snoozed = new Date(store.getState().todos.find((t) => t.id === todo.id)?.reminderAt ?? '');
    expect(snoozed.getTime()).toBeGreaterThan(Date.now());
  });

  it('skips malformed reminders without throwing', async () => {
    const todo = await store.getState().createTodo({
      projectId: null,
      title: 'Bad',
    });
    await store.getState().updateTodo({ ...todo, reminderAt: 'not-a-date' });
    const { result } = renderHook(() => useReminderTicker());
    await act(async () => {});
    expect(result.current.toasts.length).toBe(0);
  });
});
