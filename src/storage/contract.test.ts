import { describe, expect, it } from 'vitest';
import type { DataGraph, Repository } from './Repository';
import type { Project, SubStep, Todo } from '../domain/types';

// This file is a reusable suite factory. It contains no top-level tests on its
// own; the actual `describe` blocks are created by the function below and
// invoked from implementation test files (e.g. InMemoryRepository.test.ts).
describe('repository contract factory', () => {
  it('is a shared suite definition', () => {
    expect(typeof repositoryContractTest).toBe('function');
  });
});

function project(id: string, name: string): Project {
  return {
    id,
    name,
    color: '#000000',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    order: id,
    boardOrder: id,
  };
}

function todo(id: string, projectId: string | null): Todo {
  return {
    id,
    projectId,
    title: `todo-${id}`,
    description: '',
    status: 'todo',
    dueDate: null,
    boardOrder: id,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    doneAt: null,
    recurrence: 'none',
    reminderAt: null,
    reminderLead: null,
    tags: [],
    isFrog: false,
  };
}

function subStep(id: string, todoId: string): SubStep {
  return {
    id,
    todoId,
    title: `sub-${id}`,
    done: false,
    order: id,
    createdAt: '2024-01-01T00:00:00.000Z',
  };
}

export function repositoryContractTest(
  makeRepo: () => Repository,
  makeFailingReplaceAllRepo: () => Repository,
): void {
  describe('Repository contract', () => {
    it('supports project CRUD', async () => {
      const repo = makeRepo();
      const created = await repo.createProject(project('p1', 'A'));
      expect(created.id).toBe('p1');
      expect(await repo.getProject('p1')).toEqual(created);
      const updated = { ...created, name: 'B' };
      await repo.updateProject(updated);
      expect((await repo.getProject('p1'))?.name).toBe('B');
      expect(await repo.getProjects()).toHaveLength(1);
      await repo.deleteProject('p1', { mode: 'cascade' });
      expect(await repo.getProject('p1')).toBeNull();
    });

    it('supports todo CRUD and cascade delete', async () => {
      const repo = makeRepo();
      await repo.createProject(project('p1', 'A'));
      const t = await repo.createTodo(todo('t1', 'p1'));
      await repo.createSubStep(subStep('s1', 't1'));
      expect(await repo.getTodosByProject('p1')).toHaveLength(1);
      expect(await repo.getSubStepsByTodo('t1')).toHaveLength(1);
      const updated = { ...t, title: 'changed' };
      await repo.updateTodo(updated);
      expect((await repo.getTodo('t1'))?.title).toBe('changed');
      await repo.deleteTodo('t1');
      expect(await repo.getTodo('t1')).toBeNull();
      expect(await repo.getSubStepsByTodo('t1')).toHaveLength(0);
    });

    it('deleteProject cascade removes todos and sub-steps', async () => {
      const repo = makeRepo();
      await repo.createProject(project('p1', 'A'));
      await repo.createTodo(todo('t1', 'p1'));
      await repo.createTodo(todo('t2', 'p1'));
      await repo.createSubStep(subStep('s1', 't1'));
      await repo.createSubStep(subStep('s2', 't2'));

      await repo.deleteProject('p1', { mode: 'cascade' });

      expect(await repo.getProject('p1')).toBeNull();
      expect(await repo.getTodosByProject('p1')).toHaveLength(0);
      expect(await repo.getTodos()).toHaveLength(0);
      expect(await repo.getSubSteps()).toHaveLength(0);
    });

    it('deleteProject reassign keeps todos and sub-steps with their parent', async () => {
      const repo = makeRepo();
      await repo.createProject(project('p1', 'A'));
      await repo.createProject(project('p2', 'B'));
      await repo.createTodo(todo('t1', 'p1'));
      await repo.createTodo(todo('t2', 'p1'));
      await repo.createSubStep(subStep('s1', 't1'));
      await repo.createSubStep(subStep('s2', 't2'));

      await repo.deleteProject('p1', { mode: 'reassign', reassignTo: 'p2' });

      expect(await repo.getProject('p1')).toBeNull();
      const moved = await repo.getTodosByProject('p2');
      expect(moved).toHaveLength(2);
      expect(moved.map((t) => t.id).sort()).toEqual(['t1', 't2']);
      expect(await repo.getSubStepsByTodo('t1')).toHaveLength(1);
      expect(await repo.getSubStepsByTodo('t2')).toHaveLength(1);
    });

    it('deleteProject reassign to null keeps todos unassigned', async () => {
      const repo = makeRepo();
      await repo.createProject(project('p1', 'A'));
      await repo.createTodo(todo('t1', 'p1'));
      await repo.createSubStep(subStep('s1', 't1'));

      await repo.deleteProject('p1', { mode: 'reassign', reassignTo: null });

      expect(await repo.getProject('p1')).toBeNull();
      const t = await repo.getTodo('t1');
      expect(t?.projectId).toBeNull();
      expect(await repo.getSubStepsByTodo('t1')).toHaveLength(1);
    });

    it('exportAll returns full graph with integrity', async () => {
      const repo = makeRepo();
      await repo.createProject(project('p1', 'A'));
      await repo.createTodo(todo('t1', 'p1'));
      await repo.createSubStep(subStep('s1', 't1'));

      const graph: DataGraph = await repo.exportAll();
      expect(graph.projects).toHaveLength(1);
      expect(graph.todos).toHaveLength(1);
      expect(graph.subSteps).toHaveLength(1);
      expect(graph.todos[0]?.projectId).toBe('p1');
      expect(graph.subSteps[0]?.todoId).toBe('t1');
    });

    it('replaceAll replaces the entire graph', async () => {
      const repo = makeRepo();
      await repo.createProject(project('p1', 'A'));
      await repo.createTodo(todo('t1', 'p1'));

      await repo.replaceAll({
        projects: [project('p2', 'B')],
        todos: [todo('t2', 'p2')],
        subSteps: [],
      });

      const graph = await repo.exportAll();
      expect(graph.projects.map((p) => p.id)).toEqual(['p2']);
      expect(graph.todos.map((t) => t.id)).toEqual(['t2']);
    });

    it('replaceAll is atomic: failure leaves prior data intact', async () => {
      const repo = makeFailingReplaceAllRepo();
      await repo.createProject(project('p1', 'A'));
      await repo.createTodo(todo('t1', 'p1'));

      await expect(
        repo.replaceAll({
          projects: [project('p2', 'B')],
          todos: [todo('t2', 'p2')],
          subSteps: [],
        }),
      ).rejects.toBeTruthy();

      const graph = await repo.exportAll();
      expect(graph.projects.map((p) => p.id)).toEqual(['p1']);
      expect(graph.todos.map((t) => t.id)).toEqual(['t1']);
    });
  });
}
