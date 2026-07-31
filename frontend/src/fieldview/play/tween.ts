// Linear interpolation between keyframes. Entities are paired by stable
// `id`, never by array index — reordering `entities` or `players` must not
// teleport a piece, which is the whole reason identity is stated once in the
// play format.

import type { Player, Scene, Vec2 } from "../scene/types";
import type { PlayEntity, PlayFile, PlayKeyframe } from "./format";

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

export function sceneFrom(entities: PlayEntity[], positions: Record<string, Vec2>): Scene {
  const players: Player[] = entities.map((e) => ({
    id: e.id,
    team: e.team,
    role: e.role,
    label: e.label,
    pos: positions[e.id] ? { ...positions[e.id] } : { x: 0, y: 0 },
  }));
  // The play format does not carry possession or matchups yet — the format
  // partition adds them with a proper load-time backfill (ADR-4). Until then
  // possession is read back off the stored thrower role, which is where it
  // came from in the first place, and matchups are left empty: an unassigned
  // possessor makes normalize() derive the mark from proximity, which
  // reproduces the mark these entities already carry.
  const thrower = players.find((p) => p.role === "thrower");
  return { players, possession: thrower ? thrower.id : null, matchups: {} };
}

export function sampleAt(play: Pick<PlayFile, "entities" | "keyframes">, t: number): Scene {
  return sceneFrom(play.entities, samplePositions(play.keyframes, t));
}
