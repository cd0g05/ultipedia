// Layer-by-layer unit tests for the space model — each factor of brief §4.3
// tested directly against the brief's formulas, plus the §4.2 primitives,
// grid mechanics (buffer reuse), toggle substitution, explain, and palette.

import { describe, expect, it } from "vitest";
import type { Player, Scene } from "../scene/types";
import {
  ALL_LAYERS,
  BEAT_SS_HI,
  BEAT_SS_LO,
  COMP_DEPTH,
  COVERAGE_CAP,
  COV_SS_HI,
  COV_SS_LO,
  DEFAULT_PARAMS,
  GAMMA,
  GRID_STEP,
  LANE_STRENGTH,
  MARK_RAMP_FAR,
  MARK_RAMP_NEAR,
  RAMP_STOPS,
  VALUE_FLOOR,
} from "../space/constants";
import { bearing, clamp, dist, segPerpDistance, segProjectionT, ss, wrap } from "../space/math";
import {
  arrivalTime,
  bestCutterArrival,
  comp,
  coverage,
  flightTime,
  lane,
  mark,
  value,
} from "../space/layers";
import { computeGrid, sampleGrid, scoreCell } from "../space/score";
import { explainCell } from "../space/explain";
import { gammaScore, scoreToRgba } from "../space/palette";
import type { LayerFlags } from "../space/types";

const P = DEFAULT_PARAMS;

function player(id: string, team: Player["team"], role: Player["role"], x: number, y: number): Player {
  return { id, team, role, pos: { x, y } };
}

// A minimal legal scene builder: thrower at (40, 20), mark placed by caller,
// remaining pieces wherever a test needs them.
function scene(extra: Player[] = [], markPos = { x: 39, y: 20 }): Scene {
  return {
    players: [
      player("t", "offense", "thrower", 40, 20),
      { ...player("m", "defense", "mark", markPos.x, markPos.y) },
      ...extra,
    ],
  };
}

describe("space/math", () => {
  it("ss clamps below e0 to 0 and above e1 to 1", () => {
    expect(ss(0, 1, -5)).toBe(0);
    expect(ss(0, 1, 5)).toBe(1);
  });

  it("ss is the Hermite 3t²−2t³ in between", () => {
    expect(ss(0, 1, 0.5)).toBeCloseTo(0.5, 10);
    expect(ss(0, 1, 0.25)).toBeCloseTo(3 * 0.0625 - 2 * 0.015625, 10);
    expect(ss(10, 20, 15)).toBeCloseTo(0.5, 10);
  });

  it("wrap maps into (−π, π]", () => {
    expect(wrap(Math.PI * 3)).toBeCloseTo(Math.PI, 10);
    expect(wrap(-Math.PI * 2.5)).toBeCloseTo(-Math.PI / 2, 10);
    expect(wrap(0.3)).toBeCloseTo(0.3, 10);
  });

  it("bearing and clamp behave", () => {
    expect(bearing(0, 0, 1, 0)).toBeCloseTo(0, 10);
    expect(bearing(0, 0, 0, 1)).toBeCloseTo(Math.PI / 2, 10);
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
  });

  it("segment projection t and perpendicular distance", () => {
    expect(segProjectionT(5, 3, 0, 0, 10, 0)).toBeCloseTo(0.5, 10);
    expect(segPerpDistance(5, 3, 0, 0, 10, 0)).toBeCloseTo(3, 10);
    // degenerate zero-length segment
    expect(segProjectionT(1, 1, 2, 2, 2, 2)).toBe(0);
  });
});

describe("§4.2 primitives", () => {
  it("t_f(d) = 0.4 + d/20 + hang·1.6·(d/70)²", () => {
    expect(flightTime(0, 1)).toBeCloseTo(0.4, 10);
    expect(flightTime(70, 1)).toBeCloseTo(0.4 + 3.5 + 1.6, 10);
    expect(flightTime(70, 0.5)).toBeCloseTo(0.4 + 3.5 + 0.8, 10);
  });

  it("τ = react + max(0, dist − 1)/vmax, with the 1 yd slack", () => {
    expect(arrivalTime(0.5, P)).toBeCloseTo(P.react, 10);
    expect(arrivalTime(8, P)).toBeCloseTo(P.react + 7 / P.vmax, 10);
  });

  it("τ_O is Infinity with no cutters on the field", () => {
    expect(bestCutterArrival(50, 20, scene(), P)).toBe(Infinity);
  });
});

