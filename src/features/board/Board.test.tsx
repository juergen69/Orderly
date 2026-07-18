import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from '../../store/store';
import { InMemoryRepository } from '../../storage/InMemoryRepository';
import { setActiveStore } from '../../store/storeInstance';
import { Board } from './Board';

describe('Board', () => {
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

  it('renders the three fixed columns', () => {
    render(<Board filterProjectId={null} />);
    expect(screen.getByRole('region', { name: 'To do' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'In progress' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Done' })).toBeInTheDocument();
  });

  it('renders cards in their status column', async () => {
    await store.getState().createTodo({ projectId: null, title: 'Alpha', status: 'todo' });
    await store
      .getState()
      .createTodo({ projectId: null, title: 'Beta', status: 'inProgress' });

    render(<Board filterProjectId={null} />);

    const todoCol = screen.getByRole('region', { name: 'To do' });
    const progressCol = screen.getByRole('region', { name: 'In progress' });
    expect(within(todoCol).getByText('Alpha')).toBeInTheDocument();
    expect(within(progressCol).getByText('Beta')).toBeInTheDocument();
  });

  it('filters cards by the active project', async () => {
    const project = await store.getState().createProject('Work', '#22d3ee');
    await store
      .getState()
      .createTodo({ projectId: project.id, title: 'Scoped', status: 'todo' });
    await store
      .getState()
      .createTodo({ projectId: null, title: 'Unscoped', status: 'todo' });

    render(<Board filterProjectId={project.id} />);
    expect(screen.getByText('Scoped')).toBeInTheDocument();
    expect(screen.queryByText('Unscoped')).not.toBeInTheDocument();
  });

  it('inline quick-add creates a parsed todo in the column', async () => {
    const project = await store.getState().createProject('Home', '#22d3ee');
    render(<Board filterProjectId={null} />);

    const input = screen.getByRole('textbox', { name: 'Add card to To do' });
    await userEvent.type(input, 'Buy milk #errand @Home{Enter}');

    const todos = store.getState().todos;
    expect(todos).toHaveLength(1);
    expect(todos[0]).toMatchObject({
      title: 'Buy milk',
      status: 'todo',
      projectId: project.id,
      tags: ['errand'],
    });
  });

  it('quick-add defaults new cards to the active project filter', async () => {
    const project = await store.getState().createProject('Filtered', '#22d3ee');
    render(<Board filterProjectId={project.id} />);

    const input = screen.getByRole('textbox', { name: 'Add card to In progress' });
    await userEvent.type(input, 'Scoped task{Enter}');

    const todos = store.getState().todos;
    expect(todos).toHaveLength(1);
    expect(todos[0]).toMatchObject({
      title: 'Scoped task',
      status: 'inProgress',
      projectId: project.id,
    });
  });

  it('toggles the frog flag from the card', async () => {
    await store.getState().createTodo({ projectId: null, title: 'Big task', status: 'todo' });
    render(<Board filterProjectId={null} />);

    await userEvent.click(screen.getByRole('button', { name: 'Mark as frog' }));
    expect(store.getState().todos[0]!.isFrog).toBe(true);
  });
});
