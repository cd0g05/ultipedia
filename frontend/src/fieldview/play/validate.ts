// Boundary validation for untrusted play JSON (ADR-7). Every imported file
// is hand-checked before it can become a Scene: shape, ranges, roster
// integrity, version. Nothing here mutates the caller's current scene — the
// page only applies a result that came back clean.
//
// Forward-compatibility rule: unknown keys are DROPPED, never rejected. A
// future v1.x file carrying `annotations` still imports into this reader,
// minus the annotations. Known keys are copied onto fresh objects, so no
// prototype or extra property from the input survives.
//
// The v2 fields (`possession`, `matchups`, ADR-4) extend that rule inwards:
// they are optional, so a malformed one is DROPPED like an unknown key rather
// than rejecting the file. Rejecting would make an unreadable play out of a
// file whose players and positions — the parts a user would mourn — are
// perfectly intact, and the loader can rebuild both fields from geometry
// anyway. Only the structural fields (entities, keyframes, field) are worth
// refusing a file over.

import type { Role, Team, Vec2 } from "../scene/types";
import { FIELD, clampToField } from "../scene/field";
import {
  MAX_ENTITY_LABEL_LENGTH,
  MAX_PLAY_DESCRIPTION_LENGTH,
  MAX_PLAY_NAME_LENGTH,
  PLAY_FORMAT_VERSION,
  currentPlayField,
} from "./format";
import type { PlayEntity, PlayFile, PlayKeyframe } from "./format";

export class PlayValidationError extends Error {}

const VALID_TEAMS: Team[] = ["offense", "defense"];
const VALID_ROLES: Role[] = ["thrower", "cutter", "mark", "defender"];
const MAX_KEYFRAMES = 240;
const MAX_TIME_SECONDS = 600;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateEntity(raw: unknown): PlayEntity {
  if (!isRecord(raw)) throw new PlayValidationError("This file has a malformed entity.");
  if (typeof raw.id !== "string" || raw.id.length === 0) {
    throw new PlayValidationError("An entity in this file is missing an id.");
  }
  if (!VALID_TEAMS.includes(raw.team as Team)) {
    throw new PlayValidationError(`Entity ${raw.id} has an invalid team.`);
  }
  if (!VALID_ROLES.includes(raw.role as Role)) {
    throw new PlayValidationError(`Entity ${raw.id} has an invalid role.`);
  }
  const label = typeof raw.label === "string" ? raw.label.slice(0, MAX_ENTITY_LABEL_LENGTH) : undefined;
  return { id: raw.id, team: raw.team as Team, role: raw.role as Role, label };
}

function validatePosition(raw: unknown, entityId: string, t: number): Vec2 {
  if (!isRecord(raw) || !isFiniteNumber(raw.x) || !isFiniteNumber(raw.y)) {
    throw new PlayValidationError(`Keyframe at ${t}s is missing a position for entity ${entityId}.`);
  }
  return clampToField({ x: raw.x, y: raw.y });
}

function validateKeyframe(raw: unknown, entities: PlayEntity[]): PlayKeyframe {
  if (!isRecord(raw)) throw new PlayValidationError("This file has a malformed keyframe.");
  if (!isFiniteNumber(raw.t) || raw.t < 0 || raw.t > MAX_TIME_SECONDS) {
    throw new PlayValidationError("A keyframe has an out-of-range timestamp.");
  }
  if (!isRecord(raw.positions)) {
    throw new PlayValidationError(`Keyframe at ${raw.t}s has no positions.`);
  }

  // Roster integrity: every declared entity must have a position in every
  // keyframe, so a tween can never fall back to an implicit origin.
  const positions: Record<string, Vec2> = {};
  for (const entity of entities) {
    positions[entity.id] = validatePosition(raw.positions[entity.id], entity.id, raw.t);
  }
  return { t: raw.t, positions };
}

// `possession` when it names a declared entity, `null` when the file says the
// disc is loose, and `undefined` — meaning "say nothing, let the loader
// backfill" — for anything else, including an id that matches no entity.
// A dangling id is treated as absent rather than as null so a v1-style
// recovery from the `thrower` role can still find the right player, instead
// of the file's stale text silently emptying the disc.
function validatePossession(raw: unknown, entities: PlayEntity[]): string | null | undefined {
  if (raw === null) return null;
  if (typeof raw !== "string") return undefined;
  return entities.some((e) => e.id === raw) ? raw : undefined;
}

