import { useEffect, useRef } from 'react';
import type { BoardScene, Counts } from '../lib/boardScene';

/**
 * The 3D backdrop that mirrors the board. three.js loads as its own chunk after
 * the page has painted; without WebGL (or in tests) nothing renders.
 */
export function Board3D({ counts }: { counts: Counts }) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<BoardScene | null>(null);
  const latest = useRef(counts);
  latest.current = counts;

  useEffect(() => {
    const el = host.current;
    if (!el || typeof window.WebGLRenderingContext === 'undefined') return;
    let cancelled = false;
    import('../lib/boardScene')
      .then(({ createBoardScene }) => { if (!cancelled) scene.current = createBoardScene(el, latest.current); })
      .catch(() => { /* the page simply has no backdrop */ });
    return () => {
      cancelled = true;
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  const [todo, doing, done] = counts;
  useEffect(() => { scene.current?.setCounts([todo, doing, done]); }, [todo, doing, done]);

  return <div ref={host} className="board-3d" aria-hidden="true" />;
}
