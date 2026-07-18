import { create } from 'zustand';
import type { Repository, DeleteProjectOptions } from '../storage/Repository';
import type {
  Project,
  SubStep,
  Todo,
  FocusSlot,
  FocusArea,
  Status,
  Recurrence,
} from '../domain/types';
import { newId } from '../domain/ids';
import { nowIso } from '../domain/time';
import { first, between, last as lastKey } from '../domain/ordering';
import { normalizeTags } from '../domain/validation';
import { resolveReminder } from '../domain/reminders';
import {
  defaultUiState,
  loadUiState,
  saveUiState,
  reconcileFocusSlots,
  type UiState,
  type ActiveView,
} from './uiState';

export interface StoreState {
  repository: Repository;
  projects: Project[];
  todos: Todo[];
  subSteps: SubStep[];
  ui: UiState;
  loaded: boolean;

  hydrate(): Promise<void>;

  createProject(name: string, color: string): Promise<Project>;
  updateProject(project: Project): Promise<void>;
  deleteProject(id: string, options: DeleteProjectOptions): Promise<void>;
  reorderProject(id: string, beforeId: string | undefined, afterId: string | undefined): Promise<void>;

  createTodo(input: CreateTodoInput): Promise<Todo>;
  updateTodo(todo: Todo): Promise<void>;
  deleteTodo(id: string): Promise<void>;
  moveTodo(id: string, status: Status, beforeId: string | undefined, afterId: string | undefined): Promise<void>;
  setTodoDueDate(id: string, dueDate: string | null): Promise<void>;
  setTodoReminder(id: string, lead: string | null): Promise<void>;
  setTodoRecurrence(id: string, recurrence: Recurrence): Promise<void>;
  setTodoTags(id: string, tags: string[]): Promise<void>;
  toggleFrog(id: string): Promise<void>;

  createSubStep(todoId: string, title: string): Promise<SubStep>;
  updateSubStep(subStep: SubStep): Promise<void>;
  deleteSubStep(id: string): Promise<void>;
  toggleSubStep(id: string): Promise<void>;
  reorderSubStep(id: string, beforeId: string | undefined, afterId: string | undefined): Promise<void>;

  setActiveView(view: ActiveView): void;
  setShowAllRecurring(value: boolean): void;
  setFocusSlot(index: number, todoId: string | null): void;
  setFocusArea(index: number, text: string): void;

  replaceAll(data: { projects: Project[]; todos: Todo[]; subSteps: SubStep[] }): Promise<void>;
  exportAll(): Promise<{ projects: Project[]; todos: Todo[]; subSteps: SubStep[] }>;
}

export interface CreateTodoInput {
  projectId: string | null;
  title: string;
  description?: string;
  status?: Status;
  dueDate?: string | null;
  reminderLead?: string | null;
  recurrence?: Recurrence;
  tags?: string[];
  isFrog?: boolean;
}

function patchTodoReminder(todo: Todo): Todo {
  const reminderAt = resolveReminder(todo.dueDate, todo.reminderLead);
  return { ...todo, reminderAt };
}

export interface CreateStoreOptions {
  repository: Repository;
}

