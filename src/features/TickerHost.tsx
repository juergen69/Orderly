import { useEffect } from 'react';
import { store } from '../store/storeInstance';
import { useReminderTicker } from './reminders/reminderTicker';
import { useRecurrenceTicker } from './recurrence/recurrenceTicker';
import { ToastHost } from '../components/Toast';
import type { Todo } from '../domain/types';

export function TickerHost() {
  const hydrate = store((s) => s.hydrate);
  useRecurrenceTicker();
  const { toasts, dismiss, snooze } = useReminderTicker();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const mapped = toasts.map((todo: Todo) => ({
    id: todo.id,
    message: `Reminder: ${todo.title}`,
    actions: [
      {
        label: 'Snooze 10m',
        onClick: () => snooze(todo.id),
      },
    ],
  }));

  return <ToastHost toasts={mapped} onDismiss={dismiss} />;
}
