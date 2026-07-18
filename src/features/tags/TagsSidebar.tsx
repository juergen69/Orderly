import { useMemo, useState } from 'react';
import { getActiveStore } from '../../store/storeInstance';
import { selectTagFrequencies } from '../../store/selectors';
import styles from './TagsSidebar.module.css';

export function TagsSidebar() {
  const store = getActiveStore();
  const todos = store((s) => s.todos);
  const selectedTags = store((s) => s.ui.selectedTags);
  const addTagFilter = store((s) => s.addTagFilter);
  const removeTagFilter = store((s) => s.removeTagFilter);

  const [collapsed, setCollapsed] = useState(false);

  // Frequency + alpha sort via the selector.
  const tags = useMemo(() => selectTagFrequencies(todos), [todos]);
  const selected = useMemo(() => new Set(selectedTags), [selectedTags]);

  return (
    <section className={styles.section} aria-label="Tags">
      <button
        type="button"
        className={styles.header}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className={styles.title}>Tags</span>
        <span className={styles.caret} aria-hidden="true">
          {collapsed ? '▸' : '▾'}
        </span>
      </button>

      {!collapsed && (
        <>
          {tags.length === 0 ? (
            <p className={styles.empty}>No tags yet.</p>
          ) : (
            <ul className={styles.list}>
              {tags.map(({ tag, count }) => {
                const isSelected = selected.has(tag);
                return (
                  <li key={tag}>
                    <button
                      type="button"
                      className={styles.tag}
                      data-selected={isSelected || undefined}
                      aria-pressed={isSelected}
                      onClick={() => (isSelected ? removeTagFilter(tag) : addTagFilter(tag))}
                    >
                      <span className={styles.tagName}>#{tag}</span>
                      <span className={styles.tagCount}>{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {selectedTags.length > 0 && (
            <button
              type="button"
              className={styles.clear}
              onClick={() => selectedTags.forEach((t) => removeTagFilter(t))}
            >
              Clear tag filters
            </button>
          )}
        </>
      )}
    </section>
  );
}
