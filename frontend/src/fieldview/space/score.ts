// score(cell) = comp(d) · mark(cell) · Π coverage_i(cell) · Π lane_i(cell) · value(cell)
// (brief §4.3). scoreCell is the single-cell public entry; computeGrid is the
// hot path: per-defender/per-cutter positions and the shadow bearing are
// precomputed once outside the cell loop, and the output Float32Array is
// reused across calls so repeated grids allocate nothing.

import type { Scene } from "../scene/types";
import type { Vec2 } from "../scene/types";
import { FIELD } from "../scene/field";
import type { LayerFlags, Lens, ScoreGrid, SpaceParams } from "./types";
import { ARRIVAL_SLACK, COV_SS_LO, GRID_STEP } from "./constants";
import { bearing, dist } from "./math";
import {
  arrivalTime,
  comp,
  coverageKernel,
  flightTime,
  laneFactorFast,
  markKernel,
  requireRole,
  valueKernel,
} from "./layers";

// Roster view, extracted once per grid (or per scoreCell call): the mark
// counts as one of the defenders for coverage and lanes (brief §4.3).
interface Roster {
  throwerX: number;
  throwerY: number;
  thetaShadow: number; // bearing(thrower → mark) — the force
  defenderCount: number;
  defenderX: number[];
  defenderY: number[];
  defenderRelX: number[]; // defender − thrower, precomputed for the lane layer
  defenderRelY: number[];
  cutterCount: number;
  cutterX: number[];
  cutterY: number[];
}

const rosterScratch: Roster = {
  throwerX: 0,
  throwerY: 0,
  thetaShadow: 0,
  defenderCount: 0,
  defenderX: [],
  defenderY: [],
  defenderRelX: [],
  defenderRelY: [],
  cutterCount: 0,
  cutterX: [],
  cutterY: [],
};

function extractRoster(scene: Scene, out: Roster): Roster {
  const thrower = requireRole(scene, "thrower");
  const marker = requireRole(scene, "mark");
  out.throwerX = thrower.pos.x;
  out.throwerY = thrower.pos.y;
  out.thetaShadow = bearing(thrower.pos.x, thrower.pos.y, marker.pos.x, marker.pos.y);
  out.defenderCount = 0;
  out.cutterCount = 0;
  for (const player of scene.players) {
    if (player.team === "defense") {
      out.defenderX[out.defenderCount] = player.pos.x;
      out.defenderY[out.defenderCount] = player.pos.y;
      out.defenderRelX[out.defenderCount] = player.pos.x - out.throwerX;
      out.defenderRelY[out.defenderCount] = player.pos.y - out.throwerY;
      out.defenderCount++;
    } else if (player.role === "cutter") {
      out.cutterX[out.cutterCount] = player.pos.x;
      out.cutterY[out.cutterCount] = player.pos.y;
      out.cutterCount++;
    }
  }
  return out;
}

function scoreCellKernel(
  cellX: number,
  cellY: number,
  roster: Roster,
  p: SpaceParams,
  layers: LayerFlags,
  lens: Lens,
): number {
  const dirX = cellX - roster.throwerX;
  const dirY = cellY - roster.throwerY;
  const len2 = dirX * dirX + dirY * dirY;
  const d = Math.sqrt(len2);
  const tf = flightTime(d, p.hang);

  // τ_O = min arrival over the cutters; Infinity when none exist, so beat = 0
  // and coverage stands undiscounted — openness never requires a receiver.
  let tauO = Infinity;
  if (lens === "offense") {
    for (let i = 0; i < roster.cutterCount; i++) {
      const tau = arrivalTime(dist(roster.cutterX[i], roster.cutterY[i], cellX, cellY), p);
      if (tau < tauO) tauO = tau;
    }
  }

  // Coverage is exactly 1 for any defender with τ_i ≥ t_f − COV_SS_LO, so
  // defenders beyond `reach` skip the sqrt and both smoothsteps entirely.
  const reach = (tf - COV_SS_LO - p.react) * p.vmax + ARRIVAL_SLACK;
  const reach2 = reach > 0 ? reach * reach : 0;

  let coverageProduct = 1;
  let laneProduct = 1;
  for (let i = 0; i < roster.defenderCount; i++) {
    const cellDx = roster.defenderX[i] - cellX;
    const cellDy = roster.defenderY[i] - cellY;
    const dist2 = cellDx * cellDx + cellDy * cellDy;
    if (dist2 < reach2) {
      const tauI = arrivalTime(Math.sqrt(dist2), p);
      coverageProduct *= coverageKernel(tf, tauI, tauO, p.head, lens);
    }
    laneProduct *= laneFactorFast(roster.defenderRelX[i], roster.defenderRelY[i], dirX, dirY, len2);
  }

  // FR-3.6 / ADR-5: a disabled layer is substituted with 1.0 HERE, at the
  // call site — never by branching inside a layer function.
  const markF = layers.markForce
    ? markKernel(cellX, cellY, roster.throwerX, roster.throwerY, roster.thetaShadow, d, p)
    : 1.0;
  const coverageF = layers.coverage ? coverageProduct : 1.0;
  const laneF = layers.lanes ? laneProduct : 1.0;
  const valueF = layers.value ? valueKernel(cellX, roster.throwerX) : 1.0;

  return comp(d) * markF * coverageF * laneF * valueF;
}

export function scoreCell(
  cell: Vec2,
  scene: Scene,
  params: SpaceParams,
  layers: LayerFlags,
  lens: Lens,
): number {
  const roster = extractRoster(scene, rosterScratch);
  return scoreCellKernel(cell.x, cell.y, roster, params, layers, lens);
}

// Cached output grid — computeGrid reuses the same Float32Array across calls
// (ADR-2/§8.9: the drag loop must not allocate per frame). Callers must copy
// if they need the values to survive the next computeGrid call.
let cachedGrid: ScoreGrid | null = null;

export function computeGrid(
  scene: Scene,
  params: SpaceParams,
  layers: LayerFlags,
  lens: Lens,
): ScoreGrid {
  const cols = Math.round(FIELD.length / GRID_STEP);
  const rows = Math.round(FIELD.width / GRID_STEP);
  if (!cachedGrid || cachedGrid.cols !== cols || cachedGrid.rows !== rows) {
    cachedGrid = { cols, rows, step: GRID_STEP, values: new Float32Array(cols * rows) };
  }
  const roster = extractRoster(scene, rosterScratch);
  const values = cachedGrid.values;
  const half = GRID_STEP / 2;
  for (let row = 0; row < rows; row++) {
    const cellY = row * GRID_STEP + half;
    const base = row * cols;
    for (let col = 0; col < cols; col++) {
      const cellX = col * GRID_STEP + half;
      values[base + col] = scoreCellKernel(cellX, cellY, roster, params, layers, lens);
    }
  }
  return cachedGrid;
}

// Sample the grid value at a field position (yards). Out-of-bounds clamps to
// the nearest cell.
export function sampleGrid(grid: ScoreGrid, pos: Vec2): number {
  let col = Math.floor(pos.x / grid.step);
  let row = Math.floor(pos.y / grid.step);
  if (col < 0) col = 0;
  else if (col >= grid.cols) col = grid.cols - 1;
  if (row < 0) row = 0;
  else if (row >= grid.rows) row = grid.rows - 1;
  return grid.values[row * grid.cols + col];
}
