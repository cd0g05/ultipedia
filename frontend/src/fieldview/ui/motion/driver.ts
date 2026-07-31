// The clock (tech-design.md ADR-5). This is the only place in fieldview/ that
// reads wall-clock time, and the module's first free-running frame loop —
// store.onFrame has always been a repaint coalescer driven by mutations, not
// a simulation.
//
// Two properties carry the design:
//
// 1. FIXED TIMESTEP. Real elapsed time goes into an accumulator, which is
//    consumed in DT-sized bites. The simulation therefore advances identically
//    regardless of the host's frame pacing, which is what makes it replayable
//    (Initiative D) and what makes ADR-1's live/headless agreement possible at
//    all. The accumulator is CLAMPED first: a backgrounded tab hands back one
//    enormous elapsed time, and integrating it in one go teleports everyone
//    across the field (PRD FR-4.5).
//
// 2. ONE MUTATION PER RENDERED FRAME, not per substep. store.mutate() notifies
//    subscribers and schedules a repaint; calling it eight times for eight
//    substeps would do the same painting eight times for one visible frame.
//    Canon ADR-2 is absolute here — React is told nothing per frame; the
//    painters already subscribe to onFrame and that path is unchanged.

import type { SpaceParams } from "../../space/types";
import type { SceneStore } from "../../scene/store";
import type { MotionParams, MotionState, Mover } from "../../motion/types";
import type { Vec2 } from "../../scene/types";
import { DT, MAX_FRAME_SECONDS } from "../../motion/constants";
import { createMotionState, isSettled, step } from "../../motion/step";
import { simulate } from "../../motion/simulate";
import { getRoutes, rewindRoutes, setStatus } from "./motionMode";
import { beginFlight, discPos, hasArrived } from "../../motion/disc";
import type { DiscFlight } from "../../motion/types";
import { setFlightPos } from "../shell/throwMode";

export interface MotionDriver {
  run(): void;
  // Animates the disc to a receiver and applies the throw ON ARRIVAL.
  // Returns false when it declined to animate (reduced motion, or a throw
  // that makes no sense), so the caller can fall back to the instant path.
  throwDisc(receiverId: string, apply: () => void): boolean;
  stop(): void;
  reset(): void;
  isRunning(): boolean;
  dispose(): void;
}

export interface MotionDriverOptions {
  // Supplied rather than read from prefs.ts directly, so the driver has no
  // opinion about where tunables live and stays testable without a React
  // tree. Partition 4 wires this to the overlay prefs store.
  getParams: () => { mp: MotionParams; sp: SpaceParams };
  // Injectable clock and scheduler. Tests drive frames by hand; without this
  // seam every timing assertion would depend on jsdom's rAF pacing, which is
  // exactly the non-determinism the fixed timestep exists to remove.
  now?: () => number;
  schedule?: (cb: () => void) => number;
  cancel?: (handle: number) => void;
  prefersReducedMotion?: () => boolean;
}

