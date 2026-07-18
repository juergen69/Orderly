import { beforeEach, describe, expect, it } from 'vitest';
import { createStore } from './store';
import { InMemoryRepository } from '../storage/InMemoryRepository';
import type { Todo } from '../domain/types';
import { selectTodosByStatus, selectTodosByProject, selectArchivedSplit } from './selectors';

function makeStore() {
  return createStore({ repository: new InMemoryRepository() });
}

describe('store actions', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(async () => {
    store = makeStore();
    await store.getState().hydrate();
  });

  it('creates a project and persists it via the repository', async () => {
    const project = await store.getState().createProject('Work', '#22d3ee');
    const stored = await store.getState().repository.getProject(project.id);
    expect(stored).not.toBeNull();
    expect(stored?.name).toBe('Work');
    expect(store.getState().projects).toHaveLength(1);
  });

  it('updates a project', async () => {
    const project = await store.getState().createProject('Work', '#22d3ee');
    await store.getState().updateProject({ ...project, name: 'Job' });
    expect(store.getState().projects[0]?.name).toBe('Job');
    expect((await store.getState().repository.getProject(project.id))?.name).toBe('Job');
  });

  it('deletes a project and cascades todos + reconciles focus slots', async () => {
    const project = await store.getState().createProject('Work', '#22d3ee');
    const todo = await store.getState().createTodo({ projectId: project.id, title: 't' });
    store.getState().setFocusSlot(0, todo.id);
    await store.getState().deleteProject(project.id, { mode: 'cascade' });
    expect(store.getState().projects).toHaveLength(0);
    expect(store.getState().todos).toHaveLength(0);
    expect(await store.getState().repository.getTodo(todo.id)).toBeNull();
    expect(store.getState().ui.focusSlots[0]?.todoId).toBeNull();
  });

  it('reorders a project', async () => {
    const a = await store.getState().createProject('A', '#000000');
    const b = await store.getState().createProject('B', '#111111');
    const orderA = a.order;
    await store.getState().reorderProject(a.id, b.id, undefined);
    const reordered = store.getState().projects.find((p) => p.id === a.id);
    expect(reordered && reordered.order > orderA).toBe(true);
  });

  it('creates a todo resolving its reminder from due date + lead', async () => {
    const todo = await store.getState().createTodo({
      projectId: null,
      title: 't',
      dueDate: '2024-05-10',
      reminderLead: '1d',
    });
    expect(todo.reminderAt).toBe('2024-05-09');
    expect(await store.getState().repository.getTodo(todo.id)).not.toBeNull();
  });

  it('moves a todo between columns with ordering', async () => {
    const t1 = await store.getState().createTodo({ projectId: null, title: 'a' });
    const t2 = await store.getState().createTodo({ projectId: null, title: 'b' });
    await store.getState().moveTodo(t1.id, 'done', undefined, undefined);
    const todos = store.getState().todos;
    expect(todos.find((t) => t.id === t1.id)?.status).toBe('done');
    expect(selectTodosByStatus(todos, 'todo').map((t) => t.id)).toEqual([t2.id]);
    expect(selectTodosByStatus(todos, 'done')[0]?.id).toBe(t1.id);
  });

  it('sets due date, reminder, recurrence, tags, frog', async () => {
    const todo = await store.getState().createTodo({ projectId: null, title: 't' });
    await store.getState().setTodoDueDate(todo.id, '2024-06-01');
    await store.getState().setTodoReminder(todo.id, '7d');
    await store.getState().setTodoRecurrence(todo.id, 'weekly');
    await store.getState().setTodoTags(todo.id, ['Alpha', 'alpha', 'Beta']);
    await store.getState().toggleFrog(todo.id);
    const t: Todo | undefined = store.getState().todos.find((x) => x.id === todo.id);
    expect(t?.dueDate).toBe('2024-06-01');
    expect(t?.reminderAt).toBe('2024-05-25');
    expect(t?.recurrence).toBe('weekly');
    expect(t?.tags).toEqual(['alpha', 'beta']);
    expect(t?.isFrog).toBe(true);
  });

  it('creates, toggles, reorders and deletes sub-steps', async () => {
    const todo = await store.getState().createTodo({ projectId: null, title: 't' });
    const s1 = await store.getState().createSubStep(todo.id, 'one');
    const s2 = await store.getState().createSubStep(todo.id, 'two');
    await store.getState().toggleSubStep(s1.id);
    expect(store.getState().subSteps.find((s) => s.id === s1.id)?.done).toBe(true);
    await store.getState().reorderSubStep(s2.id, s1.id, undefined);
    const reorderedS2 = store.getState().subSteps.find((s) => s.id === s2.id);
    expect(reorderedS2).toBeDefined();
    expect(reorderedS2!.order > s1.order).toBe(true);
    await store.getState().deleteSubStep(s2.id);
    expect(store.getState().subSteps).toHaveLength(1);
  });

  it('deleting a todo clears its sub-steps and reconciles focus slots', async () => {
    const todo = await store.getState().createTodo({ projectId: null, title: 't' });
    await store.getState().createSubStep(todo.id, 'one');
    store.getState().setFocusSlot(2, todo.id);
    await store.getState().deleteTodo(todo.id);
    expect(store.getState().subSteps).toHaveLength(0);
    expect(store.getState().ui.focusSlots[2]?.todoId).toBeNull();
  });

  it('selectTodosByProject filters correctly', async () => {
    const project = await store.getState().createProject('P', '#000000');
    await store.getState().createTodo({ projectId: project.id, title: 'a' });
    await store.getState().createTodo({ projectId: null, title: 'b' });
    const inProject = selectTodosByProject(store.getState().todos, project.id);
    expect(inProject).toHaveLength(1);
    expect(selectTodosByProject(store.getState().todos, null)).toHaveLength(1);
  });

  it('selectArchivedSplit separates old done todos', async () => {
    const old = await store.getState().createTodo({ projectId: null, title: 'old' });
    await store.getState().updateTodo({ ...old, status: 'done', doneAt: '2024-01-01' });
    const split = selectArchivedSplit(store.getState().todos, '2024-02-01');
    expect(split.archived.map((t) => t.id)).toEqual([old.id]);
  });

  it('reconciles focus slots after replaceAll (import)', async () => {
    const todo = await store.getState().createTodo({ projectId: null, title: 'old' });
    store.getState().setFocusSlot(0, todo.id);

    const importedTodo: Todo = {
      ...todo,
      id: 'imported-id',
      title: 'new',
    };
    await store.getState().replaceAll({
      projects: [],
      todos: [importedTodo],
      subSteps: [],
    });
    expect(store.getState().todos.map((t) => t.id)).toEqual(['imported-id']);
    expect(store.getState().ui.focusSlots[0]?.todoId).toBeNull();
    expect(await store.getState().repository.getTodo('imported-id')).not.toBeNull();
  });
});
