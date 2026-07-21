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

  it('global composer parses quick-add syntax', async () => {
    const project = await store.getState().createProject('Home', '#22d3ee');
    render(<Board filterProjectId={null} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add card' }));
    const dialog = screen.getByRole('dialog', { name: 'Add card' });
    const textarea = within(dialog).getByRole('textbox', { name: 'Details' });
    await userEvent.type(textarea, 'Buy milk #errand @Home{Enter}');

    const todos = store.getState().todos;
    expect(todos).toHaveLength(1);
    expect(todos[0]).toMatchObject({
      title: 'Buy milk',
      status: 'todo',
      projectId: project.id,
      tags: ['errand'],
    });
  });

  it('composer defaults project selection from board filter', async () => {
    const project = await store.getState().createProject('Filtered', '#22d3ee');
    render(<Board filterProjectId={project.id} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add card' }));
    const dialog = screen.getByRole('dialog', { name: 'Add card' });
    const textarea = within(dialog).getByRole('textbox', { name: 'Details' });
    await userEvent.type(textarea, 'Scoped task{Enter}');

    const todos = store.getState().todos;
    expect(todos).toHaveLength(1);
    expect(todos[0]).toMatchObject({
      title: 'Scoped task',
      status: 'todo',
      projectId: project.id,
    });
  });

  it('toggles the frog flag from the card', async () => {
    await store.getState().createTodo({ projectId: null, title: 'Big task', status: 'todo' });
    render(<Board filterProjectId={null} />);

    await userEvent.click(screen.getByRole('button', { name: 'Mark as frog' }));
    expect(store.getState().todos[0]!.isFrog).toBe(true);
  });

  it('shows project autocomplete when typing @ in composer', async () => {
    await store.getState().createProject('Work', '#22d3ee');
    render(<Board filterProjectId={null} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add card' }));
    const dialog = screen.getByRole('dialog', { name: 'Add card' });
    const textarea = within(dialog).getByRole('textbox', { name: 'Details' });

    await userEvent.type(textarea, '@W');
    const suggestionList = document.querySelector('[role="listbox"]');
    expect(suggestionList).toBeInTheDocument();
    expect(within(suggestionList as HTMLElement).getByText('Work')).toBeInTheDocument();
  });

  it('accepting a project suggestion inserts full project name', async () => {
    await store.getState().createProject('Work', '#22d3ee');
    render(<Board filterProjectId={null} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add card' }));
    const dialog = screen.getByRole('dialog', { name: 'Add card' });
    const textarea = within(dialog).getByRole('textbox', { name: 'Details' });

    await userEvent.type(textarea, '@W');
    const suggestionList = document.querySelector('[role="listbox"]');
    expect(suggestionList).toBeInTheDocument();

    await userEvent.click(within(suggestionList as HTMLElement).getByText('Work'));
    expect(textarea).toHaveValue('@Work ');
  });

  it('submitting with accepted suggestion assigns the project', async () => {
    const project = await store.getState().createProject('Work', '#22d3ee');
    render(<Board filterProjectId={null} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add card' }));
    const dialog = screen.getByRole('dialog', { name: 'Add card' });
    const textarea = within(dialog).getByRole('textbox', { name: 'Details' });

    await userEvent.type(textarea, '@Work{Enter}');
    const todos = store.getState().todos;
    expect(todos).toHaveLength(1);
    expect(todos[0]).toMatchObject({
      title: '',
      projectId: project.id,
    });
  });

  it('closes autocomplete on Escape without closing dialog', async () => {
    await store.getState().createProject('Work', '#22d3ee');
    render(<Board filterProjectId={null} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add card' }));
    const dialog = screen.getByRole('dialog', { name: 'Add card' });
    const textarea = within(dialog).getByRole('textbox', { name: 'Details' });

    await userEvent.type(textarea, '@W');
    let suggestionList = document.querySelector('[role="listbox"]');
    expect(suggestionList).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    suggestionList = document.querySelector('[role="listbox"]');
    expect(suggestionList).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Add card' })).toBeInTheDocument();
  });

  it('preserves unmatched @ token in project autocomplete', async () => {
    render(<Board filterProjectId={null} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add card' }));
    const dialog = screen.getByRole('dialog', { name: 'Add card' });
    const textarea = within(dialog).getByRole('textbox', { name: 'Details' });

    await userEvent.type(textarea, 'email @nodentist{Enter}');
    const todos = store.getState().todos;
    expect(todos).toHaveLength(1);
    expect(todos[0]).toMatchObject({
      title: 'email @nodentist',
      projectId: null,
    });
  });
});
