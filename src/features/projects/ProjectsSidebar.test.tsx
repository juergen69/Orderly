import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from '../../store/store';
import { InMemoryRepository } from '../../storage/InMemoryRepository';
import { setActiveStore } from '../../store/storeInstance';
import { ProjectsSidebar } from './ProjectsSidebar';

function Harness() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <ProjectsSidebar selectedProjectId={selected} onSelect={setSelected} />
      <div data-testid="selected">{selected ?? 'all'}</div>
    </>
  );
}

describe('ProjectsSidebar', () => {
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

  it('renders projects sorted by name with an "All projects" row', async () => {
    await store.getState().createProject('Zebra', '#22d3ee');
    await store.getState().createProject('Alpha', '#a3e635');
    await store.getState().createProject('mango', '#f472b6');

    render(<Harness />);

    // Row buttons carry no aria-label (unlike the Edit/Delete/New buttons),
    // so their accessible name is their visible text.
    const rowNames = screen
      .getAllByRole('button')
      .filter((b) => !b.hasAttribute('aria-label'))
      .map((b) => b.textContent?.trim())
      .filter((t): t is string => Boolean(t));
    // "All projects" first, then case-insensitive alphabetical order.
    expect(rowNames).toEqual(['All projects', 'Alpha', 'mango', 'Zebra']);
  });

  it('filters to a project when its row is selected', async () => {
    const p = await store.getState().createProject('Work', '#22d3ee');
    render(<Harness />);

    await userEvent.click(screen.getByRole('button', { name: 'Work' }));
    expect(screen.getByTestId('selected')).toHaveTextContent(p.id);

    await userEvent.click(screen.getByRole('button', { name: 'All projects' }));
    expect(screen.getByTestId('selected')).toHaveTextContent('all');
  });

  it('rejects an invalid hex color and does not create the project', async () => {
    render(<Harness />);

    await userEvent.click(screen.getByRole('button', { name: 'New project' }));
    await userEvent.type(screen.getByLabelText('Project name'), 'Bad Color');
    const hex = screen.getByLabelText('Project color hex');
    await userEvent.clear(hex);
    await userEvent.type(hex, 'not-a-hex');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/hex color/i);
    expect(store.getState().projects).toHaveLength(0);
    // dialog stays open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('creates a project with a valid name and hex color', async () => {
    render(<Harness />);

    await userEvent.click(screen.getByRole('button', { name: 'New project' }));
    await userEvent.type(screen.getByLabelText('Project name'), 'Home');
    const hex = screen.getByLabelText('Project color hex');
    await userEvent.clear(hex);
    await userEvent.type(hex, '#123abc');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    const projects = store.getState().projects;
    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({ name: 'Home', color: '#123abc' });
  });

  it('cascade delete removes the project, its todos and their sub-steps', async () => {
    const project = await store.getState().createProject('Doomed', '#22d3ee');
    const todo = await store
      .getState()
      .createTodo({ projectId: project.id, title: 'task' });
    await store.getState().createSubStep(todo.id, 'step');

    render(<Harness />);

    await userEvent.click(screen.getByRole('button', { name: 'Delete Doomed' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('radio', { name: /Delete todos and their sub-steps/ }),
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete everything' }));

    const state = store.getState();
    expect(state.projects).toHaveLength(0);
    expect(state.todos).toHaveLength(0);
    expect(state.subSteps).toHaveLength(0);
  });

  it('reassign delete moves todos to the target project and keeps their sub-steps', async () => {
    const source = await store.getState().createProject('Source', '#22d3ee');
    const target = await store.getState().createProject('Target', '#a3e635');
    const todo = await store
      .getState()
      .createTodo({ projectId: source.id, title: 'task' });
    await store.getState().createSubStep(todo.id, 'step');

    render(<Harness />);

    await userEvent.click(screen.getByRole('button', { name: 'Delete Source' }));
    const dialog = screen.getByRole('dialog');
    // reassign is the default mode; choose the target project.
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Reassign todos to'),
      target.id,
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Reassign & delete' }),
    );

    const state = store.getState();
    expect(state.projects.map((p) => p.name)).toEqual(['Target']);
    expect(state.todos).toHaveLength(1);
    expect(state.todos[0]!.projectId).toBe(target.id);
    // Sub-step still attached to its parent todo.
    expect(state.subSteps).toHaveLength(1);
    expect(state.subSteps[0]!.todoId).toBe(todo.id);
  });

  it('reassign to "No project" sets todo projectId to null', async () => {
    const source = await store.getState().createProject('Source', '#22d3ee');
    await store.getState().createTodo({ projectId: source.id, title: 'task' });

    render(<Harness />);

    await userEvent.click(screen.getByRole('button', { name: 'Delete Source' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Reassign & delete' }),
    );

    const state = store.getState();
    expect(state.projects).toHaveLength(0);
    expect(state.todos).toHaveLength(1);
    expect(state.todos[0]!.projectId).toBeNull();
  });

  it('closes drawer when a project is selected in drawer mode', async () => {
    await store.getState().createProject('Work', '#22d3ee');
    const on_close = vi.fn();

    render(<Harness />);

    const drawer = screen.getByLabelText('Projects');
    expect(drawer).not.toHaveAttribute('data-drawer-open');

    // Re-render with drawer prop
    cleanup();
    render(
      <ProjectsSidebar
        selectedProjectId={null}
        onSelect={() => {}}
        drawer
        onClose={on_close}
      />,
    );

    expect(screen.getByLabelText('Projects')).toHaveAttribute('data-drawer-open');
    await userEvent.click(screen.getByRole('button', { name: 'Work' }));
    expect(on_close).toHaveBeenCalled();
  });
});
