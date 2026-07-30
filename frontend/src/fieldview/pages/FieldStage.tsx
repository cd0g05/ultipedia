// Static scene render used by the Designer shell (interactivity lands in the
// play-designer partition). All visuals come from render/tokens.ts (ADR-10).

import type { Scene } from "../scene/types";
import { FIELD } from "../scene/field";
import { FIELD_PX_HEIGHT, FIELD_PX_WIDTH, FieldLayer } from "../render/fieldLayer";
import { getStageViewBox, viewBoxToString, yardToPixel } from "../render/coords";
import { PIECE_TOKENS } from "../render/tokens";

export function FieldStage({ scene }: { scene: Scene }) {
  const viewBox = viewBoxToString(getStageViewBox(FIELD_PX_WIDTH, FIELD_PX_HEIGHT));

  return (
    <svg
      role="img"
      aria-label={`Ultimate field, ${FIELD.length} by ${FIELD.width} yards. Offense attacks left to right.`}
      viewBox={viewBox}
      className="h-auto w-full"
    >
      <FieldLayer />
      <g data-testid="pieces">
      {scene.players.map((p) => {
        const { x, y } = yardToPixel(p.pos);
        const style = p.team === "offense" ? PIECE_TOKENS.offense : PIECE_TOKENS.defense;
        const isSpecial = p.role === "thrower" || p.role === "mark";
        const radius = isSpecial ? PIECE_TOKENS.special.radius : style.radius;
        return (
          <g key={p.id} aria-hidden="true">
            <circle
              cx={x}
              cy={y}
              r={radius}
              fill={style.fill}
              stroke={isSpecial ? PIECE_TOKENS.special.stroke : undefined}
              strokeWidth={isSpecial ? PIECE_TOKENS.special.strokeWidth : undefined}
            />
            {p.label && (
              <text
                x={x}
                y={y + PIECE_TOKENS.label.fontSize / 2}
                textAnchor="middle"
                fontSize={PIECE_TOKENS.label.fontSize}
                fill={PIECE_TOKENS.label.fill}
              >
                {p.label}
              </text>
            )}
          </g>
        );
      })}
      </g>
    </svg>
  );
}
