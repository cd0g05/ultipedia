// explainCell — the hover readout's structured payload (FR-3.8). Shows the
// per-cell math in plain terms: distance out, flight time, closest defender's
// arrival vs. (offense on) the best cutter's effective arrival, and the score
// with a verbal label. The label derives from the same gamma'd score and
// thresholds as the colour ramp, so the words and the paint never disagree.

import type { Scene, Vec2 } from "../scene/types";
import type { CellExplain, LayerFlags, Lens, SpaceParams } from "./types";
import { GAMMA, LABEL_CLOSED_BELOW, LABEL_STRONG_FROM } from "./constants";
import { dist } from "./math";
import { arrivalTime, bestCutterArrival, flightTime, requireRole } from "./layers";
import { scoreCell } from "./score";

export function explainCell(
  cell: Vec2,
  scene: Scene,
  params: SpaceParams,
  layers: LayerFlags,
  lens: Lens,
): CellExplain {
  const thrower = requireRole(scene, "thrower");
  const distance = dist(thrower.pos.x, thrower.pos.y, cell.x, cell.y);

  let nearestDefenderArrival = Infinity;
  for (const player of scene.players) {
    if (player.team !== "defense") continue;
    const tau = arrivalTime(dist(player.pos.x, player.pos.y, cell.x, cell.y), params);
    if (tau < nearestDefenderArrival) nearestDefenderArrival = tau;
  }

  // Effective arrival credits the head start — the cutter knows the throw,
  // the defender reacts. Omitted entirely under the defense-only lens.
  let bestCutterEffectiveArrival: number | null = null;
  if (lens === "offense") {
    const tauO = bestCutterArrival(cell.x, cell.y, scene, params);
    bestCutterEffectiveArrival = Number.isFinite(tauO) ? tauO - params.head : null;
  }

  const score = scoreCell(cell, scene, params, layers, lens);
  const shade = Math.pow(score, GAMMA);
  const label = shade < LABEL_CLOSED_BELOW ? "closed" : shade < LABEL_STRONG_FROM ? "contested" : "strong";

  return {
    distance,
    flightTime: flightTime(distance, params.hang),
    nearestDefenderArrival,
    bestCutterEffectiveArrival,
    score,
    label,
  };
}
