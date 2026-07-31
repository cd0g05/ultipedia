// Brief §8 acceptance checks — "does it feel right" — as executable
// assertions, for every check that is a property of the model rather than of
// the UI: checks 1, 2, 3, 4, 6, 7, 8, plus the FR-3.2 no-receiver-gate
// regression (the v2 prototype failure). Checks 5 and 9 are drag-and-repaint
// properties and live in the heatmap-overlay partition.
//
// Following tech-design's testing doctrine, checks are encoded as falsifiable
// relative orderings and floor/ceiling thresholds, sampled from the real
// computeGrid pipeline on the built-in presets (or on minimal constructed
// scenes where the brief describes a specific isolated situation).

import { describe, expect, it } from "vitest";
import type { Player, Scene } from "../scene/types";
import { getPreset } from "../scene/presets";
import {
  ALL_LAYERS,
  DEFAULT_PARAMS,
  LABEL_CLOSED_BELOW,
  LABEL_STRONG_FROM,
  SLIDER_RANGES,
  degToRad,
} from "../space/constants";
import { mark } from "../space/layers";
import { computeGrid, sampleGrid, scoreCell } from "../space/score";
import { explainCell } from "../space/explain";
import { gammaScore } from "../space/palette";
import type { LayerFlags, SpaceParams } from "../space/types";

const P = DEFAULT_PARAMS;

function player(id: string, team: Player["team"], role: Player["role"], x: number, y: number): Player {
  return { id, team, role, pos: { x, y } };
}

function findRole(scene: Scene, role: Player["role"]): Player {
  const p = scene.players.find((pl) => pl.role === role);
  if (!p) throw new Error(`no ${role}`);
  return p;
}

function argmax(grid: ReturnType<typeof computeGrid>): { x: number; y: number; score: number } {
  let best = -1;
  let bestIndex = 0;
  for (let i = 0; i < grid.values.length; i++) {
    if (grid.values[i] > best) {
      best = grid.values[i];
      bestIndex = i;
    }
  }
  const row = Math.floor(bestIndex / grid.cols);
  const col = bestIndex % grid.cols;
  return { x: (col + 0.5) * grid.step, y: (row + 0.5) * grid.step, score: best };
}

// On the vert/force-side preset the thrower is at (40, 20), the mark at
// (41, 23): the force shadow points at the break-side (+y) downfield wedge,
// so the open side is y < 20.
const vert = () => getPreset("vertStackForceSide");

describe("FR-3.2 regression — openness never requires a receiver", () => {
  it("with all six cutters removed, far open-side space still scores open", () => {
    const s = vert();
    const noCutters: Scene = { ...s, players: s.players.filter((p) => p.role !== "cutter") };
    const cell = { x: 50, y: 10 }; // ~11 yd out, open side, no defender near
    const score = scoreCell(cell, noCutters, P, ALL_LAYERS, "offense");
    expect(score).toBeGreaterThan(0.5);
    const e = explainCell(cell, noCutters, P, ALL_LAYERS, "offense");
    expect(e.label).not.toBe("closed");
    // And no cell anywhere gained score from the cutters' mere absence being
    // penalised: a receiver-free scene equals the defense-only view of it.
    const offense = computeGrid(noCutters, P, ALL_LAYERS, "offense");
    const offenseValues = Array.from(offense.values);
    const defenseOnly = computeGrid(noCutters, P, ALL_LAYERS, "defense-only");
    for (let i = 0; i < defenseOnly.values.length; i += 997) {
      expect(offenseValues[i]).toBeCloseTo(defenseOnly.values[i], 6);
    }
  });
});

describe("§8.1 — vert/force-side: the open-side lane is the greenest region", () => {
  it("the global maximum lies in the open-side lane upfield of the thrower", () => {
    const grid = computeGrid(vert(), P, ALL_LAYERS, "offense");
    const top = argmax(grid);
    // "Roughly 5–15 yards upfield" — the peak sits in the open-side band
    // just past the stack front; allow the blob its real extent.
    expect(top.x).toBeGreaterThan(44);
    expect(top.x).toBeLessThan(60);
    expect(top.y).toBeLessThan(18); // open side of the force
  });

  it("the open-side lane outscores dump, break side, and deep", () => {
    const grid = computeGrid(vert(), P, ALL_LAYERS, "offense");
    const lane = sampleGrid(grid, { x: 50, y: 10 });
    expect(lane).toBeGreaterThan(sampleGrid(grid, { x: 35, y: 20 })); // dump space
    expect(lane).toBeGreaterThan(sampleGrid(grid, { x: 50, y: 30 })); // break mirror
    expect(lane).toBeGreaterThan(sampleGrid(grid, { x: 80, y: 20 })); // deep centre
    expect(gammaScore(lane)).toBeGreaterThanOrEqual(LABEL_STRONG_FROM); // it reads green
  });
});

