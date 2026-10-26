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
import { DEFAULT_PREFS, parsePrefs } from "../ui/prefs";
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

function setup(options: Partial<PlaybackOptions> = {}) {
  const play = throwThenMove();
  const c = clock();
  const store = createSceneStore(toScene(play, 0));
  const controller = createPlaybackController(store, play, { ...c.options, ...options });
  return { c, store, controller };
}

afterEach(() => {
  setFlightPos(null);
  setHeatHold(null);
});

describe("pinning the space at the throw", () => {
  it("is live while nobody throws", () => {
    const { c, controller } = setup();
    controller.goto(1);
    controller.goto(2);
    c.run(TRANSITION_SECONDS / 2);
    expect(getHeatHold()).toBeNull();
  });

  it("judges the space at the START of a throw and keeps it through the flight", () => {
    const { c, controller, store } = setup();
    const start = toScene(throwThenMove(), 0).players.find((p) => p.id === "o2")!.pos;
    controller.next();
    c.run(1 / 60);
    const pinned = getHeatHold()!;
    expect(pinned.target!.possession).toBe("o1"); // the thrower's view
    expect(pinned.weight).toBe(1);
    expect(pinned.anchor).toBeNull();
    // At the start poses: the receiver has not run to the catch spot yet.
    expect(pinned.target!.players.find((p) => p.id === "o2")!.pos).toEqual(start);
    c.run(TRANSITION_SECONDS / 2);
    expect(getHeatHold()!.target).toBe(pinned.target); // not recomputed as everyone moves
    expect(store.getScene().players.find((p) => p.id === "o2")!.pos).not.toEqual(start);
  });

  it("keeps it after the catch, with the receiver standing in the space they were thrown into", () => {
    const { c, controller, store } = setup();
    controller.next();
    c.run(TRANSITION_SECONDS + 0.2);
    expect(store.getScene().possession).toBe("o2");
    const hold = getHeatHold()!;
    expect(hold.target!.possession).toBe("o1");
    expect(hold.weight).toBe(1);
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

describe("stepping back across a pass", () => {
  it("keeps the earlier thrower's space on the way back and holds nothing afterwards", () => {
    const { c, controller, store } = setup();
    controller.next();
    c.run(TRANSITION_SECONDS + 0.2); // frame 1: o2 holds, o1's space held
    controller.prev();
    c.run(TRANSITION_SECONDS / 2);
    // Mid-move the disc is still with o2, but the space is o1's, not o2's.
    expect(getHeatHold()).toMatchObject({ holder: "o1", anchor: null });
    c.run(TRANSITION_SECONDS);
    expect(store.getScene().possession).toBe("o1");
    expect(getHeatHold()).toBeNull(); // frame 0 is just frame 0
  });

  it("never shows the later thrower's view on the earlier frame", () => {
    const { c, controller, store } = setup();
    controller.goto(1);
    controller.prev();
    c.run(TRANSITION_SECONDS * 2);
    expect(controller.getState().frameIndex).toBe(0);
    expect(getHeatHold()).toBeNull();
    expect(store.getScene().possession).toBe("o1");
  });
});

describe("clicking through fast", () => {
  it("forward to the end then straight back before anything animates lands cleanly on frame 0", () => {
    const { c, controller, store } = setup();
    controller.next();
    controller.next();
    controller.prev();
    controller.next();
    controller.next();
    controller.prev();
    controller.prev();
    controller.prev();
    c.run(TRANSITION_SECONDS * 3);
    const scene = store.getScene();
    const frame0 = toScene(throwThenMove(), 0);
    expect(controller.getState().frameIndex).toBe(0);
    expect(getHeatHold()).toBeNull();
    expect(scene.possession).toBe("o1");
    for (const p of scene.players) {
      expect(p.pos, p.id).toEqual(frame0.players.find((q) => q.id === p.id)!.pos);
    }
    // Exactly one thrower and a mark that follows the geometry.
    expect(scene.players.filter((p) => p.role === "thrower").map((p) => p.id)).toEqual(["o1"]);
  });

  it("a half-finished pass never leaves the disc holder out of step with the frame it lands on", () => {
    const { c, controller, store } = setup();
    controller.next();
    c.run(TRANSITION_SECONDS * 0.5); // pass in the air
    controller.next(); // interrupted: on to frame 2
    c.run(TRANSITION_SECONDS * 2);
    expect(controller.getState().frameIndex).toBe(2);
    expect(store.getScene().possession).toBe("o2"); // frame 2 inherits o2
    // The interrupted throw completes on this landing, so its space is held.
    expect(getHeatHold()?.target?.possession).toBe("o1");
  });
});

describe("the pref", () => {
  it("is on by default", () => {
    expect(DEFAULT_PREFS.pinSpaceAtThrow).toBe(true);
    expect(parsePrefs({}).pinSpaceAtThrow).toBe(true);
    expect(parsePrefs({ pinSpaceAtThrow: false }).pinSpaceAtThrow).toBe(false);
    expect(parsePrefs({ pinSpaceAtThrow: "no" }).pinSpaceAtThrow).toBe(true);
  });

  it("when off, nothing is pinned: the space follows the live scene through a throw", () => {
    const { c, controller, store } = setup({ pinSpaceAtThrow: () => false });
    controller.next();
    c.run(TRANSITION_SECONDS / 2);
    expect(getHeatHold()).toBeNull();
    c.run(TRANSITION_SECONDS);
    expect(getHeatHold()).toBeNull();
    expect(store.getScene().possession).toBe("o2");
    controller.prev();
    c.run(TRANSITION_SECONDS * 2);
    expect(getHeatHold()).toBeNull();
    expect(store.getScene().possession).toBe("o1");
  });

  it("is read at the start of each move", () => {
    let on = true;
    const { c, controller } = setup({ pinSpaceAtThrow: () => on });
    controller.next();
    c.run(TRANSITION_SECONDS + 0.3);
    expect(getHeatHold()).not.toBeNull();
    on = false;
    controller.next();
    c.run(TRANSITION_SECONDS * 0.1);
    expect(getHeatHold()).toBeNull();
  });
});

describe("a second throw takes over from the first", () => {
  // o1 → o2 (frame 1), then o2 → o3 (frame 2).
  function twoThrows(): Play {
    let p = newPlay();
    p = addFrame(addFrame(p, 0), 1);
    p = placePlayers(p, 1, { o2: { x: 70, y: 10 } });
    p = giveDisc(p, 1, "o2");
    p = placePlayers(p, 2, { o3: { x: 60, y: 30 } });
    p = giveDisc(p, 2, "o3");
    return p;
  }

  it("pins the new throw's space at its own start, crossfading from the last one", () => {
    const play = twoThrows();
    const c = clock();
    const store = createSceneStore(toScene(play, 0));
    const controller = createPlaybackController(store, play, c.options);
    controller.next();
    c.run(TRANSITION_SECONDS + 0.3);
    const first = getHeatHold()!.target!;
    controller.next();
    c.run(TRANSITION_SECONDS * 0.05);
    const mid = getHeatHold()!;
    expect(mid.anchor).toBe(first); // the old throw is still easing out…
    expect(mid.target!.possession).toBe("o2"); // …into the new thrower's, judged now
    expect(mid.weight).toBeLessThan(1);
    c.run(TRANSITION_SECONDS * 0.4);
    const later = getHeatHold()!;
    expect(later.anchor).toBeNull();
    expect(later.weight).toBe(1);
    expect(later.target).toBe(mid.target);
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