export function createStore(options: CreateStoreOptions) {
  return create<StoreState>((set, get) => ({
    repository: options.repository,
    projects: [],
    todos: [],
    subSteps: [],
    ui: defaultUiState(),
    loaded: false,

    async hydrate() {
      const { repository } = get();
      const [projects, todos, subSteps] = await Promise.all([
        repository.getProjects(),
        repository.getTodos(),
        repository.getSubSteps(),
      ]);
      set({
        projects,
        todos,
        subSteps,
        ui: loadUiState(),
        loaded: true,
      });
      reconcileAfterLoad(set, get);
    },

    async createProject(name, color) {
      const { repository, projects } = get();
      const order = lastKey(projects.map((p) => p.order));
      const now = nowIso();
      const project: Project = {
        id: newId(),
        name,
        color,
        createdAt: now,
        updatedAt: now,
        order,
        boardOrder: order,
      };
      await repository.createProject(project);
      set({ projects: [...projects, project] });
      return project;
    },

    async updateProject(project) {
      const { repository, projects } = get();
      const updated = { ...project, updatedAt: nowIso() };
      await repository.updateProject(updated);
      set({
        projects: projects.map((p) => (p.id === updated.id ? updated : p)),
      });
    },

    async deleteProject(id, options) {
      const { repository, projects, todos, ui } = get();
      await repository.deleteProject(id, options);
      const remainingProjects = projects.filter((p) => p.id !== id);
      const remainingTodos = todos.filter((t) => t.projectId !== id);
      const validTodoIds = new Set(remainingTodos.map((t) => t.id));
      set({
        projects: remainingProjects,
        todos: remainingTodos,
        ui: { ...ui, focusSlots: reconcileFocusSlots(ui.focusSlots, validTodoIds) },
      });
    },

    async reorderProject(id, beforeId, afterId) {
      const { repository, projects } = get();
      const target = projects.find((p) => p.id === id);
      if (!target) return;
      const beforeKey = beforeId ? projects.find((p) => p.id === beforeId)?.order : undefined;
      const afterKey = afterId ? projects.find((p) => p.id === afterId)?.order : undefined;
      const order = between(beforeKey, afterKey);
      const updated = { ...target, order, updatedAt: nowIso() };
      await repository.updateProject(updated);
      set({
        projects: projects.map((p) => (p.id === id ? updated : p)),
      });
    },

    async createTodo(input) {
      const { repository, todos } = get();
      const now = nowIso();
      const status = input.status ?? 'todo';
      const dueDate = input.dueDate ?? null;
      const reminderLead = input.reminderLead ?? null;
      const recurrence = input.recurrence ?? 'none';
      const tags = normalizeTags(input.tags ?? []);
      const baseTodo: Todo = {
        id: newId(),
        projectId: input.projectId,
        title: input.title,
        description: input.description ?? '',
        status,
        dueDate,
        boardOrder: first(),
        createdAt: now,
        updatedAt: now,
        doneAt: status === 'done' ? now : null,
        recurrence,
        reminderAt: null,
        reminderLead,
        tags,
        isFrog: input.isFrog ?? false,
      };
      const todo = patchTodoReminder(baseTodo);
      await repository.createTodo(todo);
      set({ todos: [...todos, todo] });
      return todo;
    },

    async updateTodo(todo) {
      const { repository, todos } = get();
      const updated = { ...todo, updatedAt: nowIso() };
      await repository.updateTodo(updated);
      set({
        todos: todos.map((t) => (t.id === updated.id ? updated : t)),
      });
    },

    async deleteTodo(id) {
      const { repository, todos, subSteps, ui } = get();
      await repository.deleteTodo(id);
      const remainingTodos = todos.filter((t) => t.id !== id);
      const validTodoIds = new Set(remainingTodos.map((t) => t.id));
      set({
        todos: remainingTodos,
        subSteps: subSteps.filter((s) => s.todoId !== id),
        ui: { ...ui, focusSlots: reconcileFocusSlots(ui.focusSlots, validTodoIds) },
      });
    },

    async moveTodo(id, status, beforeId, afterId) {
      const { repository, todos } = get();
      const target = todos.find((t) => t.id === id);
      if (!target) return;
      const siblings = todos.filter((t) => t.status === status && t.id !== id);
      const beforeKey = beforeId ? siblings.find((t) => t.id === beforeId)?.boardOrder : undefined;
      const afterKey = afterId ? siblings.find((t) => t.id === afterId)?.boardOrder : undefined;
      const boardOrder = between(beforeKey, afterKey);
      const now = nowIso();
      const updated: Todo = {
        ...target,
        status,
        boardOrder,
        updatedAt: now,
        doneAt: status === 'done' ? (target.doneAt ?? now) : null,
      };
      await repository.updateTodo(updated);
      let nextTodos = todos.map((t) => (t.id === id ? updated : t));
      nextTodos = reconcileDoneSlots(nextTodos, get().ui, set);
      set({ todos: nextTodos });
    },

    async setTodoDueDate(id, dueDate) {
      const todo = get().todos.find((t) => t.id === id);
      if (!todo) return;
      const updated = patchTodoReminder({ ...todo, dueDate, updatedAt: nowIso() });
      await get().repository.updateTodo(updated);
      set({ todos: get().todos.map((t) => (t.id === id ? updated : t)) });
    },

    async setTodoReminder(id, lead) {
      const todo = get().todos.find((t) => t.id === id);
      if (!todo) return;
      const updated = patchTodoReminder({
        ...todo,
        reminderLead: lead,
        updatedAt: nowIso(),
      });
      await get().repository.updateTodo(updated);
      set({ todos: get().todos.map((t) => (t.id === id ? updated : t)) });
    },

    async setTodoRecurrence(id, recurrence) {
      const todo = get().todos.find((t) => t.id === id);
      if (!todo) return;
      const updated: Todo = { ...todo, recurrence, updatedAt: nowIso() };
      await get().repository.updateTodo(updated);
      set({ todos: get().todos.map((t) => (t.id === id ? updated : t)) });
    },

    async setTodoTags(id, tags) {
      const todo = get().todos.find((t) => t.id === id);
      if (!todo) return;
      const updated: Todo = {
        ...todo,
        tags: normalizeTags(tags),
        updatedAt: nowIso(),
      };
      await get().repository.updateTodo(updated);
      set({ todos: get().todos.map((t) => (t.id === id ? updated : t)) });
    },

    async toggleFrog(id) {
      const todo = get().todos.find((t) => t.id === id);
      if (!todo) return;
      const updated: Todo = { ...todo, isFrog: !todo.isFrog, updatedAt: nowIso() };
      await get().repository.updateTodo(updated);
      set({ todos: get().todos.map((t) => (t.id === id ? updated : t)) });
    },

    async createSubStep(todoId, title) {
      const { repository, subSteps } = get();
      const order = lastKey(subSteps.filter((s) => s.todoId === todoId).map((s) => s.order));
      const now = nowIso();
      const subStep: SubStep = {
        id: newId(),
        todoId,
        title,
        done: false,
        order,
        createdAt: now,
      };
      await repository.createSubStep(subStep);
      set({ subSteps: [...subSteps, subStep] });
      return subStep;
    },

    async updateSubStep(subStep) {
      const { repository, subSteps } = get();
      await repository.updateSubStep(subStep);
      set({
        subSteps: subSteps.map((s) => (s.id === subStep.id ? subStep : s)),
      });
    },

    async deleteSubStep(id) {
      const { repository, subSteps } = get();
      await repository.deleteSubStep(id);
      set({ subSteps: subSteps.filter((s) => s.id !== id) });
    },

    async toggleSubStep(id) {
      const subStep = get().subSteps.find((s) => s.id === id);
      if (!subStep) return;
      const updated: SubStep = { ...subStep, done: !subStep.done };
      await get().repository.updateSubStep(updated);
      set({ subSteps: get().subSteps.map((s) => (s.id === id ? updated : s)) });
    },

    async reorderSubStep(id, beforeId, afterId) {
      const { repository, subSteps } = get();
      const target = subSteps.find((s) => s.id === id);
      if (!target) return;
      const siblings = subSteps.filter((s) => s.todoId === target.todoId && s.id !== id);
      const beforeKey = beforeId ? siblings.find((s) => s.id === beforeId)?.order : undefined;
      const afterKey = afterId ? siblings.find((s) => s.id === afterId)?.order : undefined;
      const order = between(beforeKey, afterKey);
      const updated: SubStep = { ...target, order };
      await repository.updateSubStep(updated);
      set({
        subSteps: subSteps.map((s) => (s.id === id ? updated : s)),
      });
    },

    setActiveView(view) {
      set((state) => {
        const ui = { ...state.ui, activeView: view };
        saveUiState(ui);
        return { ui };
      });
    },

    setShowAllRecurring(value) {
      set((state) => {
        const ui = { ...state.ui, showAllRecurring: value };
        saveUiState(ui);
        return { ui };
      });
    },

    setFocusSlot(index, todoId) {
      set((state) => {
        const focusSlots = state.ui.focusSlots.map((slot) =>
          slot.index === index ? { index, todoId } : slot,
        );
        const ui = { ...state.ui, focusSlots };
        saveUiState(ui);
        return { ui };
      });
    },

    setFocusArea(index, text) {
      set((state) => {
        const focusAreas = state.ui.focusAreas.map((area) =>
          area.index === index ? { index, text } : area,
        );
        const ui = { ...state.ui, focusAreas };
        saveUiState(ui);
        return { ui };
      });
    },

    async replaceAll(data) {
      const { repository } = get();
      await repository.replaceAll(data);
      const validTodoIds = new Set(data.todos.map((t) => t.id));
      set((state) => ({
        projects: data.projects,
        todos: data.todos,
        subSteps: data.subSteps,
        ui: { ...state.ui, focusSlots: reconcileFocusSlots(state.ui.focusSlots, validTodoIds) },
      }));
    },

    async exportAll() {
      const { repository } = get();
      return repository.exportAll();
    },
  }));
}

function reconcileAfterLoad(
  set: (partial: Partial<StoreState>) => void,
  get: () => StoreState,
): void {
  const { todos, ui } = get();
  const validTodoIds = new Set(todos.map((t) => t.id));
  set({ ui: { ...ui, focusSlots: reconcileFocusSlots(ui.focusSlots, validTodoIds) } });
}

function reconcileDoneSlots(
  todos: Todo[],
  ui: UiState,
  set: (partial: Partial<StoreState>) => void,
): Todo[] {
  const hasDoneSlot = ui.focusSlots.some((slot) => {
    const id = slot.todoId;
    return id !== null && todos.find((t) => t.id === id)?.status === 'done';
  });
  if (!hasDoneSlot) {
    return todos;
  }
  const validTodoIds = new Set(todos.map((t) => t.id));
  set({ ui: { ...ui, focusSlots: reconcileFocusSlots(ui.focusSlots, validTodoIds) } });
  return todos;
}
