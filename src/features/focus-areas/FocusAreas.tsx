import { useEffect, useRef, useState } from 'react';
import { getActiveStore } from '../../store/storeInstance';
import styles from './FocusAreas.module.css';

const PLACEHOLDERS = [
  'What matters most right now?',
  'A theme for this week…',
  'Something to keep in mind…',
];

/**
 * Three free-text focus areas persisted via uiState. Each box saves on blur,
 * Enter, or Ctrl/Cmd+Enter; Escape cancels the in-progress edit. Focus areas
 * are UI-only and are never touched by import/export.
 */
export function FocusAreas() {
  const store = getActiveStore();
  const focusAreas = store((s) => s.ui.focusAreas);
  const setFocusArea = store((s) => s.setFocusArea);

  return (
    <section className={styles.areas} aria-label="Focus areas">
      {focusAreas.map((area) => (
        <FocusAreaBox
          key={area.index}
          index={area.index}
          value={area.text}
          placeholder={PLACEHOLDERS[area.index] ?? 'Focus area'}
          onSave={(text) => setFocusArea(area.index, text)}
        />
      ))}
    </section>
  );
}

function FocusAreaBox({
  index,
  value,
  placeholder,
  onSave,
}: {
  index: number;
  value: string;
  placeholder: string;
  onSave: (text: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const dirty = useRef(false);
  const skipBlur = useRef(false);

  // Sync external changes when not mid-edit.
  useEffect(() => {
    if (!dirty.current) setDraft(value);
  }, [value]);

  const commit = () => {
    dirty.current = false;
    if (skipBlur.current) {
      skipBlur.current = false;
      return;
    }
    if (draft !== value) onSave(draft);
  };

  const cancel = () => {
    dirty.current = false;
    skipBlur.current = true;
    setDraft(value);
  };

  return (
    <div className={styles.box}>
      <label className={styles.label} htmlFor={`focus-area-${index}`}>
        Focus {index + 1}
      </label>
      <textarea
        id={`focus-area-${index}`}
        className={styles.input}
        value={draft}
        placeholder={placeholder}
        aria-label={`Focus area ${index + 1}`}
        onChange={(e) => {
          dirty.current = true;
          setDraft(e.target.value);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
            (e.target as HTMLTextAreaElement).blur();
          } else if (e.key === 'Enter' && !e.shiftKey) {
            // Enter (and Ctrl/Cmd+Enter) save; Shift+Enter inserts a newline.
            e.preventDefault();
            commit();
          }
        }}
      />
      <button
        type="button"
        className={styles.save}
        aria-label={`Save focus area ${index + 1}`}
        onClick={commit}
      >
        Save
      </button>
    </div>
  );
}
