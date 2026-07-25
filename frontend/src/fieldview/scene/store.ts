// Mutable subscribe-store + rAF loop (ADR-2). Pointer-move handlers (added
// in the whiteboard partition) mutate the scene directly and never trigger
// React reconciliation per move; React only subscribes to structural
// changes via subscribe(). Canvas/SVG painters subscribe to onFrame() and
// repaint at most once per animation frame regardless of mutation count.

import type { Scene } from "./types";

export interface SceneStore {
  getScene(): Scene; // returns the live object — treat as read-only
  mutate(fn: (draft: Scene) => void): void;
  subscribe(cb: () => void): () => void;
  onFrame(cb: () => void): () => void;
}

export function createSceneStore(initial: Scene): SceneStore {
  const scene = initial;
  const subscribers = new Set<() => void>();
  const frameSubscribers = new Set<() => void>();
  let frameScheduled = false;

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
  };
}
