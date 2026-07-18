import type { Status } from '../../domain/types';

export interface ColumnMeta {
  status: Status;
  title: string;
}

// Fixed 3-column layout matching the domain Status names (spec §3).
export const BOARD_COLUMNS: readonly ColumnMeta[] = [
  { status: 'todo', title: 'To do' },
  { status: 'inProgress', title: 'In progress' },
  { status: 'done', title: 'Done' },
];
