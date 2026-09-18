import { useState, type ReactNode } from 'react';
import { COLUMN_LABELS, type ColumnId } from '../lib/types';

interface Props {
  id: ColumnId;
  count: number;
  onDrop: (taskId: string) => void;
  children: ReactNode;
}

export function Column({ id, count, onDrop, children }: Props) {
  const [over, setOver] = useState(false);
  return (
    <section
      className={`column${over ? ' over' : ''}`}
      aria-label={COLUMN_LABELS[id]}
      data-column={id}
      onDragOver={(event) => { event.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const taskId = event.dataTransfer.getData('text/plain');
        if (taskId) onDrop(taskId);
      }}
    >
      <h2>{COLUMN_LABELS[id]} <span>{count}</span></h2>
      {children}
    </section>
  );
}
