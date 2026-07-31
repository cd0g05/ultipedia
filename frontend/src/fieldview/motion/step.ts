// The single physics entry point (tech-design.md ADR-1). The live driver
// calls this once per fixed substep; simulate() calls the very same function
// in a loop. There is no second implementation for playback, which is what
// lets a test assert the two agree exactly and what lets Initiative D replay
// a frame rather than re-deriving it.
//
// Ownership note: step() CONSUMES its input state. The reaction ring is
// written in place rather than copied, because copying every mover's ring
// every substep is O(movers × react/dt) of pure garbage at 120 Hz — and this
// module's standing convention is that buffers in the hot path are reused,
// never retained by callers. Determinism is unaffected: the same state
// stepped forward the same way always produces the same result. Callers that
// need to keep the original (simulate() does) clone first via cloneState().

import type { Vec2 } from "../scene/types";
import type { MotionParams, MotionState, Mover, Route } from "./types";
import type { SpaceParams } from "../space/types";
import { arrive, coast, speedOf } from "./kinematics";
import { advance, currentTarget, emptyRoute, isComplete, isFinalLeg } from "./route";
import { createHistory, defenderTarget } from "./pursuit";
import { SETTLE_SPEED } from "./constants";

export function createMotionState(args: {
  movers: Mover[];
  routes?: Record<string, Route>;
  matchups?: Record<string, string | null>;
  possession?: string | null;
  react: number;
  dt: number;
}): MotionState {
  const { history, historyHead } = createHistory(args.movers, args.react, args.dt);
  return {
    movers: args.movers.map((m) => ({ id: m.id, pos: { ...m.pos }, vel: { ...m.vel } })),
    routes: args.routes ?? {},
    matchups: args.matchups ?? {},
    possession: args.possession ?? null,
    history,
    historyHead,
    disc: null,
    elapsed: 0,
  };
}

export function cloneState(s: MotionState): MotionState {
  const history: Record<string, Vec2[]> = {};
  for (const [id, ring] of Object.entries(s.history)) history[id] = ring.slice();
  const routes: Record<string, Route> = {};
  for (const [id, r] of Object.entries(s.routes)) routes[id] = { legs: r.legs, leg: r.leg };
  return {
    movers: s.movers.map((m) => ({ id: m.id, pos: { ...m.pos }, vel: { ...m.vel } })),
    routes,
    matchups: { ...s.matchups },
    possession: s.possession,
    history,
    historyHead: s.historyHead,
    disc: s.disc ? { ...s.disc } : null,
    elapsed: s.elapsed,
  };
}

function recordHistory(s: MotionState): number {
  for (const m of s.movers) {
    const ring = s.history[m.id];
    if (ring && ring.length > 0) ring[s.historyHead % ring.length] = m.pos;
  }
  const first = s.movers.find((m) => s.history[m.id]?.length);
  const length = first ? s.history[first.id].length : 1;
  return (s.historyHead + 1) % length;
}

export function step(
  s: MotionState,
  dt: number,
  mp: MotionParams,
  sp: SpaceParams,
): MotionState {
  // Written before anyone moves, so the ring holds a trailing window ending
  // at "now". The head must then ADVANCE before any defender reads: the slot
  // just written is "now", and the oldest surviving entry — the one exactly
  // `react` seconds back — is the one the next write will claim. Reading at
  // the pre-write head hands the defender the current position and, worse, a
  // delayedVel differenced the wrong way round, which sends it chasing a
  // point behind the cutter.
  const nextHead = recordHistory(s);
  s.historyHead = nextHead;

  const routes: Record<string, Route> = {};
  const movers: Mover[] = [];

  for (const m of s.movers) {
    const route = s.routes[m.id];

    if (route && !isComplete(route)) {
      const target = currentTarget(route);
      // Intermediate waypoints are rounded through at speed; only the last is
      // braked into (route.ts). That asymmetry is what makes a two-part cut a
      // setup rather than two sprints with a stop between them.
      const moved = arrive(m, target as Vec2, dt, mp, sp.vmax, { brake: isFinalLeg(route) });
      routes[m.id] = advance(route, moved);
      movers.push(moved);
      continue;
    }

    const target = defenderTarget(s, m.id, mp, dt);
    if (target !== null) {
      // Defenders brake onto the cushion point so they settle rather than
      // jittering around it. The snap only engages within one substep's
      // travel (under a tenth of a yard), so it is never visible as a jump.
      movers.push(arrive(m, target, dt, mp, sp.vmax));
      continue;
    }

    // Nobody to chase and nowhere to be — shed whatever speed is still being
    // carried, so a run stopped mid-flight does not leave pieces gliding.
    movers.push(coast(m, dt, mp));
    if (route) routes[m.id] = route;
  }

  return {
    movers,
    routes,
    matchups: s.matchups,
    possession: s.possession,
    history: s.history,
    historyHead: nextHead,
    disc: stepDisc(s, dt),
    elapsed: s.elapsed + dt,
  };
}

// The disc's own clock. Arrival — moving possession and re-deriving roles —
// is the disc partition's job; all this does is advance time, so that
// partition adds a completion branch rather than a second loop.
function stepDisc(s: MotionState, dt: number): MotionState["disc"] {
  if (s.disc === null) return null;
  return { ...s.disc, elapsed: s.disc.elapsed + dt };
}

// A run is over when nothing is still moving, every route is spent, and no
// disc is in the air. Checked rather than timed, so a run ends when it looks
// finished rather than after a fixed duration.
export function isSettled(s: MotionState): boolean {
  if (s.disc !== null) return false;
  for (const route of Object.values(s.routes)) {
    if (!isComplete(route)) return false;
  }
  for (const m of s.movers) {
    if (speedOf(m) > SETTLE_SPEED) return false;
  }
  return true;
}

export { emptyRoute };
