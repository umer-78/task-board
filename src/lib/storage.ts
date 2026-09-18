// Persistence. Every read and write is guarded: private mode, a full quota or a
// corrupted value must degrade to an empty board, not a blank screen.
import { COLUMNS, PRIORITIES, type BoardState, type Task } from './types';
import { emptyBoard } from './board';

export const STORAGE_KEY = 'task-board:v1';

function isTask(value: unknown): value is Task {
  const task = value as Task;
  return !!task && typeof task.id === 'string' && typeof task.title === 'string'
    && COLUMNS.includes(task.column) && PRIORITIES.includes(task.priority)
    && Array.isArray(task.tags) && typeof task.order === 'number';
}

export function load(storage: Storage | undefined = safeStorage()): BoardState {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return emptyBoard();
    const parsed = JSON.parse(raw) as BoardState;
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks.filter(isTask) : [];
    return { ...emptyBoard(), ...parsed, tasks, filter: '' };
  } catch {
    return emptyBoard();
  }
}

export function save(state: BoardState, storage: Storage | undefined = safeStorage()): boolean {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ ...state, filter: '' }));
    return true;
  } catch {
    return false;   // quota or private mode: the board keeps working in memory
  }
}

export function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function exportJson(state: BoardState): string {
  return JSON.stringify({ ...state, filter: '' }, null, 2);
}

export function importJson(text: string): BoardState {
  const parsed = JSON.parse(text) as BoardState;
  const tasks = Array.isArray(parsed?.tasks) ? parsed.tasks.filter(isTask) : [];
  if (!tasks.length) throw new Error('That file has no tasks in it.');
  return { ...emptyBoard(), tasks };
}
