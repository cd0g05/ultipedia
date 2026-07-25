// The five factors of brief §4.3, one exported function per layer (ADR-5).
// The model is transcribed, not re-derived: each function carries the brief's
// formula verbatim as the comment directly above it, and every constant comes
// from constants.ts. Layer toggles are applied in score.ts by substituting
// 1.0 at the call site — never by branching in here.
//
// Each layer has two forms: a scalar kernel (allocation-free, used by the
// per-cell loop in score.ts) and a Scene-signature wrapper (the public
// interface from tech-design.md, used by tests and the readout). The formula
// lives once, in the kernel.

import type { Player, Scene, Vec2 } from "../scene/types";
import { GOAL_LINE_ATTACKING } from "../scene/field";
import type { Lens, SpaceParams } from "./types";
import { bearing, clamp, dist, ss, wrap } from "./math";
import {
  ARRIVAL_SLACK,
  BEAT_SS_HI,
  BEAT_SS_LO,
  COMP_DEPTH,
  COMP_NEAR,
  COMP_RANGE,
  COVERAGE_CAP,
  COV_SS_HI,
  COV_SS_LO,
  FLIGHT_BASE,
  FLIGHT_HANG_COEFF,
  FLIGHT_HANG_SCALE,
  FLIGHT_LINEAR_SCALE,
  LANE_RADIUS,
  LANE_STRENGTH,
  LANE_T_MAX,
  LANE_T_MIN,
  MARK_RAMP_FAR,
  MARK_RAMP_NEAR,
  VALUE_FLOOR,
  VALUE_GAIN_OFFSET,
  VALUE_GAIN_SCALE,
  VALUE_SPAN,
} from "./constants";

// --- §4.2 primitives ---

// brief §4.2: t_f(d) = 0.4 + d/20 + hang · 1.6 · (d/70)²
// (superlinear: hucks hang — this is what gives deep defenders their range)
export function flightTime(d: number, hang: number): number {
  const r = d / FLIGHT_HANG_SCALE;
  return FLIGHT_BASE + d / FLIGHT_LINEAR_SCALE + hang * FLIGHT_HANG_COEFF * r * r;
}

// brief §4.2: τ(p) = react + max(0, dist(p, cell) − 1) / vmax
export function arrivalTime(distToCell: number, p: SpaceParams): number {
  return p.react + Math.max(0, distToCell - ARRIVAL_SLACK) / p.vmax;
}

// τ_O = minimum arrival over the six cutters (thrower excluded). Infinity
// when there are no cutters — which makes beat = 0 and leaves coverage
// undiscounted, so removing every cutter can never close space (FR-3.2).
export function bestCutterArrival(cellX: number, cellY: number, scene: Scene, p: SpaceParams): number {
  let best = Infinity;
  for (const player of scene.players) {
    if (player.role !== "cutter") continue;
    const tau = arrivalTime(dist(player.pos.x, player.pos.y, cellX, cellY), p);
    if (tau < best) best = tau;
  }
  return best;
}

// --- The five layers of §4.3 ---

// brief §4.3: comp(d) = 1 − 0.6 · ss(15, 75, d)      # throw-range completion decay
export function comp(d: number): number {
  return 1 - COMP_DEPTH * ss(COMP_NEAR, COMP_RANGE, d);
}

// brief §4.3 mark(cell):                              # the mark's position IS the force
//   θ_shadow = bearing(thrower → mark)
//   Δ        = |wrap(bearing(thrower → cell) − θ_shadow)|
//   bump     = max(0, 1 − (Δ/W)²)²                    # W = shadow half-width, radians
//   mark     = 1 − markStr · bump · ss(2, 10, d)      # distance ramp: short break resets escape
export function markKernel(
  cellX: number,
  cellY: number,
  throwerX: number,
  throwerY: number,
  thetaShadow: number,
  d: number,
  p: SpaceParams,
): number {
  const delta = Math.abs(wrap(bearing(throwerX, throwerY, cellX, cellY) - thetaShadow));
  const a = delta / p.markW;
  const base = Math.max(0, 1 - a * a);
  const bump = base * base;
  return 1 - p.markStr * bump * ss(MARK_RAMP_NEAR, MARK_RAMP_FAR, d);
}

export function mark(cell: Vec2, scene: Scene, p: SpaceParams): number {
  const thrower = requireRole(scene, "thrower");
  const marker = requireRole(scene, "mark");
  const thetaShadow = bearing(thrower.pos.x, thrower.pos.y, marker.pos.x, marker.pos.y);
  const d = dist(thrower.pos.x, thrower.pos.y, cell.x, cell.y);
  return markKernel(cell.x, cell.y, thrower.pos.x, thrower.pos.y, thetaShadow, d, p);
}

