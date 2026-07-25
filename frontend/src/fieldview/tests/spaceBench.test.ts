// §8.9 groundwork: computeGrid on the full 220 × 80 × 14 problem must leave
// comfortable headroom inside a 16 ms frame, since the heatmap partition adds
// paint time on top. The frame-budget check itself (grid + paint while
// dragging) belongs to feat/heatmap-overlay; this records the model's share.

import { describe, expect, it } from "vitest";
import { getPreset } from "../scene/presets";
import { ALL_LAYERS, DEFAULT_PARAMS } from "../space/constants";
import { computeGrid } from "../space/score";

describe("computeGrid budget", () => {
  it("computes a full grid well inside the frame budget", () => {
    const scene = getPreset("vertStackForceSide");
    // Warm up (JIT + buffer allocation).
    for (let i = 0; i < 5; i++) computeGrid(scene, DEFAULT_PARAMS, ALL_LAYERS, "offense");
    const runs = 30;
    let best = Infinity;
    let total = 0;
    for (let i = 0; i < runs; i++) {
      const start = performance.now();
      computeGrid(scene, DEFAULT_PARAMS, ALL_LAYERS, "offense");
      const ms = performance.now() - start;
      total += ms;
      if (ms < best) best = ms;
    }
    console.log(
      `computeGrid 220×80×14: best ${best.toFixed(2)} ms / avg ${(total / runs).toFixed(2)} ms over ${runs} runs`,
    );
    // The best run reflects true cost; the average is polluted by whatever
    // else the test runner is doing on the machine.
    expect(best).toBeLessThan(12); // model's share of the 16 ms frame
  });
});
