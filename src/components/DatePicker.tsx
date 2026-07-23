import { useMemo, useState } from 'react';
import { monthGrid } from '../domain/calendar';
import { formatDate, parseDate, todayIso } from '../domain/time';
import styles from './DatePicker.module.css';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface DatePickerProps {
  /** Currently selected ISO date (`YYYY-MM-DD`) or null. */
  value: string | null;
  /** Emits an ISO `YYYY-MM-DD` string, or null when cleared. */
  onChange: (iso: string | null) => void;
}

function initialMonth(value: string | null): { year: number; month: number } {
  if (value !== null) {
    try {
      const d = parseDate(value);
      return { year: d.getFullYear(), month: d.getMonth() };
    } catch {
      /* fall through */
    }
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const [view, setView] = useState(() => initialMonth(value));
  const today = todayIso();

  const grid = useMemo(() => monthGrid(view.year, view.month), [view]);

  const goPrev = () => {
    setView((v) => {
      const d = new Date(v.year, v.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const goNext = () => {
    setView((v) => {
      const d = new Date(v.year, v.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const goToday = () => {
    const now = new Date();
    setView({ year: now.getFullYear(), month: now.getMonth() });
    onChange(formatDate(now));
  };

  return (
    <div className={styles.picker} aria-label="Date picker">
      <div className={styles.header}>
        <button
          type="button"
          className={styles.nav}
          onClick={goPrev}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className={styles.monthLabel} aria-live="polite">
          {MONTH_NAMES[view.month]} {view.year}
        </span>
        <button
          type="button"
          className={styles.nav}
          onClick={goNext}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className={styles.weekdays} aria-hidden="true">
        {WEEKDAYS.map((d) => (
          <span key={d} className={styles.weekday}>
            {d}
          </span>
        ))}
      </div>

      <div className={styles.grid} role="grid">
        {grid.map((week) => (
          <div key={week[0]?.iso} className={styles.week} role="row">
            {week.map((day) => {
              const selected = value === day.iso;
              const isToday = today === day.iso;
              return (
                <button
                  key={day.iso}
                  type="button"
                  role="gridcell"
                  className={styles.day}
                  data-outside={!day.inMonth || undefined}
                  data-today={isToday || undefined}
                  aria-selected={selected}
                  aria-label={day.iso}
                  onClick={() => onChange(day.iso)}
                >
                  {day.date.getDate()}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.action} onClick={goToday}>
          Today
        </button>
        <button
          type="button"
          className={styles.action}
          onClick={() => onChange(null)}
          disabled={value === null}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
