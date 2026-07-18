import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from '../../store/store';
import { InMemoryRepository } from '../../storage/InMemoryRepository';
import { setActiveStore } from '../../store/storeInstance';
import { todayIso } from '../../domain/time';
import { CalendarView } from './CalendarView';

// A date guaranteed to be in the current month & visible grid: the 15th.
function midMonthIso(): string {
  const today = todayIso();
  return `${today.slice(0, 7)}-15`;
}

describe('CalendarView', () => {
  let store: ReturnType<typeof createStore>;
  const day = midMonthIso();

  beforeEach(async () => {
    store = createStore({ repository: new InMemoryRepository() });
    setActiveStore(store);
    await store.getState().hydrate();
  });

  afterEach(() => {
    cleanup();
    setActiveStore(null);
  });

  it('renders a month grid (42 day cells)', () => {
    render(<CalendarView />);
    expect(screen.getAllByRole('gridcell')).toHaveLength(42);
  });

  it('shows a count indicator on days with due todos', async () => {
    await store.getState().createTodo({ projectId: null, title: 'Due task', dueDate: day });
    render(<CalendarView />);

    const cell = screen.getByRole('gridcell', { name: new RegExp(`^${day}, 1 todos`) });
    expect(cell).toBeInTheDocument();
  });

  it('composes project + search filters with AND', async () => {
    const project = await store.getState().createProject('Work', '#22d3ee');
    await store
      .getState()
      .createTodo({ projectId: project.id, title: 'Work report', dueDate: day });
    await store
      .getState()
      .createTodo({ projectId: null, title: 'Home report', dueDate: day });

    render(<CalendarView />);

    // Filter to the Work project.
    await userEvent.selectOptions(screen.getByLabelText('Filter by project'), project.id);
    // Now the day should have 1 todo (Work report).
    expect(
      screen.getByRole('gridcell', { name: new RegExp(`^${day}, 1 todos`) }),
    ).toBeInTheDocument();

    // Add a search that excludes it.
    await userEvent.type(screen.getByLabelText('Search todos'), 'home');
    // No day should show a count now (Work report filtered out by project, Home by project).
    expect(
      screen.queryByRole('gridcell', { name: new RegExp(`${day}, `) }),
    ).not.toBeInTheDocument();
  });

  it('opens a day detail and reschedules a todo via the picker', async () => {
    const todo = await store
      .getState()
      .createTodo({ projectId: null, title: 'Reschedule me', dueDate: day });
    render(<CalendarView />);

    await userEvent.click(screen.getByRole('gridcell', { name: new RegExp(`^${day}`) }));
    const detail = screen.getByRole('region', { name: `Todos on ${day}` });
    expect(within(detail).getByText('Reschedule me')).toBeInTheDocument();

    // Pick a different day in the detail's DatePicker.
    const other = `${day.slice(0, 8)}20`;
    await userEvent.click(within(detail).getByRole('gridcell', { name: other }));
    expect(store.getState().todos.find((t) => t.id === todo.id)!.dueDate).toBe(other);
  });

  it('clears a due date from the day detail', async () => {
    const todo = await store
      .getState()
      .createTodo({ projectId: null, title: 'Clear me', dueDate: day });
    render(<CalendarView />);

    await userEvent.click(screen.getByRole('gridcell', { name: new RegExp(`^${day}`) }));
    const detail = screen.getByRole('region', { name: `Todos on ${day}` });
    await userEvent.click(within(detail).getByRole('button', { name: 'Clear' }));
    expect(store.getState().todos.find((t) => t.id === todo.id)!.dueDate).toBeNull();
  });
});
