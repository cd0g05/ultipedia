// Force geometry (tech-design.md ADR-3: "force is geometry, never stored").
//
// The space model already answers "what is the force?" — space/layers.ts
// markKernel derives θ_shadow = bearing(thrower → mark), which is why the
// brief annotates it "the mark's position IS the force". This module adds no
// second answer. It is purely a convenience for *positioning* the mark:
//
//   markPosFor()  — a named force in, a mark position out (snap)
//   readForce()   — a scene in, the name of whatever force its geometry
//                   already describes out, or "custom" (read back)
//
// Nothing here is persisted, and nothing in space/ imports it. Adding a
// stored force field anywhere is a review-blocking change (ADR-3): the drawn
// mark could then contradict the stated force.
//
// Coordinates are field-relative yards throughout, exactly as scene/types.ts
// defines them: +x = downfield (attacking), y = lateral. Orientation lives
// only in render/coords.ts (canon ADR-11), so these offsets survive the
// vertical render unchanged and readForce() gives the same answer regardless
// of how the stage draws the field.

import type { Scene, Vec2 } from "./types";

export type ForceSide = "flat" | "flick" | "backhand";
export type ForceAngle = "default" | "inside" | "around";
export type ForceReading = { side: ForceSide; angle: ForceAngle } | "custom";

export const FORCE_SIDES: readonly ForceSide[] = ["flat", "flick", "backhand"];
export const FORCE_ANGLES: readonly ForceAngle[] = ["default", "inside", "around"];

// How far a hand-dragged mark may sit from a preset and still read as that
// named force. This is a UX-generosity number, but it has a hard ceiling: it
// must stay below *half* the smallest gap between any two presets, or a
// single mark position could satisfy two named forces at once. The tightest
// pair below is 1.22 yd apart, so anything under ~0.61 is unambiguous.
// force.test.ts asserts that relationship so a future tuning pass to
// FORCE_PRESETS cannot silently break it.
export const FORCE_TOLERANCE_YD = 0.5;

// The mark's offset from the thrower, in field-relative yards, for each of
// the 9 side × angle combinations.
//
// Sign convention: +y is the flick (forehand) side of a right-handed
// thrower, -y the backhand side. With the field rendered attacking-up, +y is
// screen-right (render/coords.ts).
//
// Side — which side of the thrower the mark takes away. Standard force
// semantics: the mark stands on the side it is *removing*, funnelling throws
// to the other side.
//   flick    → takes away the backhand, so the mark stands backhand side (-y)
//   backhand → takes away the flick, so the mark stands flick side (+y)
//   flat     → straight-on, downfield of the thrower, conceding neither side
//
// Angle — how far around the thrower the mark has slid, and how tight it
// plays, which are the same motion:
//   inside  → squared up and tight, closing the inside-out lane: less
//             lateral, further downfield
//   default → the textbook position for that force
//   around  → slid wide to the break side to close the around lane: more
//             lateral, shallower
//
// Flat has no break side, so its inside/around have no natural referent. By
// convention they are a small shade to the flick and backhand sides
// respectively, kept deliberately small so flat still reads as flat; the
// three flat cells separate mainly by how far off the thrower the mark
// stands.
//
// NEEDS VISUAL TUNING: these are a first pass, not a calibration exercise
// (approach.md flags the same). They live as constants in this one file
// precisely so that correcting them after a look at the rendered field is a
// token edit rather than a rewrite. If you retune them, keep every pair at
// least 2 × FORCE_TOLERANCE_YD apart — the guard test will tell you.
export const FORCE_PRESETS: Record<ForceSide, Record<ForceAngle, Vec2>> = {
  flat: {
    inside: { x: 3.5, y: 0.5 },
    default: { x: 2.3, y: 0.0 },
    around: { x: 1.0, y: -0.5 },
  },
  flick: {
    inside: { x: 2.8, y: -1.5 },
    default: { x: 1.7, y: -2.3 },
    around: { x: 0.5, y: -2.9 },
  },
  backhand: {
    inside: { x: 2.8, y: 1.5 },
    default: { x: 1.7, y: 2.3 },
    around: { x: 0.5, y: 2.9 },
  },
};

// Where the mark goes when a force is chosen. Deliberately not clamped to the
// field: this is offset arithmetic, and callers apply it through
// scene.movePlayer, which owns clamping (scene/field.ts). Near a sideline the
// clamp may land the mark short of the preset, in which case readForce()
// honestly reports "custom" — the mark is not where that force wants it.
export function markPosFor(side: ForceSide, angle: ForceAngle, throwerPos: Vec2): Vec2 {
  const offset = FORCE_PRESETS[side][angle];
  return { x: throwerPos.x + offset.x, y: throwerPos.y + offset.y };
}

// Read the current force back out of the scene's geometry. Roles are used to
// find the pair (matching scene.ts moveThrower), so this works both before
// and after possession becomes the source of truth for those roles (ADR-1) —
// the thrower is the thrower either way.
//
// A scene with no thrower or no mark has no force to report; it returns
// "custom" rather than throwing, and the Mark panel gates its disabled
// "needs a thrower" state on possession, not on this.
export function readForce(scene: Scene): ForceReading {
  const thrower = scene.players.find((p) => p.role === "thrower");
  const mark = scene.players.find((p) => p.role === "mark");
  if (!thrower || !mark) return "custom";

  const offset: Vec2 = {
    x: mark.pos.x - thrower.pos.x,
    y: mark.pos.y - thrower.pos.y,
  };

  // Nearest preset wins, so the reading stays deterministic even if a future
  // tuning pass lets two tolerance discs touch. Only the offset is compared,
  // never the absolute position, which is what makes the reading invariant
  // under moving the whole play up or down the field.
  let best: { side: ForceSide; angle: ForceAngle } | null = null;
  let bestDist = Infinity;
  for (const side of FORCE_SIDES) {
    for (const angle of FORCE_ANGLES) {
      const preset = FORCE_PRESETS[side][angle];
      const d = Math.hypot(offset.x - preset.x, offset.y - preset.y);
      if (d < bestDist) {
        bestDist = d;
        best = { side, angle };
      }
    }
  }

  // Inclusive at the tolerance: a mark sitting exactly FORCE_TOLERANCE_YD
  // away still reads as the named force; only beyond it is "custom". The
  // epsilon is there because the tolerance is a fuzzy UX threshold, not a
  // measurement — a mark placed exactly on the boundary should not flip its
  // reading on the sixteenth decimal of a yard.
  if (!best || bestDist > FORCE_TOLERANCE_YD + 1e-9) return "custom";
  return best;
}
