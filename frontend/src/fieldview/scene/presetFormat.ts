// A preset is structurally a one-keyframe play (ADR-9): identity (entities)
// and position (positions) are stated once, sharing the play format's entity
// representation so a saved formation and an exported play are the same
// contract. `builtin` is assigned by the registry — never trusted from an
// imported file or a localStorage entry.

import type { Player, Role, Scene, Team, Vec2 } from "./types";
import { FIELD, clampToField } from "./field";

export const PRESET_FORMAT_VERSION = 1;

export interface PlayEntity {
  id: string;
  team: Team;
  role: Role;
  label?: string;
}

export interface PresetFile {
  formatVersion: number;
  id: string;
  name: string;
  builtin?: boolean;
  field: { length: number; width: number; endzone: number };
  entities: PlayEntity[];
  positions: Record<string, Vec2>;
}

export function sceneToPreset(scene: Scene, id: string, name: string): PresetFile {
  const entities: PlayEntity[] = scene.players.map((p) => ({
    id: p.id,
    team: p.team,
    role: p.role,
    label: p.label,
  }));
  const positions: Record<string, Vec2> = {};
  for (const p of scene.players) positions[p.id] = { ...p.pos };

  return {
    formatVersion: PRESET_FORMAT_VERSION,
    id,
    name,
    field: { length: FIELD.length, width: FIELD.width, endzone: FIELD.endzone },
    entities,
    positions,
  };
}

export function presetToScene(preset: PresetFile): Scene {
  const players: Player[] = preset.entities.map((e) => ({
    id: e.id,
    team: e.team,
    role: e.role,
    label: e.label,
    pos: preset.positions[e.id] ?? { x: 0, y: 0 },
  }));
  return { players };
}

const VALID_TEAMS: Team[] = ["offense", "defense"];
const VALID_ROLES: Role[] = ["thrower", "cutter", "mark", "defender"];
const MAX_NAME_LENGTH = 60;
const MAX_LABEL_LENGTH = 10;

export class PresetValidationError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validateEntity(raw: unknown): PlayEntity {
  if (!isRecord(raw)) throw new PresetValidationError("Malformed entity.");
  if (typeof raw.id !== "string" || raw.id.length === 0) {
    throw new PresetValidationError("Entity is missing an id.");
  }
  if (!VALID_TEAMS.includes(raw.team as Team)) {
    throw new PresetValidationError(`Entity ${raw.id} has an invalid team.`);
  }
  if (!VALID_ROLES.includes(raw.role as Role)) {
    throw new PresetValidationError(`Entity ${raw.id} has an invalid role.`);
  }
  const label = typeof raw.label === "string" ? raw.label.slice(0, MAX_LABEL_LENGTH) : undefined;
  return { id: raw.id, team: raw.team as Team, role: raw.role as Role, label };
}

function validatePosition(raw: unknown, entityId: string): Vec2 {
  if (!isRecord(raw) || typeof raw.x !== "number" || typeof raw.y !== "number") {
    throw new PresetValidationError(`Missing or invalid position for entity ${entityId}.`);
  }
  return clampToField({ x: raw.x, y: raw.y });
}

// Boundary validation for untrusted input — an imported file or a
// localStorage entry. Strips `builtin` unconditionally; throws
// PresetValidationError with a legible message on any shape violation.
export function validatePresetFile(raw: unknown): PresetFile {
  if (!isRecord(raw)) {
    throw new PresetValidationError("Not a valid preset file.");
  }
  if (typeof raw.formatVersion !== "number" || raw.formatVersion > PRESET_FORMAT_VERSION) {
    throw new PresetValidationError("This preset was made by a newer version of Field View.");
  }
  if (typeof raw.id !== "string" || raw.id.length === 0) {
    throw new PresetValidationError("Preset is missing an id.");
  }
  if (typeof raw.name !== "string" || raw.name.length === 0) {
    throw new PresetValidationError("Preset is missing a name.");
  }
  if (!isRecord(raw.field) || raw.field.length !== FIELD.length || raw.field.width !== FIELD.width) {
    throw new PresetValidationError("Preset field dimensions do not match.");
  }
  if (!Array.isArray(raw.entities) || raw.entities.length === 0) {
    throw new PresetValidationError("Preset has no entities.");
  }
  const entities = raw.entities.map(validateEntity);

  if (!isRecord(raw.positions)) {
    throw new PresetValidationError("Preset has no positions.");
  }
  const positions: Record<string, Vec2> = {};
  for (const entity of entities) {
    positions[entity.id] = validatePosition(raw.positions[entity.id], entity.id);
  }

  return {
    formatVersion: PRESET_FORMAT_VERSION,
    id: raw.id,
    name: raw.name.slice(0, MAX_NAME_LENGTH),
    field: { length: FIELD.length, width: FIELD.width, endzone: FIELD.endzone },
    entities,
    positions,
  };
}
