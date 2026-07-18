import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from '../../store/store';
import { InMemoryRepository } from '../../storage/InMemoryRepository';
import { setActiveStore } from '../../store/storeInstance';
import { TodoDetail, TITLE_SAVE_DEBOUNCE_MS } from './TodoDetail';

describe('TodoDetail', () => {
  let store: ReturnType<typeof createStore>;
  let todoId: string;

  beforeEach(async () => {
    store = createStore({ repository: new InMemoryRepository() });
    setActiveStore(store);
    await store.getState().hydrate();
    const todo = await store
      .getState()
      .createTodo({ projectId: null, title: 'Original', description: '' });
    todoId = todo.id;
  });

  afterEach(() => {
    cleanup();
    setActiveStore(null);
  });

  it('debounces the title save (300ms)', async () => {
    const user = userEvent.setup();
    render(<TodoDetail todoId={todoId} onClose={() => {}} />);

    const input = screen.getByLabelText('Title');
    await user.clear(input);
    await user.type(input, 'Updated title');

    // Not saved immediately after typing (before the debounce window).
    expect(store.getState().todos.find((t) => t.id === todoId)!.title).toBe('Original');

    // After the debounce window elapses, the save lands.
    await waitFor(
      () =>
        expect(store.getState().todos.find((t) => t.id === todoId)!.title).toBe(
          'Updated title',
        ),
      { timeout: TITLE_SAVE_DEBOUNCE_MS + 500 },
    );
  });

  it('rejects an empty title and does not save', async () => {
    const user = userEvent.setup();
    render(<TodoDetail todoId={todoId} onClose={() => {}} />);

    const input = screen.getByLabelText('Title');
    await user.clear(input);

    expect(screen.getByRole('alert')).toHaveTextContent(/required/i);
    // give any pending debounce a chance (there shouldn't be one)
    await new Promise((r) => setTimeout(r, TITLE_SAVE_DEBOUNCE_MS + 20));
    expect(store.getState().todos.find((t) => t.id === todoId)!.title).toBe('Original');
  });

  it('saves recurrence immediately', async () => {
    const user = userEvent.setup();
    render(<TodoDetail todoId={todoId} onClose={() => {}} />);

    await user.selectOptions(screen.getByLabelText('Repeat'), 'weekly');
    expect(store.getState().todos.find((t) => t.id === todoId)!.recurrence).toBe('weekly');
  });

  it('saves the due date immediately from the picker', async () => {
    const user = userEvent.setup();
    render(<TodoDetail todoId={todoId} onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Today' }));
    const due = store.getState().todos.find((t) => t.id === todoId)!.dueDate;
    expect(due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('resolves a reminder from the lead preset when a due date exists', async () => {
    const user = userEvent.setup();
    await store.getState().setTodoDueDate(todoId, '2025-06-10');
    render(<TodoDetail todoId={todoId} onClose={() => {}} />);

    await user.selectOptions(screen.getByLabelText('Reminder'), '1d');
    const todo = store.getState().todos.find((t) => t.id === todoId)!;
    expect(todo.reminderLead).toBe('1d');
    expect(todo.reminderAt).toBe('2025-06-09');
  });

  it('adds a tag and offers autocomplete over existing tags', async () => {
    const user = userEvent.setup();
    // Seed an existing tag on another todo.
    await store.getState().createTodo({ projectId: null, title: 'Other', tags: ['urgent'] });
    render(<TodoDetail todoId={todoId} onClose={() => {}} />);

    const tagInput = screen.getByLabelText('Add tag');
    await user.type(tagInput, 'urg');
    // suggestion button appears
    const suggestion = await screen.findByRole('button', { name: '#urgent' });
    await user.click(suggestion);

    expect(store.getState().todos.find((t) => t.id === todoId)!.tags).toContain('urgent');
  });

  it('removes a tag', async () => {
    const user = userEvent.setup();
    await store.getState().setTodoTags(todoId, ['keep', 'drop']);
    render(<TodoDetail todoId={todoId} onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Remove tag drop' }));
    expect(store.getState().todos.find((t) => t.id === todoId)!.tags).toEqual(['keep']);
  });
});
