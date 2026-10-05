// Build's change indicator on the field (fieldview-build ux): for each player
// placed in the CURRENT frame, a faint ghost where they stood before (the
// inherited position) and a dashed arrow to where they are now. Static SVG drawn
// from the document above the pieces (FieldCanvas `overlayLayer`), transparent
// to the pointer; it updates when a gesture commits, not per pointer move.

import { yardToPixel } from "../../render/coords";
import { GHOST_TOKENS, PIECE_TOKENS, TRAIL_TOKENS } from "../../render/tokens";
import type { Play } from "../../play/format";
import { placedIds, resolveAll } from "../../play/model";

const MARKER_ID = "fv-ghost-arrow";

export function GhostLayer({ play, frameIndex }: { play: Play; frameIndex: number }) {
  const ids = placedIds(play, frameIndex);
  if (ids.length === 0) return null;
  const frames = resolveAll(play);
  const before = frames[frameIndex - 1].positions;
  const now = frames[frameIndex].positions;

  const items = ids.flatMap((id) => {
    const a = before[id];
    const b = now[id];
    if (!a || !b) return [];
    if (Math.hypot(b.x - a.x, b.y - a.y) < TRAIL_TOKENS.minYards) return [];
    const pa = yardToPixel(a);
    const pb = yardToPixel(b);
    const len = Math.hypot(pb.x - pa.x, pb.y - pa.y);
    const back = PIECE_TOKENS.offense.radius + 3;
    const k = len > back ? (len - back) / len : 0;
    return [{ id, pa, tip: { x: pa.x + (pb.x - pa.x) * k, y: pa.y + (pb.y - pa.y) * k }, long: len > back }];
  });

  return (
    <g data-testid="ghosts" aria-hidden="true" pointerEvents="none">
      <defs>
        <marker id={MARKER_ID} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto">
          <path d="M0 0L6 3L0 6z" fill={TRAIL_TOKENS.stroke} />
        </marker>
      </defs>
      {items.map(({ id, pa, tip, long }) => (
        <g key={id} data-ghost-for={id}>
          <circle
            cx={pa.x}
            cy={pa.y}
            r={PIECE_TOKENS.offense.radius}
            fill={GHOST_TOKENS.fill}
            fillOpacity={GHOST_TOKENS.fillOpacity}
            stroke={TRAIL_TOKENS.stroke}
            strokeWidth={GHOST_TOKENS.strokeWidth}
            strokeDasharray={GHOST_TOKENS.dash}
            opacity={GHOST_TOKENS.opacity}
          />
          {long && (
            <line
              x1={pa.x}
              y1={pa.y}
              x2={tip.x}
              y2={tip.y}
              stroke={TRAIL_TOKENS.stroke}
              strokeWidth={TRAIL_TOKENS.strokeWidth}
              strokeDasharray={TRAIL_TOKENS.dash}
              opacity={TRAIL_TOKENS.opacity}
              markerEnd={`url(#${MARKER_ID})`}
            />
          )}
        </g>
      ))}
    </g>
  );
}
