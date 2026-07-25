// Pure scene operations. Mutate the draft passed in — callers are expected
// to invoke these from inside store.mutate(fn), which owns notification and
// frame scheduling. scene/ imports nothing from React, the DOM, or canvas.

import type { Scene, Vec2 } from "./types";
import { clampToField } from "./field";

export function movePlayer(scene: Scene, id: string, pos: Vec2): void {
  const player = scene.players.find((p) => p.id === id);
  if (!player) return;
  player.pos = clampToField(pos);
}

// Translates the thrower to `pos` and carries the mark by the same delta,
// preserving their relative offset (FR-2.2). The mark can still be dragged
// independently via movePlayer.
export function moveThrower(scene: Scene, pos: Vec2): void {
  const thrower = scene.players.find((p) => p.role === "thrower");
  if (!thrower) return;

  const clamped = clampToField(pos);
  const delta: Vec2 = { x: clamped.x - thrower.pos.x, y: clamped.y - thrower.pos.y };
  thrower.pos = clamped;

  const mark = scene.players.find((p) => p.role === "mark");
  if (mark) {
    mark.pos = clampToField({ x: mark.pos.x + delta.x, y: mark.pos.y + delta.y });
  }
}
