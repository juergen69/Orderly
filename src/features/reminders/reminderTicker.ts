import { useCallback, useEffect, useRef, useState } from 'react';
import type { Todo } from '../../domain/types';
import { getActiveStore } from '../../store/storeInstance';

export const REMINDER_INTERVAL_MS = 30_000;
const SNOOZE_MINUTES = 10;

export interface ReminderToast extends Todo {}

function parseIsoSafe(value: string | null): Date | null {
  if (value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function useReminderTicker(): {
  toasts: Todo[];
  dismiss: (id: string) => Promise<void>;
  snooze: (id: string) => Promise<void>;
} {
  const store = getActiveStore();
  const todos = store((s) => s.todos);
  const updateTodo = store((s) => s.updateTodo);
  const [firing, setFiring] = useState<Todo[]>([]);
  const seen = useRef<Set<string>>(new Set());

  const tick = useCallback(() => {
    const now = new Date();
    const triggered: Todo[] = [];
    for (const todo of todos) {
      const due = parseIsoSafe(todo.reminderAt);
      if (due === null) continue;
      if (due.getTime() <= now.getTime() && !seen.current.has(todo.id)) {
        seen.current.add(todo.id);
        triggered.push(todo);
      }
    }
    if (triggered.length > 0) {
      setFiring((prev) => [...prev, ...triggered]);
    }
  }, [todos]);

  useEffect(() => {
    tick();
    const timer = setInterval(tick, REMINDER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [tick]);

  const dismiss = useCallback(
    async (id: string) => {
      setFiring((prev) => prev.filter((t) => t.id !== id));
      const todo = todos.find((t) => t.id === id);
      if (todo) {
        await updateTodo({ ...todo, reminderAt: null });
      }
    },
    [todos, updateTodo],
  );

  const snooze = useCallback(
    async (id: string) => {
      setFiring((prev) => prev.filter((t) => t.id !== id));
      const todo = todos.find((t) => t.id === id);
      if (todo) {
        const snoozed = new Date(Date.now() + SNOOZE_MINUTES * 60_000);
        await updateTodo({ ...todo, reminderAt: snoozed.toISOString() });
      }
    },
    [todos, updateTodo],
  );

  return { toasts: firing, dismiss, snooze };
}
