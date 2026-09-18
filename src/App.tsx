import { useEffect, useMemo, useRef, useState } from 'react';
import { Column } from './components/Column';
import { TaskCard } from './components/TaskCard';
import {
  clearDone, createTask, deleteTask, emptyBoard, moveTask, nudge, parseTitle, stats, updateTask, visibleTasks,
} from './lib/board';
import { exportJson, importJson, load, save } from './lib/storage';
import { COLUMNS, type BoardState } from './lib/types';

const SAMPLE = [
  { title: 'Read the README #docs', column: 'todo' as const },
  { title: 'Drag a card, or press → to move it', column: 'doing' as const },
  { title: 'Everything is saved in this browser #local', column: 'done' as const },
];

export default function App() {
  const [state, setState] = useState<BoardState>(() => {
    const loaded = load();
    if (loaded.tasks.length) return loaded;
    return SAMPLE.reduce((acc, task) => {
      const { title, tags } = parseTitle(task.title);
      return createTask(acc, { title, tags, column: task.column });
    }, emptyBoard());
  });
  const [dragging, setDragging] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [draft, setDraft] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { setSaveFailed(!save(state)); }, [state]);

  const summary = useMemo(() => stats(state), [state]);

  const add = () => {
    const { title, tags } = parseTitle(draft);
    if (!title) return;
    setState((current) => createTask(current, { title, tags }));
    setDraft('');
  };

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>Task Board</h1>
          <p>{summary.done} of {summary.total} done · everything stays in this browser</p>
        </div>
        <span className="spacer" />
        <button onClick={() => {
          const blob = new Blob([exportJson(state)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'task-board.json';
          link.click();
          URL.revokeObjectURL(url);
        }}>Export</button>
        <button onClick={() => fileInput.current?.click()}>Import</button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          hidden
          aria-label="Import a board file"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              setState(importJson(await file.text()));
            } catch (error) {
              alert(error instanceof Error ? error.message : 'That file could not be read.');
            }
            event.target.value = '';
          }}
        />
        <button onClick={() => setState(clearDone)} disabled={!summary.done}>Clear done</button>
      </header>

      {saveFailed && (
        <p role="status" style={{ color: 'var(--high)' }}>
          Changes cannot be saved in this browser (private mode or storage is full), so they will be
          lost when you close the tab. Export to keep them.
        </p>
      )}

      <div className="toolbar">
        <div className="new">
          <label className="sr-only" htmlFor="new-task">New task</label>
          <input
            id="new-task"
            placeholder="What needs doing?  Add #tags inline"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') add(); }}
          />
          <button className="primary" onClick={add}>Add</button>
        </div>
        <label className="sr-only" htmlFor="filter">Filter tasks</label>
        <input
          id="filter"
          type="search"
          placeholder="Filter by text or #tag"
          value={state.filter}
          onChange={(event) => setState((current) => ({ ...current, filter: event.target.value }))}
        />
      </div>

      <div className="progress" aria-hidden="true"><i style={{ width: `${summary.percent}%` }} /></div>

      <div className="board">
        {COLUMNS.map((column) => {
          const tasks = visibleTasks(state, column);
          return (
            <Column
              key={column}
              id={column}
              count={tasks.length}
              onDrop={(taskId) => setState((current) => moveTask(current, taskId, column))}
            >
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  dragging={dragging === task.id}
                  onDragStart={() => setDragging(task.id)}
                  onDragEnd={() => setDragging(null)}
                  onChange={(patch) => setState((current) => updateTask(current, task.id, patch))}
                  onDelete={() => setState((current) => deleteTask(current, task.id))}
                  onNudge={(direction) => setState((current) => nudge(current, task.id, direction))}
                />
              ))}
              {!tasks.length && <p className="empty">Nothing here.</p>}
            </Column>
          );
        })}
      </div>

      <footer>
        Drag cards, or focus one and press <kbd>←</kbd> / <kbd>→</kbd> to move it,{' '}
        <kbd>Enter</kbd> to edit and <kbd>Delete</kbd> to remove.
        {summary.tags.length > 0 && <> Tags in use: {summary.tags.map((tag) => `#${tag}`).join(' ')}.</>}
        {' '}<a href="https://github.com/umer-78/task-board">Source on GitHub</a>
      </footer>
    </div>
  );
}
