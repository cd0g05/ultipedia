// Eases one score grid into another (the held space of heatHold.ts). Headless
// like the rest of space/: two grids in, one grid out.
//
// computeGrid reuses a single output buffer, so the live grid is copied aside
// before the held one overwrites it; the blend is written into that same shared
// buffer, so the whole thing still allocates nothing per frame.

import type { ScoreGrid } from "./types";

let scratch: Float32Array | null = null;

// weight 0 = the held grid, 1 = the live one.
export function blendHeld(live: ScoreGrid, computeHeld: () => ScoreGrid, weight: number): ScoreGrid {
  if (!scratch || scratch.length !== live.values.length) scratch = new Float32Array(live.values.length);
  scratch.set(live.values);
  const held = computeHeld();
  const out = held.values;
  for (let i = 0; i < out.length; i++) out[i] += (scratch[i] - out[i]) * weight;
  return held;
}
