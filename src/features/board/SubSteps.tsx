import { useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SubStep } from '../../domain/types';
import { getActiveStore } from '../../store/storeInstance';
import styles from './SubSteps.module.css';

function sortByOrder(items: SubStep[]): SubStep[] {
  return [...items].sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));
}

export function SubSteps({ todoId }: { todoId: string }) {
  const store = getActiveStore();
  const allSubSteps = store((s) => s.subSteps);
  const createSubStep = store((s) => s.createSubStep);
  const updateSubStep = store((s) => s.updateSubStep);
  const toggleSubStep = store((s) => s.toggleSubStep);
  const deleteSubStep = store((s) => s.deleteSubStep);
  const reorderSubStep = store((s) => s.reorderSubStep);

  const subSteps = useMemo(
    () => sortByOrder(allSubSteps.filter((s) => s.todoId === todoId)),
    [allSubSteps, todoId],
  );

  const [newTitle, setNewTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (title.length === 0) return;
    await createSubStep(todoId, title);
    setNewTitle('');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = subSteps.map((s) => s.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;

    // Compute neighbours in the target position (excluding the dragged item)
    // and write a single fractional order via the store.
    const without = subSteps.filter((s) => s.id !== active.id);
    const insertAt = to;
    const before = without[insertAt - 1];
    const after = without[insertAt];
    void reorderSubStep(String(active.id), before?.id, after?.id);
  };

  return (
    <div className={styles.wrapper}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={subSteps.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className={styles.list}>
            {subSteps.map((sub) => (
              <SubStepRow
                key={sub.id}
                subStep={sub}
                onToggle={() => void toggleSubStep(sub.id)}
                onRename={(title) => void updateSubStep({ ...sub, title })}
                onDelete={() => void deleteSubStep(sub.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className={styles.addRow}>
        <input
          type="text"
          className={styles.addInput}
          value={newTitle}
          placeholder="Add sub-step"
          aria-label="New sub-step title"
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleAdd();
            }
          }}
        />
        <button type="button" className={styles.addButton} onClick={() => void handleAdd()}>
          Add
        </button>
      </div>
    </div>
  );
}

function SubStepRow({
  subStep,
  onToggle,
  onRename,
  onDelete,
}: {
  subStep: SubStep;
  onToggle: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: subStep.id });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(subStep.title);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const commit = () => {
    const next = draft.trim();
    if (next.length > 0 && next !== subStep.title) {
      onRename(next);
    } else {
      setDraft(subStep.title);
    }
    setEditing(false);
  };

  return (
    <li ref={setNodeRef} style={style} className={styles.row}>
      <button
        type="button"
        className={styles.dragHandle}
        aria-label="Reorder sub-step"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <input
        type="checkbox"
        checked={subStep.done}
        aria-label={`Mark "${subStep.title}" ${subStep.done ? 'incomplete' : 'complete'}`}
        onChange={onToggle}
      />
      {editing ? (
        <input
          type="text"
          className={styles.editInput}
          value={draft}
          autoFocus
          aria-label="Edit sub-step title"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              setDraft(subStep.title);
              setEditing(false);
            }
          }}
        />
      ) : (
        <span
          className={subStep.done ? styles.titleDone : styles.title}
          onDoubleClick={() => {
            setDraft(subStep.title);
            setEditing(true);
          }}
        >
          {subStep.title}
        </span>
      )}
      <button
        type="button"
        className={styles.deleteButton}
        aria-label={`Delete sub-step "${subStep.title}"`}
        onClick={onDelete}
      >
        ×
      </button>
    </li>
  );
}
