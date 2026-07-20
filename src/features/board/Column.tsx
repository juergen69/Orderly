import { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Project, SubStep, Todo, Status } from '../../domain/types';
import { selectArchivedSplit } from '../../store/selectors';
import { Card } from './Card';
import styles from './Column.module.css';

export interface ColumnProps {
  status: Status;
  title: string;
  todos: Todo[];
  projects: Project[];
  subStepsByTodo: Map<string, SubStep[]>;
  /** Active project filter (null = all). New cards default to this project. */
  filterProjectId: string | null;
  onToggleFrog: (id: string) => void;
  onOpenTodo?: (id: string) => void;
}

export function Column({
  status,
  title,
  todos,
  projects,
  subStepsByTodo,
  filterProjectId,
  onToggleFrog,
  onOpenTodo,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` });
  const [showArchived, setShowArchived] = useState(false);

  const projectById = new Map(projects.map((p) => [p.id, p]));

  // For the Done column, recent vs. archived split (archived = done ≥3 days ago).
  const archivedSplit =
    status === 'done' ? selectArchivedSplit(todos, todayIso()) : null;
  const visibleTodos = archivedSplit
    ? archivedSplit.recent
    : todos;
  const hiddenArchived = archivedSplit ? archivedSplit.archived : [];

  const renderCard = (todo: Todo) => (
    <Card
      key={todo.id}
      todo={todo}
      project={todo.projectId ? projectById.get(todo.projectId) ?? null : null}
      subSteps={subStepsByTodo.get(todo.id) ?? []}
      onToggleFrog={onToggleFrog}
      onOpenTodo={onOpenTodo}
    />
  );

  return (
    <section className={styles.column} aria-label={title}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <span className={styles.count} aria-label={`${todos.length} cards`}>
          {todos.length}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={styles.dropZone}
        data-over={isOver || undefined}
      >
        <SortableContext
          items={visibleTodos.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className={styles.list}>
            {visibleTodos.map(renderCard)}
          </ul>
        </SortableContext>

        {hiddenArchived.length > 0 && (
          <div className={styles.archiveToggle}>
            <button
              type="button"
              className={styles.archiveButton}
              aria-expanded={showArchived}
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived
                ? 'Hide'
                : `+ ${hiddenArchived.length} archived item${hiddenArchived.length === 1 ? '' : 's'}`}
            </button>
            {showArchived && (
              <ul className={styles.archivedList} data-archived="true">
                {hiddenArchived.map((todo) => (
                  <li key={todo.id} className={styles.archivedItem}>
                    {renderCard(todo)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

    </section>
  );
}
