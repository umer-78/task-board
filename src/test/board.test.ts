import { describe, expect, it } from 'vitest';
import {
  clearDone, createTask, deleteTask, emptyBoard, moveTask, nudge, parseTitle, stats, updateTask, visibleTasks,
} from '../lib/board';
import { exportJson, importJson, load, save, STORAGE_KEY } from '../lib/storage';
import type { BoardState } from '../lib/types';

let counter = 0;
const id = () => `id-${++counter}`;
const now = () => '2026-09-17T10:00:00.000Z';
const add = (state: BoardState, title: string, column: 'todo' | 'doing' | 'done' = 'todo') =>
  createTask(state, { title, column }, now, id);

describe('tasks', () => {
  it('adds a task to the end of its column', () => {
    let board = add(emptyBoard(), 'First');
    board = add(board, 'Second');
    expect(board.tasks.map((t) => t.title)).toEqual(['First', 'Second']);
    expect(board.tasks.map((t) => t.order)).toEqual([0, 1]);
  });

  it('ignores an empty title and trims the rest', () => {
    expect(add(emptyBoard(), '   ').tasks).toHaveLength(0);
    expect(add(emptyBoard(), '  Tidy up  ').tasks[0]!.title).toBe('Tidy up');
  });

  it('sets completedAt only in the done column', () => {
    const board = add(emptyBoard(), 'Ship it', 'done');
    expect(board.tasks[0]!.completedAt).toBe(now());
    const reopened = updateTask(board, board.tasks[0]!.id, { column: 'doing' }, now);
    expect(reopened.tasks[0]!.completedAt).toBeNull();
  });

  it('updates and deletes', () => {
    const board = add(emptyBoard(), 'Draft');
    const taskId = board.tasks[0]!.id;
    const edited = updateTask(board, taskId, { title: 'Final', priority: 'high' });
    expect(edited.tasks[0]).toMatchObject({ title: 'Final', priority: 'high' });
    expect(deleteTask(edited, taskId).tasks).toHaveLength(0);
    expect(deleteTask(edited, 'missing').tasks).toHaveLength(1);
  });

  it('parses inline #tags out of the title', () => {
    expect(parseTitle('Fix login #auth #urgent')).toEqual({ title: 'Fix login', tags: ['auth', 'urgent'] });
    expect(parseTitle('No tags here')).toEqual({ title: 'No tags here', tags: [] });
  });
});

describe('moving', () => {
  it('moves between columns and renumbers the target', () => {
    let board = add(emptyBoard(), 'A', 'doing');
    board = add(board, 'B', 'doing');
    board = add(board, 'C');
    const moved = moveTask(board, board.tasks[2]!.id, 'doing', 0, now);
    const doing = visibleTasks(moved, 'doing');
    expect(doing.map((t) => t.title)).toEqual(['C', 'A', 'B']);
    expect(doing.map((t) => t.order)).toEqual([0, 1, 2]);
  });

  it('keeps the original completion time when re-ordering inside done', () => {
    const board = add(emptyBoard(), 'Shipped', 'done');
    const moved = moveTask(board, board.tasks[0]!.id, 'done', 0, () => '2030-01-01T00:00:00.000Z');
    expect(moved.tasks[0]!.completedAt).toBe(now());
  });

  it('nudges left and right, and stops at the ends', () => {
    const board = add(emptyBoard(), 'Task');
    const taskId = board.tasks[0]!.id;
    expect(nudge(board, taskId, -1).tasks[0]!.column).toBe('todo');
    const doing = nudge(board, taskId, 1);
    expect(doing.tasks[0]!.column).toBe('doing');
    const done = nudge(doing, taskId, 1);
    expect(done.tasks[0]!.column).toBe('done');
    expect(nudge(done, taskId, 1).tasks[0]!.column).toBe('done');
    expect(nudge(done, 'missing', 1)).toBe(done);
  });
});

describe('filtering and stats', () => {
  const build = () => {
    let board = add(emptyBoard(), 'Write tests');
    board = createTask(board, { title: 'Fix login', tags: ['auth'] }, now, id);
    board = add(board, 'Deploy', 'done');
    return board;
  };

  it('filters by text and by tag', () => {
    const board = build();
    expect(visibleTasks({ ...board, filter: 'login' }, 'todo').map((t) => t.title)).toEqual(['Fix login']);
    expect(visibleTasks({ ...board, filter: '#auth' }, 'todo').map((t) => t.title)).toEqual(['Fix login']);
    expect(visibleTasks({ ...board, filter: 'nothing' }, 'todo')).toHaveLength(0);
  });

  it('counts progress and collects tags', () => {
    const board = build();
    expect(stats(board)).toMatchObject({ total: 3, done: 1, todo: 2, percent: 33, tags: ['auth'] });
    expect(stats(emptyBoard()).percent).toBe(0);
  });

  it('clears the done column only', () => {
    const cleared = clearDone(build());
    expect(cleared.tasks).toHaveLength(2);
    expect(cleared.tasks.every((t) => t.column !== 'done')).toBe(true);
  });
});

describe('storage', () => {
  const memory = (): Storage => {
    const map = new Map<string, string>();
    return {
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => void map.set(key, value),
      removeItem: (key) => void map.delete(key),
      clear: () => map.clear(),
      key: (i) => [...map.keys()][i] ?? null,
      get length() { return map.size; },
    } as Storage;
  };

  it('round-trips a board', () => {
    const storage = memory();
    const board = add(emptyBoard(), 'Saved');
    expect(save(board, storage)).toBe(true);
    expect(load(storage).tasks[0]!.title).toBe('Saved');
  });

  it('never lets broken storage break the board', () => {
    const broken = {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('quota'); },
    } as unknown as Storage;
    expect(load(broken).tasks).toEqual([]);
    expect(save(emptyBoard(), broken)).toBe(false);
  });

  it('ignores corrupted or foreign data', () => {
    const storage = memory();
    storage.setItem(STORAGE_KEY, 'not json');
    expect(load(storage).tasks).toEqual([]);
    storage.setItem(STORAGE_KEY, JSON.stringify({ tasks: [{ id: 'x' }, { nonsense: true }] }));
    expect(load(storage).tasks).toEqual([]);
  });

  it('exports and imports', () => {
    const board = add(emptyBoard(), 'Portable');
    const restored = importJson(exportJson(board));
    expect(restored.tasks[0]!.title).toBe('Portable');
    expect(() => importJson('{"tasks":[]}')).toThrow(/no tasks/);
    expect(() => importJson('nope')).toThrow();
  });
});
