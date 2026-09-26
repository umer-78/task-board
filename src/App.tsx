import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'motion/react';
import { BlurFade } from './components/ui/blur-fade';
import { NumberTicker } from './components/ui/number-ticker';
import { ShimmerButton } from './components/ui/shimmer-button';
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
  const [focusId, setFocusId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // Ids that were on screen in the last render. A card that was already visible
  // is moving between columns, so it glides across instead of fading in again.
  const shown = useRef<Set<string> | null>(null);
  const firstRender = shown.current === null;

  useEffect(() => { setSaveFailed(!save(state)); }, [state]);
  useEffect(() => {
    shown.current = new Set(COLUMNS.flatMap((column) => visibleTasks(state, column).map((task) => task.id)));
  });

  const summary = useMemo(() => stats(state), [state]);

  const add = () => {
    const { title, tags } = parseTitle(draft);
    if (!title) return;
    setState((current) => createTask(current, { title, tags }));
    setDraft('');
  };

  return (
    <div className="app">
      <a className="site-crumb" href="https://umer-78.github.io/">← All projects</a>
      <BlurFade>
      <header className="top">
        <div>
          <h1>Task Board</h1>
          <p><NumberTicker value={summary.done} /> of <NumberTicker value={summary.total} /> done · everything stays in this browser</p>
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
      </BlurFade>

      {saveFailed && (
        <p role="status" style={{ color: 'var(--high)' }}>
          Changes cannot be saved in this browser (private mode or storage is full), so they will be
          lost when you close the tab. Export to keep them.
        </p>
      )}

      <BlurFade delay={0.08}>
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
          <ShimmerButton className="primary" onClick={add}>Add</ShimmerButton>
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
      </BlurFade>

      <div className="progress" aria-hidden="true"><i style={{ width: `${summary.percent}%` }} /></div>

      <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 520, damping: 42, mass: 0.9 }}>
        <LayoutGroup>
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
                  <AnimatePresence mode="popLayout">
                    {tasks.map((task, index) => (
                      <motion.div
                        key={task.id}
                        layoutId={task.id}
                        layout="position"
                        className="card-shell"
                        initial={shown.current?.has(task.id) ? false : { opacity: 0, y: 12, scale: 0.97 }}
                        animate={{
                          opacity: 1, y: 0, scale: 1,
                          transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: firstRender ? 0.16 + index * 0.06 : 0 },
                        }}
                        exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
                      >
                        <TaskCard
                          task={task}
                          dragging={dragging === task.id}
                          focusOnMount={focusId === task.id}
                          onFocused={() => setFocusId(null)}
                          onDragStart={() => setDragging(task.id)}
                          onDragEnd={() => setDragging(null)}
                          onChange={(patch) => setState((current) => updateTask(current, task.id, patch))}
                          onDelete={() => setState((current) => deleteTask(current, task.id))}
                          onNudge={(direction) => {
                            setState((current) => nudge(current, task.id, direction));
                            setFocusId(task.id);
                          }}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {!tasks.length && (
                    <motion.p className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Nothing here.</motion.p>
                  )}
                </Column>
              );
            })}
          </div>
        </LayoutGroup>
      </MotionConfig>

      <footer>
        Drag cards, or focus one and press <kbd>←</kbd> / <kbd>→</kbd> to move it,{' '}
        <kbd>Enter</kbd> to edit and <kbd>Delete</kbd> to remove.
        {summary.tags.length > 0 && <> Tags in use: {summary.tags.map((tag) => `#${tag}`).join(' ')}.</>}
        {' '}<a href="https://github.com/umer-78/task-board">Source on GitHub</a>
      </footer>
    </div>
  );
}
