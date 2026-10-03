// Yard -> pixel transform. This is the only place fieldview coordinates
// leave yards; scene/ and space/ never see a pixel value. It is also the
// *only* place orientation lives (canon ADR-11, ADR-28): the field renders
// horizontally, offense attacking to the right, and nothing outside this file
// encodes that fact. scene/ stays orientation-agnostic — yard.x is still
// "downfield, +x = attacking" (scene/types.ts) no matter how the stage draws
// it; only this transform decides which screen axis that becomes.
//
// Horizontal because the field is 2.75x longer than it is wide and every
// target device is used in landscape: a vertical field is a thin ribbon on a
// laptop and a small one on a phone (fieldview-ui-rework ADR-28).

import type { Vec2 } from "../scene/types";

export const PIXELS_PER_YARD = 8;

// Downfield yards (x) become screen-horizontal, increasing to the right, so
// attacking (+x) points right. Lateral yards (y) become screen-vertical,
// increasing downward, with y = 0 the top sideline. Pixel space is therefore
// [0, FIELD.length*PIXELS_PER_YARD] x [0, FIELD.width*PIXELS_PER_YARD] with no
// negative range, so getStageViewBox's margin math needs no special case.
export function yardToPixel(pos: Vec2): Vec2 {
  return {
    x: pos.x * PIXELS_PER_YARD,
    y: pos.y * PIXELS_PER_YARD,
  };
}

export function pixelToYard(pos: Vec2): Vec2 {
  return {
    x: pos.x / PIXELS_PER_YARD,
    y: pos.y / PIXELS_PER_YARD,
  };
}

// A breathing margin around the field. Pieces at the sideline are drawn
// centred on it, so the margin has to hold a piece's radius plus its focus
// ring or the stage's own clip would shave the glyph. Shared by every stage
// (static or interactive) so their viewBoxes — and therefore pointer math —
// agree. FieldCanvas also derives the heatmap canvas's inset from this, so
// changing it moves the field markings and the overlay together.
export const STAGE_MARGIN = { top: 16, right: 16, bottom: 16, left: 16 };

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Callers pass the field's on-screen pixel width and height (fieldLayer.tsx's
// FIELD_PX_WIDTH/HEIGHT: downfield span by lateral span).
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
