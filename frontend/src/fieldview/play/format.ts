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

export const PLAY_FORMAT_VERSION = 1;

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
