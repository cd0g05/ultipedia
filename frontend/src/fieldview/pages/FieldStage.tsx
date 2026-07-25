// Static scene render shared by the Whiteboard and Designer shells. Piece
// visuals here are a deliberately crude placeholder — the whiteboard
// partition replaces this with render/pieceLayer.tsx reading render/tokens.ts
// (ADR-10); this partition only needs a legible, non-interactive scene.

import type { Scene } from "../scene/types";
import { FIELD } from "../scene/field";
import { FIELD_PX_HEIGHT, FIELD_PX_WIDTH, FieldLayer } from "../render/fieldLayer";
import { yardToPixel } from "../render/coords";

const MARGIN = { top: 30, right: 20, bottom: 20, left: 20 };

export function FieldStage({ scene }: { scene: Scene }) {
  const viewBox = `${-MARGIN.left} ${-MARGIN.top} ${FIELD_PX_WIDTH + MARGIN.left + MARGIN.right} ${
    FIELD_PX_HEIGHT + MARGIN.top + MARGIN.bottom
  }`;

  return (
    <svg
      role="img"
      aria-label={`Ultimate field, ${FIELD.length} by ${FIELD.width} yards`}
      viewBox={viewBox}
      className="h-auto w-full max-w-4xl"
    >
      <FieldLayer />
      {scene.players.map((p) => {
        const { x, y } = yardToPixel(p.pos);
        const fill = p.team === "offense" ? "#4F941D" : "#D64B4A";
        const isSpecial = p.role === "thrower" || p.role === "mark";
        return (
          <g key={p.id} aria-hidden="true">
            <circle
              cx={x}
              cy={y}
              r={isSpecial ? 6 : 5}
              fill={fill}
              stroke={isSpecial ? "#18181b" : "none"}
              strokeWidth={isSpecial ? 1.5 : 0}
            />
            {p.label && (
              <text x={x} y={y + 3} textAnchor="middle" fontSize={5} fill="white">
                {p.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
