import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from '../../store/store';
import { InMemoryRepository } from '../../storage/InMemoryRepository';
import { setActiveStore } from '../../store/storeInstance';
import { FocusPanel } from './FocusPanel';

describe('FocusPanel', () => {
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

  it('renders 9 slots and the source list', async () => {
    await store.getState().createTodo({ projectId: null, title: 'Loose' });
    render(<FocusPanel />);

    expect(screen.getAllByLabelText(/Focus slot \d/)).toHaveLength(9);
    expect(screen.getByLabelText('Available todos')).toBeInTheDocument();
    expect(screen.getByText('Loose')).toBeInTheDocument();
  });

  it('empty-slot add creates a project-less todo in the todo column and references it', async () => {
    render(<FocusPanel />);

    const input = screen.getByLabelText('Add todo to focus slot 1');
    await userEvent.type(input, 'My focus item{Enter}');

    const todos = store.getState().todos;
    expect(todos).toHaveLength(1);
    const created = todos[0]!;
    expect(created.title).toBe('My focus item');
    expect(created.projectId).toBeNull();
    expect(created.status).toBe('todo');

    // The slot now references the created todo.
    expect(store.getState().ui.focusSlots[0]!.todoId).toBe(created.id);
    // And the item appears in the slot (not the source list).
    const slot = screen.getByLabelText('Focus slot 1');
    expect(within(slot).getByText('My focus item')).toBeInTheDocument();
  });

  it('clears a slot via the remove button', async () => {
    const todo = await store.getState().createTodo({ projectId: null, title: 'Pinned' });
    store.getState().setFocusSlot(0, todo.id);
    render(<FocusPanel />);

    const slot = screen.getByLabelText('Focus slot 1');
    await userEvent.click(within(slot).getByRole('button', { name: `Remove Pinned from focus` }));
    expect(store.getState().ui.focusSlots[0]!.todoId).toBeNull();
    // Returned to the source list.
    expect(screen.getByText('Pinned')).toBeInTheDocument();
  });

  it('empties a slot when the referenced todo is marked done', async () => {
    const todo = await store.getState().createTodo({ projectId: null, title: 'Finish me' });
    store.getState().setFocusSlot(0, todo.id);
    render(<FocusPanel />);

    const slot = screen.getByLabelText('Focus slot 1');
    expect(within(slot).getByText('Finish me')).toBeInTheDocument();

    // Mark done via the store (the board would do this); the slot should empty.
    await store.getState().moveTodo(todo.id, 'done', undefined, undefined);
    expect(
      within(screen.getByLabelText('Focus slot 1')).queryByText('Finish me'),
    ).not.toBeInTheDocument();
  });

  it('excludes a slot-assigned todo from the source list (no duplication)', async () => {
    const todo = await store.getState().createTodo({ projectId: null, title: 'Shift' });
    store.getState().setFocusSlot(0, todo.id);
    render(<FocusPanel />);

    // The todo occupies slot 1, so it is not in the available list.
    const source = screen.getByLabelText('Available todos');
    expect(within(source).queryByText('Shift')).not.toBeInTheDocument();
    expect(within(screen.getByLabelText('Focus slot 1')).getByText('Shift')).toBeInTheDocument();
  });
});
