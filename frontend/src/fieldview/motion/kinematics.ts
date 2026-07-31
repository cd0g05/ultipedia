// Accel-limited steering with arrival braking — the whole of how a body moves
// in this model. Both offense and defense go through arrive(); a defender is
// not a different kind of mover, it just steers at a different target
// (pursuit.ts). That is what guarantees PRD FR-3.6: the defense cannot
// outrun, out-accelerate, or out-turn the offense, because it is running the
// same function.
//
// Turn cost is EMERGENT, not a rule. arrive() caps the change applied to the
// velocity *vector*, so a mover changing direction spends its acceleration
// budget rotating the vector instead of lengthening it, and loses speed
// automatically. There is no separate turn penalty to tune, and therefore no
// way for a turn penalty and the straight-line case to disagree.

import type { Vec2 } from "../scene/types";
import type { Mover, MotionParams } from "./types";
import { add, clampLen, len, norm, scale, sub } from "./vec";

export interface ArriveOptions {
  // Final legs brake to a stop on the target; intermediate waypoints are
  // rounded through at speed (route.ts). A real cut does not stop at every
  // point it passes.
  brake: boolean;
}

// The distance inside which a braking mover would pass its target during this
// tick. Snapping there rather than integrating past it is what makes arrival
// exact: no overshoot, and therefore no oscillation around the target for the
// settle test to wait out.
function wouldPassTarget(m: Mover, toTarget: Vec2, dt: number): boolean {
  return len(toTarget) <= len(m.vel) * dt;
}

export function arrive(
  m: Mover,
  target: Vec2,
  dt: number,
  mp: MotionParams,
  vmax: number,
  opts: ArriveOptions = { brake: true },
): Mover {
  const toTarget = sub(target, m.pos);
  const d = len(toTarget);

  if (opts.brake && wouldPassTarget(m, toTarget, dt)) {
    // Copied, not aliased: `target` is usually a waypoint out of Route.legs,
    // and handing back a reference to it would let a mover's position and a
    // route's waypoint become the same object.
    return { id: m.id, pos: { x: target.x, y: target.y }, vel: { x: 0, y: 0 } };
  }

  // v² = 2·a·d — the speed from which this mover can still stop exactly on
  // the target. Outside that distance it wants full speed; inside it, it
  // wants exactly enough to arrive at rest.
  const brakingSpeed = Math.sqrt(2 * mp.decel * d);
  const desiredSpeed = opts.brake ? Math.min(vmax, brakingSpeed) : vmax;
  const desiredVel = scale(norm(toTarget), desiredSpeed);

  // Braking gets the (larger) decel budget, steering and speeding up get
  // accel. Deciding by which one the mover is actually doing — rather than by
  // whether it is inside the braking radius — means a mover turning hard
  // while slowing is not quietly granted the bigger budget for the turn.
  const steer = sub(desiredVel, m.vel);
  const slowing = len(desiredVel) < len(m.vel);
  const budget = (slowing ? mp.decel : mp.accel) * dt;

  const vel = clampLen(add(m.vel, clampLen(steer, budget)), vmax);
  return { id: m.id, pos: add(m.pos, scale(vel, dt)), vel };
}

// A mover with nowhere to be still has to shed the speed it is carrying,
// otherwise stopping a run mid-flight would leave pieces gliding forever.
export function coast(m: Mover, dt: number, mp: MotionParams): Mover {
  const speed = len(m.vel);
  if (speed === 0) return m;
  const next = Math.max(0, speed - mp.decel * dt);
  const vel = scale(norm(m.vel), next);
  return { id: m.id, pos: add(m.pos, scale(vel, dt)), vel };
}

export function speedOf(m: Mover): number {
  return len(m.vel);
}
