// Every change to the board is a pure function from state to state, so the
// rules can be tested without rendering anything.
import { COLUMNS, type BoardState, type ColumnId, type Priority, type Task } from './types';

export const emptyBoard = (): BoardState => ({ tasks: [], filter: '', version: 1 });

const nextOrder = (tasks: Task[], column: ColumnId): number =>
  tasks.filter((t) => t.column === column).reduce((max, t) => Math.max(max, t.order), -1) + 1;

export function createTask(
  state: BoardState,
  input: { title: string; notes?: string; column?: ColumnId; priority?: Priority; tags?: string[] },
  now: () => string = () => new Date().toISOString(),
  id: () => string = () => crypto.randomUUID(),
): BoardState {
  const title = input.title.trim();
  if (!title) return state;
  const column = input.column ?? 'todo';
  const task: Task = {
    id: id(),
    title,
    notes: input.notes?.trim() ?? '',
    column,
    priority: input.priority ?? 'medium',
    tags: (input.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean),
    createdAt: now(),
    completedAt: column === 'done' ? now() : null,
    order: nextOrder(state.tasks, column),
  };
  return { ...state, tasks: [...state.tasks, task] };
}

export function updateTask(state: BoardState, id: string, patch: Partial<Task>,
                           now: () => string = () => new Date().toISOString()): BoardState {
  return {
    ...state,
    tasks: state.tasks.map((task) => {
      if (task.id !== id) return task;
      const next = { ...task, ...patch };
      // completedAt is derived from the column, never set by hand, so reopening
      // a task cannot leave a stale completion date behind.
      if (patch.column && patch.column !== task.column) {
        next.completedAt = patch.column === 'done' ? now() : null;
      }
      return next;
    }),
  };
}

export function deleteTask(state: BoardState, id: string): BoardState {
  return { ...state, tasks: state.tasks.filter((task) => task.id !== id) };
}

/** Move a task to another column, or to another position in the same one. */
export function moveTask(state: BoardState, id: string, column: ColumnId, index?: number,
                         now: () => string = () => new Date().toISOString()): BoardState {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return state;
  const target = state.tasks
    .filter((t) => t.column === column && t.id !== id)
    .sort((a, b) => a.order - b.order);
  const position = index === undefined ? target.length : Math.max(0, Math.min(index, target.length));
  target.splice(position, 0, { ...task, column });
  const reordered = new Map(target.map((t, i) => [t.id, i]));
  return {
    ...state,
    tasks: state.tasks.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          column,
          order: reordered.get(id) ?? 0,
          completedAt: column === 'done' ? (t.completedAt ?? now()) : null,
        };
      }
      return reordered.has(t.id) ? { ...t, order: reordered.get(t.id)! } : t;
    }),
  };
}

/** Move a task one column left or right — the keyboard alternative to dragging. */
export function nudge(state: BoardState, id: string, direction: -1 | 1): BoardState {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return state;
  const next = COLUMNS[COLUMNS.indexOf(task.column) + direction];
  return next ? moveTask(state, id, next) : state;
}

export function visibleTasks(state: BoardState, column: ColumnId): Task[] {
  const needle = state.filter.trim().toLowerCase();
  return state.tasks
    .filter((task) => task.column === column)
    .filter((task) =>
      !needle ||
      task.title.toLowerCase().includes(needle) ||
      task.notes.toLowerCase().includes(needle) ||
      task.tags.some((tag) => tag.includes(needle.replace(/^#/, ''))))
    .sort((a, b) => a.order - b.order);
}

export function stats(state: BoardState) {
  const total = state.tasks.length;
  const done = state.tasks.filter((t) => t.column === 'done').length;
  return {
    total,
    done,
    doing: state.tasks.filter((t) => t.column === 'doing').length,
    todo: state.tasks.filter((t) => t.column === 'todo').length,
    percent: total ? Math.round((done / total) * 100) : 0,
    tags: [...new Set(state.tasks.flatMap((t) => t.tags))].sort(),
  };
}

export function clearDone(state: BoardState): BoardState {
  return { ...state, tasks: state.tasks.filter((task) => task.column !== 'done') };
}

/** Parse "#tag" markers out of a title: "Fix login #auth #urgent". */
export function parseTitle(raw: string): { title: string; tags: string[] } {
  const tags = [...raw.matchAll(/#([\w-]+)/g)].map((match) => match[1]!.toLowerCase());
  return { title: raw.replace(/#[\w-]+/g, '').replace(/\s+/g, ' ').trim(), tags };
}
