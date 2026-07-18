import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from '../../store/store';
import { InMemoryRepository } from '../../storage/InMemoryRepository';
import { setActiveStore } from '../../store/storeInstance';
import { todayIso, formatDate, shiftDays } from '../../domain/time';
import { Column } from './Column';
import type { Todo } from '../../domain/types';

function doneTodo(overrides: Partial<Todo>): Todo {
  return {
    id: crypto.randomUUID(),
    projectId: null,
    title: 'done',
    description: '',
    status: 'done',
    dueDate: null,
    boardOrder: 'm',
    createdAt: '',
    updatedAt: '',
    doneAt: '',
    recurrence: 'none',
    reminderAt: null,
    reminderLead: null,
    tags: [],
    isFrog: false,
    ...overrides,
  };
}

const TODAY = todayIso();
const RECENT = formatDate(shiftDays(new Date(TODAY), -1));
const OLD = formatDate(shiftDays(new Date(TODAY), -10));

describe('Column (Done) archive toggle', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(async () => {
    store = createStore({ repository: new InMemoryRepository() });
    setActiveStore(store);
    await store.getState().hydrate();
  });

  afterEach(() => {
    cleanup();
    setActiveStore(null);
  });

  it('shows recent done todos and hides archived behind a toggle', async () => {
    const recent = doneTodo({ id: 'r', title: 'Recent', doneAt: RECENT });
    const old = doneTodo({ id: 'o', title: 'Old', doneAt: OLD }); // > 3 days old
    store.setState((s) => ({ todos: [...s.todos, recent, old] }));

    render(
      <Column
        status="done"
        title="Done"
        todos={[recent, old]}
        projects={[]}
        subStepsByTodo={new Map()}
        filterProjectId={null}
        onToggleFrog={() => {}}
      />,
    );

    // Recent visible immediately.
    expect(screen.getByText('Recent')).toBeInTheDocument();
    // Archived hidden until toggled.
    expect(screen.queryByText('Old')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /\+ 1 archived item/ }));
    expect(screen.getByText('Old')).toBeInTheDocument();
    // Archived item is dimmed (wrapper li carries the archivedItem class).
    const cardLi = screen.getByText('Old').closest('li');
    expect(cardLi?.parentElement).toHaveClass(/archivedItem/);
  });
});
