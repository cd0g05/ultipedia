// The play library (fieldview-build ADR-43): ONE list of saved plays on this
// device. A setup is just a one-frame play, so setups and plays live together
// and the screens filter by frame count.
//
// Stored in localStorage as { version: 3, plays: StoredPlay[] }. Everything read
// back goes through the v3 validator and an invalid entry is DROPPED, never
// thrown (a hand-edited or old entry must not take the app down). Memory is the
// source of truth: a failed write (quota, private mode) reports an error and
// leaves the in-memory library — and the play being edited — intact.

import { useSyncExternalStore } from "react";
import type { Play } from "./format";
import { validatePlay } from "./validate";

export const LIBRARY_KEY = "fieldview.plays.v3";

export interface StoredPlay {
  id: string;
  updatedAt: number;
  play: Play;
}

export type SaveResult = { ok: true } | { ok: false; reason: "quota" | "unavailable" };

export interface PlayStore {
  list(): readonly StoredPlay[];
  get(id: string): StoredPlay | undefined;
  save(id: string, play: Play): SaveResult;
  remove(id: string): SaveResult;
  // Puts back an entry exactly as it was (undo of a delete).
  restore(entry: StoredPlay): SaveResult;
  subscribe(cb: () => void): () => void;
  getSnapshot(): readonly StoredPlay[];
}

export function newPlayId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readAll(storage: Storage | null): StoredPlay[] {
  if (!storage) return [];
  let raw: string | null;
  try {
    raw = storage.getItem(LIBRARY_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const list = (parsed as { plays?: unknown })?.plays;
  if (!Array.isArray(list)) return [];
  const out: StoredPlay[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const { id, updatedAt, play } = item as Record<string, unknown>;
    if (typeof id !== "string" || id.length === 0 || seen.has(id)) continue;
    try {
      out.push({ id, updatedAt: typeof updatedAt === "number" && Number.isFinite(updatedAt) ? updatedAt : 0, play: validatePlay(play) });
      seen.add(id);
    } catch {
      // dropped
    }
  }
  return out;
}

function errorReason(error: unknown): "quota" | "unavailable" {
  const e = error as { name?: string; code?: number } | null;
  return e && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.code === 22 || e.code === 1014)
    ? "quota"
    : "unavailable";
}

export function createLocalPlayStore(storage: Storage | null = safeLocalStorage()): PlayStore {
  let plays: StoredPlay[] = readAll(storage);
  const listeners = new Set<() => void>();

  function emit() {
    // A new array each time, so useSyncExternalStore sees the change.
    plays = plays.slice();
    for (const cb of listeners) cb();
  }

  function persist(): SaveResult {
    if (!storage) return { ok: false, reason: "unavailable" };
    try {
      storage.setItem(LIBRARY_KEY, JSON.stringify({ version: 3, plays }));
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: errorReason(error) };
    }
  }

  // Another tab changed the library: take its copy.
  if (typeof window !== "undefined" && storage) {
    window.addEventListener("storage", (e) => {
      if (e.key !== null && e.key !== LIBRARY_KEY) return;
      plays = readAll(storage);
      for (const cb of listeners) cb();
    });
  }

  return {
    list: () => plays,
    getSnapshot: () => plays,
    get: (id) => plays.find((p) => p.id === id),
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    save(id, play) {
      const entry: StoredPlay = { id, updatedAt: Date.now(), play };
      const at = plays.findIndex((p) => p.id === id);
      plays = at >= 0 ? plays.map((p, i) => (i === at ? entry : p)) : [...plays, entry];
      const result = persist();
      emit();
      return result;
    },
    remove(id) {
      plays = plays.filter((p) => p.id !== id);
      const result = persist();
      emit();
      return result;
    },
    restore(entry) {
      plays = plays.some((p) => p.id === entry.id) ? plays : [...plays, entry];
      const result = persist();
      emit();
      return result;
    },
  };
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

// The app's one library.
export const library: PlayStore = createLocalPlayStore();

export function useLibrary(store: PlayStore = library): readonly StoredPlay[] {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
