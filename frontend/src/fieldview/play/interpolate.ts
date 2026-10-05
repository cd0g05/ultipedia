// Pure straight-line interpolation of piece positions. Pieces are paired by
// stable id, never array index. Playback uses this to move every piece from
// one resolved frame to the next, all starting and finishing together.

import type { Vec2 } from "../scene/types";

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

export function samplePositions(
  from: Record<string, Vec2>,
  to: Record<string, Vec2>,
  u: number,
): Record<string, Vec2> {
  const t = Math.max(0, Math.min(1, u));
  const out: Record<string, Vec2> = {};
  for (const id of Object.keys(from)) {
    const a = from[id];
    const b = to[id];
    out[id] = b ? { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) } : { x: a.x, y: a.y };
  }
  return out;
}
