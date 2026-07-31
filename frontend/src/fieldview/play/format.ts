// The site-wide play contract (tech-design.md "Play file", ADR-7). The
// encyclopedia's drill visualizer and the AI-animation pipeline will both
// write against this shape, so identity (entities) is stated once and
// position is stated per keyframe — cheap to diff, sane to generate.
//
// A preset (scene/presetFormat.ts) is deliberately this format with one
// frame, so `PlayEntity` is owned here and re-exported there rather than
// declared twice.

import type { Role, Team, Vec2 } from "../scene/types";
import { FIELD } from "../scene/field";

// v2 adds `possession` and `matchups` ADDITIVELY (tech-design ADR-4): both
// are optional, a v1 file is still valid input, and anything missing is
// backfilled at load time rather than migrated on disk. The version number is
// documentation — forward compatibility is guaranteed by validate.ts dropping
// unknown keys (ADR-7), not by this integer.
export const PLAY_FORMAT_VERSION = 2;

export interface PlayEntity {
  id: string; // stable across keyframes — tweening pairs by id, never array index
  team: Team;
  role: Role;
  label?: string;
}

export interface PlayKeyframe {
  t: number; // seconds from play start; strictly increasing across the array
  positions: Record<string, Vec2>; // entity id -> position, yards
}

export interface PlayField {
  length: number;
  width: number;
  endzone: number;
}

export interface PlayFile {
  formatVersion: number; // PLAY_FORMAT_VERSION
  name: string;
  description?: string;
  // Written explicitly rather than assumed, so a future non-regulation field
  // is not a breaking change for a reader.
  field: PlayField;
  entities: PlayEntity[];
  keyframes: PlayKeyframe[]; // >= 1, sorted by t
  // Enumerated with one member today: adding "ease-in-out" later is additive
  // rather than a format version bump.
  interpolation: "linear";

  // v2 (ADR-4). Both optional: absent means "this file predates the play
  // model", and the reader backfills rather than the writer migrating.
  //
  // Who holds the disc — an id from `entities`, or null for a loose disc.
  // Stated once for the whole play, not per keyframe: a keyframe is a POSE,
  // and a throw is a change of play, not a change of pose. (Recording
  // possession over time is Initiative D's job and will be a keyframe-level
  // addition, which this leaves room for.) Absent → backfilled from whichever
  // entity carries the stored `thrower` role, which is where the fact lived
  // in v1.
  possession?: string | null;
  // defenderId -> offensiveId, or null for explicit free roam. A permutation
  // (ADR-2): no two defenders share a target. Absent → backfilled by
  // autoAssign() from the first keyframe's geometry.
  matchups?: Record<string, string | null>;

  // RESERVED — `annotations` (arrows, text, cone markers) is a confirmed
  // future need whose *shape* is deliberately not designed yet. The key name
  // is reserved here so nothing else claims it, and forward-compatibility is
  // secured by validate.ts dropping unknown keys rather than rejecting them:
  // a v1.x file carrying annotations still imports cleanly into a reader
  // that predates them, minus the annotations. Adding the field later is
  // therefore additive, not a formatVersion bump.
}

// Length caps applied at the boundary (play/validate.ts) so an imported file
// cannot carry an unbounded string into the DOM.
export const MAX_PLAY_NAME_LENGTH = 80;
export const MAX_PLAY_DESCRIPTION_LENGTH = 500;
export const MAX_ENTITY_LABEL_LENGTH = 10;

export function currentPlayField(): PlayField {
  return { length: FIELD.length, width: FIELD.width, endzone: FIELD.endzone };
}
