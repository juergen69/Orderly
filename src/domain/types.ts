export type Status = 'todo' | 'inProgress' | 'done';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Project {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  order: string;
  boardOrder: string;
}

export interface Todo {
  id: string;
  projectId: string | null;
  title: string;
  description: string;
  status: Status;
  dueDate: string | null;
  boardOrder: string;
  createdAt: string;
  updatedAt: string;
  doneAt: string | null;
  recurrence: Recurrence;
  reminderAt: string | null;
  reminderLead: string | null;
  tags: string[];
  isFrog: boolean;
}

export interface SubStep {
  id: string;
  todoId: string;
  title: string;
  done: boolean;
  order: string;
  createdAt: string;
}

export interface FocusArea {
  index: number;
  text: string;
}

export interface FocusSlot {
  index: number;
  todoId: string | null;
  tier?: 1 | 3 | 5;
}
