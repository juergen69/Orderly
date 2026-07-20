import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Project, SubStep, Todo, Status } from '../../domain/types';
import { selectTodosByStatus } from '../../store/selectors';
import { filterRecurringVisible } from '../../domain/recurringVisibility';
import { getActiveStore } from '../../store/storeInstance';
import { BOARD_COLUMNS } from './boardMeta';
import { Column } from './Column';
import { RecurringFilter } from '../recurrence/RecurringFilter';
import styles from './Board.module.css';

const COLUMN_PREFIX = 'column:';

function isStatus(value: string): value is Status {
  return value === 'todo' || value === 'inProgress' || value === 'done';
}

export interface BoardProps {
  /** Active project filter; null shows all projects. */
  filterProjectId: string | null;
  onOpenTodo?: (id: string) => void;
}

export function Board({ filterProjectId, onOpenTodo }: BoardProps) {
  const store = getActiveStore();
  const allTodos = store((s) => s.todos);
  const projects = store((s) => s.projects);
  const subSteps = store((s) => s.subSteps);
  const showAllRecurring = store((s) => s.ui.showAllRecurring);
  const searchQuery = store((s) => s.ui.searchQuery);
  const selectedTags = store((s) => s.ui.selectedTags);
  const moveTodo = store((s) => s.moveTodo);
  const toggleFrog = store((s) => s.toggleFrog);

  const [activeId, setActiveId] = useState<string | null>(null);

  const filteredTodos = useMemo(() => {
    let result = filterRecurringVisible(allTodos, showAllRecurring);
    if (filterProjectId !== null) {
      result = result.filter((t) => t.projectId === filterProjectId);
    }
    const query = searchQuery.trim().toLowerCase();
    if (query.length > 0) {
      result = result.filter((t) =>
        `${t.title} ${t.description}`.toLowerCase().includes(query),
      );
    }
    if (selectedTags.length > 0) {
      result = result.filter((t) => selectedTags.every((tag) => t.tags.includes(tag)));
    }
    return result;
  }, [allTodos, filterProjectId, showAllRecurring, searchQuery, selectedTags]);

  const todosByStatus = useMemo(() => {
    const map = new Map<Status, Todo[]>();
    for (const col of BOARD_COLUMNS) {
      map.set(col.status, selectTodosByStatus(filteredTodos, col.status));
    }
    return map;
  }, [filteredTodos]);

  const subStepsByTodo = useMemo(() => {
    const map = new Map<string, SubStep[]>();
    for (const sub of subSteps) {
      const list = map.get(sub.todoId);
      if (list) list.push(sub);
      else map.set(sub.todoId, [sub]);
    }
    return map;
  }, [subSteps]);

  const projectById = useMemo(
    () => new Map<string, Project>(projects.map((p) => [p.id, p])),
    [projects],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragCancel = () => setActiveId(null);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    // Cancel-on-drop-outside: no droppable target.
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const dragged = allTodos.find((t) => t.id === activeIdStr);
    if (!dragged) return;

    // Resolve the destination column.
    let targetStatus: Status;
    if (overIdStr.startsWith(COLUMN_PREFIX)) {
      const raw = overIdStr.slice(COLUMN_PREFIX.length);
      if (!isStatus(raw)) return;
      targetStatus = raw;
    } else {
      const overTodo = allTodos.find((t) => t.id === overIdStr);
      if (!overTodo) return;
      targetStatus = overTodo.status;
    }

    // Ordered destination column without the dragged card.
    const columnTodos = (todosByStatus.get(targetStatus) ?? []).filter(
      (t) => t.id !== activeIdStr,
    );

    let insertIndex: number;
    if (overIdStr.startsWith(COLUMN_PREFIX)) {
      // Dropped on the column body: append to the end.
      insertIndex = columnTodos.length;
    } else {
      const overIndex = columnTodos.findIndex((t) => t.id === overIdStr);
      insertIndex = overIndex === -1 ? columnTodos.length : overIndex;
    }

    const before = columnTodos[insertIndex - 1];
    const after = columnTodos[insertIndex];

    void moveTodo(activeIdStr, targetStatus, before?.id, after?.id);
  };

  const activeTodo = activeId ? allTodos.find((t) => t.id === activeId) ?? null : null;

  return (
    <div className={styles.boardWrapper}>
      <div className={styles.toolbar}>
        <RecurringFilter />
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className={styles.board}>
          {BOARD_COLUMNS.map((col) => (
            <Column
              key={col.status}
              status={col.status}
              title={col.title}
              todos={todosByStatus.get(col.status) ?? []}
              projects={projects}
              subStepsByTodo={subStepsByTodo}
              filterProjectId={filterProjectId}
              onToggleFrog={toggleFrog}
              onOpenTodo={onOpenTodo}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTodo ? (
            <div className={styles.overlayCard}>
              <span
                className={styles.overlayDot}
                style={{
                  backgroundColor:
                    activeTodo.projectId && projectById.get(activeTodo.projectId)
                      ? projectById.get(activeTodo.projectId)!.color
                      : 'var(--color-border)',
                }}
                aria-hidden="true"
              />
              {activeTodo.title.trim() || '(untitled)'}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