describe("comp — throw-range completion decay", () => {
  it("is 1 inside the near threshold and 1 − 0.6 at/beyond range", () => {
    expect(comp(0)).toBe(1);
    expect(comp(15)).toBe(1);
    expect(comp(75)).toBeCloseTo(1 - COMP_DEPTH, 10);
    expect(comp(110)).toBeCloseTo(1 - COMP_DEPTH, 10);
  });

  it("decreases monotonically through the ramp", () => {
    expect(comp(30)).toBeGreaterThan(comp(45));
    expect(comp(45)).toBeGreaterThan(comp(60));
  });
});

describe("mark — the mark's position IS the force", () => {
  // Mark due −x of the thrower: shadow points straight backfield (θ = π).
  const s = scene([], { x: 37, y: 20 });

  it("full shadow at the force bearing beyond the ramp", () => {
    // 8 yd behind the thrower, dead on the shadow bearing.
    const expected = 1 - P.markStr * 1 * ss(MARK_RAMP_NEAR, MARK_RAMP_FAR, 8);
    expect(mark({ x: 32, y: 20 }, s, P)).toBeCloseTo(expected, 10);
  });

  it("no shadow outside the half-width W", () => {
    // Straight upfield is π radians off the shadow — far outside W.
    expect(mark({ x: 50, y: 20 }, s, P)).toBeCloseTo(1, 10);
  });

  it("short break-side resets escape via the distance ramp", () => {
    const near = mark({ x: 38, y: 20 }, s, P); // 2 yd, on-bearing
    const far = mark({ x: 32, y: 20 }, s, P); // 8 yd, on-bearing
    expect(near).toBeGreaterThan(far);
    expect(near).toBeCloseTo(1, 5); // ss(2,10,2) = 0 — ramp not started
  });

  it("penalty fades with angular distance (bump shape)", () => {
    const on = mark({ x: 32, y: 20 }, s, P);
    const off = mark({ x: 32.5, y: 24 }, s, P); // ~half a half-width off
    expect(off).toBeGreaterThan(on);
    expect(off).toBeLessThan(1);
  });
});

describe("coverage — defenders close space; cutters contest defenders' claims", () => {
  it("a defender that cannot beat the disc leaves the cell open", () => {
    const d = player("d2", "defense", "defender", 80, 20);
    const s = scene([d]);
    // Cell 5 yd from the thrower, defender 35+ yd away.
    expect(coverage({ x: 45, y: 20 }, d, s, P, "offense")).toBeCloseTo(1, 5);
  });

  it("a defender camped on a far cell closes it up to the 0.92 cap", () => {
    const d = player("d2", "defense", "defender", 70, 20);
    const s = scene([d]);
    const cell = { x: 70, y: 20 }; // 30 yd out: t_f ≈ 2.19, τ_i = react
    const cov = coverage(cell, d, s, P, "offense");
    // No cutters → τ_O = ∞ → beat = 0 → full penalty.
    expect(cov).toBeCloseTo(1 - COVERAGE_CAP, 5);
  });

  it("a cutter that beats the defender voids that defender's coverage", () => {
    const d = player("d2", "defense", "defender", 70, 24);
    const c = player("o2", "offense", "cutter", 70, 19);
    const s = scene([d, c]);
    const cell = { x: 70, y: 20 };
    const contested = coverage(cell, d, s, P, "offense");
    const uncontested = coverage(cell, d, scene([d]), P, "offense");
    expect(contested).toBeGreaterThan(uncontested);
  });

  it("ADR-6: defense-only skips ONLY the beat term", () => {
    const d = player("d2", "defense", "defender", 70, 24);
    const c = player("o2", "offense", "cutter", 70, 19);
    const s = scene([d, c]);
    const cell = { x: 70, y: 20 };
    // Defense-only ignores the cutter entirely…
    const defOnly = coverage(cell, d, s, P, "defense-only");
    const defOnlyNoCutter = coverage(cell, d, scene([d]), P, "defense-only");
    expect(defOnly).toBeCloseTo(defOnlyNoCutter, 10);
    // …and equals the offense lens when no cutter exists to contest.
    expect(defOnly).toBeCloseTo(coverage(cell, d, scene([d]), P, "offense"), 10);
  });

  it("cov threshold is soft: ss(−0.35, 0.35, t_f − τ)", () => {
    // Construct t_f − τ ≈ 0 → cov ≈ 0.5 → coverage ≈ 1 − 0.92/2.
    const cell = { x: 50, y: 20 }; // d = 10 → t_f = 0.4 + 0.5 + 1.6/49 ≈ 0.9327
    const tf = flightTime(10, P.hang);
    const distNeeded = (tf - P.react) * P.vmax + 1; // τ_i = tf exactly
    const d = player("d2", "defense", "defender", 50, 20 + distNeeded);
    const s = scene([d]);
    expect(coverage(cell, d, s, P, "offense")).toBeCloseTo(1 - COVERAGE_CAP * 0.5, 3);
    expect(COV_SS_LO).toBeLessThan(0);
    expect(COV_SS_HI).toBeGreaterThan(0);
    expect(BEAT_SS_LO).toBeLessThan(BEAT_SS_HI);
  });
});

