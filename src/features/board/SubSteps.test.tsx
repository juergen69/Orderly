import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from '../../store/store';
import { InMemoryRepository } from '../../storage/InMemoryRepository';
import { setActiveStore } from '../../store/storeInstance';
import { SubSteps } from './SubSteps';

describe('SubSteps', () => {
  let store: ReturnType<typeof createStore>;
  let todoId: string;

  beforeEach(async () => {
    store = createStore({ repository: new InMemoryRepository() });
    setActiveStore(store);
    await store.getState().hydrate();
    const todo = await store.getState().createTodo({ projectId: null, title: 'Parent' });
    todoId = todo.id;
  });

  afterEach(() => {
    cleanup();
    setActiveStore(null);
  });

  it('adds a sub-step', async () => {
    render(<SubSteps todoId={todoId} />);
    await userEvent.type(
      screen.getByRole('textbox', { name: 'New sub-step title' }),
      'First step{Enter}',
    );
    const subs = store.getState().subSteps;
    expect(subs).toHaveLength(1);
    expect(subs[0]).toMatchObject({ todoId, title: 'First step', done: false });
  });

  it('toggles a sub-step done state', async () => {
    await store.getState().createSubStep(todoId, 'Step');
    render(<SubSteps todoId={todoId} />);

    await userEvent.click(screen.getByRole('checkbox'));
    expect(store.getState().subSteps[0]!.done).toBe(true);
  });

  it('renames a sub-step via double-click', async () => {
    await store.getState().createSubStep(todoId, 'Old');
    render(<SubSteps todoId={todoId} />);

    await userEvent.dblClick(screen.getByText('Old'));
    const editor = screen.getByRole('textbox', { name: 'Edit sub-step title' });
    await userEvent.clear(editor);
    await userEvent.type(editor, 'New{Enter}');

    expect(store.getState().subSteps[0]!.title).toBe('New');
  });

  it('deletes a sub-step', async () => {
    await store.getState().createSubStep(todoId, 'Doomed');
    render(<SubSteps todoId={todoId} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Delete sub-step "Doomed"' }),
    );
    expect(store.getState().subSteps).toHaveLength(0);
  });

  it('keeps sub-steps ordered by fractional order', async () => {
    await store.getState().createSubStep(todoId, 'One');
    await store.getState().createSubStep(todoId, 'Two');
    render(<SubSteps todoId={todoId} />);

    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items[0]).toContain('One');
    expect(items[1]).toContain('Two');
  });
});
