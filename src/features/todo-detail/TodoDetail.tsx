import { useEffect, useMemo, useRef, useState } from 'react';
import type { Recurrence, Todo } from '../../domain/types';
import {
  todoTitleSchema,
  descriptionSchema,
  recurrenceSchema,
  normalizeTags,
} from '../../domain/validation';
import {
  REMINDER_LEAD_ON_DUE,
  REMINDER_LEAD_1_DAY,
  REMINDER_LEAD_1_WEEK,
  REMINDER_LEAD_2_WEEKS,
} from '../../domain/reminders';
import { getActiveStore } from '../../store/storeInstance';
import { DatePicker } from '../../components/DatePicker';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import styles from './TodoDetail.module.css';

export const TITLE_SAVE_DEBOUNCE_MS = 300;

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'No repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const REMINDER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'No reminder' },
  { value: REMINDER_LEAD_ON_DUE, label: 'On due date' },
  { value: REMINDER_LEAD_1_DAY, label: '1 day before' },
  { value: REMINDER_LEAD_1_WEEK, label: '1 week before' },
  { value: REMINDER_LEAD_2_WEEKS, label: '2 weeks before' },
];

export interface TodoDetailProps {
  todoId: string;
  onClose: () => void;
}

export function TodoDetail({ todoId, onClose }: TodoDetailProps) {
  const store = getActiveStore();
  const todo = store((s) => s.todos.find((t) => t.id === todoId)) as Todo | undefined;
  const allTodos = store((s) => s.todos);
  const projects = store((s) => s.projects);
  const updateTodo = store((s) => s.updateTodo);
  const setTodoDueDate = store((s) => s.setTodoDueDate);
  const setTodoReminder = store((s) => s.setTodoReminder);
  const setTodoRecurrence = store((s) => s.setTodoRecurrence);
  const setTodoTags = store((s) => s.setTodoTags);
  const deleteTodo = store((s) => s.deleteTodo);

  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [title, setTitle] = useState(todo?.title ?? '');
  const [description, setDescription] = useState(todo?.description ?? '');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState('');

  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local fields in sync if the underlying todo changes identity.
  useEffect(() => {
    setTitle(todo?.title ?? '');
    setDescription(todo?.description ?? '');
    setTitleError(null);
    setDescriptionError(null);
  }, [todoId]);

  useEffect(() => {
    return () => {
      if (titleTimer.current) clearTimeout(titleTimer.current);
      if (descTimer.current) clearTimeout(descTimer.current);
    };
  }, []);

  const existingTags = useMemo(() => {
    const set = new Set<string>();
    for (const t of allTodos) for (const tag of t.tags) set.add(tag);
    return [...set].sort();
  }, [allTodos]);

  const tagSuggestions = useMemo(() => {
    const draft = tagDraft.trim().toLowerCase();
    if (draft.length === 0) return [];
    return existingTags
      .filter((t) => t.includes(draft) && !(todo?.tags ?? []).includes(t))
      .slice(0, 6);
  }, [tagDraft, existingTags, todo?.tags]);

  // Move focus into the dialog on open and return it to the trigger on close.
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  if (!todo) {
    return null;
  }

  const handleTitleChange = (next: string) => {
    setTitle(next);
    const result = todoTitleSchema.safeParse(next);
    if (!result.success) {
      setTitleError(result.error.issues[0]?.message ?? 'Title is required');
      if (titleTimer.current) clearTimeout(titleTimer.current);
      return;
    }
    setTitleError(null);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      // Read the freshest todo so a concurrent immediate save (project, due,
      // reminder, recurrence, tags) isn't clobbered by this stale closure.
      const current = store.getState().todos.find((t) => t.id === todoId);
      if (current) {
        void updateTodo({ ...current, title: result.data });
      }
    }, TITLE_SAVE_DEBOUNCE_MS);
  };

  const handleDescriptionChange = (next: string) => {
    setDescription(next);
    const result = descriptionSchema.safeParse(next);
    if (!result.success) {
      setDescriptionError(
        result.error.issues[0]?.message ?? 'Description is too long',
      );
      if (descTimer.current) clearTimeout(descTimer.current);
      return;
    }
    setDescriptionError(null);
    if (descTimer.current) clearTimeout(descTimer.current);
    descTimer.current = setTimeout(() => {
      const current = store.getState().todos.find((t) => t.id === todoId);
      if (current) {
        void updateTodo({ ...current, description: result.data });
      }
    }, TITLE_SAVE_DEBOUNCE_MS);
  };

  const addTag = (raw: string) => {
    const [normalized] = normalizeTags([raw]);
    if (!normalized) return;
    if (todo.tags.includes(normalized)) {
      setTagDraft('');
      return;
    }
    void setTodoTags(todo.id, [...todo.tags, normalized]);
    setTagDraft('');
  };

  const removeTag = (tag: string) => {
    void setTodoTags(
      todo.id,
      todo.tags.filter((t) => t !== tag),
    );
  };

  return (
    <>
      <div className={styles.overlay} role="presentation">
        <div
          ref={dialogRef}
          className={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-label="Todo details"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              onClose();
            }
          }}
        >
          <div className={styles.headerRow}>
            <h2 className={styles.heading}>Details</h2>
            <button
              type="button"
              className={styles.close}
              aria-label="Close details"
              onClick={onClose}
            >
              ×
            </button>
          </div>

        <label className={styles.field}>
          <span>Title</span>
          <input
            type="text"
            value={title}
            aria-label="Title"
            aria-invalid={titleError !== null}
            onChange={(e) => handleTitleChange(e.target.value)}
          />
          {titleError !== null && (
            <span className={styles.error} role="alert">
              {titleError}
            </span>
          )}
        </label>

        <label className={styles.field}>
          <span>Description</span>
          <textarea
            value={description}
            rows={4}
            aria-label="Description"
            aria-invalid={descriptionError !== null}
            onChange={(e) => handleDescriptionChange(e.target.value)}
          />
          {descriptionError !== null && (
            <span className={styles.error} role="alert">
              {descriptionError}
            </span>
          )}
        </label>

        <label className={styles.field}>
          <span>Project</span>
          <select
            value={todo.projectId ?? ''}
            aria-label="Project"
            onChange={(e) =>
              void updateTodo({
                ...todo,
                projectId: e.target.value === '' ? null : e.target.value,
              })
            }
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.field}>
          <span>Due date</span>
          <DatePicker
            value={todo.dueDate}
            onChange={(iso) => void setTodoDueDate(todo.id, iso)}
          />
        </div>

        <label className={styles.field}>
          <span>Reminder</span>
          <select
            value={todo.reminderLead ?? ''}
            aria-label="Reminder"
            onChange={(e) =>
              void setTodoReminder(todo.id, e.target.value === '' ? null : e.target.value)
            }
          >
            {REMINDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Repeat</span>
          <select
            value={todo.recurrence}
            aria-label="Repeat"
            onChange={(e) => {
              const parsed = recurrenceSchema.safeParse(e.target.value);
              if (parsed.success) {
                void setTodoRecurrence(todo.id, parsed.data);
              }
            }}
          >
            {RECURRENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.field}>
          <span>Tags</span>
          <ul className={styles.tagList}>
            {todo.tags.map((tag) => (
              <li key={tag} className={styles.tag}>
                #{tag}
                <button
                  type="button"
                  className={styles.tagRemove}
                  aria-label={`Remove tag ${tag}`}
                  onClick={() => removeTag(tag)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <input
            type="text"
            value={tagDraft}
            placeholder="Add tag"
            aria-label="Add tag"
            list="tag-suggestions"
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag(tagDraft);
              }
            }}
          />
          <datalist id="tag-suggestions">
            {tagSuggestions.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          {tagSuggestions.length > 0 && (
            <ul className={styles.suggestions}>
              {tagSuggestions.map((t) => (
                <li key={t}>
                  <button
                    type="button"
                    className={styles.suggestion}
                    onClick={() => addTag(t)}
                  >
                    #{t}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.delete}
            aria-label="Delete todo"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </button>
          <button type="button" className={styles.done} onClick={onClose}>
            Done
          </button>
        </div>
        </div>
      </div>
      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this todo?"
          destructive
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={async () => {
            try {
              await deleteTodo(todo.id);
            } catch {
              // keep the dialog open on failure so the user can retry
            } finally {
              setConfirmingDelete(false);
            }
            onClose();
          }}
          onCancel={() => setConfirmingDelete(false)}
        >
          This action cannot be undone.
        </ConfirmDialog>
      )}
    </>
  );
}
