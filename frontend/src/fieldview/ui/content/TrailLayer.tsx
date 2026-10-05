// Watch's movement trails: a dashed arrow from where each piece was in the
// previous frame to where it is in this one, so a frame's moves read at a
// glance. Static SVG for the current frame, drawn above the pieces
// (FieldCanvas `overlayLayer`) and transparent to the pointer.

import { yardToPixel } from "../../render/coords";
import { PIECE_TOKENS, TRAIL_TOKENS } from "../../render/tokens";
import type { Play } from "../../play/format";
import { resolveAll } from "../../play/model";

const MARKER_ID = "fv-trail-arrow";

export function TrailLayer({ play, frameIndex }: { play: Play; frameIndex: number }) {
  if (frameIndex <= 0) return null;
  const frames = resolveAll(play);
  const from = frames[frameIndex - 1].positions;
  const to = frames[frameIndex].positions;

  const arrows = play.players.flatMap((e) => {
    const a = from[e.id];
    const b = to[e.id];
    if (!a || !b) return [];
    if (Math.hypot(b.x - a.x, b.y - a.y) < TRAIL_TOKENS.minYards) return [];
    const pa = yardToPixel(a);
    const pb = yardToPixel(b);
    // Stop short of the piece so the arrowhead is not hidden under it.
    const len = Math.hypot(pb.x - pa.x, pb.y - pa.y);
    const back = PIECE_TOKENS.offense.radius + 3;
    if (len <= back) return [];
    const k = (len - back) / len;
    return [{ id: e.id, a: pa, b: { x: pa.x + (pb.x - pa.x) * k, y: pa.y + (pb.y - pa.y) * k } }];
  });

  return (
    <g data-testid="trails" aria-hidden="true" pointerEvents="none">
      <defs>
        <marker id={MARKER_ID} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto">
          <path d="M0 0L6 3L0 6z" fill={TRAIL_TOKENS.stroke} />
        </marker>
      </defs>
      {arrows.map(({ id, a, b }) => (
        <line
          key={id}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={TRAIL_TOKENS.stroke}
          strokeWidth={TRAIL_TOKENS.strokeWidth}
          strokeDasharray={TRAIL_TOKENS.dash}
          opacity={TRAIL_TOKENS.opacity}
          markerEnd={`url(#${MARKER_ID})`}
        />
      ))}
    </g>
  );
}
