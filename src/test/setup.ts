import '@testing-library/jest-dom/vitest';
import { MotionGlobalConfig } from 'motion/react';

// jsdom has no layout, so run Motion animations instantly: a card that leaves
// is gone at once instead of waiting for its exit animation.
MotionGlobalConfig.skipAnimations = true;

// Node 26 + jsdom: window.localStorage can be undefined (ExperimentalWarning
// about --localstorage-file). Provide an in-memory Storage so tests and the
// app under test share a working localStorage.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() { return store.size; },
    clear() { store.clear(); },
    getItem(key: string) { return store.has(key) ? store.get(key)! : null; },
    key(index: number) { return [...store.keys()][index] ?? null; },
    removeItem(key: string) { store.delete(key); },
    setItem(key: string, value: string) { store.set(key, String(value)); },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
      writable: true,
    });
  }
}

// jsdom has no IntersectionObserver; Motion's useInView needs one. Report every
// element as visible straight away, which is what a real browser does for an
// element already on screen.
if (!('IntersectionObserver' in globalThis)) {
  class ImmediateIntersectionObserver {
    constructor(private cb: IntersectionObserverCallback) {}
    observe(target: Element) {
      this.cb([{ isIntersecting: true, target, intersectionRatio: 1 } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = ImmediateIntersectionObserver;
}
