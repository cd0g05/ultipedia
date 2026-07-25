// Space-model inputs/outputs (tech-design.md "Space model inputs/outputs").
// This module is headless (ADR-1): nothing in space/ imports React, the DOM,
// or canvas — it is a pure library over the scene model.

export type Lens = "offense" | "defense-only";

// The six user-tunable parameters (brief §4.4). markW is RADIANS internally;
// the UI converts from degrees at its own boundary.
export interface SpaceParams {
  vmax: number;
  react: number;
  head: number;
  hang: number;
  markStr: number;
  markW: number;
}

// FR-3.6 — each layer substitutes 1.0 at the call site in score.ts when false
// (ADR-5: never a branch inside a layer function).
export interface LayerFlags {
  markForce: boolean;
  coverage: boolean;
  lanes: boolean;
  value: boolean;
}

export interface ScoreGrid {
  cols: number;
  rows: number;
  step: number; // GRID_STEP, yards
  values: Float32Array; // length cols*rows, row-major, raw score (pre-gamma), 0..1
}

// FR-3.8 — the hover readout payload.
export interface CellExplain {
  distance: number; // yards from thrower
  flightTime: number; // t_f(d)
  nearestDefenderArrival: number;
  bestCutterEffectiveArrival: number | null; // null when lens = "defense-only"
  score: number;
  label: "strong" | "contested" | "closed";
}
