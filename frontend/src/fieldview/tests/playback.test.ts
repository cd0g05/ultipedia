// The Watch playback controller (ADR-34), driven with a hand-cranked clock so
// every timing assertion is exact rather than a race against jsdom's rAF.

import { describe, expect, it } from "vitest";
import { createSceneStore } from "../scene/store";
import { resolveAll, toScene } from "../play/model";
import { BUILTIN_PLAYS } from "../play/plays";
import { HOLD_SECONDS, TRANSITION_SECONDS, createPlaybackController } from "../ui/playback/playback";
import type { PlaybackOptions } from "../ui/playback/playback";
import type { Play } from "../play/format";

const play = BUILTIN_PLAYS.find((p) => p.frames.length >= 5)!;
const frames = resolveAll(play);

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
    // Advance the clock in ~60 fps frames.
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

function setup(p: Play = play, extra: Partial<PlaybackOptions> = {}) {
  const c = clock();
  const store = createSceneStore(toScene(p, 0));
  const controller = createPlaybackController(store, p, { ...c.options, ...extra });
  const posOf = (id: string) => {
    const pl = store.getScene().players.find((q) => q.id === id)!;
    return { x: pl.pos.x, y: pl.pos.y };
  };
  return { c, store, controller, posOf };
}

// A player that actually moves between frame 0 and frame 1.
function mover(p: Play) {
  const f = resolveAll(p);
  return p.players.find((e) => {
    const a = f[0].positions[e.id];
    const b = f[1].positions[e.id];
    return Math.hypot(a.x - b.x, a.y - b.y) > 1;
  })!.id;
}

