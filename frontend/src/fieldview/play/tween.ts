// Linear interpolation between keyframes. Entities are paired by stable
// `id`, never by array index — reordering `entities` or `players` must not
// teleport a piece, which is the whole reason identity is stated once in the
// play format.

import type { Player, Scene, Vec2 } from "../scene/types";
import type { PlayEntity, PlayFile, PlayKeyframe } from "./format";
import { backfillScene } from "./backfill";
import type { StoredPlayModel } from "./backfill";

export function playDuration(play: Pick<PlayFile, "keyframes">): number {
  if (play.keyframes.length === 0) return 0;
  return play.keyframes[play.keyframes.length - 1].t;
}

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

function lerpVec(a: Vec2, b: Vec2, u: number): Vec2 {
  return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
}

// Positions at time `t`, clamped to the play's extent: before the first
// keyframe holds the first pose, after the last holds the last.
export function samplePositions(
  keyframes: PlayKeyframe[],
  t: number,
): Record<string, Vec2> {
  if (keyframes.length === 0) return {};

  const sorted = keyframes;
  if (t <= sorted[0].t) return { ...sorted[0].positions };
  const last = sorted[sorted.length - 1];
  if (t >= last.t) return { ...last.positions };

  let i = 0;
  while (i < sorted.length - 2 && sorted[i + 1].t <= t) i += 1;

  const from = sorted[i];
  const to = sorted[i + 1];
  const span = to.t - from.t;
  const u = span === 0 ? 0 : (t - from.t) / span;

  const out: Record<string, Vec2> = {};
  for (const id of Object.keys(from.positions)) {
    const a = from.positions[id];
    const b = to.positions[id];
    // A missing id in the later keyframe holds position rather than
    // snapping to the origin; validate.ts makes this unreachable for
    // imported files, but in-memory edits go through here too.
    out[id] = b ? lerpVec(a, b, u) : { ...a };
  }
  return out;
}

// Positions plus whatever the file said about the play model; the shared
// backfill (ADR-4) fills in the rest and normalizes, so a v1 play sampled here
// is indistinguishable from a v2 one that stated the same facts.
export function sceneFrom(
  entities: PlayEntity[],
  positions: Record<string, Vec2>,
  stored?: StoredPlayModel,
): Scene {
  const players: Player[] = entities.map((e) => ({
    id: e.id,
    team: e.team,
    role: e.role,
    label: e.label,
    pos: positions[e.id] ? { ...positions[e.id] } : { x: 0, y: 0 },
  }));
  return backfillScene(players, stored);
}

// The v2 fields are play-level, not keyframe-level, so every sample of a play
// carries the same possession and matchups — only the pose moves.
export function sampleAt(
  play: Pick<PlayFile, "entities" | "keyframes"> & StoredPlayModel,
  t: number,
): Scene {
  return sceneFrom(play.entities, samplePositions(play.keyframes, t), {
    possession: play.possession,
    matchups: play.matchups,
  });
}