// brief §4.3 coverage_i(cell):                        # includes the mark as a defender
//   cov  = ss(−0.35, 0.35, t_f(d) − τ_i)              # can defender i beat the disc here
//   if offense on:
//     beat = ss(−0.15, 0.55, τ_i − τ_O + head)        # would the best cutter beat THIS defender
//     cov  = cov · (1 − beat)                         # contested coverage is voided coverage
//   coverage_i = 1 − 0.92 · cov
export function coverageKernel(
  tf: number,
  tauI: number,
  tauO: number,
  head: number,
  lens: Lens,
): number {
  let cov = ss(COV_SS_LO, COV_SS_HI, tf - tauI);
  if (lens === "offense") {
    // ADR-6: "defense-only" skips only this beat term — same pipeline otherwise.
    const beat = ss(BEAT_SS_LO, BEAT_SS_HI, tauI - tauO + head);
    cov = cov * (1 - beat);
  }
  return 1 - COVERAGE_CAP * cov;
}

export function coverage(
  cell: Vec2,
  defender: Player,
  scene: Scene,
  p: SpaceParams,
  lens: Lens,
): number {
  const thrower = requireRole(scene, "thrower");
  const d = dist(thrower.pos.x, thrower.pos.y, cell.x, cell.y);
  const tf = flightTime(d, p.hang);
  const tauI = arrivalTime(dist(defender.pos.x, defender.pos.y, cell.x, cell.y), p);
  const tauO = bestCutterArrival(cell.x, cell.y, scene, p);
  return coverageKernel(tf, tauI, tauO, p.head, lens);
}

// brief §4.3 lane_i(cell):                            # poaches shade everything behind them
//   project defender i onto segment thrower→cell; keep if projection t ∈ (0.06, 0.94)
//   bump   = max(0, 1 − (d⊥ / 2.2)²)²                 # d⊥ = distance to the segment, yards
//   lane_i = 1 − 0.55 · bump
// Fast form for the per-cell loop: rel = defender − thrower is precomputed
// per grid, dir/len2 per cell, and the bump uses d⊥² directly (no sqrt).
export function laneFactorFast(
  relX: number,
  relY: number,
  dirX: number,
  dirY: number,
  len2: number,
): number {
  if (len2 === 0) return 1;
  const t = (relX * dirX + relY * dirY) / len2;
  if (t <= LANE_T_MIN || t >= LANE_T_MAX) return 1;
  const perpX = relX - t * dirX;
  const perpY = relY - t * dirY;
  const dPerp2 = perpX * perpX + perpY * perpY;
  const radius2 = LANE_RADIUS * LANE_RADIUS;
  if (dPerp2 >= radius2) return 1;
  const base = 1 - dPerp2 / radius2; // = 1 − (d⊥ / 2.2)²
  return 1 - LANE_STRENGTH * base * base;
}

export function laneKernel(
  cellX: number,
  cellY: number,
  defenderX: number,
  defenderY: number,
  throwerX: number,
  throwerY: number,
): number {
  const dirX = cellX - throwerX;
  const dirY = cellY - throwerY;
  return laneFactorFast(
    defenderX - throwerX,
    defenderY - throwerY,
    dirX,
    dirY,
    dirX * dirX + dirY * dirY,
  );
}

export function lane(cell: Vec2, defender: Player, scene: Scene): number {
  const thrower = requireRole(scene, "thrower");
  return laneKernel(cell.x, cell.y, defender.pos.x, defender.pos.y, thrower.pos.x, thrower.pos.y);
}

// brief §4.3 value(cell):                             # what separates strong from merely open
//   gain  = cell.x − thrower.x
//   value = 0.3 + 0.7 · clamp((gain + 15) / 55, 0, 1)
//   value = 1.0 inside the attacking endzone
export function valueKernel(cellX: number, throwerX: number): number {
  if (cellX >= GOAL_LINE_ATTACKING) return 1;
  const gain = cellX - throwerX;
  return VALUE_FLOOR + VALUE_SPAN * clamp((gain + VALUE_GAIN_OFFSET) / VALUE_GAIN_SCALE, 0, 1);
}

export function value(cell: Vec2, scene: Scene): number {
  const thrower = requireRole(scene, "thrower");
  return valueKernel(cell.x, thrower.pos.x);
}

// --- shared scene lookup ---

export function requireRole(scene: Scene, role: Player["role"]): Player {
  for (const player of scene.players) {
    if (player.role === role) return player;
  }
  throw new Error(`scene has no player with role "${role}"`);
}
