// Regulation field geometry in yards. Coordinates are always yards here —
// pixel conversion lives only in render/.

import type { Vec2 } from "./types";

export const FIELD = {
  length: 110,
  width: 40,
  endzone: 20,
} as const;

export const GOAL_LINE_DEFENDING = FIELD.endzone; // 20
export const GOAL_LINE_ATTACKING = FIELD.length - FIELD.endzone; // 90

// Brick marks sit 20 yd from each goal line.
export const BRICK_DEFENDING = GOAL_LINE_DEFENDING + 20; // 40
export const BRICK_ATTACKING = GOAL_LINE_ATTACKING - 20; // 70

export function clampToField(pos: Vec2): Vec2 {
  return {
    x: Math.min(FIELD.length, Math.max(0, pos.x)),
    y: Math.min(FIELD.width, Math.max(0, pos.y)),
  };
}

export function isInBounds(pos: Vec2): boolean {
  return pos.x >= 0 && pos.x <= FIELD.length && pos.y >= 0 && pos.y <= FIELD.width;
}
