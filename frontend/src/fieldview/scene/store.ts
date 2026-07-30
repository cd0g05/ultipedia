// Mutable subscribe-store + rAF loop (ADR-2). Pointer-move handlers (added
// in the whiteboard partition) mutate the scene directly and never trigger
// React reconciliation per move; React only subscribes to structural
// changes via subscribe(). Canvas/SVG painters subscribe to onFrame() and
// repaint at most once per animation frame regardless of mutation count.

import type { Scene } from "./types";
import type { SelectionState } from "./selection";
import { clearSelection } from "./selection";

export interface SceneStore {
  getScene(): Scene; // returns the live object — treat as read-only
  mutate(fn: (draft: Scene) => void): void;
  subscribe(cb: () => void): () => void;
  onFrame(cb: () => void): () => void;
  getSelection(): SelectionState;
  setSelection(next: SelectionState): void;
  subscribeSelection(cb: () => void): () => void;
}

export function createSceneStore(initial: Scene): SceneStore {
  const scene = initial;
  const subscribers = new Set<() => void>();
  const frameSubscribers = new Set<() => void>();
  let frameScheduled = false;
  let selection: SelectionState = clearSelection();
  // Deliberately its own subscriber set (ADR-1) rather than reusing
  // `subscribers`: a selection change is comparatively rare and UI-only, so
  // routing it through the same list would force every scene subscriber
  // (which exists to react to player-position mutations) to re-check on
  // every click and marquee drag.
  const selectionSubscribers = new Set<() => void>();

  function scheduleFrame(): void {
    if (frameScheduled) return;
    frameScheduled = true;
    requestAnimationFrame(() => {
      frameScheduled = false;
      for (const cb of frameSubscribers) cb();
    });
  }

  return {
    getScene() {
      return scene;
    },
    mutate(fn) {
      fn(scene);
      for (const cb of subscribers) cb();
      scheduleFrame();
    },
    subscribe(cb) {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    onFrame(cb) {
      frameSubscribers.add(cb);
      return () => frameSubscribers.delete(cb);
    },
    getSelection() {
      return selection;
    },
    setSelection(next) {
      selection = next;
      for (const cb of selectionSubscribers) cb();
    },
    subscribeSelection(cb) {
      selectionSubscribers.add(cb);
      return () => selectionSubscribers.delete(cb);
    },
  };
}
