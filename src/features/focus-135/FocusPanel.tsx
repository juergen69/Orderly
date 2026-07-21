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
import type { FocusSlot, Todo } from '../../domain/types';
import { parseQuickAdd } from '../../domain/quick-add';
import { todayIso } from '../../domain/time';
import { getActiveStore } from '../../store/storeInstance';
import styles from './FocusPanel.module.css';

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

const TIER_CYCLE = [5, 3, 1] as const;
const TIER_ICONS: Record<1 | 3 | 5, string> = {
  1: '🔥',
  3: '⚡',
  5: '💧',
};
const TIER_CAPACITY: Record<1 | 3 | 5, number> = {
  1: 1,
  3: 3,
  5: 5,
};

const LIST_DROPPABLE = 'focus-list';

function nextTier(current: 1 | 3 | 5 | undefined, slots: FocusSlot[]): 1 | 3 | 5 | null {
  const counts: Record<1 | 3 | 5, number> = { 1: 0, 3: 0, 5: 0 };
  for (const s of slots) {
    if (s.tier === 1 || s.tier === 3 || s.tier === 5) {
      counts[s.tier]++;
    }
  }

  if (current === undefined) {
    for (const t of TIER_CYCLE) {
      if (counts[t] < TIER_CAPACITY[t]) return t;
    }
    return null;
  }

  const currentIndex = TIER_CYCLE.indexOf(current as 1 | 3 | 5);
  for (let i = currentIndex + 1; i < TIER_CYCLE.length; i++) {
    const t = TIER_CYCLE[i] as 1 | 3 | 5;
    if (counts[t] < TIER_CAPACITY[t]) return t;
  }
  return null;
}

function allSlotsTiered(slots: FocusSlot[]): boolean {
  return slots.every((s) => s.tier === 1 || s.tier === 3 || s.tier === 5);
}

export function FocusPanel({ onOpenTodo }: { onOpenTodo?: (id: string) => void }) {
  const store = getActiveStore();
  const todos = store((s) => s.todos);
  const projects = store((s) => s.projects);
  const focusSlots = store((s) => s.ui.focusSlots);
  const setFocusSlot = store((s) => s.setFocusSlot);
  const setFocusSlotTier = store((s) => s.setFocusSlotTier);
  const createTodo = store((s) => s.createTodo);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const todoById = useMemo(() => new Map(todos.map((t) => [t.id, t])), [todos]);

  const slotTodo = (todoId: string | null): Todo | null => {
    if (todoId === null) return null;
    const todo = todoById.get(todoId);
    if (!todo || todo.status === 'done') return null;
    return todo;
  };

  const assignedIds = new Set(
    focusSlots.map((s) => slotTodo(s.todoId)?.id).filter((id): id is string => Boolean(id)),
  );

  const sourceTodos = todos.filter((t) => t.status !== 'done' && !assignedIds.has(t.id));

  const clearSlotByTodo = (todoId: string) => {
    const slot = focusSlots.find((s) => s.todoId === todoId);
    if (slot) setFocusSlot(slot.index, null);
  };

  const assignToSlot = (index: number, todoId: string) => {
    const existing = focusSlots.find((s) => s.todoId === todoId && s.index !== index);
    if (existing) setFocusSlot(existing.index, null);
    setFocusSlot(index, todoId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId.startsWith('todo:')) return;
    const todoId = activeId.slice('todo:'.length);

    if (overId === LIST_DROPPABLE) {
      clearSlotByTodo(todoId);
      return;
    }
    if (overId.startsWith('slot:')) {
      const index = Number(overId.slice('slot:'.length));
      if (Number.isInteger(index)) assignToSlot(index, todoId);
    }
  };

  const handleCycleTier = (index: number) => {
    const slot = focusSlots[index];
    if (!slot) return;
    const next = nextTier(slot.tier, focusSlots);
    if (next === null && slot.tier === undefined) return;
    setFocusSlotTier(index, next);
  };

  const disabled = allSlotsTiered(focusSlots);

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
      <div className={styles.panel}>
        <div className={styles.slots} aria-label="Focus 1-3-5 slots" role="list">
          {focusSlots.map((slot) => (
            <FocusSlot
              key={slot.index}
              index={slot.index}
              size={SLOT_SIZES[slot.index] ?? 'small'}
              tier={slot.tier}
              todo={slotTodo(slot.todoId)}
              projects={projects}
              onClear={() => setFocusSlot(slot.index, null)}
              onCycleTier={() => handleCycleTier(slot.index)}
              tierDisabled={disabled}
              onOpenTodo={onOpenTodo}
              onAdd={async (raw) => {
                const parsed = parseQuickAdd(raw, projects, todayIso());
                const title = parsed.title.length > 0 ? parsed.title : raw;
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
        <div className={styles.legend} aria-label="Tier legend">
          <span className={styles.legendItem} data-tier="1">
            <span className={styles.legendIcon} aria-hidden="true">🔥</span> 1 big task
          </span>
          <span className={styles.legendItem} data-tier="3">
            <span className={styles.legendIcon} aria-hidden="true">⚡</span> 3 medium tasks
          </span>
          <span className={styles.legendItem} data-tier="5">
            <span className={styles.legendIcon} aria-hidden="true">💧</span> 5 small tasks
          </span>
        </div>
      </div>
    </DndContext>
  );
}

function FocusSlot({
  index,
  size,
  tier,
  todo,
  projects,
  onClear,
  onCycleTier,
  tierDisabled,
  onOpenTodo,
  onAdd,
}: {
  index: number;
  size: 'large' | 'medium' | 'small';
  tier?: 1 | 3 | 5;
  todo: Todo | null;
  projects: { id: string; name: string }[];
  onClear: () => void;
  onCycleTier: () => void;
  tierDisabled: boolean;
  onOpenTodo?: (id: string) => void;
  onAdd: (raw: string) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${index}` });
  const [draft, setDraft] = useState('');

  return (
    <div
      ref={setNodeRef}
      className={styles.slot}
      data-size={size}
      data-tier={tier}
      data-over={isOver || undefined}
      role="listitem"
      aria-label={`Focus slot ${index + 1}${tier ? `, tier ${tier}` : ''}`}
    >
      {todo ? (
        <FocusSlotCard
          todo={todo}
          tier={tier}
          projects={projects}
          onClear={onClear}
          onOpenTodo={onOpenTodo}
        />
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
      <button
        type="button"
        className={styles.tierButton}
        data-tier={tier}
        disabled={tierDisabled}
        aria-label={tier ? `Change tier (currently ${tier})` : 'Assign tier'}
        onClick={onCycleTier}
      >
        {tier ? TIER_ICONS[tier] : '+'}
      </button>
    </div>
  );
}

function FocusSlotCard({
  todo,
  tier,
  projects,
  onClear,
  onOpenTodo,
}: {
  todo: Todo;
  tier?: 1 | 3 | 5;
  projects: { id: string; name: string }[];
  onClear: () => void;
  onOpenTodo?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `todo:${todo.id}`,
  });
  const project = todo.projectId ? projects.find((p) => p.id === todo.projectId) : null;

  return (
    <div className={styles.card} data-dragging={isDragging || undefined} data-tier={tier}>
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
      {tier && (
        <span className={styles.cardTier} data-tier={tier} aria-hidden="true">
          {TIER_ICONS[tier]}
        </span>
      )}
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
