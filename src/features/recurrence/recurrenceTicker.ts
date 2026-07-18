import { useCallback, useEffect } from 'react';
import type { Todo } from '../../domain/types';
import { newId } from '../../domain/ids';
import { nowIso, todayIso } from '../../domain/time';
import { rollForward } from '../../domain/recurrence';
import { first } from '../../domain/ordering';
import { getActiveStore } from '../../store/storeInstance';

export const RECURRENCE_INTERVAL_MS = 60_000;

// Re-entrancy guard: a `runTick` invocation may be triggered both by the
// mount-time effect and by an explicit call (e.g. in tests). Because the
// spawn work is asynchronous, two invocations can observe the same overdue
// todo before either has demoted it. This flag and the per-todo `processing`
// set ensure each overdue todo is advanced exactly once.
let running = false;
const processing = new Set<string>();

function parseDateSafe(value: string | null): Date | null {
  if (value === null || value === '') return null;
  const parts = value.split('-');
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function runRecurrenceTick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const store = getActiveStore();
    const state = store.getState();
    const today = todayIso();
    const todayDate = parseDateSafe(today);
    if (todayDate === null) return;

    const { todos, subSteps } = state;
    const jobs: Promise<void>[] = [];

    for (const todo of todos) {
      if (todo.recurrence === 'none') continue;
      const dueDate = todo.dueDate;
      if (dueDate === null) continue;
      const due = parseDateSafe(dueDate);
      if (due === null) continue;
      if (due.getTime() >= todayDate.getTime()) continue;
      if (processing.has(todo.id)) continue;
      processing.add(todo.id);

      const nextDue = rollForward(dueDate, todo.recurrence, today);
      const successorId = newId();
      const now = nowIso();

      const successor: Todo = {
        id: successorId,
        projectId: todo.projectId,
        title: todo.title,
        description: todo.description,
        status: 'todo',
        dueDate: nextDue,
        boardOrder: first(),
        createdAt: now,
        updatedAt: now,
        doneAt: null,
        recurrence: todo.recurrence,
        reminderAt: null,
        reminderLead: todo.reminderLead,
        tags: [...todo.tags],
        isFrog: false,
      };

      const originalSubSteps = subSteps
        .filter((s) => s.todoId === todo.id)
        .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));

      // Demote the original synchronously so re-runs never re-process it.
      store.setState((s) => ({
        todos: s.todos.map((t) =>
          t.id === todo.id ? { ...t, recurrence: 'none' } : t,
        ),
      }));

      const finalize = async () => {
        try {
          const created = await state.createTodo(successor);
          for (const sub of originalSubSteps) {
            await state.createSubStep(created.id, sub.title);
          }
          const latest = store.getState().todos.find((t) => t.id === todo.id);
          if (latest) {
            await state.updateTodo({ ...latest, recurrence: 'none' });
          }
        } finally {
          processing.delete(todo.id);
        }
      };
      jobs.push(finalize());
    }

    await Promise.all(jobs);
  } finally {
    running = false;
  }
}

export function useRecurrenceTicker(): { runTick: () => Promise<void> } {
  const runTick = useCallback(() => runRecurrenceTick(), []);

  useEffect(() => {
    void runRecurrenceTick();
    const timer = setInterval(() => void runRecurrenceTick(), RECURRENCE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return { runTick };
}