describe("§8.2 — the mark's shadow: red near the force bearing, fading with angle, escaped up close", () => {
  const s = vert();
  const thrower = findRole(s, "thrower");
  const marker = findRole(s, "mark");
  const theta = Math.atan2(marker.pos.y - thrower.pos.y, marker.pos.x - thrower.pos.x);

  function cellAt(bearingOffset: number, d: number) {
    return {
      x: thrower.pos.x + d * Math.cos(theta + bearingOffset),
      y: thrower.pos.y + d * Math.sin(theta + bearingOffset),
    };
  }

  it("break side behind the shadow scores lowest on the force bearing, rising with angular distance", () => {
    const on = mark(cellAt(0, 8), s, P);
    const off25 = mark(cellAt(degToRad(25), 8), s, P);
    const off50 = mark(cellAt(degToRad(50), 8), s, P);
    expect(on).toBeLessThan(off25);
    expect(off25).toBeLessThan(off50);
    expect(off50).toBeCloseTo(1, 5); // outside the 38° half-width
    // And through the whole pipeline the on-bearing break cell reads closed.
    const grid = computeGrid(s, P, ALL_LAYERS, "offense");
    expect(gammaScore(sampleGrid(grid, cellAt(0, 8)))).toBeLessThan(LABEL_CLOSED_BELOW);
  });

  it("short break-side reset space escapes the shadow (distance ramp)", () => {
    const near = mark(cellAt(0, 2), s, P);
    const far = mark(cellAt(0, 8), s, P);
    expect(near).toBeGreaterThan(far);
    expect(near).toBeCloseTo(1, 5); // ramp has not started at 2 yd
  });
});

describe("§8.3 — wide-open dump/reset space reads yellow, never red", () => {
  it("dump space behind the thrower scores above the closed threshold", () => {
    const grid = computeGrid(vert(), P, ALL_LAYERS, "offense");
    const dump = sampleGrid(grid, { x: 35, y: 20 });
    expect(gammaScore(dump)).toBeGreaterThanOrEqual(LABEL_CLOSED_BELOW);
    const e = explainCell({ x: 35, y: 20 }, vert(), P, ALL_LAYERS, "offense");
    expect(e.label).not.toBe("closed");
  });
});

describe("§8.4 — deep space: live without a deep defender, shut by deep help, pried open by a deep cutter", () => {
  const deepCell = { x: 80, y: 20 };

  it("with no deep defender the deep third scores mid-range", () => {
    // Flat mark: symmetric defense, everyone underneath — no deep defender.
    const grid = computeGrid(getPreset("flatMark"), P, ALL_LAYERS, "offense");
    const deep = sampleGrid(grid, deepCell);
    expect(deep).toBeGreaterThan(0.35);
    expect(deep).toBeLessThan(0.8);
  });

  it("the deep help preset shuts the deep third", () => {
    const noDeepDefender = computeGrid(getPreset("flatMark"), P, ALL_LAYERS, "offense");
    const reference = sampleGrid(noDeepDefender, deepCell);
    const deepHelp = computeGrid(getPreset("deepHelp"), P, ALL_LAYERS, "offense");
    expect(sampleGrid(deepHelp, deepCell)).toBeLessThan(reference * 0.5);
  });

  it("a cutter challenging the poach pries the deep back open", () => {
    const withDeepCutter = getPreset("deepHelp"); // has a cutter at (82, 20)
    const withoutDeepCutter = getPreset("deepHelp");
    const deepCutter = withoutDeepCutter.players.find(
      (p) => p.role === "cutter" && p.pos.x > 75,
    )!;
    expect(deepCutter).toBeDefined();
    deepCutter.pos = { x: 58, y: 20 }; // pull him underneath
    // Sampled off the poach's lane shadow so coverage, not lanes, decides.
    const probe = { x: 80, y: 14 };
    const opened = scoreCell(probe, withDeepCutter, P, ALL_LAYERS, "offense");
    const closed = scoreCell(probe, withoutDeepCutter, P, ALL_LAYERS, "offense");
    expect(opened).toBeGreaterThan(closed * 2);
  });
});

