// SVG field markings: sidelines, goal lines, brick marks, and the
// attacking-direction indicator. Piece rendering (drag, tokens) lands in the
// whiteboard partition; this layer only draws the field itself.

import {
  BRICK_ATTACKING,
  BRICK_DEFENDING,
  FIELD,
  GOAL_LINE_ATTACKING,
  GOAL_LINE_DEFENDING,
} from "../scene/field";
import { PIXELS_PER_YARD, yardToPixel } from "./coords";

export const FIELD_PX_WIDTH = FIELD.length * PIXELS_PER_YARD;
export const FIELD_PX_HEIGHT = FIELD.width * PIXELS_PER_YARD;

function verticalLine(x: number, dashed = false) {
  const px = yardToPixel({ x, y: 0 }).x;
  return (
    <line
      key={`vline-${x}`}
      x1={px}
      y1={0}
      x2={px}
      y2={FIELD_PX_HEIGHT}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeDasharray={dashed ? "4 4" : undefined}
    />
  );
}

export function FieldLayer() {
  const midY = yardToPixel({ x: 0, y: FIELD.width / 2 }).y;

  return (
    <g className="text-zinc-400" aria-hidden="true">
      {/* Sidelines */}
      <rect
        x={0}
        y={0}
        width={FIELD_PX_WIDTH}
        height={FIELD_PX_HEIGHT}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      />
      {/* Goal lines */}
      {verticalLine(GOAL_LINE_DEFENDING)}
      {verticalLine(GOAL_LINE_ATTACKING)}
      {/* Brick marks, 20 yd from each goal line */}
      <circle cx={yardToPixel({ x: BRICK_DEFENDING, y: FIELD.width / 2 }).x} cy={midY} r={2.5} fill="currentColor" />
      <circle cx={yardToPixel({ x: BRICK_ATTACKING, y: FIELD.width / 2 }).x} cy={midY} r={2.5} fill="currentColor" />
      {/* Attacking-direction indicator: an arrow pointing toward +x */}
      <g transform={`translate(${FIELD_PX_WIDTH / 2 - 20}, -14)`} className="text-film-accentPink">
        <line x1={0} y1={0} x2={36} y2={0} stroke="currentColor" strokeWidth={2} />
        <path d="M 30 -4 L 36 0 L 30 4 Z" fill="currentColor" />
      </g>
    </g>
  );
}
