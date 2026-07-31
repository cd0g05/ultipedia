// The single source of truth for every numeric constant in the motion model
// (tech-design.md ADR-3). No constant here may be inlined in another motion/
// file; tests/motionGuard.test.ts scans for violations, mirroring the rule
// space/constants.ts has carried since the space model shipped.
//
// What is NOT here, deliberately: player top speed and reaction time. Those
// are SpaceParams (`vmax`, `react`), already user-tunable and already the
// numbers the heatmap is computed from. Declaring them again would be a
// second answer to a question the space model has answered since ADR-5 —
// the failure mode canon ADR-17 and ADR-19 exist to prevent, reappearing in
// a third place. motionGuard fails the build if either is assigned here.
//
// Values below are a reasoned first pass, not a calibration. Like
// FORCE_PRESETS before them, they want a coach's eye on a deployed preview.

import type { MotionParams } from "./types";

// --- The three user-tunable motion parameters (sliders) ---

// | accel   | 6.0 yd/s² | 3–10   | acceleration out of a stance
// | decel   | 9.0 yd/s² | 4–14   | braking — harder than accelerating, as legs are
// | cushion | 3.0 yd    | 0–8    | defensive goalside gap (ADR-2)
// | lead    | 0.6 s     | 0–1.5  | how far ahead a defender plays the cutter's speed
export const DEFAULT_MOTION_PARAMS: MotionParams = {
  accel: 6.0,
  decel: 9.0,
  cushion: 3.0,
  lead: 0.6,
};

export const MOTION_SLIDER_RANGES = {
  accel: { min: 3, max: 10 },
  decel: { min: 4, max: 14 },
  cushion: { min: 0, max: 8 },
  lead: { min: 0, max: 1.5 },
} as const;

// --- Fixed simulation constants ---

// The fixed timestep (ADR-5). Everything downstream depends on this being a
// constant: determinism, live/headless agreement, and the reaction ring's
// length (react / DT) are all only well-defined because the step never varies
// with host frame pacing.
export const DT = 1 / 120;

// The accumulator ceiling (PRD FR-4.5). A backgrounded tab hands back one
// enormous elapsed time; without this, integrating it in one go teleports
// every player across the field. Capped at a quarter second — three rendered
// frames' worth — so a brief stall still plays out smoothly and a long one
// simply loses time rather than the plot.
export const MAX_FRAME_SECONDS = 0.25;

// A run is over when every mover is slower than this and has nowhere left to
// be. Well under a walking pace, so it reads as "stopped" rather than as a
// piece still creeping.
export const SETTLE_SPEED = 0.05; // yd/s

// How close counts as having reached an intermediate waypoint. Generous on
// purpose: a real cut rounds the corner, it does not touch a survey pin
// (see route.ts — intermediate legs are never braked into).
export const WAYPOINT_RADIUS = 1.0; // yd

// Hard ceiling on a headless run, so a pathological tuning combination
// terminates instead of hanging the caller (PRD "Reliability"). Far longer
// than any real cut: a 110 yd field crossed at the slowest tunable top speed
// is well under this.
export const MAX_SIM_SECONDS = 30;
