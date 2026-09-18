export const COLUMNS = ['todo', 'doing', 'done'] as const;
export type ColumnId = (typeof COLUMNS)[number];

export const COLUMN_LABELS: Record<ColumnId, string> = {
  todo: 'To do',
  doing: 'Doing',
  done: 'Done',
};

export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface Task {
  id: string;
  title: string;
  notes: string;
  column: ColumnId;
  priority: Priority;
  tags: string[];
  createdAt: string;
  completedAt: string | null;
  order: number;
}

export interface BoardState {
  tasks: Task[];
  filter: string;
  version: 1;
}
