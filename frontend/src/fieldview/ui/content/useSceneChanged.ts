// Has the live scene drifted from a baseline? Drives the ✎ marker and Reset.
//
// The comparison runs on each coalesced scene frame, but React is only told
// about it once the movement STOPS (trailing debounce). That is deliberate:
// flipping a boolean state on the first frame of a drag would be a React commit
// inside the drag path, which canon ADR-2 forbids. The marker therefore lags a
// drag by ~DEBOUNCE_MS — nobody is reading it mid-drag.

import { useEffect, useState } from "react";
import type { RefObject } from "react";
import type { SceneStore } from "../../scene/store";
import type { Scene } from "../../scene/types";

const DEBOUNCE_MS = 200;

function differs(live: Scene, baseline: Scene): boolean {
  if (live.players.length !== baseline.players.length) return true;
  return live.players.some((p) => {
    const other = baseline.players.find((q) => q.id === p.id);
    return !other || other.pos.x !== p.pos.x || other.pos.y !== p.pos.y;
  });
}

export function useSceneChanged(
  store: SceneStore,
  baselineRef: RefObject<Scene | null>,
  // Bump to force a re-evaluation (e.g. right after a setup load or a reset).
  resetKey: unknown,
): boolean {
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    function evaluate() {
      const baseline = baselineRef.current;
      setChanged(baseline ? differs(store.getScene(), baseline) : false);
    }
    const unsubscribe = store.onFrame(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(evaluate, DEBOUNCE_MS);
    });
    // A setup load/reset is a discrete event: reflect it at once.
    evaluate();
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [store, baselineRef, resetKey]);

  return changed;
}
