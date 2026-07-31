// PRD Non-Functional "Performance": a running simulation with 14 movers plus
// a repainting heatmap must hold the existing 16 ms frame budget.
//
// What one rendered frame actually costs is the substeps the accumulator
// consumes for it — at 60 Hz and DT = 1/120 that is two, but a 30 Hz host
// takes four, so this measures four — plus the grid recompute the heatmap
// does on every scene mutation. Those are the two things that scale; the
// mutation and the paint are unchanged from today.

import { describe, expect, it } from "vitest";
import { getPreset } from "../scene/presets";
import { ALL_LAYERS, DEFAULT_PARAMS } from "../space/constants";
import { computeGrid } from "../space/score";
import { DEFAULT_MOTION_PARAMS, DT } from "../motion/constants";
import { addWaypoint, emptyRoute } from "../motion/route";
import { createMotionState, step } from "../motion/step";
import type { MotionState } from "../motion/types";

const PERF_RUN = process.env.PERF === "1";

const SUBSTEPS_PER_FRAME = 4; // a 30 Hz host — the pessimistic case

function fullScene(): MotionState {
  const scene = getPreset("vertStackForceSide");
  // Every offensive player carrying a route, so the stepper is doing the most
  // work it can be asked to: 7 routed movers and 7 pursuing defenders.
  const routes: Record<string, ReturnType<typeof emptyRoute>> = {};
  for (const p of scene.players) {
    if (p.team === "offense") {
      routes[p.id] = addWaypoint(emptyRoute(), { x: 95, y: (p.pos.y + 17) % 40 });
    }
  }
  return createMotionState({
    movers: scene.players.map((p) => ({ id: p.id, pos: { ...p.pos }, vel: { x: 0, y: 0 } })),
    routes,
    matchups: scene.matchups,
    possession: scene.possession,
    react: DEFAULT_PARAMS.react,
    dt: DT,
  });
}

describe("motion frame budget", () => {
  it("steps a full 14-mover scene far inside the frame budget", () => {
    let s = fullScene();
    for (let i = 0; i < 200; i++) s = step(s, DT, DEFAULT_MOTION_PARAMS, DEFAULT_PARAMS);

    const runs = 200;
    let best = Infinity;
    let total = 0;
    for (let i = 0; i < runs; i++) {
      const start = performance.now();
      for (let k = 0; k < SUBSTEPS_PER_FRAME; k++) {
        s = step(s, DT, DEFAULT_MOTION_PARAMS, DEFAULT_PARAMS);
      }
      const ms = performance.now() - start;
      total += ms;
      if (ms < best) best = ms;
    }
    console.log(
      `motion step ×${SUBSTEPS_PER_FRAME} (14 movers): best ${best.toFixed(4)} ms / avg ${(total / runs).toFixed(4)} ms`,
    );
    // The stepper's share should be a rounding error next to the grid. If this
    // ever approaches a millisecond, something started allocating per tick.
    expect(best).toBeLessThan(PERF_RUN ? 1 : 5);
  });

  it("a whole simulated frame — substeps plus heatmap recompute — fits in 16 ms", () => {
    const scene = getPreset("vertStackForceSide");
    let s = fullScene();
    for (let i = 0; i < 100; i++) s = step(s, DT, DEFAULT_MOTION_PARAMS, DEFAULT_PARAMS);
    computeGrid(scene, DEFAULT_PARAMS, ALL_LAYERS, "offense");

    const runs = 40;
    let best = Infinity;
    for (let i = 0; i < runs; i++) {
      const start = performance.now();
      for (let k = 0; k < SUBSTEPS_PER_FRAME; k++) {
        s = step(s, DT, DEFAULT_MOTION_PARAMS, DEFAULT_PARAMS);
      }
      computeGrid(scene, DEFAULT_PARAMS, ALL_LAYERS, "offense");
      const ms = performance.now() - start;
      if (ms < best) best = ms;
    }
    console.log(`motion frame (steps + grid): best ${best.toFixed(2)} ms`);
    // Same quarantine reasoning as spaceBench: measured under the parallel
    // suite this reads 2–3× high, so the real budget is asserted only under
    // `npm run test:perf` and the everyday run keeps a loose ceiling.
    expect(best).toBeLessThan(PERF_RUN ? 16 : 70);
  });
});
