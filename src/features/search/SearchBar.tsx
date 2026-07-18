import { useEffect, useRef, useState } from 'react';
import { getActiveStore } from '../../store/storeInstance';
import styles from './SearchBar.module.css';

export const SEARCH_DEBOUNCE_MS = 150;

/**
 * Header search input. Debounces (~150ms) before pushing the query into the
 * transient uiState `searchQuery`. Escape clears it.
 */
export function SearchBar() {
  const store = getActiveStore();
  const searchQuery = store((s) => s.ui.searchQuery);
  const setSearchQuery = store((s) => s.setSearchQuery);

  const [local, setLocal] = useState(searchQuery);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local input in sync if the store query changes externally (e.g. clear).
  useEffect(() => {
    setLocal(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const push = (value: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSearchQuery(value), SEARCH_DEBOUNCE_MS);
  };

  return (
    <input
      type="search"
      className={styles.input}
      value={local}
      placeholder="Search todos…"
      aria-label="Search todos"
      onChange={(e) => {
        const value = e.target.value;
        setLocal(value);
        push(value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          if (timer.current) clearTimeout(timer.current);
          setLocal('');
          setSearchQuery('');
        }
      }}
    />
  );
}
