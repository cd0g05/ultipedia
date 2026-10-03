// Watch's playback controller (tech-design ADR-34): a thin imperative layer
// over the play format. Frames are the play's keyframes; moving between two of
// them animates the pieces with the existing sampler (play/tween.ts) over a
// fixed transition, so a frame's actions all happen together rather than at the
// pace the author dragged them.
//
// React sees only STRUCTURAL state — frame index, status, speed, loop — via
// getState()/subscribe(). Positions are written straight into the SceneStore,
// once per animation frame, so playing a play costs no React commits per frame
// (canon ADR-2). The play data is never mutated: positions are copied on the
// way into the store.
//
// Like the motion driver, time is injectable so tests drive frames by hand, and
// a backgrounded tab's one enormous elapsed time is clamped rather than
// integrated (it would teleport the pieces).

import type { SceneStore } from "../../scene/store";
import type { Vec2 } from "../../scene/types";
import type { PlayFile } from "../../play/format";
import { samplePositions } from "../../play/tween";

export type PlaybackStatus = "idle" | "playing" | "paused";
export type PlaybackSpeed = 0.5 | 1 | 2;
export const PLAYBACK_SPEEDS: readonly PlaybackSpeed[] = [0.5, 1, 2];

// PLACEHOLDER(fieldview-ui-rework): both are first-guess feel values the
// Builder tunes (docs/fieldview-placeholders.md #17).
export const TRANSITION_SECONDS = 1.2; // one frame's move, at 1x
export const HOLD_SECONDS = 0.4; // dwell on a frame before the next, while playing, at 1x
const MAX_STEP_SECONDS = 0.1;

export interface PlaybackState {
  // The frame being shown — or, mid-transition, the frame being moved TO, so
  // the dots and filmstrip answer at once.
  frameIndex: number;
  frameCount: number;
  status: PlaybackStatus;
  speed: PlaybackSpeed;
  loop: boolean;
}

export interface PlaybackOptions {
  now?: () => number;
  schedule?: (cb: () => void) => number;
  cancel?: (handle: number) => void;
  prefersReducedMotion?: () => boolean;
}

export interface PlaybackController {
  getState(): PlaybackState;
  subscribe(cb: () => void): () => void;
  goto(index: number): void;
  next(): void;
  prev(): void;
  play(): void;
  pause(): void;
  setSpeed(speed: PlaybackSpeed): void;
  setLoop(loop: boolean): void;
  dispose(): void;
}

function defaultReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function createPlaybackController(
  store: SceneStore,
  play: PlayFile,
  options: PlaybackOptions = {},
): PlaybackController {
  const now = options.now ?? (() => performance.now());
  const schedule = options.schedule ?? ((cb) => requestAnimationFrame(cb));
  const cancel = options.cancel ?? ((h) => cancelAnimationFrame(h));
  const reduced = options.prefersReducedMotion ?? defaultReducedMotion;

  const frames = play.keyframes;
  const last = frames.length - 1;
  const listeners = new Set<() => void>();

  let state: PlaybackState = {
    frameIndex: 0,
    frameCount: frames.length,
    status: "idle",
    speed: 1,
    loop: false,
  };

  // The running transition, if any: from one frame's pose to another's.
  // `fromPositions` is a snapshot of where the pieces ARE when the move starts
  // (not the previous keyframe's pose), so interrupting a transition with
  // another step glides on from the current spot instead of jumping.
  let motion: {
    fromIndex: number;
    fromPositions: Record<string, Vec2>;
    to: number;
    elapsed: number;
  } | null = null;
  // Seconds left to dwell on a frame while playing (counts down between moves).
  let hold = 0;
  let handle: number | null = null;
  let lastTime = 0;

  function set(patch: Partial<PlaybackState>) {
    const next = { ...state, ...patch };
    if (
      next.frameIndex === state.frameIndex &&
      next.status === state.status &&
      next.speed === state.speed &&
      next.loop === state.loop
    ) {
      return;
    }
    state = next;
    for (const cb of listeners) cb();
  }

  // Copies positions in — never hands the play's own objects to the store.
  function write(positions: Record<string, Vec2>) {
    store.mutate((draft) => {
      for (const p of draft.players) {
        const to = positions[p.id];
        if (to) p.pos = { x: to.x, y: to.y };
      }
    });
  }

  function snapTo(index: number) {
    write(frames[index].positions);
  }

  function stopClock() {
    if (handle !== null) cancel(handle);
    handle = null;
  }

  function startClock() {
    if (handle !== null) return;
    lastTime = now();
    handle = schedule(tick);
  }

  function currentPositions(): Record<string, Vec2> {
    const out: Record<string, Vec2> = {};
    for (const p of store.getScene().players) out[p.id] = { x: p.pos.x, y: p.pos.y };
    return out;
  }

  // `fromIndex` is the frame we are leaving (used to land cleanly if paused
  // before the halfway point).
  function beginMove(to: number, fromIndex: number) {
    if (reduced()) {
      motion = null;
      snapTo(to);
      return;
    }
    motion = { fromIndex, fromPositions: currentPositions(), to, elapsed: 0 };
    startClock();
  }

  function advanceWhilePlaying() {
    if (state.frameIndex < last) {
      const from = state.frameIndex;
      set({ frameIndex: from + 1 });
      beginMove(from + 1, from);
      return;
    }
    if (state.loop) {
      // Back to the start without playing the long way home.
      set({ frameIndex: 0 });
      snapTo(0);
      hold = HOLD_SECONDS / state.speed;
      return;
    }
    set({ status: "paused" });
    stopClock();
  }

  function tick() {
    handle = null;
    const t = now();
    const dt = Math.min((t - lastTime) / 1000, MAX_STEP_SECONDS) * state.speed;
    lastTime = t;

    if (motion) {
      motion.elapsed += dt;
      const u = Math.min(1, motion.elapsed / TRANSITION_SECONDS);
      write(
        samplePositions(
          [
            { t: 0, positions: motion.fromPositions },
            { t: 1, positions: frames[motion.to].positions },
          ],
          u,
        ),
      );
      if (u >= 1) {
        motion = null;
        hold = HOLD_SECONDS;
      }
    } else if (state.status === "playing") {
      hold -= dt;
      if (hold <= 0) advanceWhilePlaying();
    }

    // Not if a move begun inside this tick already scheduled the next one
    // (beginMove -> startClock): scheduling twice would leave an untracked,
    // uncancellable handle and double the tick rate.
    if ((motion || state.status === "playing") && handle === null) handle = schedule(tick);
  }

  // Rewrites the current frame's pose and drops any transition in flight, so
  // every stop lands cleanly ON a keyframe.
  function settle() {
    motion = null;
    stopClock();
    snapTo(state.frameIndex);
  }

  return {
    getState: () => state,
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    goto(index) {
      const i = Math.max(0, Math.min(last, Math.round(index)));
      motion = null;
      stopClock();
      set({ frameIndex: i });
      snapTo(i);
      if (state.status === "playing") {
        hold = HOLD_SECONDS / state.speed;
        startClock();
      }
    },
    next() {
      if (state.frameIndex >= last) return;
      const from = state.frameIndex;
      if (state.status === "playing") set({ status: "paused" });
      set({ frameIndex: from + 1 });
      beginMove(from + 1, from);
    },
    prev() {
      if (state.frameIndex <= 0) return;
      const from = state.frameIndex;
      if (state.status === "playing") set({ status: "paused" });
      set({ frameIndex: from - 1 });
      beginMove(from - 1, from);
    },
    play() {
      if (state.status === "playing" || last === 0) return;
      // Playing from the end restarts, as every player does.
      if (state.frameIndex >= last && !motion) {
        set({ frameIndex: 0 });
        snapTo(0);
      }
      set({ status: "playing" });
      hold = motion ? 0 : HOLD_SECONDS / state.speed;
      startClock();
    },
    pause() {
      if (state.status !== "playing" && !motion) return;
      // Stopped mid-transition: land on whichever frame it was nearer to.
      if (motion) {
        const nearer = motion.elapsed / TRANSITION_SECONDS >= 0.5 ? motion.to : motion.fromIndex;
        set({ frameIndex: nearer });
      }
      set({ status: "paused" });
      settle();
    },
    setSpeed(speed) {
      set({ speed });
    },
    setLoop(loop) {
      set({ loop });
    },
    dispose() {
      stopClock();
      listeners.clear();
      motion = null;
    },
  };
}
