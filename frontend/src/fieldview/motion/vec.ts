// Vec2 arithmetic for the motion model. Deliberately separate from
// space/math.ts, which holds the space model's scalar helpers (smoothstep,
// clamp) and no vector algebra at all — there is nothing here to share, and
// importing across the two libraries to save nine one-line functions would
// couple them for no gain.
//
// Every function returns a new Vec2 rather than mutating: the stepper is a
// pure function (ADR-1), and aliasing a shared vector is the classic way that
// stops being true without anyone noticing.

import type { Vec2 } from "../scene/types";

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec2, k: number): Vec2 {
  return { x: v.x * k, y: v.y * k };
}

export function len(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Zero-length input returns zero rather than NaN. Callers routinely normalise
// a direction that can legitimately be zero (a mover exactly on its target, a
// defender exactly on the disc), and a NaN there propagates into a position
// and blanks the field.
export function norm(v: Vec2): Vec2 {
  const l = len(v);
  if (l === 0) return { x: 0, y: 0 };
  return { x: v.x / l, y: v.y / l };
}

// Clamp a vector's magnitude, preserving direction. This is the whole of the
// acceleration limit: capping the per-tick change in velocity is what makes a
// direction change cost speed, with no separate turn-penalty rule to tune
// (tech-design "Implementation Patterns").
export function clampLen(v: Vec2, max: number): Vec2 {
  const l = len(v);
  if (l <= max || l === 0) return v;
  return scale(v, max / l);
}
