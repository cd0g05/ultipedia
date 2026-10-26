// The pinned space (Builder request, after fieldview-build). The heatmap says
// where a throw FROM the current holder would be open, so it is judged at the
// moment the disc leaves their hand: while the disc is in the air, and after the
// catch, the space stays exactly as it was at the throw — the receiver stands in
// the green they were thrown into, however far the defender has caught up since.
// It only updates for the new holder when the NEXT frame's movement starts,
// easing over once the cutters are under way.
//
// Like the flight position this is the published view of a playback fact, not
// the model of one: playback.ts publishes, FieldCanvas reads inside its own
// repaint (which every scene write already triggers), so none of it touches
// React.
//
//   target — the scene the space is computed from (the poses at the throw),
//            instead of the live scene. null = the live scene
//   anchor — a second scene the space is eased FROM: the live scene easing out
//            of a pinned throw, or the previous throw easing into the next
//   weight — 0 = all anchor space, 1 = all target (or live) space
//   holder — instead of a target: the LIVE poses, scored as if this player
//            held the disc. Used when stepping BACK across a pass: the disc
//            flies home, but the space belongs to the earlier thrower the whole
//            way, so it never shows the later thrower's view on an earlier frame.

import type { Scene } from "../../scene/types";
import { normalize } from "../../scene/possession";
import { ss } from "../../space/math";

export interface HeatHold {
  target: Scene | null;
  anchor: Scene | null;
  holder: string | null;
  weight: number;
}

// The share of a transition that passes before the colours start to move, so
// the cutters visibly go first and the space follows them.
export const HOLD_RELEASE_START = 0.3;

let hold: HeatHold | null = null;

export function getHeatHold(): HeatHold | null {
  return hold;
}

export function setHeatHold(next: HeatHold | null): void {
  hold = next;
}

// A new throw's space takes over from the previous one's within this share of
// its transition (the throw happens at the start, so it must not lag).
export const CROSSFADE_END = 0.25;

export function crossfadeWeight(u: number): number {
  return ss(0, CROSSFADE_END, u);
}

// Colour weight at transition progress u (0..1).
export function releaseWeight(u: number): number {
  return ss(HOLD_RELEASE_START, 1, u);
}

// A private copy: the live scene keeps changing under the hold.
export function snapshotScene(scene: Scene): Scene {
  return { ...scene, players: scene.players.map((p) => ({ ...p, pos: { ...p.pos } })) };
}

// The live scene scored as if `holder` had the disc (roles re-derived).
export function withHolder(scene: Scene, holder: string): Scene {
  const copy = snapshotScene(scene);
  copy.possession = holder;
  normalize(copy);
  return copy;
}
