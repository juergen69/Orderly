import { useMemo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Project, SubStep, Todo } from '../../domain/types';
import { truncate } from '../../domain/truncation';
import { progress } from '../../domain/progress';
import { advance } from '../../domain/recurrence';
import { isBeforeToday } from '../../domain/time';
import { Linkify } from '../../components/Linkify';
import { SubSteps } from './SubSteps';
import styles from './Card.module.css';

const RECURRENCE_LABEL: Record<Todo['recurrence'], string> = {
  none: '',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export interface CardProps {
  todo: Todo;
  project: Project | null;
  subSteps: SubStep[];
  onToggleFrog: (id: string) => void;
}

export function Card({ todo, project, subSteps, onToggleFrog }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id });
  const [expanded, setExpanded] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const prog = useMemo(() => progress(subSteps), [subSteps]);

  const recurrenceLabel = RECURRENCE_LABEL[todo.recurrence];
  const overdue =
    todo.dueDate !== null && todo.status !== 'done' && isBeforeToday(todo.dueDate);
  const nextOccurrence =
    todo.recurrence !== 'none' && todo.dueDate !== null
      ? advance(todo.dueDate, todo.recurrence)
      : null;

  const snippet = todo.description.trim().length > 0 ? truncate(todo.description) : '';

  return (
    <li
      ref={setNodeRef}
      style={{
        ...style,
        borderInlineStartColor: project ? project.color : 'var(--color-border)',
      }}
      className={styles.card}
      data-frog={todo.isFrog || undefined}
    >
      <div className={styles.header} {...attributes} {...listeners}>
        <div className={styles.meta}>
          {project && (
            <span className={styles.project}>
              <span
                className={styles.projectDot}
                style={{ backgroundColor: project.color }}
                aria-hidden="true"
              />
              {project.name}
            </span>
          )}
          {recurrenceLabel && (
            <span className={styles.badge} title={`Repeats ${recurrenceLabel.toLowerCase()}`}>
              {recurrenceLabel}
            </span>
          )}
        </div>
        <button
          type="button"
          className={styles.frog}
          data-active={todo.isFrog || undefined}
          aria-pressed={todo.isFrog}
          aria-label={todo.isFrog ? 'Unmark as frog' : 'Mark as frog'}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFrog(todo.id);
          }}
        >
          🐸
        </button>
      </div>

      <p className={styles.title}>{todo.title}</p>

      {todo.dueDate !== null && (
        <p className={overdue ? styles.dueOverdue : styles.due}>
          {overdue ? 'Overdue: ' : 'Due: '}
          {todo.dueDate}
          {nextOccurrence !== null && (
            <span className={styles.next}> · next {nextOccurrence}</span>
          )}
        </p>
      )}

      {snippet && (
        <p className={styles.snippet}>
          <Linkify text={snippet} />
        </p>
      )}

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.progress}
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          Sub-steps {prog.label}
        </button>
      </div>

      {expanded && <SubSteps todoId={todo.id} />}
    </li>
  );
}
