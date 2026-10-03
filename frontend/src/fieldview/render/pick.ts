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

// A finger needs a bigger target than a cursor, and the stage scales to fit its
// container, so a fixed yard radius is a smaller and smaller number of pixels
// on a smaller screen. For touch the radius is therefore the larger of the
// mouse radius and half the minimum target, converted to yards at the CURRENT
// rendered scale. Mouse feel never changes. (Pure: the caller supplies the
// scale, so this module still knows no pixels of its own.)
// PLACEHOLDER(fieldview-ui-rework): the 44 px target is the platform guideline;
// confirm on a real device (docs/fieldview-placeholders.md #13).
export const TOUCH_TARGET_PX = 44;

export function hitRadiusYd(pointerType: string | undefined, pxPerYard: number): number {
  if (pointerType !== "touch" || !(pxPerYard > 0)) return HIT_RADIUS_YD;
  return Math.max(HIT_RADIUS_YD, TOUCH_TARGET_PX / 2 / pxPerYard);
}

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
