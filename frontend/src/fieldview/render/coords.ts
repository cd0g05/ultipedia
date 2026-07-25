// Yard -> pixel transform. This is the only place field-view coordinates
// leave yards; scene/ and (later) space/ never see a pixel value.

import type { Vec2 } from "../scene/types";

export const PIXELS_PER_YARD = 8;

export function yardToPixel(pos: Vec2): Vec2 {
  return { x: pos.x * PIXELS_PER_YARD, y: pos.y * PIXELS_PER_YARD };
}
