// Yard -> pixel transform. This is the only place field-view coordinates
// leave yards; scene/ and (later) space/ never see a pixel value.

import type { Vec2 } from "../scene/types";

export const PIXELS_PER_YARD = 8;

export function yardToPixel(pos: Vec2): Vec2 {
  return { x: pos.x * PIXELS_PER_YARD, y: pos.y * PIXELS_PER_YARD };
}

export function pixelToYard(pos: Vec2): Vec2 {
  return { x: pos.x / PIXELS_PER_YARD, y: pos.y / PIXELS_PER_YARD };
}

// Margin around the field itself so the attacking-direction indicator has
// room to render above the sideline. Shared by every stage (static or
// interactive) so their viewBoxes — and therefore pointer math — agree.
export const STAGE_MARGIN = { top: 30, right: 20, bottom: 20, left: 20 };

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getStageViewBox(fieldPxWidth: number, fieldPxHeight: number): ViewBox {
  return {
    x: -STAGE_MARGIN.left,
    y: -STAGE_MARGIN.top,
    width: fieldPxWidth + STAGE_MARGIN.left + STAGE_MARGIN.right,
    height: fieldPxHeight + STAGE_MARGIN.top + STAGE_MARGIN.bottom,
  };
}

export function viewBoxToString(viewBox: ViewBox): string {
  return `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
}

// Inverse of the SVG's own viewBox scaling — converts a pointer event's
// client coordinates into field yards, given the SVG's on-screen rect.
export function clientToYard(rect: DOMRect, viewBox: ViewBox, client: Vec2): Vec2 {
  const scaleX = viewBox.width / rect.width;
  const scaleY = viewBox.height / rect.height;
  const svgX = (client.x - rect.left) * scaleX + viewBox.x;
  const svgY = (client.y - rect.top) * scaleY + viewBox.y;
  return pixelToYard({ x: svgX, y: svgY });
}
