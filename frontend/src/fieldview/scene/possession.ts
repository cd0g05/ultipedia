// Possession and the role derivation that hangs off it (tech-design ADR-1).
//
// Canon recorded that the disc was derived from `role === "thrower"` "so it
// cannot disagree with itself". This initiative needs possession to be an
// explicit fact (a throw is a discrete event that a later initiative has to
// record), so the derivation is INVERTED rather than dropped: `possession` is
// the single stored truth, and `thrower`/`mark` are recomputed from it here.
// The guarantee only survives if this is the ONLY place roles are written —
// no caller may assign `player.role` itself, and every mutation that could
// invalidate the derivation ends with normalize(). tests/modelGuard.test.ts
// asserts that across every public op.
//
// Pure, like scene.ts and selection.ts: mutates the draft passed in, imports
// nothing from React, the DOM, or render/. Callers run these inside
// store.mutate(), which owns notification and frame scheduling.

import type { Player, Scene } from "./types";
import { MARK_RADIUS_YD } from "../space/constants";

function findPlayer(scene: Scene, id: string | null): Player | undefined {
  if (id === null) return undefined;
  return scene.players.find((p) => p.id === id);
}

// The defence player nearest `targetId` by straight-line yards. Ties break on
// player id so the result is deterministic — two defenders equidistant from a
// cutter must not make the derived mark depend on array order, or a scene
// would render differently after a harmless reorder.
//
// It answers "who is physically closest" and nothing more; whether that
// defender counts as the mark is markFor's range check.
export function nearestDefender(scene: Scene, targetId: string): string | null {
  const target = findPlayer(scene, targetId);
  if (!target) return null;

  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const p of scene.players) {
    if (p.team !== "defense") continue;
    if (p.id === targetId) continue;
    const dx = p.pos.x - target.pos.x;
    const dy = p.pos.y - target.pos.y;
    const dist = dx * dx + dy * dy; // squared: monotone in distance, no sqrt
    if (dist < bestDist || (dist === bestDist && bestId !== null && p.id < bestId)) {
      bestDist = dist;
      bestId = p.id;
    }
  }
  return bestId;
}

// Which defender is derived as the mark (fieldview-build ADR-38): the defender
// closest to the possessor, if within MARK_RADIUS_YD (10 ft); otherwise nobody.
// Pure geometry — matchups play no part. Ties break on id (nearestDefender).
function markFor(scene: Scene, possessorId: string): string | null {
  const possessor = findPlayer(scene, possessorId);
  const nearestId = nearestDefender(scene, possessorId);
  const nearest = findPlayer(scene, nearestId);
  if (!possessor || !nearest) return null;
  const dist = Math.hypot(nearest.pos.x - possessor.pos.x, nearest.pos.y - possessor.pos.y);
  return dist <= MARK_RADIUS_YD ? nearest.id : null;
}

// Recompute every role from possession + matchups. Idempotent, and safe to
// call on a scene that is already consistent — which is why every mutation
// can just end with it rather than reasoning about whether it needs to.
//
// Stale possession (an id that is not on the field, or that names a defence
// player) is cleared rather than carried: possession means "an offensive
// player is holding the disc", and leaving a dangling id would let the UI
// show a live Throw button pointed at nobody.
export function normalize(scene: Scene): void {
  const possessor = findPlayer(scene, scene.possession);
  if (!possessor || possessor.team !== "offense") {
    scene.possession = null;
  }

  const possessorId = scene.possession;
  // null possession = loose disc: no thrower and no mark, everyone falls back
  // to their team's default role. Nothing here throws on that case.
  const markId = possessorId === null ? null : markFor(scene, possessorId);

  for (const p of scene.players) {
    if (p.id === possessorId) {
      p.role = "thrower";
    } else if (p.id === markId && p.team === "defense") {
      p.role = "mark";
    } else {
      p.role = p.team === "offense" ? "cutter" : "defender";
    }
  }
}

// Complete a throw: possession moves to the receiver, then roles re-derive —
// the old thrower becomes a cutter, the receiver becomes the thrower, and the
// mark moves to whoever guards the new thrower, all in one call.
//
// A receiver who is not an offensive player on the field leaves possession
// untouched (the UI's cancel paths mean a stray id is a no-op, not an error).
// Throwing to the current holder is likewise a no-op — normalize() still runs,
// which is harmless because it is idempotent.
export function throwTo(scene: Scene, receiverId: string): void {
  const receiver = findPlayer(scene, receiverId);
  if (receiver && receiver.team === "offense") {
    scene.possession = receiverId;
  }
  normalize(scene);
}
