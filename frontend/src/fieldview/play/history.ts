// Generic undo/redo over immutable snapshots (fieldview-build ADR-40). Pure:
// push/undo/redo return a new History and never mutate the old one. One step
// per completed gesture, capped so a long session cannot grow without bound.

export const HISTORY_CAP = 100;

export interface History<T> {
  past: readonly T[];
  present: T;
  future: readonly T[];
  cap: number;
}

export function createHistory<T>(initial: T, cap = HISTORY_CAP): History<T> {
  return { past: [], present: initial, future: [], cap };
}

export function push<T>(h: History<T>, next: T): History<T> {
  if (Object.is(next, h.present)) return h;
  const past = [...h.past, h.present];
  while (past.length > h.cap) past.shift();
  return { ...h, past, present: next, future: [] };
}

export function undo<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h;
  const present = h.past[h.past.length - 1];
  return { ...h, past: h.past.slice(0, -1), present, future: [h.present, ...h.future] };
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h;
  const [present, ...future] = h.future;
  return { ...h, past: [...h.past, h.present], present, future };
}

export const canUndo = <T>(h: History<T>): boolean => h.past.length > 0;
export const canRedo = <T>(h: History<T>): boolean => h.future.length > 0;
