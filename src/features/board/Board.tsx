import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
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
import { parseQuickAdd } from '../../domain/quick-add';
import { todayIso } from '../../domain/time';
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

function isEditableElement(element: Element | null): boolean {
  if (!element) return false;
  const tag = element.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return element instanceof HTMLElement && element.isContentEditable;
}

export function Board({ filterProjectId, onOpenTodo }: BoardProps) {
  const storeRef = getActiveStore();
  const allTodos = storeRef((s) => s.todos);
  const projects = storeRef((s) => s.projects);
  const subSteps = storeRef((s) => s.subSteps);
  const showAllRecurring = storeRef((s) => s.ui.showAllRecurring);
  const searchQuery = storeRef((s) => s.ui.searchQuery);
  const selectedTags = storeRef((s) => s.ui.selectedTags);
  const moveTodo = storeRef((s) => s.moveTodo);
  const toggleFrog = storeRef((s) => s.toggleFrog);
  const createTodo = storeRef((s) => s.createTodo);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerStatus, setComposerStatus] = useState<Status>('todo');
  const [composerDraft, setComposerDraft] = useState('');
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (composerOpen) {
      composerRef.current?.focus();
    }
  }, [composerOpen]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        return;
      }
      if (event.shiftKey && key === 'a' && !composerOpen && !isEditableElement(document.activeElement)) {
        event.preventDefault();
        setComposerOpen(true);
        setComposerStatus('todo');
        return;
      }
      if (key === 'escape' && composerOpen) {
        event.preventDefault();
        setComposerOpen(false);
        return;
      }
      if (key === 'tab' && composerOpen && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        const current = document.activeElement;
        if (event.shiftKey && current === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && current === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [composerOpen]);

  const handleComposerSubmit = useCallback(async () => {
    const raw = composerDraft.trim();
    if (raw.length === 0) return;
    const parsed = parseQuickAdd(raw, projects, todayIso());
    const title = parsed.title.length > 0 ? parsed.title : raw;
    await createTodo({
      title,
      status: composerStatus,
      projectId: parsed.projectId ?? filterProjectId,
      dueDate: parsed.dueDate,
      tags: parsed.tags,
    });
    setComposerDraft('');
    setComposerOpen(false);
  }, [composerDraft, projects, composerStatus, createTodo, filterProjectId]);

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
      <button
        type="button"
        className={styles.fab}
        aria-label="Add card"
        aria-haspopup="dialog"
        onClick={() => setComposerOpen(true)}
      >
        +
      </button>
      {composerOpen ? (
        <div
          className={styles.sheetBackdrop}
          role="presentation"
          onClick={() => setComposerOpen(false)}
        >
          <div
            ref={dialogRef}
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label="Add card"
            onClick={(e) => e.stopPropagation()}
          >
            <header className={styles.sheetHeader}>
              <span className={styles.sheetTitle}>New card</span>
              <button
                type="button"
                className={styles.sheetClose}
                aria-label="Close add card"
                onClick={() => setComposerOpen(false)}
              >
                ×
              </button>
            </header>
            <div className={styles.sheetBody}>
              <div className={styles.sheetFilters}>
                {BOARD_COLUMNS.map((col) => (
                  <button
                    key={col.status}
                    type="button"
                    className={styles.statusPill}
                    data-active={composerStatus === col.status || undefined}
                    onClick={() => setComposerStatus(col.status)}
                  >
                    {col.title}
                  </button>
                ))}
              </div>
              <p className={styles.hint}>Use #tag @project !date to target cards faster.</p>
              <label className={styles.sheetLabel}>
                <span>Details</span>
                <textarea
                  ref={composerRef}
                  className={styles.sheetInput}
                  placeholder="Add card…"
                  value={composerDraft}
                  onChange={(e) => setComposerDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleComposerSubmit();
                    }
                  }}
                />
              </label>
            </div>
            <footer className={styles.sheetFooter}>
              <button
                type="button"
                className={styles.sheetCancel}
                onClick={() => setComposerOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.sheetSubmit}
                onClick={() => void handleComposerSubmit()}
              >
                Add card
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
