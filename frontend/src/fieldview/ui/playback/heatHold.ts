// The held space (Builder request, after fieldview-build). When the disc lands
// with a new holder the colours must not jump to the receiver's view: the
// cutters are usually behind the disc by then and the whole field would flash
// red. Instead the space of the throw stays on screen through the dwell, and
// once the NEXT frame's movement starts it eases over to the new holder's view.
//
// Like the flight position this is the published view of a playback fact, not
// the model of one: playback.ts publishes, FieldCanvas reads inside its own
// repaint (which every scene write already triggers), so none of it touches
// React.
//
//   anchor — the scene the held space is computed from (the pose at the end
//            of the throw, with the thrower still the thrower)
//   weight — 0 = all held space, 1 = all live space
//   holder — instead of an anchor: the LIVE poses, scored as if this player
//            held the disc. Used when stepping BACK across a pass: the disc
//            flies home, but the space belongs to the earlier thrower the whole
//            way, so it never shows the later thrower's view on an earlier frame.

import type { Scene } from "../../scene/types";
import { normalize } from "../../scene/possession";
import { ss } from "../../space/math";

export interface HeatHold {
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
