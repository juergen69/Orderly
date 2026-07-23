import { useMemo, useState } from 'react';
import type { Todo } from '../../domain/types';
import { monthGrid, groupByDueDate } from '../../domain/calendar';
import { filterRecurringVisible } from '../../domain/recurringVisibility';
import { todayIso } from '../../domain/time';
import { normalizeTags } from '../../domain/validation';
import { getActiveStore } from '../../store/storeInstance';
import { DatePicker } from '../../components/DatePicker';
import { RecurringFilter } from '../recurrence/RecurringFilter';
import styles from './CalendarView.module.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface CalendarViewProps {
  onOpenTodo?: (id: string) => void;
}

export function CalendarView({ onOpenTodo }: CalendarViewProps) {
  const store = getActiveStore();
  const allTodos = store((s) => s.todos);
  const projects = store((s) => s.projects);
  const showAllRecurring = store((s) => s.ui.showAllRecurring);
  const setTodoDueDate = store((s) => s.setTodoDueDate);

  const today = todayIso();
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [projectFilter, setProjectFilter] = useState<string>(''); // '' = all
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string>(''); // '' = all
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const t of allTodos) for (const tag of t.tags) set.add(tag);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [allTodos]);

  // Compose filters (AND): recurring-visibility, project, search, tag.
  const filteredTodos = useMemo(() => {
    const query = search.trim().toLowerCase();
    const [normTag] = normalizeTags(tagFilter ? [tagFilter] : []);
    return filterRecurringVisible(allTodos, showAllRecurring, today).filter((t) => {
      if (projectFilter !== '' && t.projectId !== projectFilter) return false;
      if (normTag && !t.tags.includes(normTag)) return false;
      if (query) {
        const haystack = `${t.title} ${t.description}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [allTodos, showAllRecurring, today, projectFilter, tagFilter, search]);

  const grouped = useMemo(() => groupByDueDate(filteredTodos), [filteredTodos]);
  const grid = useMemo(() => monthGrid(view.year, view.month), [view]);

  const goPrev = () =>
    setView((v) => {
      const d = new Date(v.year, v.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const goNext = () =>
    setView((v) => {
      const d = new Date(v.year, v.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const goToday = () => {
    const now = new Date();
    setView({ year: now.getFullYear(), month: now.getMonth() });
  };

  const selectedTodos: Todo[] = selectedDay ? grouped[selectedDay] ?? [] : [];

  return (
    <div className={styles.calendar}>
      <div className={styles.toolbar}>
        <div className={styles.monthNav}>
          <button type="button" className={styles.nav} onClick={goPrev} aria-label="Previous month">
            ‹
          </button>
          <span className={styles.monthLabel}>
            {MONTH_NAMES[view.month]} {view.year}
          </span>
          <button type="button" className={styles.nav} onClick={goNext} aria-label="Next month">
            ›
          </button>
          <button type="button" className={styles.todayButton} onClick={goToday}>
            Today
          </button>
        </div>

        <div className={styles.filters}>
          <input
            type="search"
            className={styles.search}
            placeholder="Search"
            aria-label="Search todos"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Filter by project"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by tag"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          >
            <option value="">All tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                #{tag}
              </option>
            ))}
          </select>
          <RecurringFilter />
        </div>
      </div>

      <div className={styles.weekdays} aria-hidden="true">
        {WEEKDAYS.map((d) => (
          <span key={d} className={styles.weekday}>
            {d}
          </span>
        ))}
      </div>

      <div className={styles.grid} role="grid" aria-label="Month">
        {grid.map((week) => (
          <div key={week[0]?.iso} className={styles.week} role="row">
            {week.map((day) => {
              const dayTodos = grouped[day.iso] ?? [];
              const isToday = today === day.iso;
              const dayAriaLabel = dayTodos.length > 0 ? `${day.iso}, ${dayTodos.length} todos` : day.iso;
              return (
                <button
                  key={day.iso}
                  type="button"
                  role="gridcell"
                  className={styles.day}
                  data-outside={!day.inMonth || undefined}
                  data-today={isToday || undefined}
                  aria-label={dayAriaLabel}
                  onClick={() => setSelectedDay(day.iso)}
                >
                  <span className={styles.dayNumber}>{day.date.getDate()}</span>
                  {dayTodos.length > 0 && (
                    <span className={styles.dayCount} aria-hidden="true">
                      <span className={styles.dot} />
                      {dayTodos.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {selectedDay !== null && (
        <aside className={styles.dayDetail} aria-label={`Todos on ${selectedDay}`}>
          <div className={styles.dayDetailHeader}>
            <h2 className={styles.dayDetailTitle}>{selectedDay}</h2>
            <button
              type="button"
              className={styles.close}
              aria-label="Close day detail"
              onClick={() => setSelectedDay(null)}
            >
              ×
            </button>
          </div>

          {selectedTodos.length === 0 ? (
            <p className={styles.empty}>No todos due.</p>
          ) : (
            <ul className={styles.dayList}>
              {selectedTodos.map((todo) => (
                <li key={todo.id} className={styles.dayItem}>
                  <button
                    type="button"
                    className={styles.dayItemTitle}
                    onClick={() => onOpenTodo?.(todo.id)}
                  >
                    {todo.title}
                  </button>
                  <div className={styles.reschedule}>
                    <span className={styles.rescheduleLabel}>Reschedule</span>
                    <DatePicker
                      value={todo.dueDate}
                      onChange={(iso) => void setTodoDueDate(todo.id, iso)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}
    </div>
  );
}
