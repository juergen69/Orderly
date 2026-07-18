import { getActiveStore } from '../../store/storeInstance';
import styles from './RecurringFilter.module.css';

/**
 * Toggle between "Soon" (hide recurring todos due more than 7 days out) and
 * "All". The choice is persisted in the uiState `showAllRecurring` flag.
 */
export function RecurringFilter() {
  const store = getActiveStore();
  const showAll = store((s) => s.ui.showAllRecurring);
  const setShowAllRecurring = store((s) => s.setShowAllRecurring);

  return (
    <div
      className={styles.toggle}
      role="group"
      aria-label="Recurring visibility"
    >
      <button
        type="button"
        className={styles.option}
        aria-pressed={!showAll}
        data-active={!showAll || undefined}
        onClick={() => setShowAllRecurring(false)}
      >
        Soon
      </button>
      <button
        type="button"
        className={styles.option}
        aria-pressed={showAll}
        data-active={showAll || undefined}
        onClick={() => setShowAllRecurring(true)}
      >
        All
      </button>
    </div>
  );
}
