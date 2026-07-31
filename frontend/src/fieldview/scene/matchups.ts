// Defensive matchups (tech-design ADR-2). `Scene.matchups` maps defenderId ->
// offensiveId (or null for explicit free roam), and this module is its only
// writer.
//
// The invariant is that matchups stay a PERMUTATION: no two defenders may
// hold the same target. That is a property of the whole set, not of any one
// player, which is exactly why ADR-2 puts it on Scene as a map instead of a
// field on Player — validating it here is one object to look at, and a stale
// entry cannot hide on a removed player.
//
// Every writer ends with normalize(), because changing who guards the
// possessor changes which defender derives the `mark` role (ADR-1).
//
// Pure, like scene.ts and selection.ts: mutates the passed draft, no React,
// no DOM, called from inside store.mutate().

import type { Scene } from "./types";
import { normalize } from "./possession";

function isDefender(scene: Scene, id: string): boolean {
  return scene.players.some((p) => p.id === id && p.team === "defense");
}

function isOffense(scene: Scene, id: string): boolean {
  return scene.players.some((p) => p.id === id && p.team === "offense");
}

// Who is covering `offensiveId`, or null if nobody is. Scans in player order
// rather than Object.keys order so the answer never depends on how the map
// was built; the permutation invariant means at most one defender can match.
export function guardedBy(scene: Scene, offensiveId: string): string | null {
  for (const p of scene.players) {
    if (p.team !== "defense") continue;
    if (scene.matchups[p.id] === offensiveId) return p.id;
  }
  return null;
}

// Nearest-available pairing, rebuilt from scratch. Every candidate pair is
// scored, then claimed greedily closest-first, each defender and each
// offensive player taken at most once — so the result is a permutation by
// construction rather than by repair.
//
// Determinism matters as much as optimality here (a preset must load the same
// way twice), so equal distances break on defender id then offensive id
// instead of on array order. Greedy-nearest is not a global minimum-cost
// matching; it is what a coach reads as "everyone picks up the person in
// front of them", and O(n^2) over 14 players is free.
export function autoAssign(scene: Scene): void {
  const defenders = scene.players.filter((p) => p.team === "defense");
  const offense = scene.players.filter((p) => p.team === "offense");

  const pairs: Array<{ d: string; o: string; dist: number }> = [];
  for (const d of defenders) {
    for (const o of offense) {
      const dx = d.pos.x - o.pos.x;
      const dy = d.pos.y - o.pos.y;
      pairs.push({ d: d.id, o: o.id, dist: dx * dx + dy * dy });
    }
  }
  pairs.sort((a, b) => a.dist - b.dist || (a.d < b.d ? -1 : a.d > b.d ? 1 : 0) || (a.o < b.o ? -1 : 1));

  const next: Record<string, string | null> = {};
  for (const d of defenders) next[d.id] = null;
  const takenOffense = new Set<string>();
  for (const pair of pairs) {
    if (next[pair.d] !== null) continue;
    if (takenOffense.has(pair.o)) continue;
    next[pair.d] = pair.o;
    takenOffense.add(pair.o);
  }

  scene.matchups = next;
  normalize(scene);
}

// Point `defenderId` at `offensiveId`, preserving the permutation by SWAP: if
// another defender already holds that target, they receive the caller's
// previous target — which may be null, and that is the correct outcome, not a
// hole to patch. Nobody is left uncovered that was not already uncovered, and
// no target ends up double-teamed.
//
// Passing null clears only this defender and cascades nothing (an explicit
// "free roam" choice, distinct from an unknown assignment).
export function reassign(scene: Scene, defenderId: string, offensiveId: string | null): void {
  if (!isDefender(scene, defenderId)) return;

  if (offensiveId === null) {
    scene.matchups[defenderId] = null;
    normalize(scene);
    return;
  }
  if (!isOffense(scene, offensiveId)) return;

  const previous = scene.matchups[defenderId] ?? null;
  const displaced = guardedBy(scene, offensiveId);

  scene.matchups[defenderId] = offensiveId;
  // `displaced === defenderId` is the no-op case (already guarding them);
  // handing the previous target back to themselves would undo the write.
  if (displaced !== null && displaced !== defenderId) {
    scene.matchups[displaced] = previous;
  }

  normalize(scene);
}
