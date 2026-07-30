// SVG field markings: sidelines, goal lines, brick marks, and the
// attacking-direction indicator. All visual values come from tokens.ts
// (ADR-10); piece rendering lives in pieceLayer.tsx.
//
// The field renders vertically, offense attacking up the screen (coords.ts
// ADR-2). FIELD_PX_WIDTH/HEIGHT are screen dimensions, not yard-axis-order
// dimensions — width is the lateral (sideline-to-sideline) span, height is
// the downfield span — so they're swapped from what a horizontal field's
// same names would mean. Every downfield-relative line below is drawn
// horizontal (perpendicular to the vertical length axis) for the same
// reason a horizontal field draws its goal lines as verticals.

import {
  BRICK_ATTACKING,
  BRICK_DEFENDING,
  FIELD,
  GOAL_LINE_ATTACKING,
  GOAL_LINE_DEFENDING,
} from "../scene/field";
import { PIXELS_PER_YARD, yardToPixel } from "./coords";
import { FIELD_TOKENS } from "./tokens";

export const FIELD_PX_WIDTH = FIELD.width * PIXELS_PER_YARD;
export const FIELD_PX_HEIGHT = FIELD.length * PIXELS_PER_YARD;

// A line at fixed downfield yard `x`, spanning the full lateral width —
// e.g. a goal line. (Named for what it marks, not for its screen
// orientation, since that's an implementation detail of coords.ts.)
function downfieldLine(x: number) {
  const py = yardToPixel({ x, y: 0 }).y;
  return (
    <line
      key={`dline-${x}`}
      x1={0}
      y1={py}
      x2={FIELD_PX_WIDTH}
      y2={py}
      stroke={FIELD_TOKENS.lineColor}
      strokeWidth={FIELD_TOKENS.lineWidth}
    />
  );
}

export function FieldLayer() {
  const midX = yardToPixel({ x: 0, y: FIELD.width / 2 }).x;

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
        cx={midX}
        cy={yardToPixel({ x: BRICK_DEFENDING, y: FIELD.width / 2 }).y}
        r={FIELD_TOKENS.brickRadius}
        fill={FIELD_TOKENS.lineColor}
      />
      <circle
        cx={midX}
        cy={yardToPixel({ x: BRICK_ATTACKING, y: FIELD.width / 2 }).y}
        r={FIELD_TOKENS.brickRadius}
        fill={FIELD_TOKENS.lineColor}
      />
      {/* Attacking-direction indicator: a labelled arrow pointing up-field
          (+x, now up the screen), anchored just above the sideline and
          centred over the field's lateral midpoint. Sized to fit inside
          STAGE_MARGIN.top (36 px): arrow tip at -16, label baseline at -22,
          leaving fontSize (11) worth of headroom under the -36 clip. */}
      <g transform={`translate(${midX}, -2)`}>
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={-14}
          stroke={FIELD_TOKENS.attackArrowColor}
          strokeWidth={2}
        />
        <path d="M -4 -10 L 0 -16 L 4 -10 Z" fill={FIELD_TOKENS.attackArrowColor} />
        <text
          x={0}
          y={-16 - FIELD_TOKENS.attackLabel.gapPx}
          textAnchor="middle"
          fontSize={FIELD_TOKENS.attackLabel.fontSize}
          letterSpacing={FIELD_TOKENS.attackLabel.letterSpacing}
          fill={FIELD_TOKENS.attackLabel.fill}
        >
          {FIELD_TOKENS.attackLabel.text}
        </text>
      </g>
    </g>
  );
}
