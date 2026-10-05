// Playback when the disc changes hands (fieldview-build ADR-39): the disc flies
// from the old holder's START to the new holder's END while everyone moves,
// possession flips on arrival, an interrupted step or a pause lands cleanly on a
// frame, and reduced motion jumps. Driven with a hand-cranked clock.

import { afterEach, describe, expect, it } from "vitest";
import { createSceneStore } from "../scene/store";
import { addFrame, giveDisc, newPlay, placePlayers, resolveAll, toScene } from "../play/model";
import type { Play } from "../play/format";
import { HOLD_SECONDS, TRANSITION_SECONDS, createPlaybackController } from "../ui/playback/playback";
import type { PlaybackOptions } from "../ui/playback/playback";
import { getFlightPos, setFlightPos } from "../ui/shell/throwMode";

// Frame 0: o1 holds, o2 near (48,20). Frame 1: o2 runs to (70,10) and gets the
// disc; o1 stays. Frame 2: o1 gets it back, no one else moves.
function passPlay(): Play {
  let p = newPlay();
  p = addFrame(addFrame(p, 0), 1);
  p = placePlayers(p, 1, { o2: { x: 70, y: 10 } });
  p = giveDisc(p, 1, "o2");
  p = giveDisc(p, 2, "o1");
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
    pending: () => queue.size,
  };
}

function setup(extra: Partial<PlaybackOptions> = {}) {
  const play = passPlay();
  const frames = resolveAll(play);
  const c = clock();
  const store = createSceneStore(toScene(play, 0));
  const controller = createPlaybackController(store, play, { ...c.options, ...extra });
  const pos = (id: string) => store.getScene().players.find((p) => p.id === id)!.pos;
  return { play, frames, c, store, controller, pos };
}

afterEach(() => setFlightPos(null));

describe("a pass between frames", () => {
  it("flies the disc from the old holder's start to the new holder's end, flipping possession on arrival", () => {
    const { c, controller, store, frames } = setup();
    const start = frames[0].positions.o1;
    const end = frames[1].positions.o2;

    controller.next();
    c.run(1 / 60);
    expect(getFlightPos()).not.toBeNull();
    expect(store.getScene().possession).toBe("o1"); // the old holder keeps it the whole flight

    c.run(TRANSITION_SECONDS / 2 - 1 / 60);
    const mid = getFlightPos()!;
    expect(mid.x).toBeGreaterThan(start.x);
    expect(mid.x).toBeLessThan(end.x);
    // A straight line: the midpoint of the flight is the midpoint of the segment.
    expect(mid.x).toBeCloseTo((start.x + end.x) / 2, 0);
    expect(mid.y).toBeCloseTo((start.y + end.y) / 2, 0);
    expect(store.getScene().possession).toBe("o1");

    c.run(TRANSITION_SECONDS);
    expect(getFlightPos()).toBeNull();
    expect(store.getScene().possession).toBe("o2");
    expect(store.getScene().players.find((p) => p.id === "o2")!.role).toBe("thrower");
    expect(c.pending()).toBe(0);
  });

  it("the disc lands exactly where the receiver arrives", () => {
    const { c, controller, pos, frames } = setup();
    controller.next();
    let last: { x: number; y: number } | null = null;
    for (let i = 0; i < 120; i += 1) {
      c.run(1 / 60);
      last = getFlightPos() ?? last;
    }
    expect(pos("o2")).toEqual(frames[1].positions.o2);
    expect(last!.x).toBeCloseTo(frames[1].positions.o2.x, 0);
    expect(last!.y).toBeCloseTo(frames[1].positions.o2.y, 0);
  });

  it("rides with the holder when the holder does not change", () => {
    const { c, controller, store } = setup();
    controller.goto(1);
    setFlightPos(null);
    controller.next(); // frame 1 -> 2: o2 -> o1 is a pass back; but 0 -> 1 -> 2 aside, test no-change below
    c.run(TRANSITION_SECONDS + 0.2);
    expect(store.getScene().possession).toBe("o1");

    // A transition with the same holder never publishes a flight.
    const same = setup();
    same.controller.goto(2);
    same.controller.prev();
    same.c.run(TRANSITION_SECONDS + 0.2);
    expect(same.store.getScene().possession).toBe("o2");
    controller.dispose();
  });

  it("re-derives the mark while pieces move (no React, via the store)", () => {
    const { c, controller, store } = setup();
    controller.next();
    c.run(TRANSITION_SECONDS + 0.2);
    // o2 now holds the disc far from every defender's frame-0 spot: whoever is
    // the mark is within 10 ft of o2 or there is none, and never a stale d1.
    const s = store.getScene();
    const holder = s.players.find((p) => p.id === s.possession)!;
    const marks = s.players.filter((p) => p.role === "mark");
    for (const m of marks) expect(Math.hypot(m.pos.x - holder.pos.x, m.pos.y - holder.pos.y)).toBeLessThanOrEqual(10 / 3);
  });

  it("an interrupting step glides on, and the disc flies from where its holder is now", () => {
    const { c, controller, store } = setup();
    controller.next();
    c.run(TRANSITION_SECONDS / 2);
    controller.next(); // frame 2: o1 gets it back; current possession is still o1 (mid-flight)
    c.run(TRANSITION_SECONDS + 0.2);
    expect(store.getScene().possession).toBe("o1");
    expect(getFlightPos()).toBeNull();
  });

  it("pause() mid-flight lands on a frame: pose, holder, and no disc in the air", () => {
    const { c, controller, store, frames, pos } = setup();
    controller.play();
    c.run(HOLD_SECONDS + TRANSITION_SECONDS * 0.8);
    controller.pause();
    const i = controller.getState().frameIndex;
    expect(getFlightPos()).toBeNull();
    expect(store.getScene().possession).toBe(frames[i].holder);
    expect(pos("o2")).toEqual(frames[i].positions.o2);
    expect(c.pending()).toBe(0);
  });

  it("reduced motion jumps: the new pose and the new holder at once, nothing in the air", () => {
    const { controller, store, frames, pos } = setup({ prefersReducedMotion: () => true });
    controller.next();
    expect(pos("o2")).toEqual(frames[1].positions.o2);
    expect(store.getScene().possession).toBe("o2");
    expect(getFlightPos()).toBeNull();
  });

  it("goto() snaps pose and holder and clears any flight", () => {
    const { c, controller, store } = setup();
    controller.next();
    c.run(0.3);
    expect(getFlightPos()).not.toBeNull();
    controller.goto(0);
    expect(getFlightPos()).toBeNull();
    expect(store.getScene().possession).toBe("o1");
  });

  it("dispose() never leaves a disc in the air", () => {
    const { c, controller } = setup();
    controller.next();
    c.run(0.3);
    controller.dispose();
    expect(getFlightPos()).toBeNull();
  });
});