function defaultReducedMotion(): boolean {
  // ADR-6: this is a JS check, deliberately, and is the module's one
  // sanctioned exception to "reduced motion via Tailwind motion-safe:
  // variants, no JS matchMedia". That convention holds for CSS transitions;
  // there is no CSS here to vary, so a variant would silently do nothing.
  // Queried once per run rather than subscribed, which keeps the
  // no-listener half of the convention intact.
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function createMotionDriver(
  store: SceneStore,
  opts: MotionDriverOptions,
): MotionDriver {
  const now = opts.now ?? (() => performance.now());
  const schedule =
    opts.schedule ?? ((cb: () => void) => requestAnimationFrame(() => cb()));
  const cancel = opts.cancel ?? ((h: number) => cancelAnimationFrame(h));
  const reducedMotion = opts.prefersReducedMotion ?? defaultReducedMotion;

  let state: MotionState | null = null;
  let handle: number | null = null;
  let lastTime = 0;
  let accumulator = 0;
  // Captured at run start so Reset restores the field exactly, however the run
  // ended (PRD FR-4.3). Keyed by id rather than index, per module convention.
  let preRun: Map<string, Vec2> | null = null;
  // The disc's flight runs on its own loop rather than through MotionState and
  // the run-status machinery. A throw is not a "run": routing it through
  // setStatus() would put the route panel into Running…/Stop for something the
  // coach did not start there, and would freeze the field read-only for a
  // second. MotionState.disc stays the model fact a headless trajectory
  // carries for Initiative D; this is the live animation.
  let flight: DiscFlight | null = null;
  let flightHandle: number | null = null;
  let flightLast = 0;
  // Held beside the flight rather than on it: DiscFlight is the pure model
  // type a trajectory carries, and a callback has no business in it.
  let flightApply: (() => void) | null = null;

  function buildState(): MotionState {
    const scene = store.getScene();
    const { sp } = opts.getParams();
    const movers: Mover[] = scene.players.map((p) => ({
      id: p.id,
      pos: { ...p.pos },
      vel: { x: 0, y: 0 },
    }));
    return createMotionState({
      movers,
      routes: getRoutes(),
      matchups: scene.matchups,
      possession: scene.possession,
      react: sp.react,
      dt: DT,
    });
  }

  function writePositions(movers: { id: string; pos: Vec2 }[]): void {
    store.mutate((draft) => {
      for (const m of movers) {
        const player = draft.players.find((p) => p.id === m.id);
        // Positions only. Roles stay derived — normalize() is their only
        // writer (canon ADR-17) and motion has no business touching them.
        if (player) player.pos = { x: m.pos.x, y: m.pos.y };
      }
    });
  }

  function cancelFrame(): void {
    if (handle !== null) {
      cancel(handle);
      handle = null;
    }
  }

  function frame(): void {
    if (state === null) return;
    const { mp, sp } = opts.getParams();

    const t = now();
    const elapsed = (t - lastTime) / 1000;
    lastTime = t;

    // Clamp the frame, not the accumulator's running total: a stall should
    // cost the run the time it was away rather than being played back in fast
    // forward (PRD FR-4.5).
    accumulator += Math.min(elapsed, MAX_FRAME_SECONDS);

    let advanced = false;
    while (accumulator >= DT) {
      state = step(state, DT, mp, sp);
      accumulator -= DT;
      advanced = true;
    }

    if (advanced) writePositions(state.movers);

    if (isSettled(state)) {
      cancelFrame();
      state = null;
      setStatus("settled");
      return;
    }
    handle = schedule(frame);
  }

  function cancelFlight(): void {
    if (flightHandle !== null) {
      cancel(flightHandle);
      flightHandle = null;
    }
    flight = null;
    flightApply = null;
    setFlightPos(null);
  }

  function flightFrame(): void {
    if (flight === null) return;
    const t = now();
    flight = { ...flight, elapsed: flight.elapsed + Math.min((t - flightLast) / 1000, MAX_FRAME_SECONDS) };
    flightLast = t;

    if (hasArrived(flight)) {
      const land = flightApply;
      cancelFlight();
      // Possession moves exactly here, at the moment the disc lands — never
      // when the receiver was clicked (PRD FR-5.3). Applied AFTER clearing the
      // flight so there is no instant where both a flight and the new
      // possession are live.
      land?.();
      return;
    }

    setFlightPos(discPos(flight));
    flightHandle = schedule(flightFrame);
  }

  return {
    throwDisc(receiverId, apply) {
      const scene = store.getScene();
      const thrower = scene.players.find((p) => p.id === scene.possession);
      const receiver = scene.players.find((p) => p.id === receiverId);
      // Nothing sensible to animate: no holder, no receiver, or a throw to
      // self. The caller applies instantly instead.
      if (!thrower || !receiver || thrower.id === receiver.id) return false;
      if (reducedMotion()) return false;

      cancelFlight();
      const { sp } = opts.getParams();
      flight = beginFlight(thrower.pos, receiver.pos, receiverId, sp.hang);
      flightApply = apply;
      flightLast = now();
      setFlightPos(discPos(flight));
      flightHandle = schedule(flightFrame);
      return true;
    },

    run() {
      if (handle !== null) return;

      preRun = new Map(store.getScene().players.map((p) => [p.id, { ...p.pos }]));
      const initial = buildState();

      if (reducedMotion()) {
        // Same physics, no animation: run it headlessly and apply the end
        // state in a single mutation (ADR-6). simulate() clones, so `initial`
        // is not consumed here.
        const { mp, sp } = opts.getParams();
        const trajectory = simulate(initial, mp, sp);
        writePositions(
          Object.entries(trajectory.samples).map(([id, track]) => ({
            id,
            pos: track[track.length - 1],
          })),
        );
        setStatus("settled");
        return;
      }

      state = initial;
      accumulator = 0;
      lastTime = now();
      setStatus("running");
      handle = schedule(frame);
    },

    stop() {
      if (handle === null) return;
      cancelFrame();
      // Pieces stay exactly where they are. Freezing mid-run is a legitimate
      // coaching moment, not an error (ux.md Flow 5).
      state = null;
      setStatus("stopped");
    },

    reset() {
      cancelFrame();
      state = null;
      if (preRun) {
        writePositions([...preRun].map(([id, pos]) => ({ id, pos })));
      }
      // Routes rewind rather than clear, so the same cut can be re-run after
      // a tuning change without re-clicking it.
      rewindRoutes();
      setStatus("idle");
    },

    isRunning() {
      return handle !== null;
    },

    dispose() {
      cancelFrame();
      cancelFlight();
      state = null;
      preRun = null;
    },
  };
}
