import { useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  pointerWithin,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { Todo } from '../../domain/types';
import { parseQuickAdd } from '../../domain/quick-add';
import { todayIso } from '../../domain/time';
import { getActiveStore } from '../../store/storeInstance';
import styles from './FocusPanel.module.css';

// 1-3-5 layout: slot 0 is large, 1-3 medium, 4-8 small.
const SLOT_SIZES: ('large' | 'medium' | 'small')[] = [
  'large',
  'medium',
  'medium',
  'medium',
  'small',
  'small',
  'small',
  'small',
  'small',
];

const LIST_DROPPABLE = 'focus-list';

export function FocusPanel({ onOpenTodo }: { onOpenTodo?: (id: string) => void }) {
  const store = getActiveStore();
  const todos = store((s) => s.todos);
  const projects = store((s) => s.projects);
  const focusSlots = store((s) => s.ui.focusSlots);
  const setFocusSlot = store((s) => s.setFocusSlot);
  const createTodo = store((s) => s.createTodo);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const todoById = useMemo(() => new Map(todos.map((t) => [t.id, t])), [todos]);

  // A slot's referenced todo is only shown if it still exists and isn't done.
  const slotTodo = (todoId: string | null): Todo | null => {
    if (todoId === null) return null;
    const todo = todoById.get(todoId);
    if (!todo || todo.status === 'done') return null;
    return todo;
  };

  const assignedIds = new Set(
    focusSlots.map((s) => slotTodo(s.todoId)?.id).filter((id): id is string => Boolean(id)),
  );

  // Source list: active (non-done) todos not already in a slot.
  const sourceTodos = todos.filter((t) => t.status !== 'done' && !assignedIds.has(t.id));

  const clearSlotByTodo = (todoId: string) => {
    const slot = focusSlots.find((s) => s.todoId === todoId);
    if (slot) setFocusSlot(slot.index, null);
  };

  const assignToSlot = (index: number, todoId: string) => {
    // If the todo already occupies another slot, clear that one first (move).
    const existing = focusSlots.find((s) => s.todoId === todoId && s.index !== index);
    if (existing) setFocusSlot(existing.index, null);
    setFocusSlot(index, todoId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id); // "todo:<id>"
    const overId = String(over.id); // "slot:<index>" | "focus-list"
    if (!activeId.startsWith('todo:')) return;
    const todoId = activeId.slice('todo:'.length);

    if (overId === LIST_DROPPABLE) {
      // slot -> list: unassign.
      clearSlotByTodo(todoId);
      return;
    }
    if (overId.startsWith('slot:')) {
      const index = Number(overId.slice('slot:'.length));
      if (Number.isInteger(index)) assignToSlot(index, todoId);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
      <div className={styles.panel}>
        <div className={styles.slots} aria-label="Focus 1-3-5 slots" role="list">
          {focusSlots.map((slot) => (
            <FocusSlot
              key={slot.index}
              index={slot.index}
              size={SLOT_SIZES[slot.index] ?? 'small'}
              todo={slotTodo(slot.todoId)}
              projects={projects}
              onClear={() => setFocusSlot(slot.index, null)}
              onOpenTodo={onOpenTodo}
              onAdd={async (raw) => {
                const parsed = parseQuickAdd(raw, projects, todayIso());
                const title = parsed.title.length > 0 ? parsed.title : raw;
                // New focus todos are project-less by default and land in the
                // first ("todo") column so they are valid, board-visible records.
                const created = await createTodo({
                  projectId: parsed.projectId ?? null,
                  title,
                  status: 'todo',
                  tags: parsed.tags,
                });
                setFocusSlot(slot.index, created.id);
              }}
            />
          ))}
        </div>

        <FocusSource todos={sourceTodos} onOpenTodo={onOpenTodo} />
      </div>
    </DndContext>
  );
}

function FocusSlot({
  index,
  size,
  todo,
  projects,
  onClear,
  onAdd,
  onOpenTodo,
}: {
  index: number;
  size: 'large' | 'medium' | 'small';
  todo: Todo | null;
  projects: { id: string; name: string }[];
  onClear: () => void;
  onAdd: (raw: string) => Promise<void>;
  onOpenTodo?: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${index}` });
  const [draft, setDraft] = useState('');

  return (
    <div
      ref={setNodeRef}
      className={styles.slot}
      data-size={size}
      data-over={isOver || undefined}
      role="listitem"
      aria-label={`Focus slot ${index + 1}`}
    >
      {todo ? (
        <FocusSlotCard todo={todo} projects={projects} onClear={onClear} onOpenTodo={onOpenTodo} />
      ) : (
        <form
          className={styles.addForm}
          onSubmit={(e) => {
            e.preventDefault();
            const raw = draft.trim();
            if (raw.length === 0) return;
            void onAdd(raw).then(() => setDraft(''));
          }}
        >
          <input
            type="text"
            className={styles.addInput}
            value={draft}
            placeholder="Add focus todo"
            aria-label={`Add todo to focus slot ${index + 1}`}
            onChange={(e) => setDraft(e.target.value)}
          />
        </form>
      )}
    </div>
  );
}

function FocusSlotCard({
  todo,
  projects,
  onClear,
  onOpenTodo,
}: {
  todo: Todo;
  projects: { id: string; name: string }[];
  onClear: () => void;
  onOpenTodo?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `todo:${todo.id}`,
  });
  const project = todo.projectId ? projects.find((p) => p.id === todo.projectId) : null;

  return (
    <div className={styles.card} data-dragging={isDragging || undefined}>
      <button
        type="button"
        className={styles.dragHandle}
        aria-label={`Move ${todo.title}`}
        ref={setNodeRef}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <button
        type="button"
        className={styles.cardTitle}
        onClick={() => onOpenTodo?.(todo.id)}
      >
        {todo.title}
        {project && <span className={styles.cardProject}> · {project.name}</span>}
      </button>
      <button
        type="button"
        className={styles.clear}
        aria-label={`Remove ${todo.title} from focus`}
        onClick={onClear}
      >
        ×
      </button>
    </div>
  );
}

function FocusSource({
  todos,
  onOpenTodo,
}: {
  todos: Todo[];
  onOpenTodo?: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: LIST_DROPPABLE });

  return (
    <div
      ref={setNodeRef}
      className={styles.source}
      data-over={isOver || undefined}
      aria-label="Available todos"
    >
      <h2 className={styles.sourceHeading}>Todos</h2>
      <ul className={styles.sourceList}>
        {todos.map((todo) => (
          <FocusSourceItem key={todo.id} todo={todo} onOpenTodo={onOpenTodo} />
        ))}
        {todos.length === 0 && <li className={styles.sourceEmpty}>Nothing to focus.</li>}
      </ul>
    </div>
  );
}

function FocusSourceItem({
  todo,
  onOpenTodo,
}: {
  todo: Todo;
  onOpenTodo?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `todo:${todo.id}`,
  });

  return (
    <li className={styles.sourceItem} data-dragging={isDragging || undefined}>
      <button
        type="button"
        className={styles.dragHandle}
        aria-label={`Move ${todo.title}`}
        ref={setNodeRef}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <button
        type="button"
        className={styles.sourceTitle}
        onClick={() => onOpenTodo?.(todo.id)}
      >
        {todo.title}
      </button>
    </li>
  );
}
