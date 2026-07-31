// The load-time backfill (tech-design ADR-4), split out from serialize.ts so
// that scene/ can reach it without importing FilePlayStore: scene modules are
// pure by rule (tests/imports.test.ts), and serialize.ts also owns the
// download/file-picker store, which touches the DOM. Same partition, same
// contract, one import edge fewer.

import type { Player, Scene } from "../scene/types";
import { normalize } from "../scene/possession";
import { autoAssign } from "../scene/matchups";

// What a stored file (or a preset, or an in-memory keyframe) can tell the
// loader about the play model. Both optional — absent means "backfill it".
export interface StoredPlayModel {
  possession?: string | null;
  matchups?: Record<string, string | null>;
}

// THE load-time backfill (ADR-4). Every path that turns stored data back into
// a Scene goes through here — play import, tween sampling, preset load, and
// the built-ins themselves — so a v1 file, a v2 file and a built-in preset all
// reach the same normalized state with no per-call-site special-casing.
//
// Order matters, and it is the reason this is one function rather than three
// lines repeated:
//
//  1. Possession first, because matchups mean nothing without knowing who
//     holds the disc. A stored value wins; otherwise it is recovered from the
//     `thrower` role, which is exactly where v1 kept this fact.
//  2. Matchups: a stored map is taken as given, an absent one is built by
//     autoAssign() from the geometry we just loaded.
//  3. normalize() last, always — it is what re-derives `thrower`/`mark` and
//     what clears a possession that names nobody. Running it last means a
//     stale id from a hand-edited file becomes a loose disc instead of a
//     phantom thrower, while a v1 file whose thrower is a real offensive
//     player keeps the disc in that player's hands. (autoAssign() already
//     ends with normalize(); the explicit call covers the stored-map branch
//     and is idempotent in the other.)
export function backfillScene(players: Player[], stored?: StoredPlayModel): Scene {
  const possession =
    stored?.possession !== undefined
      ? stored.possession
      : (players.find((p) => p.role === "thrower")?.id ?? null);

  const scene: Scene = { players, possession, matchups: {} };

  if (stored?.matchups !== undefined) {
    scene.matchups = { ...stored.matchups };
    normalize(scene);
  } else {
    autoAssign(scene);
  }
  return scene;
}

// The play model as a play file states it. Used on export; the reader's
// counterpart is backfillScene().
export function playModelOf(scene: Scene): Required<StoredPlayModel> {
  return { possession: scene.possession, matchups: { ...scene.matchups } };
}