describe("§8.6 — a cutter beside their matched defender yields contested, not green", () => {
  // Minimal scene: one downfield pair standing 1 yd apart, nothing else.
  const pair: Scene = {
    players: [
      player("t", "offense", "thrower", 40, 20),
      player("m", "defense", "mark", 39, 20),
      player("c", "offense", "cutter", 60, 20),
      player("d", "defense", "defender", 61, 20),
    ],
    possession: "t",
    matchups: { m: "t", d: "c" },
  };
  // Ring cells around the pair, off the thrower→pair axis so the lane layer
  // stays out of the picture.
  const ring = [
    { x: 62, y: 23 },
    { x: 59, y: 23 },
    { x: 62, y: 17 },
    { x: 59, y: 17 },
  ];

  it("cells around the pair read contested mid-range — below strong, above dead", () => {
    for (const cell of ring) {
      const contested = scoreCell(cell, pair, P, ALL_LAYERS, "offense");
      const open = scoreCell(cell, { ...pair, players: pair.players.filter((p) => p.id !== "d") }, P, ALL_LAYERS, "offense");
      const shutDown = scoreCell(cell, { ...pair, players: pair.players.filter((p) => p.id !== "c") }, P, ALL_LAYERS, "offense");
      // Separation emerges from the race margin — no special-casing:
      expect(contested).toBeLessThan(open);
      expect(contested).toBeGreaterThan(shutDown);
      expect(gammaScore(contested)).toBeLessThan(LABEL_STRONG_FROM); // not green
    }
  });
});

describe("§8.7 — a defender parked in a throwing lane shades the space behind them", () => {
  const laneScene: Scene = {
    players: [
      player("t", "offense", "thrower", 40, 20),
      player("m", "defense", "mark", 39, 20),
      player("d", "defense", "defender", 55, 20),
    ],
    possession: "t",
    matchups: { m: "t", d: null },
  };
  const noDefender: Scene = {
    ...laneScene,
    players: laneScene.players.filter((p) => p.id !== "d"),
  };
  const behind = { x: 75, y: 20 }; // 20 yd behind the poach, 35 yd out

  it("lowers the score behind the poach even where they cannot beat the disc", () => {
    // The defender cannot beat the disc to this cell…
    const e = explainCell(behind, laneScene, P, ALL_LAYERS, "offense");
    expect(e.nearestDefenderArrival).toBeGreaterThan(e.flightTime + 0.35);
    // …yet the cell scores materially lower with them parked in the lane.
    const withPoach = scoreCell(behind, laneScene, P, ALL_LAYERS, "offense");
    const without = scoreCell(behind, noDefender, P, ALL_LAYERS, "offense");
    expect(withPoach).toBeLessThan(without * 0.6);
  });
});

describe("§8.8 — every slider and every layer toggle produces a visible change", () => {
  function gridSum(params: SpaceParams, layers: LayerFlags): { sum: number; values: number[] } {
    const grid = computeGrid(vert(), params, layers, "offense");
    let sum = 0;
    for (let i = 0; i < grid.values.length; i++) sum += grid.values[i];
    return { sum, values: Array.from(grid.values) };
  }

  function delta(a: number[], b: number[]): number {
    let d = 0;
    for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]);
    return d;
  }

  const base = gridSum(P, ALL_LAYERS).values;

  const sliderCases: Array<[string, SpaceParams]> = [
    ["vmax", { ...P, vmax: SLIDER_RANGES.vmax.min }],
    ["react", { ...P, react: SLIDER_RANGES.react.max }],
    ["head", { ...P, head: SLIDER_RANGES.head.max }],
    ["hang", { ...P, hang: SLIDER_RANGES.hang.min }],
    ["markStr", { ...P, markStr: SLIDER_RANGES.markStr.min }],
    ["markW", { ...P, markW: degToRad(SLIDER_RANGES.markWDeg.max) }],
  ];

  for (const [name, params] of sliderCases) {
    it(`slider ${name} changes the map`, () => {
      expect(delta(gridSum(params, ALL_LAYERS).values, base)).toBeGreaterThan(0);
    });
  }

  const toggleCases: Array<[string, LayerFlags]> = [
    ["markForce", { ...ALL_LAYERS, markForce: false }],
    ["coverage", { ...ALL_LAYERS, coverage: false }],
    ["lanes", { ...ALL_LAYERS, lanes: false }],
    ["value", { ...ALL_LAYERS, value: false }],
  ];

  for (const [name, layers] of toggleCases) {
    it(`layer toggle ${name} changes the map`, () => {
      expect(delta(gridSum(P, layers).values, base)).toBeGreaterThan(0);
    });
  }
});
