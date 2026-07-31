// Defensive pursuit (tech-design.md ADR-2). A defender does not steer at its
// cutter. It steers at a cushion point built from what it saw `react` seconds
// ago, projected forward by the cutter's speed, and pushed goalside:
//
//   lead     = cutterPos(t − react) + cutterVel(t − react) · leadTime
//   leverage = disc → lead, normalised          # goalside: away from the disc
//   target   = lead + cushion · leverage
//
// PRD FR-3.2/3.4/3.5 read like three behaviours, and hand-coding three rules
// would leave them to fight at the boundaries. They are all consequences of
// this one expression:
//
//   - A defender deep on an approaching cutter finds the target under itself
//     by only the cushion, so it drifts under slowly and lets the gap close
//     rather than charging (FR-3.2).
//   - When the cutter attacks deep, the lead term grows with the cutter's
//     speed and swings the target past the defender, so the defender is
//     already accelerating deep before the cutter arrives (FR-3.4).
//   - The target tracks the cutter laterally one-for-one, so horizontal
//     movement is matched for free (FR-3.5).
//   - Because the input is delayed, a direction change costs the defender
//     exactly `react` seconds of committed momentum — which is why a two-part
//     cut beats it and a straight cut does not.

import type { Vec2 } from "../scene/types";
import type { MotionParams, MotionState } from "./types";
import { add, norm, scale, sub } from "./vec";

// One ring entry per fixed step, so "react seconds ago" is exactly one lap.
// At least one entry: a zero reaction time still needs somewhere to read
// the current position from.
export function historyLength(react: number, dt: number): number {
  return Math.max(1, Math.round(react / dt));
}

// The ring is seeded with the starting position rather than left empty: at
// t = 0 a defender has not seen anything happen yet, and "it saw the cutter
// standing where it started" is exactly right.
export function createHistory(
  movers: { id: string; pos: Vec2 }[],
  react: number,
  dt: number,
): { history: Record<string, Vec2[]>; historyHead: number } {
  const length = historyLength(react, dt);
  const history: Record<string, Vec2[]> = {};
  for (const m of movers) {
    history[m.id] = new Array<Vec2>(length).fill(m.pos);
  }
  return { history, historyHead: 0 };
}

// `historyHead` is where the next write goes, which means it currently holds
// the OLDEST entry — the one exactly one lap (react seconds) old.
export function delayedPos(state: MotionState, id: string): Vec2 {
  const ring = state.history[id];
  if (!ring || ring.length === 0) return { x: 0, y: 0 };
  return ring[state.historyHead % ring.length];
}

// Derived from the two oldest entries rather than stored, so the ring stays a
// plain position buffer. One step apart is exactly the dt the ring was built
// at, which is fixed (ADR-5) — that is what makes this well defined.
export function delayedVel(state: MotionState, id: string, dt: number): Vec2 {
  const ring = state.history[id];
  if (!ring || ring.length < 2) return { x: 0, y: 0 };
  const oldest = ring[state.historyHead % ring.length];
  const next = ring[(state.historyHead + 1) % ring.length];
  return scale(sub(next, oldest), 1 / dt);
}

export function pursuitTarget(
  leadPos: Vec2,
  leadVel: Vec2,
  disc: Vec2 | null,
  mp: MotionParams,
): Vec2 {
  const projected = add(leadPos, scale(leadVel, mp.lead));
  // No disc means no leverage axis to be goalside of — there is nothing to
  // defend a lane to. The defender falls back to a plain delayed follow
  // rather than picking an arbitrary direction (ADR-2's documented fallback).
  if (disc === null || mp.cushion === 0) return projected;
  const axis = norm(sub(projected, disc));
  if (axis.x === 0 && axis.y === 0) return projected;
  return add(projected, scale(axis, mp.cushion));
}

// Where the disc is for leverage purposes: the possessor's CURRENT position,
// not a delayed one. A defender always knows where the disc is; what it is
// late on is the cutter.
export function discPosition(state: MotionState): Vec2 | null {
  if (state.possession === null) return null;
  const holder = state.movers.find((m) => m.id === state.possession);
  return holder ? holder.pos : null;
}

// null means "this defender does not pursue" — either it is not a defender,
// or its matchup is explicit free roam (canon ADR-18), which is exactly the
// escape hatch a coach uses to place a zone by hand.
export function defenderTarget(
  state: MotionState,
  defenderId: string,
  mp: MotionParams,
  dt: number,
): Vec2 | null {
  const assigned = state.matchups[defenderId];
  if (assigned === undefined || assigned === null) return null;
  if (!state.history[assigned]) return null;
  return pursuitTarget(
    delayedPos(state, assigned),
    delayedVel(state, assigned, dt),
    discPosition(state),
    mp,
  );
}