// Sanitised in place of rejected: entries are kept only when the key is a
// declared defender and the value is null or a declared offensive player, and
// a target already claimed by an earlier defender is dropped to null so the
// permutation invariant (ADR-2) holds on arrival rather than being repaired
// later. Iteration follows `entities` order, not the object's key order, so
// two files with the same content but different key insertion order validate
// identically.
function validateMatchups(
  raw: unknown,
  entities: PlayEntity[],
): Record<string, string | null> | undefined {
  if (!isRecord(raw)) return undefined;

  const offense = new Set(entities.filter((e) => e.team === "offense").map((e) => e.id));
  const out: Record<string, string | null> = {};
  const taken = new Set<string>();
  for (const entity of entities) {
    if (entity.team !== "defense") continue;
    if (!Object.prototype.hasOwnProperty.call(raw, entity.id)) continue;
    const target = raw[entity.id];
    if (target === null) {
      out[entity.id] = null;
    } else if (typeof target === "string" && offense.has(target) && !taken.has(target)) {
      out[entity.id] = target;
      taken.add(target);
    } else {
      out[entity.id] = null;
    }
  }
  return out;
}

export function validatePlayFile(raw: unknown): PlayFile {
  if (!isRecord(raw)) {
    throw new PlayValidationError("This file isn't a Field View play.");
  }
  if (!isFiniteNumber(raw.formatVersion)) {
    throw new PlayValidationError("This file isn't a Field View play.");
  }
  if (raw.formatVersion > PLAY_FORMAT_VERSION) {
    throw new PlayValidationError("This play was made with a newer version of Field View.");
  }
  if (typeof raw.name !== "string" || raw.name.length === 0) {
    throw new PlayValidationError("This play is missing a name.");
  }
  if (!isRecord(raw.field) || raw.field.length !== FIELD.length || raw.field.width !== FIELD.width) {
    throw new PlayValidationError("This play was built on a different field size.");
  }
  if (!Array.isArray(raw.entities) || raw.entities.length === 0) {
    throw new PlayValidationError("This play has no players.");
  }
  if (!Array.isArray(raw.keyframes) || raw.keyframes.length === 0) {
    throw new PlayValidationError("This play has no keyframes.");
  }
  if (raw.keyframes.length > MAX_KEYFRAMES) {
    throw new PlayValidationError("This play has too many keyframes.");
  }
  if (raw.interpolation !== undefined && raw.interpolation !== "linear") {
    throw new PlayValidationError("This play uses an interpolation mode Field View doesn't know.");
  }

  const entities = raw.entities.map(validateEntity);
  const seen = new Set<string>();
  for (const entity of entities) {
    if (seen.has(entity.id)) {
      throw new PlayValidationError(`This play has two players with the id ${entity.id}.`);
    }
    seen.add(entity.id);
  }

  // Sorted by t rather than rejected on order: an out-of-order file is
  // recoverable and the format's contract is "sorted", not "the author
  // sorted it".
  const keyframes = raw.keyframes
    .map((kf) => validateKeyframe(kf, entities))
    .sort((a, b) => a.t - b.t);

  for (let i = 1; i < keyframes.length; i += 1) {
    if (keyframes[i].t === keyframes[i - 1].t) {
      throw new PlayValidationError(`This play has two keyframes at ${keyframes[i].t}s.`);
    }
  }

  const description =
    typeof raw.description === "string" ? raw.description.slice(0, MAX_PLAY_DESCRIPTION_LENGTH) : undefined;

  const possession = validatePossession(raw.possession, entities);
  const matchups = validateMatchups(raw.matchups, entities);

  const file: PlayFile = {
    formatVersion: PLAY_FORMAT_VERSION,
    name: raw.name.slice(0, MAX_PLAY_NAME_LENGTH),
    description,
    field: currentPlayField(),
    entities,
    keyframes,
    interpolation: "linear",
  };
  // Assigned conditionally rather than as `possession: undefined`, so a v1
  // file validates to an object with no v2 keys at all — "absent" and
  // "present but empty" stay distinguishable to the backfill.
  if (possession !== undefined) file.possession = possession;
  if (matchups !== undefined) file.matchups = matchups;
  return file;
}
