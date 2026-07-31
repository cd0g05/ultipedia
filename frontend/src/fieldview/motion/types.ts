// The motion model's shapes (tech-design.md "Data Models"). This module is
// headless (ADR-1): nothing in motion/ imports React, the DOM, or canvas — it
// is a pure library over positions in yards, exactly as space/ is.
//
// Everything the physics needs lives in MotionState. Nothing is read from a
// closure, a module-level variable, or the Scene — that self-containment is
// what lets the SAME stepper be driven live by a rAF clock and run headlessly
// to produce a trajectory (ADR-1), and it is what makes the whole thing
// testable without a DOM or a fake clock.

import type { Vec2 } from "../scene/types";

export interface Mover {
  // Player.id — everything here pairs by stable id, never array index, per
  // the module convention that tweening and backfill already follow.
  id: string;
  pos: Vec2; // yards, model space (+x = attacking). Never a pixel.
  vel: Vec2; // yards per second
}

export interface Route {
  legs: Vec2[]; // ordered waypoints; empty means "no route"
  leg: number; // index of the leg currently being run
}

export interface DiscFlight {
  from: Vec2;
  to: Vec2;
  receiverId: string;
  elapsed: number;
  // Seconds, from space/layers.ts flightTime(). Motion never computes a
  // flight duration of its own (ADR-3) — the heatmap is already drawn from
  // that answer, and a second one could contradict it.
  duration: number;
}

export interface MotionState {
  movers: Mover[];
  routes: Record<string, Route>; // offensive player id → route
  // Snapshotted from Scene.matchups at run start rather than read live: the
  // simulation must be a pure function of its inputs, and a matchup changing
  // mid-run would make a replay disagree with the original.
  matchups: Record<string, string | null>;
  possession: string | null; // whose position defines the leverage axis (ADR-2)
  // Ring buffer of past cutter positions, one entry per fixed step, so a
  // defender can steer on what it saw `react` seconds ago (ADR-2). Sized and
  // filled in the pursuit partition; declared here because it is part of the
  // state the stepper is a pure function of.
  history: Record<string, Vec2[]>;
  historyHead: number;
  disc: DiscFlight | null;
  elapsed: number;
}

// The three tunables motion actually owns. vmax and react are deliberately
// ABSENT: they are SpaceParams, and redeclaring them here would give the
// heatmap and the animation two different answers to "how fast can a player
// run" (ADR-3). The stepper takes a SpaceParams alongside this.
export interface MotionParams {
  accel: number; // yd/s²
  decel: number; // yd/s² — braking is its own number; players stop faster than they start
  cushion: number; // yd — the defender's goalside gap (ADR-2)
}

// The headless artifact (ADR-1). Initiative D replays a frame by asking for
// one of these rather than storing baked positions or re-implementing physics.
export interface Trajectory {
  dt: number; // the fixed step it was produced at
  samples: Record<string, Vec2[]>; // player id → position per sample
  duration: number; // seconds
}
