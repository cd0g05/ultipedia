// The space model with no mark and no holder (fieldview-build ADR-38). With a
// mark the output is unchanged (every other test); with none, the mark-force
// layer contributes 1; with no holder the grid is blank and nothing throws.

import { describe, expect, it } from "vitest";
import { computeGrid, scoreCell } from "../space/score";
import { ALL_LAYERS, DEFAULT_PARAMS } from "../space/constants";
import { getPreset, listPresetNames } from "../scene/presets";
import { normalize } from "../scene/possession";
import type { Scene } from "../scene/types";

const copy = (g: { values: Float32Array }) => Array.from(g.values);

function withoutMark(s: Scene): Scene {
  // Push every defender well out of range of the holder, keeping the rest.
  const holder = s.players.find((p) => p.id === s.possession)!;
  for (const p of s.players) {
    if (p.team === "defense" && Math.hypot(p.pos.x - holder.pos.x, p.pos.y - holder.pos.y) < 4) {
      p.pos = { x: Math.min(110, holder.pos.x + 6), y: holder.pos.y };
    }
  }
  normalize(s);
  return s;
}

describe("no mark", () => {
  it("every preset still has a mark within 10 ft (setups keep showing one)", () => {
    for (const name of listPresetNames()) {
      expect(getPreset(name).players.filter((p) => p.role === "mark"), name).toHaveLength(1);
    }
  });

  it("scores like the mark-force layer being off, and does not throw", () => {
    for (const name of listPresetNames()) {
      const s = withoutMark(getPreset(name));
      expect(s.players.some((p) => p.role === "mark")).toBe(false);
      const on = copy(computeGrid(s, DEFAULT_PARAMS, ALL_LAYERS, "offense"));
      const off = copy(computeGrid(s, DEFAULT_PARAMS, { ...ALL_LAYERS, markForce: false }, "offense"));
      expect(on, name).toEqual(off);
    }
  });

  it("with a mark, turning the layer off changes the map (so the above is a real test)", () => {
    const s = getPreset("vertStackForceSide");
    const on = copy(computeGrid(s, DEFAULT_PARAMS, ALL_LAYERS, "offense"));
    const off = copy(computeGrid(s, DEFAULT_PARAMS, { ...ALL_LAYERS, markForce: false }, "offense"));
    expect(on).not.toEqual(off);
  });
});

describe("no holder", () => {
  it("gives a blank grid and a zero cell instead of throwing", () => {
    const s = getPreset("vertStack");
    s.possession = null;
    normalize(s);
    const grid = computeGrid(s, DEFAULT_PARAMS, ALL_LAYERS, "offense");
    expect(grid.values.every((v) => v === 0)).toBe(true);
    expect(scoreCell({ x: 60, y: 20 }, s, DEFAULT_PARAMS, ALL_LAYERS, "offense")).toBe(0);
  });
});
