// SVG field markings: sidelines, goal lines, brick marks, and the
// attacking-direction label. All visual values come from tokens.ts (ADR-10);
// piece rendering lives in pieceLayer.tsx.
//
// The field renders horizontally, offense attacking to the right (coords.ts,
// ADR-28). FIELD_PX_WIDTH is the downfield span and FIELD_PX_HEIGHT the
// lateral span. Goal lines are therefore vertical.

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

// A line at fixed downfield yard `x`, spanning the full lateral width —
// e.g. a goal line. (Named for what it marks, not for its screen
// orientation, since that's an implementation detail of coords.ts.)
function downfieldLine(x: number) {
  const px = yardToPixel({ x, y: 0 }).x;
  return (
    <line
      key={`dline-${x}`}
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
  const midX = yardToPixel({ x: FIELD.length / 2, y: 0 }).x;

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
      {downfieldLine(GOAL_LINE_DEFENDING)}
      {downfieldLine(GOAL_LINE_ATTACKING)}
      {/* Brick marks, 20 yd from each goal line */}
      <circle
        cx={yardToPixel({ x: BRICK_DEFENDING, y: 0 }).x}
        cy={midY}
        r={FIELD_TOKENS.brickRadius}
        fill={FIELD_TOKENS.lineColor}
      />
      <circle
        cx={yardToPixel({ x: BRICK_ATTACKING, y: 0 }).x}
        cy={midY}
        r={FIELD_TOKENS.brickRadius}
        fill={FIELD_TOKENS.lineColor}
      />
      {/* Which way the offense is going, said in words. Drawn inside the field
          at the bottom, near midfield, so it costs the stage no margin. */}
      <text
        x={midX}
        y={FIELD_PX_HEIGHT - FIELD_TOKENS.attackLabel.insetPx}
        textAnchor="middle"
        fontSize={FIELD_TOKENS.attackLabel.fontSize}
        letterSpacing={FIELD_TOKENS.attackLabel.letterSpacing}
        fontFamily={FIELD_TOKENS.attackLabel.fontFamily}
        fontWeight={700}
        fill={FIELD_TOKENS.attackLabel.fill}
      >
        {FIELD_TOKENS.attackLabel.text}
      </text>
    </g>
  );
}
