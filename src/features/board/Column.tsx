import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Project, SubStep, Todo, Status } from '../../domain/types';
import { parseQuickAdd } from '../../domain/quick-add';
import { todayIso } from '../../domain/time';
import { getActiveStore } from '../../store/storeInstance';
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
}

export function Column({
  status,
  title,
  todos,
  projects,
  subStepsByTodo,
  filterProjectId,
  onToggleFrog,
}: ColumnProps) {
  const store = getActiveStore();
  const createTodo = store((s) => s.createTodo);
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` });
  const [draft, setDraft] = useState('');

  const projectById = new Map(projects.map((p) => [p.id, p]));

  const handleAdd = async () => {
    const raw = draft.trim();
    if (raw.length === 0) return;
    const parsed = parseQuickAdd(raw, projects, todayIso());
    const title = parsed.title.length > 0 ? parsed.title : raw;
    await createTodo({
      projectId: parsed.projectId ?? filterProjectId,
      title,
      status,
      dueDate: parsed.dueDate,
      tags: parsed.tags,
    });
    setDraft('');
  };

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
          items={todos.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className={styles.list}>
            {todos.map((todo) => (
              <Card
                key={todo.id}
                todo={todo}
                project={todo.projectId ? projectById.get(todo.projectId) ?? null : null}
                subSteps={subStepsByTodo.get(todo.id) ?? []}
                onToggleFrog={onToggleFrog}
              />
            ))}
          </ul>
        </SortableContext>
      </div>

      <div className={styles.addRow}>
        <input
          type="text"
          className={styles.addInput}
          value={draft}
          placeholder="Add card…  (#tag @project !today)"
          aria-label={`Add card to ${title}`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleAdd();
            }
          }}
        />
      </div>
    </section>
  );
}