describe("playback controller", () => {
  it("starts idle on frame 0 and reports the frame count", () => {
    const { controller } = setup();
    expect(controller.getState()).toMatchObject({
      frameIndex: 0,
      frameCount: frames.length,
      status: "idle",
      speed: 1,
      loop: false,
    });
  });

  it("next() moves the target index at once and glides the pieces to the next keyframe", () => {
    const { c, controller, posOf } = setup();
    const id = mover(play);
    const from = frames[0].positions[id];
    const to = frames[1].positions[id];

    controller.next();
    expect(controller.getState().frameIndex).toBe(1); // dots answer immediately
    expect(posOf(id)).toEqual(from); // ...pieces have not jumped

    c.run(TRANSITION_SECONDS / 2);
    const mid = posOf(id);
    expect(mid.x).not.toBe(from.x);
    expect(mid).not.toEqual(to);

    c.run(TRANSITION_SECONDS);
    expect(posOf(id)).toEqual(to);
    expect(controller.getState().status).toBe("idle"); // stepping is not playing
    expect(c.pending()).toBe(0); // the clock stops by itself
  });

  it("prev() glides back, and is a no-op on the first frame", () => {
    const { c, controller, posOf } = setup();
    const id = mover(play);
    controller.prev();
    expect(controller.getState().frameIndex).toBe(0);
    controller.next();
    c.run(TRANSITION_SECONDS + 0.2);
    controller.prev();
    c.run(TRANSITION_SECONDS + 0.2);
    expect(controller.getState().frameIndex).toBe(0);
    expect(posOf(id)).toEqual(frames[0].positions[id]);
  });

  it("next() is a no-op on the last frame", () => {
    const { controller } = setup();
    controller.goto(frames.length - 1);
    controller.next();
    expect(controller.getState().frameIndex).toBe(frames.length - 1);
  });

  it("goto() jumps straight to a frame's pose", () => {
    const { controller, posOf } = setup();
    const id = mover(play);
    controller.goto(3);
    expect(controller.getState().frameIndex).toBe(3);
    expect(posOf(id)).toEqual(frames[3].positions[id]);
    controller.goto(999); // clamps
    expect(controller.getState().frameIndex).toBe(frames.length - 1);
  });

  it("an interrupting step glides on from where the pieces are, not from the old keyframe", () => {
    const { c, controller, posOf } = setup();
    const id = mover(play);
    controller.next();
    c.run(TRANSITION_SECONDS / 2);
    const midway = posOf(id);
    controller.next();
    // First frame of the new transition: still (almost) at the interrupted spot.
    c.run(1 / 60);
    const after = posOf(id);
    expect(Math.hypot(after.x - midway.x, after.y - midway.y)).toBeLessThan(2);
  });

  it("play() runs frame to frame and stops, paused, on the last frame", () => {
    const { c, controller, posOf } = setup();
    controller.play();
    expect(controller.getState().status).toBe("playing");
    const perFrame = TRANSITION_SECONDS + HOLD_SECONDS;
    c.run(perFrame * frames.length + 2);
    expect(controller.getState()).toMatchObject({
      frameIndex: frames.length - 1,
      status: "paused",
    });
    const last = frames[frames.length - 1].positions;
    for (const e of play.players) expect(posOf(e.id)).toEqual(last[e.id]);
    expect(c.pending()).toBe(0);
  });

  it("play() from the last frame restarts from the first", () => {
    const { controller } = setup();
    controller.goto(frames.length - 1);
    controller.play();
    expect(controller.getState().frameIndex).toBe(0);
    expect(controller.getState().status).toBe("playing");
  });

  it("loops back to the start instead of stopping when Loop is on", () => {
    const { c, controller } = setup();
    controller.setLoop(true);
    controller.play();
    const perFrame = TRANSITION_SECONDS + HOLD_SECONDS;
    c.run(perFrame * (frames.length + 1));
    expect(controller.getState().status).toBe("playing");
    c.run(perFrame * frames.length);
    expect(controller.getState().status).toBe("playing");
  });

  it("speed scales how fast a transition runs", () => {
    const slow = setup();
    const fast = setup();
    slow.controller.setSpeed(0.5);
    fast.controller.setSpeed(2);
    slow.controller.next();
    fast.controller.next();
    slow.c.run(TRANSITION_SECONDS / 2);
    fast.c.run(TRANSITION_SECONDS / 2);
    const id = mover(play);
    const target = frames[1].positions[id];
    const dist = (p: { x: number; y: number }) => Math.hypot(p.x - target.x, p.y - target.y);
    expect(dist(fast.posOf(id))).toBeLessThan(dist(slow.posOf(id)));
  });

  it("pause() mid-transition lands cleanly ON a keyframe", () => {
    const { c, controller, posOf } = setup();
    controller.play();
    c.run(HOLD_SECONDS + TRANSITION_SECONDS * 0.8); // well into the first move
    controller.pause();
    const s = controller.getState();
    expect(s.status).toBe("paused");
    const id = mover(play);
    expect(posOf(id)).toEqual(frames[s.frameIndex].positions[id]);
    expect(c.pending()).toBe(0);
  });

  it("reduced motion jumps instead of animating", () => {
    const { controller, posOf } = setup(play, { prefersReducedMotion: () => true });
    const id = mover(play);
    controller.next();
    expect(posOf(id)).toEqual(frames[1].positions[id]);
  });

  it("never mutates the play data (the plays are frozen, so a write would throw)", () => {
    expect(Object.isFrozen(play)).toBe(true);
    expect(Object.isFrozen(play.frames[1].moved)).toBe(true);
    const { c, controller, store } = setup();
    controller.play();
    c.run((TRANSITION_SECONDS + HOLD_SECONDS) * frames.length + 1);
    // The store owns its own position objects, not the play's.
    for (const p of store.getScene().players) {
      expect(p.pos).not.toBe(frames[frames.length - 1].positions[p.id]);
    }
  });

  it("only notifies on structural changes, never per animation frame", () => {
    const { c, controller } = setup();
    let notes = 0;
    controller.subscribe(() => (notes += 1));
    controller.next();
    expect(notes).toBe(1);
    notes = 0;
    c.run(TRANSITION_SECONDS + 0.5);
    expect(notes).toBe(0);
  });

  it("dispose() stops the clock and drops listeners", () => {
    const { c, controller } = setup();
    let notes = 0;
    controller.subscribe(() => (notes += 1));
    controller.next();
    controller.dispose();
    notes = 0;
    c.run(2);
    expect(c.pending()).toBe(0);
    expect(notes).toBe(0);
  });
});
