// The held space (heatHold.ts): after a catch the colours of the throw stay up
// through the dwell, then ease to the new holder's view once the next frame's
// movement is under way. Driven with a hand-cranked clock like playbackDisc.

import { afterEach, describe, expect, it } from "vitest";
import { createSceneStore } from "../scene/store";
import { addFrame, giveDisc, newPlay, placePlayers, toScene } from "../play/model";
import type { Play } from "../play/format";
import { TRANSITION_SECONDS, createPlaybackController } from "../ui/playback/playback";
import type { PlaybackOptions } from "../ui/playback/playback";
import { HOLD_RELEASE_START, getHeatHold, releaseWeight, setHeatHold } from "../ui/playback/heatHold";
import { blendHeld } from "../space/blend";
import { setFlightPos } from "../ui/shell/throwMode";
import type { ScoreGrid } from "../space/types";

// Frame 0: o1 holds. Frame 1: o2 runs deep and gets the disc. Frame 2: the
// cutters move, the holder stays o2.
function throwThenMove(): Play {
  let p = newPlay();
  p = addFrame(addFrame(p, 0), 1);
  p = placePlayers(p, 1, { o2: { x: 70, y: 10 } });
  p = giveDisc(p, 1, "o2");
  p = placePlayers(p, 2, { o3: { x: 60, y: 30 } });
  return p;
}

function clock() {
  let t = 0;
  let next = 1;
  const queue = new Map<number, () => void>();
  const options: PlaybackOptions = {
    now: () => t,
    schedule: (cb) => {
      const h = next++;
      queue.set(h, cb);
      return h;
    },
    cancel: (h) => {
      queue.delete(h);
    },
    prefersReducedMotion: () => false,
  };
  return {
    options,
    run(seconds: number) {
      const frames = Math.round(seconds * 60);
      for (let i = 0; i < frames; i += 1) {
        t += 1000 / 60;
        const due = [...queue.entries()];
        queue.clear();
        for (const [, cb] of due) cb();
      }
    },
  };
}

function setup() {
  const play = throwThenMove();
  const c = clock();
  const store = createSceneStore(toScene(play, 0));
  const controller = createPlaybackController(store, play, c.options);
  return { c, store, controller };
}

afterEach(() => {
  setFlightPos(null);
  setHeatHold(null);
});

describe("holding the space of the last throw", () => {
  it("is live until a pass lands", () => {
    const { c, controller } = setup();
    controller.next();
    c.run(TRANSITION_SECONDS / 2);
    expect(getHeatHold()).toBeNull();
  });

  it("keeps the thrower's space up after the catch", () => {
    const { c, controller, store } = setup();
    controller.next();
    c.run(TRANSITION_SECONDS + 0.2);
    expect(store.getScene().possession).toBe("o2");
    const hold = getHeatHold()!;
    expect(hold).not.toBeNull();
    expect(hold.weight).toBe(0);
    expect(hold.anchor.possession).toBe("o1"); // still the thrower's view
    // ...at the pose of the end of the throw, not wherever the pieces go next.
    expect(hold.anchor.players.find((p) => p.id === "o2")!.pos).toEqual({ x: 70, y: 10 });
  });

  it("holds through the dwell, then eases over once the next move starts, cutters first", () => {
    const { c, controller } = setup();
    controller.next();
    c.run(TRANSITION_SECONDS + 0.05);
    controller.next();
    c.run(TRANSITION_SECONDS * (HOLD_RELEASE_START / 2));
    expect(getHeatHold()!.weight).toBe(0); // the pieces are moving, the colours are not
    let last = 0;
    for (let i = 0; i < 5; i += 1) {
      c.run(TRANSITION_SECONDS * 0.12);
      const w = getHeatHold()?.weight ?? 1;
      expect(w).toBeGreaterThanOrEqual(last);
      last = w;
    }
    expect(last).toBeGreaterThan(0);
    c.run(TRANSITION_SECONDS);
    expect(getHeatHold()).toBeNull(); // fully the new holder's space
  });

  it("is dropped by landing on a frame, so a jump never shows stale colours", () => {
    const { c, controller } = setup();
    controller.next();
    c.run(TRANSITION_SECONDS + 0.2);
    expect(getHeatHold()).not.toBeNull();
    controller.goto(0);
    expect(getHeatHold()).toBeNull();
  });
});

describe("releaseWeight", () => {
  it("is 0 until the release point, 1 at the end, and never decreases", () => {
    expect(releaseWeight(0)).toBe(0);
    expect(releaseWeight(HOLD_RELEASE_START)).toBe(0);
    expect(releaseWeight(1)).toBe(1);
    let last = 0;
    for (let u = 0; u <= 1; u += 0.05) {
      const w = releaseWeight(u);
      expect(w).toBeGreaterThanOrEqual(last);
      last = w;
    }
  });
});

describe("blendHeld", () => {
  const grid = (values: number[]): ScoreGrid => ({ cols: values.length, rows: 1, step: 1, values: new Float32Array(values) });

  it("goes from the held grid (0) to the live grid (1)", () => {
    const shared = grid([0, 0, 0]);
    // computeGrid hands back one shared buffer: the live values are in it when
    // blendHeld starts, and computing the held grid overwrites them.
    const run = (w: number) => {
      shared.values.set([1, 1, 1]);
      return Array.from(blendHeld(shared, () => (shared.values.set([0, 0.5, 1]), shared), w).values);
    };
    expect(run(0)).toEqual([0, 0.5, 1]);
    expect(run(1)).toEqual([1, 1, 1]);
    expect(run(0.5)).toEqual([0.5, 0.75, 1]);
  });
});