describe("lane — poaches shade everything behind them", () => {
  it("a defender square in the lane applies the full 0.55 penalty", () => {
    const d = player("d2", "defense", "defender", 50, 20); // on the segment
    const s = scene([d]);
    expect(lane({ x: 60, y: 20 }, d, s)).toBeCloseTo(1 - LANE_STRENGTH, 10);
  });

  it("no penalty outside the 2.2 yd radius", () => {
    const d = player("d2", "defense", "defender", 50, 24); // 4 yd off the lane
    const s = scene([d]);
    expect(lane({ x: 60, y: 20 }, d, s)).toBe(1);
  });

  it("no penalty when the projection falls outside (0.06, 0.94)", () => {
    // Defender BEYOND the cell (t > 0.94): cannot shade space in front of itself.
    const d = player("d2", "defense", "defender", 59.9, 20);
    const s = scene([d]);
    expect(lane({ x: 50, y: 20 }, d, s)).toBe(1);
    // Defender essentially at the thrower (t < 0.06).
    const d2 = player("d3", "defense", "defender", 40.1, 20);
    expect(lane({ x: 60, y: 20 }, d2, scene([d2]))).toBe(1);
  });
});

describe("value — what separates strong from merely open", () => {
  const s = scene();

  it("floors at 0.3 far behind the thrower — never zero", () => {
    expect(value({ x: 20, y: 20 }, s)).toBeCloseTo(VALUE_FLOOR, 10);
  });

  it("ramps with yardage gained", () => {
    expect(value({ x: 40, y: 20 }, s)).toBeCloseTo(0.3 + 0.7 * (15 / 55), 10);
    expect(value({ x: 80, y: 20 }, s)).toBeCloseTo(1, 10); // gain 40 → clamped
  });

  it("is 1.0 inside the attacking endzone regardless of thrower position", () => {
    expect(value({ x: 95, y: 20 }, s)).toBe(1);
  });
});

describe("scoreCell composition & layer toggles", () => {
  const d = player("d2", "defense", "defender", 55, 22);
  const c = player("o2", "offense", "cutter", 52, 18);
  const s = scene([d, c], { x: 39, y: 23 });
  const cell = { x: 55, y: 16 };

  function flags(overrides: Partial<LayerFlags>): LayerFlags {
    return { ...ALL_LAYERS, ...overrides };
  }

  it("all-layers score is the product of the factors", () => {
    const expected =
      comp(dist(40, 20, cell.x, cell.y)) *
      mark(cell, s, P) *
      coverage(cell, s.players[1], s, P, "offense") * // the mark is a defender
      coverage(cell, d, s, P, "offense") *
      lane(cell, s.players[1], s) *
      lane(cell, d, s) *
      value(cell, s);
    expect(scoreCell(cell, s, P, ALL_LAYERS, "offense")).toBeCloseTo(expected, 6);
  });

  it("disabling a layer substitutes 1.0 for exactly that factor", () => {
    const full = scoreCell(cell, s, P, ALL_LAYERS, "offense");
    const noValue = scoreCell(cell, s, P, flags({ value: false }), "offense");
    expect(noValue).toBeCloseTo(full / value(cell, s), 6);
    const noMark = scoreCell(cell, s, P, flags({ markForce: false }), "offense");
    expect(noMark).toBeCloseTo(full / mark(cell, s, P), 6);
  });

  it("comp is not toggleable — it applies with every layer off", () => {
    const bare = scoreCell(
      cell,
      s,
      P,
      { markForce: false, coverage: false, lanes: false, value: false },
      "offense",
    );
    expect(bare).toBeCloseTo(comp(dist(40, 20, cell.x, cell.y)), 6);
  });
});

