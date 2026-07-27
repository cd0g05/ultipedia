// Brief §4.4, transcribed verbatim — the single source of truth for every
// numeric constant in the model (ADR-5). No constant from §4.4 may appear in
// any other space/ file; tests/spaceGuard.test.ts scans for violations.
// "They were calibrated by feel and are considered correct until the client
// says otherwise."

import type { LayerFlags, SpaceParams } from "./types";

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// --- The six user-tunable parameters (sliders) ---

// | vmax    | 7.0 yd/s | 5–9     | player top speed
// | react   | 0.4 s    | 0.1–0.8 | reaction time
// | head    | 0.25 s   | 0–0.6   | cutter head start (offense initiative)
// | hang    | 1.0      | 0.5–1.6 | huck hang factor in t_f
// | markStr | 0.8      | 0–1     | mark shadow strength (never 1.0 — breaks exist)
// | W markW | 38°      | 15–60°  | mark shadow half-width
export const DEFAULT_MARK_W_DEG = 38;

export const DEFAULT_PARAMS: SpaceParams = {
  vmax: 7.0,
  react: 0.4,
  head: 0.25,
  hang: 1.0,
  markStr: 0.8,
  markW: degToRad(DEFAULT_MARK_W_DEG),
};

// Slider ranges (markW in degrees — the UI's unit; convert via degToRad).
export const SLIDER_RANGES = {
  vmax: { min: 5, max: 9 },
  react: { min: 0.1, max: 0.8 },
  head: { min: 0, max: 0.6 },
  hang: { min: 0.5, max: 1.6 },
  markStr: { min: 0, max: 1 },
  markWDeg: { min: 15, max: 60 },
} as const;

// --- Fixed pipeline constants (brief §4.2/§4.3/§4.4) ---

// t_f(d) = 0.4 + d/20 + hang · 1.6 · (d/70)²   # disc flight time
export const FLIGHT_BASE = 0.4;
export const FLIGHT_LINEAR_SCALE = 20;
export const FLIGHT_HANG_COEFF = 1.6;
export const FLIGHT_HANG_SCALE = 70;

// τ(p) = react + max(0, dist(p, cell) − 1) / vmax   # player arrival time
export const ARRIVAL_SLACK = 1;

// comp(d) = 1 − 0.6 · ss(15, 75, d)   # range = 75 yd, completion-decay scale
export const COMP_DEPTH = 0.6;
export const COMP_NEAR = 15;
export const COMP_RANGE = 75;

// mark = 1 − markStr · bump · ss(2, 10, d)   # distance ramp
export const MARK_RAMP_NEAR = 2;
export const MARK_RAMP_FAR = 10;

// cov  = ss(−0.35, 0.35, t_f(d) − τ_i)
// beat = ss(−0.15, 0.55, τ_i − τ_O + head)
// coverage_i = 1 − 0.92 · cov   # coverage cap = 0.92
export const COV_SS_LO = -0.35;
export const COV_SS_HI = 0.35;
export const BEAT_SS_LO = -0.15;
export const BEAT_SS_HI = 0.55;
export const COVERAGE_CAP = 0.92;

// lane: keep if projection t ∈ (0.06, 0.94); bump = max(0, 1 − (d⊥/2.2)²)²
// lane_i = 1 − 0.55 · bump   # lane radius 2.2 yd, lane strength 0.55
export const LANE_T_MIN = 0.06;
export const LANE_T_MAX = 0.94;
export const LANE_RADIUS = 2.2;
export const LANE_STRENGTH = 0.55;

// value = 0.3 + 0.7 · clamp((gain + 15) / 55, 0, 1); 1.0 inside attacking EZ
// The 0.3 floor is deliberate: a wide-open reset reads yellow, never red.
export const VALUE_FLOOR = 0.3;
export const VALUE_SPAN = 0.7;
export const VALUE_GAIN_OFFSET = 15;
export const VALUE_GAIN_SCALE = 55;

// --- Grid (ADR-4: the one fidelity/frames dial) ---
export const GRID_STEP = 0.5; // yards → 220 × 80 cells

// --- Display (brief §4 "Display") ---
// score^0.7 gamma, red → amber → green.
export const GAMMA = 0.7;
export const RAMP_STOPS = [
  { at: 0, hex: "#D64B4A" },
  { at: 0.42, hex: "#EF9F27" },
  { at: 0.68, hex: "#97C459" },
  { at: 1, hex: "#4F941D" },
] as const;

// Readout labels (FR-3.8) derive from the ramp's interior anchors, applied to
// the gamma'd score: below the amber stop reads "closed", from the green stop
// up reads "strong" — so the verbal label and the colour never disagree.
export const LABEL_CLOSED_BELOW = 0.42;
export const LABEL_STRONG_FROM = 0.68;

export const ALL_LAYERS: LayerFlags = {
  markForce: true,
  coverage: true,
  lanes: true,
  value: true,
};
