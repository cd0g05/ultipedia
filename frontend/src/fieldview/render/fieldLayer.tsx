// SVG field markings: sidelines, goal lines, brick marks, and the
// attacking-direction indicator. All visual values come from tokens.ts
// (ADR-10); piece rendering lives in pieceLayer.tsx.

import {
  BRICK_ATTACKING,
  BRICK_DEFENDING,
  FIELD,
  GOAL_LINE_ATTACKING,
  GOAL_LINE_DEFENDING,
} from "../scene/field";
import { PIXELS_PER_YARD, yardToPixel } from "./coords";
import { FIELD_TOKENS } from "./tokens";

export const FIELD_PX_WIDTH = FIELD.length * PIXELS_PER_YARD;
export const FIELD_PX_HEIGHT = FIELD.width * PIXELS_PER_YARD;

function verticalLine(x: number) {
  const px = yardToPixel({ x, y: 0 }).x;
  return (
    <line
      key={`vline-${x}`}
      x1={px}
      y1={0}
      x2={px}
      y2={FIELD_PX_HEIGHT}
      stroke={FIELD_TOKENS.lineColor}
      strokeWidth={FIELD_TOKENS.lineWidth}
    />
  );
}

export function FieldLayer() {
  const midY = yardToPixel({ x: 0, y: FIELD.width / 2 }).y;

  return (
    <g aria-hidden="true">
      {/* Sidelines */}
      <rect
        x={0}
        y={0}
        width={FIELD_PX_WIDTH}
        height={FIELD_PX_HEIGHT}
        fill="none"
        stroke={FIELD_TOKENS.lineColor}
        strokeWidth={FIELD_TOKENS.lineWidth}
      />
      {/* Goal lines */}
      {verticalLine(GOAL_LINE_DEFENDING)}
      {verticalLine(GOAL_LINE_ATTACKING)}
      {/* Brick marks, 20 yd from each goal line */}
      <circle
        cx={yardToPixel({ x: BRICK_DEFENDING, y: FIELD.width / 2 }).x}
        cy={midY}
        r={FIELD_TOKENS.brickRadius}
        fill={FIELD_TOKENS.lineColor}
      />
      <circle
        cx={yardToPixel({ x: BRICK_ATTACKING, y: FIELD.width / 2 }).x}
        cy={midY}
        r={FIELD_TOKENS.brickRadius}
        fill={FIELD_TOKENS.lineColor}
      />
      {/* Attacking-direction indicator: an arrow pointing toward +x */}
      <g transform={`translate(${FIELD_PX_WIDTH / 2 - 20}, -14)`}>
        <line
          x1={0}
          y1={0}
          x2={36}
          y2={0}
          stroke={FIELD_TOKENS.attackArrowColor}
          strokeWidth={2}
        />
        <path d="M 30 -4 L 36 0 L 30 4 Z" fill={FIELD_TOKENS.attackArrowColor} />
      </g>
    </g>
  );
}
