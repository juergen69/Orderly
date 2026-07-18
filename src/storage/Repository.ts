import type { Project, Todo, SubStep } from '../domain/types';

export interface DataGraph {
  projects: Project[];
  todos: Todo[];
  subSteps: SubStep[];
}

export type DeleteProjectMode = 'cascade' | 'reassign';

export interface DeleteProjectOptions {
  mode: DeleteProjectMode;
  reassignTo?: string | null;
}

export interface Repository {
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  createProject(project: Project): Promise<Project>;
  updateProject(project: Project): Promise<Project>;
  deleteProject(id: string, options: DeleteProjectOptions): Promise<void>;

  getTodos(): Promise<Todo[]>;
  getTodosByProject(projectId: string | null): Promise<Todo[]>;
  getTodo(id: string): Promise<Todo | null>;
  createTodo(todo: Todo): Promise<Todo>;
  updateTodo(todo: Todo): Promise<Todo>;
  deleteTodo(id: string): Promise<void>;

  getSubSteps(): Promise<SubStep[]>;
  getSubStepsByTodo(todoId: string): Promise<SubStep[]>;
  createSubStep(subStep: SubStep): Promise<SubStep>;
  updateSubStep(subStep: SubStep): Promise<SubStep>;
  deleteSubStep(id: string): Promise<void>;

  exportAll(): Promise<DataGraph>;
  replaceAll(data: DataGraph): Promise<void>;
}
