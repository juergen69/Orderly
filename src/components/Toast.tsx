import { useEffect } from 'react';
import styles from './Toast.module.css';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  actions?: ToastAction[];
}

export function ToastHost({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <section className={styles.host} aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </section>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 8000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className={styles.toast} role="alert">
      <span className={styles.message}>{toast.message}</span>
      <div className={styles.actions}>
        {toast.actions?.map((action) => (
          <button
            key={action.label}
            type="button"
            className={styles.action}
            onClick={() => {
              action.onClick();
              onDismiss(toast.id);
            }}
          >
            {action.label}
          </button>
        ))}
        <button
          type="button"
          className={styles.close}
          aria-label="Dismiss notification"
          onClick={() => onDismiss(toast.id)}
        >
          ×
        </button>
      </div>
    </div>
  );
}
