// Boundary validation for untrusted play JSON (ADR-7, fieldview-build ADR-37).
// Link payloads, imported files and the built-ins all pass through here before
// they can become a Play. v3 ONLY — any other version is refused (clean break).
//
// Unknown keys are DROPPED, never rejected, and known keys are copied onto
// fresh objects, so nothing from the input's prototype or extra properties
// survives. Ranges are clamped; structure is enforced: exactly 14 players with
// unique ids, 1..MAX_FRAMES frames, frame 0 places everyone and names an
// offensive holder, `moved` keys and later holders refer to real players.

import type { Team, Vec2 } from "../scene/types";
import { clampToField } from "../scene/field";
import {
  MAX_FRAMES,
  MAX_LABEL_LENGTH,
  MAX_PLAY_DESCRIPTION_LENGTH,
  MAX_PLAY_NAME_LENGTH,
  MAX_TITLE_LENGTH,
  PLAYER_COUNT,
  PLAY_FORMAT_VERSION,
} from "./format";
import type { Frame, Play, PlayerRef } from "./format";

export class PlayValidationError extends Error {}

const VALID_TEAMS: Team[] = ["offense", "defense"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function cleanTitle(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = Array.from(raw.trim().toUpperCase()).slice(0, MAX_TITLE_LENGTH).join("");
  return t || undefined;
}

function validatePlayer(raw: unknown): PlayerRef {
  if (!isRecord(raw)) throw new PlayValidationError("This play has a malformed player.");
  if (typeof raw.id !== "string" || raw.id.length === 0) {
    throw new PlayValidationError("A player in this play is missing an id.");
  }
  if (!VALID_TEAMS.includes(raw.team as Team)) {
    throw new PlayValidationError(`Player ${raw.id} has an invalid team.`);
  }
  const ref: PlayerRef = { id: raw.id, team: raw.team as Team };
  const title = cleanTitle(raw.title);
  if (title) ref.title = title;
  return ref;
}

function validatePoint(raw: unknown, who: string): Vec2 {
  if (!isRecord(raw) || !isFiniteNumber(raw.x) || !isFiniteNumber(raw.y)) {
    throw new PlayValidationError(`${who} has a malformed position.`);
  }
  return clampToField({ x: raw.x, y: raw.y });
}

function validateFrame(raw: unknown, index: number, ids: Set<string>, offense: Set<string>): Frame {
  if (!isRecord(raw)) throw new PlayValidationError(`Frame ${index + 1} is malformed.`);
  if (!isRecord(raw.moved)) throw new PlayValidationError(`Frame ${index + 1} has no positions.`);
  const moved: Record<string, Vec2> = {};
  for (const [id, pos] of Object.entries(raw.moved)) {
    if (!ids.has(id)) throw new PlayValidationError(`Frame ${index + 1} places an unknown player.`);
    moved[id] = validatePoint(pos, `Frame ${index + 1}`);
  }
  const frame: Frame = { moved };
  if (typeof raw.label === "string") {
    const label = raw.label.trim().slice(0, MAX_LABEL_LENGTH);
    if (label) frame.label = label;
  }
  if (raw.holder !== undefined) {
    if (typeof raw.holder !== "string" || !offense.has(raw.holder)) {
      throw new PlayValidationError(`Frame ${index + 1} gives the disc to someone who is not on offense.`);
    }
    frame.holder = raw.holder;
  }
  return frame;
}

export function validatePlay(raw: unknown): Play {
  if (!isRecord(raw)) throw new PlayValidationError("This is not a play file.");
  if (raw.formatVersion !== PLAY_FORMAT_VERSION) {
    throw new PlayValidationError("This play was made with a different version and can't be opened.");
  }
  if (typeof raw.name !== "string" || raw.name.trim().length === 0) {
    throw new PlayValidationError("This play has no name.");
  }
  if (!Array.isArray(raw.players) || raw.players.length !== PLAYER_COUNT) {
    throw new PlayValidationError(`A play needs exactly ${PLAYER_COUNT} players.`);
  }
  const players = raw.players.map(validatePlayer);
  const ids = new Set(players.map((p) => p.id));
  if (ids.size !== players.length) throw new PlayValidationError("Two players share an id.");
  const offense = new Set(players.filter((p) => p.team === "offense").map((p) => p.id));
  if (offense.size === 0) throw new PlayValidationError("A play needs offensive players.");

  if (!Array.isArray(raw.frames) || raw.frames.length < 1) {
    throw new PlayValidationError("This play has no frames.");
  }
  if (raw.frames.length > MAX_FRAMES) {
    throw new PlayValidationError(`A play can have at most ${MAX_FRAMES} frames.`);
  }
  const frames = raw.frames.map((f, i) => validateFrame(f, i, ids, offense));

  const first = frames[0];
  if (!players.every((p) => p.id in first.moved)) {
    throw new PlayValidationError("The first frame must place all 14 players.");
  }
  if (first.holder === undefined) {
    throw new PlayValidationError("The first frame must say who has the disc.");
  }

  const play: Play = {
    formatVersion: PLAY_FORMAT_VERSION,
    name: raw.name.trim().slice(0, MAX_PLAY_NAME_LENGTH),
    players,
    frames,
  };
  if (typeof raw.description === "string") {
    const d = raw.description.trim().slice(0, MAX_PLAY_DESCRIPTION_LENGTH);
    if (d) play.description = d;
  }
  return play;
}
