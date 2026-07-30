// Which piece does a pointer grab?
//
// Not a hit test. SVG hit-testing has no notion of distance — the topmost
// element in document order wins — so overlapping grab targets picked
// whichever player happened to be rendered last, not the one nearest the
// cursor. This module answers the question by distance instead, which is
// correct by construction however the pieces are ordered or spaced.
//
// Pure and framework-free (ADR-1): no React, no DOM, no pixels. Yards only.

import type { Player, Vec2 } from "../scene/types";

// Generous, and deliberately independent of how large a piece is drawn:
// grab distance is an input-ergonomics number, not a visual one. Changing
// PIECE_TOKENS radii must not change how the board feels to grab.
export const HIT_RADIUS_YD = 3.0;

/**
 * The player nearest `pt` within `radiusYd`, or null if the pointer is in
 * open space. Ties go to the earlier entry, so the result is stable for a
 * fixed roster.
 */
export function pickNearest(
  pt: Vec2,
  players: readonly Player[],
  radiusYd: number = HIT_RADIUS_YD,
): Player | null {
  let best: Player | null = null;
  let bestDist = radiusYd;

  for (const player of players) {
    const dist = Math.hypot(player.pos.x - pt.x, player.pos.y - pt.y);
    // Strictly less than: a later piece at exactly the same distance does
    // not displace an earlier one.
    if (dist < bestDist) {
      bestDist = dist;
      best = player;
    }
  }

  return best;
}
