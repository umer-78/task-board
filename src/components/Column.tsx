import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { COLUMN_LABELS, type ColumnId } from '../lib/types';

interface Props {
  id: ColumnId;
  count: number;
  onDrop: (taskId: string) => void;
  children: ReactNode;
}

export function Column({ id, count, onDrop, children }: Props) {
  const [over, setOver] = useState(false);
  // The count pops when it changes, but not on the first paint.
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; }, []);
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
      <h2>
        {COLUMN_LABELS[id]}{' '}
        <motion.span key={count} initial={mounted.current ? { scale: 1.35 } : false} animate={{ scale: 1 }}>
          {count}
        </motion.span>
      </h2>
      {children}
    </section>
  );
}
