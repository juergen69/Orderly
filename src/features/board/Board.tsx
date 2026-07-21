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

const TIER_CYCLE = [5, 3, 1] as const;
const TIER_CAPACITY: Record<1 | 3 | 5, number> = {
  1: 1,
  3: 3,
  5: 5,
};

function isStatus(value: string): value is Status {
  return value === 'todo' || value === 'inProgress' || value === 'done';
}

function nextTodoTier(current: 1 | 3 | 5 | undefined, todos: Todo[]): 1 | 3 | 5 | null {
  const counts: Record<1 | 3 | 5, number> = { 1: 0, 3: 0, 5: 0 };
  for (const t of todos) {
    if (t.tier === 1 || t.tier === 3 || t.tier === 5) {
      counts[t.tier]++;
    }
  }

  if (current === undefined) {
    for (const t of TIER_CYCLE) {
      if (counts[t] < TIER_CAPACITY[t]) return t;
    }
    return null;
  }

  const currentIndex = TIER_CYCLE.indexOf(current);
  if (currentIndex + 1 < TIER_CYCLE.length) {
    return TIER_CYCLE[currentIndex + 1] as 1 | 3 | 5;
  }
  return null;
}

function allTiersFull(todos: Todo[]): boolean {
  const counts: Record<1 | 3 | 5, number> = { 1: 0, 3: 0, 5: 0 };
  for (const t of todos) {
    if (t.tier === 1 || t.tier === 3 || t.tier === 5) {
      counts[t.tier]++;
    }
  }
  return counts[1] >= TIER_CAPACITY[1] && counts[3] >= TIER_CAPACITY[3] && counts[5] >= TIER_CAPACITY[5];
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
  const focusMode = storeRef((s) => s.ui.focusMode);
  const setFocusMode = storeRef((s) => s.setFocusMode);
  const searchQuery = storeRef((s) => s.ui.searchQuery);
  const selectedTags = storeRef((s) => s.ui.selectedTags);
  const moveTodo = storeRef((s) => s.moveTodo);
  const toggleFrog = storeRef((s) => s.toggleFrog);
  const createTodo = storeRef((s) => s.createTodo);
  const setTodoTier = storeRef((s) => s.setTodoTier);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerStatus, setComposerStatus] = useState<Status>('todo');
  const [composerDraft, setComposerDraft] = useState('');
  const [composerError, setComposerError] = useState<string | null>(null);
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
    if (focusMode) {
      result = result.filter((t) => t.isFrog || (t.tier === 1 || t.tier === 3 || t.tier === 5));
    }
    return result;
  }, [allTodos, filterProjectId, showAllRecurring, focusMode, searchQuery, selectedTags]);

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

  const tierDisabled = useMemo(() => allTiersFull(filteredTodos), [filteredTodos]);

  const handleCycleTier = useCallback(
    (id: string) => {
      const todo = filteredTodos.find((t) => t.id === id);
      if (!todo) return;
      const next = nextTodoTier(todo.tier, filteredTodos);
      if (next === null && todo.tier === undefined) return;
      void setTodoTier(id, next);
    },
    [filteredTodos, setTodoTier, focusMode],
  );

  useEffect(() => {
    if (composerOpen) {
      composerRef.current?.focus();
      setComposerError(null);
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
    try {
      await createTodo({
        title,
        status: composerStatus,
        projectId: parsed.projectId ?? filterProjectId,
        dueDate: parsed.dueDate,
        tags: parsed.tags,
      });
      setComposerDraft('');
      setComposerError(null);
      setComposerOpen(false);
    } catch (error) {
      setComposerError(error instanceof Error ? error.message : 'Failed to add card');
    }
  }, [composerDraft, projects, composerStatus, createTodo, filterProjectId]);

  return (
    <div className={styles.boardWrapper}>
      <div className={styles.toolbar}>
        <RecurringFilter />
        <button
          type="button"
          className={styles.focusModePill}
          data-active={focusMode || undefined}
          onClick={() => setFocusMode(!focusMode)}
          aria-pressed={focusMode}
        >
          🎯 Focus mode
        </button>
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
              onCycleTier={handleCycleTier}
              tierDisabled={tierDisabled}
              onOpenTodo={onOpenTodo}
            />
          ))}
        </div>
        <div className={styles.legend} aria-label="Legend">
          <span className={styles.legendItem} data-tier="1">
            <span className={styles.legendIcon} aria-hidden="true">🔥</span> 1 big task
          </span>
          <span className={styles.legendItem} data-tier="3">
            <span className={styles.legendIcon} aria-hidden="true">⚡</span> 3 medium tasks
          </span>
          <span className={styles.legendItem} data-tier="5">
            <span className={styles.legendIcon} aria-hidden="true">💧</span> 5 small tasks
          </span>
          <span className={styles.legendItem} data-frog>
            <span className={styles.legendIcon} aria-hidden="true">🐸</span> Eat the frog (most dreaded — do it first)
          </span>
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
              {composerError !== null && (
                <p className={styles.composerError} role="alert">
                  {composerError}
                </p>
              )}
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
