import { useState } from 'react';
import { COLUMNS, type Task } from '../lib/types';

interface Props {
  task: Task;
  onChange: (patch: Partial<Task>) => void;
  onDelete: () => void;
  onNudge: (direction: -1 | 1) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  dragging: boolean;
}

export function TaskCard({ task, onChange, onDelete, onNudge, onDragStart, onDragEnd, dragging }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);

  const commit = () => {
    const trimmed = title.trim();
    if (trimmed) onChange({ title: trimmed, notes: notes.trim() });
    setEditing(false);
  };

  const index = COLUMNS.indexOf(task.column);

  return (
    <article
      className={`card${dragging ? ' dragging' : ''}${editing ? ' editing' : ''}`}
      draggable={!editing}
      tabIndex={0}
      aria-label={`${task.title}, ${task.column}, ${task.priority} priority`}
      onDragStart={(event) => { event.dataTransfer.setData('text/plain', task.id); onDragStart(); }}
      onDragEnd={onDragEnd}
      onDoubleClick={() => setEditing(true)}
      onKeyDown={(event) => {
        if (editing) return;
        if (event.key === 'ArrowRight' && index < COLUMNS.length - 1) { event.preventDefault(); onNudge(1); }
        if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); onNudge(-1); }
        if (event.key === 'Enter') { event.preventDefault(); setEditing(true); }
        if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); onDelete(); }
      }}
    >
      {editing ? (
        <>
          <label className="sr-only" htmlFor={`title-${task.id}`}>Title</label>
          <input
            id={`title-${task.id}`}
            value={title}
            autoFocus
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit();
              if (event.key === 'Escape') { setTitle(task.title); setNotes(task.notes); setEditing(false); }
            }}
          />
          <label className="sr-only" htmlFor={`notes-${task.id}`}>Notes</label>
          <textarea
            id={`notes-${task.id}`}
            rows={2}
            placeholder="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <div className="meta" style={{ marginTop: 8 }}>
            <button className="primary" onClick={commit}>Save</button>
            <button onClick={() => { setTitle(task.title); setNotes(task.notes); setEditing(false); }}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <div className="title">{task.title}</div>
          {task.notes && <div className="notes">{task.notes}</div>}
          <div className="meta">
            <select
              aria-label={`Priority for ${task.title}`}
              value={task.priority}
              onChange={(event) => onChange({ priority: event.target.value as Task['priority'] })}
              style={{ width: 'auto', padding: '2px 6px', fontSize: 11 }}
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
            {task.tags.map((tag) => <span className="tag" key={tag}>#{tag}</span>)}
            <span className="actions">
              <button className="ghost" aria-label={`Move ${task.title} left`} disabled={index === 0}
                      onClick={() => onNudge(-1)}>←</button>
              <button className="ghost" aria-label={`Move ${task.title} right`}
                      disabled={index === COLUMNS.length - 1} onClick={() => onNudge(1)}>→</button>
              <button className="ghost" aria-label={`Delete ${task.title}`} onClick={onDelete}>✕</button>
            </span>
          </div>
        </>
      )}
    </article>
  );
}
