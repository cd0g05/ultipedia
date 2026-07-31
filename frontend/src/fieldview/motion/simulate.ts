// The headless half of ADR-1: the same step() run to completion, recording a
// sample per fixed step. This is the artifact Initiative D replays — it asks
// what a frame's recorded actions look like over time instead of storing
// baked positions or re-implementing physics.
//
// The hard ceiling is not defensive paranoia. Pursuit is a feedback loop with
// gains a coach can drag to their extremes, and feedback loops with tunable
// gains oscillate. A ceiling turns "the tuning is pathological" into a
// terminating run rather than a hung tab.

import type { Vec2 } from "../scene/types";
import type { SpaceParams } from "../space/types";
import type { MotionParams, MotionState, Trajectory } from "./types";
import { DT, MAX_SIM_SECONDS } from "./constants";
import { cloneState, isSettled, step } from "./step";

export interface SimulateOptions {
  dt?: number;
  maxSeconds?: number;
}

export function simulate(
  s0: MotionState,
  mp: MotionParams,
  sp: SpaceParams,
  opts: SimulateOptions = {},
): Trajectory {
  const dt = opts.dt ?? DT;
  const maxSeconds = opts.maxSeconds ?? MAX_SIM_SECONDS;

  // step() consumes its input (see step.ts). Cloning here is what makes
  // simulate() safe to call on a state the caller still holds — the live
  // driver does exactly that when reduced motion is on.
  let s = cloneState(s0);

  const samples: Record<string, Vec2[]> = {};
  for (const m of s.movers) samples[m.id] = [{ ...m.pos }];

  let elapsed = 0;
  while (!isSettled(s) && elapsed < maxSeconds) {
    s = step(s, dt, mp, sp);
    elapsed += dt;
    for (const m of s.movers) {
      const track = samples[m.id];
      // A mover that appeared mid-run (nothing does today, but the disc
      // partition adds one) starts its track padded to the current length so
      // every track stays index-aligned with the sample clock.
      if (track) track.push({ ...m.pos });
    }
  }

  return { dt, samples, duration: elapsed };
}

// Linear interpolation between samples, so a caller can ask for any time
// rather than only multiples of dt. At exact multiples this returns the
// stored sample untouched, which is what lets the live/headless agreement
// test assert equality rather than closeness.
export function sampleAt(t: Trajectory, seconds: number): Record<string, Vec2> {
  const out: Record<string, Vec2> = {};
  const exact = seconds / t.dt;

  for (const [id, track] of Object.entries(t.samples)) {
    if (track.length === 0) continue;
    const clamped = Math.min(Math.max(exact, 0), track.length - 1);
    const lo = Math.floor(clamped);
    const hi = Math.min(lo + 1, track.length - 1);
    const f = clamped - lo;
    out[id] =
      f === 0
        ? { ...track[lo] }
        : {
            x: track[lo].x + (track[hi].x - track[lo].x) * f,
            y: track[lo].y + (track[hi].y - track[lo].y) * f,
          };
  }
  return out;
}
