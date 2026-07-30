// Yard -> pixel transform. This is the only place fieldview coordinates
// leave yards; scene/ and (later) space/ never see a pixel value. It is also
// the *only* place orientation lives (tech-design.md ADR-2): the field
// renders vertically, offense attacking up the screen, and nothing outside
// this file encodes that fact. scene/ stays orientation-agnostic — yard.x is
// still "downfield, +x = attacking" (scene/types.ts) no matter how the stage
// draws it; only this transform decides which screen axis that becomes.

import type { Vec2 } from "../scene/types";
import { FIELD } from "../scene/field";

export const PIXELS_PER_YARD = 8;

// Downfield yards (x) become screen-vertical, decreasing pixel-y as x grows,
// so attacking (+x) points up the screen. Lateral yards (y) become
// screen-horizontal unchanged. Flipping via `FIELD.length - x` (rather than
// a bare negation) keeps every on-field point at a non-negative pixel-y, so
// the pixel space stays [0, FIELD.length*PIXELS_PER_YARD] just like the
// pre-rotation [0, FIELD.length*PIXELS_PER_YARD] horizontal span did —
// getStageViewBox's margin math doesn't need to special-case a negative
// range as a result.
export function yardToPixel(pos: Vec2): Vec2 {
  return {
    x: pos.y * PIXELS_PER_YARD,
    y: (FIELD.length - pos.x) * PIXELS_PER_YARD,
  };
}

export function pixelToYard(pos: Vec2): Vec2 {
  return {
    x: FIELD.length - pos.y / PIXELS_PER_YARD,
    y: pos.x / PIXELS_PER_YARD,
  };
}

// Margin around the field itself so the attacking-direction indicator and
// its label have room to render above the sideline. Shared by every stage
// (static or interactive) so their viewBoxes — and therefore pointer math —
// agree. FieldCanvas also derives the heatmap canvas's inset from this, so
// changing it moves the field markings and the overlay together.
export const STAGE_MARGIN = { top: 36, right: 20, bottom: 20, left: 20 };

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Field-relative, not axis-relative: callers pass whatever their on-screen
// width/height actually are. Since fieldLayer.tsx's FIELD_PX_WIDTH/HEIGHT
// now measure the vertical field (width = FIELD.width * PIXELS_PER_YARD,
// height = FIELD.length * PIXELS_PER_YARD — swapped from the pre-rotation
// horizontal field), this function's own math is unchanged; it was already
// generic over which yard dimension maps to which screen dimension.
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