describe("computeGrid mechanics", () => {
  const s = scene([
    player("o2", "offense", "cutter", 50, 20),
    player("d2", "defense", "defender", 48, 22),
  ]);

  it("produces a 220 × 80 grid at GRID_STEP", () => {
    const grid = computeGrid(s, P, ALL_LAYERS, "offense");
    expect(grid.cols).toBe(Math.round(110 / GRID_STEP));
    expect(grid.rows).toBe(Math.round(40 / GRID_STEP));
    expect(grid.values.length).toBe(grid.cols * grid.rows);
    expect(grid.step).toBe(GRID_STEP);
  });

  it("reuses its output buffer across repeated calls (allocation-free)", () => {
    const a = computeGrid(s, P, ALL_LAYERS, "offense");
    const buf = a.values;
    const b = computeGrid(s, P, ALL_LAYERS, "defense-only");
    expect(b.values).toBe(buf);
  });

  it("grid cells agree with scoreCell at the cell centre", () => {
    const grid = computeGrid(s, P, ALL_LAYERS, "offense");
    for (const pos of [
      { x: 50.25, y: 15.25 },
      { x: 30.25, y: 8.25 },
      { x: 95.25, y: 30.25 },
    ]) {
      expect(sampleGrid(grid, pos)).toBeCloseTo(scoreCell(pos, s, P, ALL_LAYERS, "offense"), 5);
    }
  });
});

describe("explainCell", () => {
  const d = player("d2", "defense", "defender", 60, 20);
  const c = player("o2", "offense", "cutter", 55, 20);
  const s = scene([d, c]);
  const cell = { x: 58, y: 20 };

  it("reports distance, flight time, arrivals, score, and a label", () => {
    const e = explainCell(cell, s, P, ALL_LAYERS, "offense");
    expect(e.distance).toBeCloseTo(18, 10);
    expect(e.flightTime).toBeCloseTo(flightTime(18, P.hang), 10);
    // Nearest defender is d2 at 2 yd (the mark is 19 yd away).
    expect(e.nearestDefenderArrival).toBeCloseTo(arrivalTime(2, P), 10);
    expect(e.bestCutterEffectiveArrival).toBeCloseTo(arrivalTime(3, P) - P.head, 10);
    expect(e.score).toBeCloseTo(scoreCell(cell, s, P, ALL_LAYERS, "offense"), 10);
    expect(["strong", "contested", "closed"]).toContain(e.label);
  });

  it("defense-only lens nulls the cutter row", () => {
    const e = explainCell(cell, s, P, ALL_LAYERS, "defense-only");
    expect(e.bestCutterEffectiveArrival).toBeNull();
  });

  it("labels follow the gamma'd ramp thresholds", () => {
    // A wide-open near cell on an empty-ish scene scores well above closed.
    const open = explainCell({ x: 48, y: 8 }, scene(), P, ALL_LAYERS, "offense");
    expect(open.label).not.toBe("closed");
  });
});

describe("palette", () => {
  it("applies score^0.7 gamma once, at colour time", () => {
    expect(gammaScore(1)).toBe(1);
    expect(gammaScore(0)).toBe(0);
    expect(gammaScore(0.5)).toBeCloseTo(Math.pow(0.5, GAMMA), 10);
  });

  it("hits the anchor stops exactly", () => {
    const out = new Uint8ClampedArray(4);
    scoreToRgba(0, out, 0);
    expect([out[0], out[1], out[2], out[3]]).toEqual([0xd6, 0x4b, 0x4a, 255]);
    scoreToRgba(1, out, 0);
    expect([out[0], out[1], out[2], out[3]]).toEqual([0x4f, 0x94, 0x1d, 255]);
    // A raw score whose gamma'd value lands exactly on the amber stop.
    scoreToRgba(Math.pow(RAMP_STOPS[1].at, 1 / GAMMA), out, 0);
    expect([out[0], out[1], out[2]]).toEqual([0xef, 0x9f, 0x27]);
  });

  it("interpolates between stops (red→amber band is warm, not green)", () => {
    const out = new Uint8ClampedArray(4);
    scoreToRgba(Math.pow(0.2, 1 / GAMMA), out, 0);
    expect(out[0]).toBeGreaterThan(out[2]); // more red than blue
    expect(out[3]).toBe(255);
  });
});
