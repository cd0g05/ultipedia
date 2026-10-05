// The play document's behaviour (fieldview-build ADR-36). Pure, immutable, no
// React and no DOM.
//
// `resolve` is the ONLY place frame inheritance lives: a player's position in
// frame i is `moved[id]` if that frame placed them, otherwise their resolved
// position in frame i-1; the holder inherits the same way. Every operation
// returns a NEW Play and never touches its input (tests freeze inputs).

import type { Player, Scene, Vec2 } from "../scene/types";
import { clampToField } from "../scene/field";
import { autoAssign } from "../scene/matchups";
import { getPreset } from "../scene/presets";
import {
  MAX_FRAMES,
  MAX_LABEL_LENGTH,
  MAX_PLAY_DESCRIPTION_LENGTH,
  MAX_PLAY_NAME_LENGTH,
  MAX_TITLE_LENGTH,
  PLAY_FORMAT_VERSION,
} from "./format";
import type { Frame, Play, PlayerRef } from "./format";

export interface ResolvedFrame {
  positions: Record<string, Vec2>;
  holder: string;
}

// ── resolution ──────────────────────────────────────────────────────────────

export function resolveAll(play: Play): ResolvedFrame[] {
  const out: ResolvedFrame[] = [];
  let positions: Record<string, Vec2> = {};
  let holder = "";
  play.frames.forEach((frame, i) => {
    const next: Record<string, Vec2> = {};
    for (const p of play.players) {
      const placed = frame.moved[p.id];
      const at = placed ?? (i > 0 ? positions[p.id] : undefined);
      next[p.id] = at ? { x: at.x, y: at.y } : { x: 0, y: 0 };
    }
    positions = next;
    holder = frame.holder ?? holder;
    out.push({ positions: next, holder });
  });
  return out;
}

export function resolve(play: Play, i: number): ResolvedFrame {
  const all = resolveAll(play);
  return all[Math.max(0, Math.min(all.length - 1, i))];
}

// A frame's positions, holder and the derived model as a live Scene. Roles,
// the mark and the matchups are rebuilt from geometry (autoAssign ends with
// normalize, the sole writer of Player.role).
export function sceneOf(play: Play, resolved: ResolvedFrame): Scene {
  const players: Player[] = play.players.map((p) => ({
    id: p.id,
    team: p.team,
    role: p.team === "offense" ? "cutter" : "defender",
    pos: { ...resolved.positions[p.id] },
    label: p.title,
  }));
  const scene: Scene = { players, possession: resolved.holder, matchups: {} };
  autoAssign(scene);
  return scene;
}

export function toScene(play: Play, i: number): Scene {
  return sceneOf(play, resolve(play, i));
}

// What frame i changed, for indicators and badges. Reading a frame's own edits
// is the document's business, so it lives here and nowhere else.
export function placedIds(play: Play, i: number): string[] {
  if (i <= 0 || !inRange(play, i)) return [];
  return Object.keys(play.frames[i].moved);
}

// True when frame i gave the disc to someone (frame 0 always names a holder but
// that is a starting state, not a change).
export function discChangedIn(play: Play, i: number): boolean {
  return i > 0 && inRange(play, i) && play.frames[i].holder !== undefined;
}

// ── helpers ─────────────────────────────────────────────────────────────────

function withFrame(play: Play, i: number, frame: Frame): Play {
  const frames = play.frames.slice();
  frames[i] = frame;
  return { ...play, frames };
}

function inRange(play: Play, i: number): boolean {
  return Number.isInteger(i) && i >= 0 && i < play.frames.length;
}

function isOffense(play: Play, id: string): boolean {
  return play.players.some((p) => p.id === id && p.team === "offense");
}

function knows(play: Play, id: string): boolean {
  return play.players.some((p) => p.id === id);
}

export function cleanTitle(raw: string): string {
  return Array.from(raw.trim().toUpperCase()).slice(0, MAX_TITLE_LENGTH).join("");
}

function cleanLabel(raw: string): string {
  return raw.trim().slice(0, MAX_LABEL_LENGTH);
}

// ── operations ──────────────────────────────────────────────────────────────

// Writes `moved[id]` for each id (even if dropped back on the same spot —
// "placed" is a user action, not a comparison). Positions are clamped to the field.
export function placePlayers(play: Play, i: number, positions: Record<string, Vec2>): Play {
  if (!inRange(play, i)) return play;
  const moved = { ...play.frames[i].moved };
  let any = false;
  for (const [id, pos] of Object.entries(positions)) {
    if (!knows(play, id)) continue;
    moved[id] = clampToField(pos);
    any = true;
  }
  return any ? withFrame(play, i, { ...play.frames[i], moved }) : play;
}

// Offense only; defenders cannot hold the disc.
export function giveDisc(play: Play, i: number, playerId: string): Play {
  if (!inRange(play, i) || !isOffense(play, playerId)) return play;
  return withFrame(play, i, { ...play.frames[i], holder: playerId });
}

export function setTitle(play: Play, playerId: string, title: string): Play {
  const clean = cleanTitle(title);
  if (!knows(play, playerId)) return play;
  const players: PlayerRef[] = play.players.map((p) => {
    if (p.id !== playerId) return p;
    const { title: _old, ...rest } = p;
    return clean ? { ...rest, title: clean } : rest;
  });
  return { ...play, players };
}

export function setFrameLabel(play: Play, i: number, label: string): Play {
  if (!inRange(play, i)) return play;
  const clean = cleanLabel(label);
  const { label: _old, ...rest } = play.frames[i];
  return withFrame(play, i, clean ? { ...rest, label: clean } : rest);
}

export function renamePlay(play: Play, name: string, description?: string): Play {
  const next: Play = { ...play, name: name.trim().slice(0, MAX_PLAY_NAME_LENGTH) || play.name };
  if (description !== undefined) {
    const d = description.trim().slice(0, MAX_PLAY_DESCRIPTION_LENGTH);
    if (d) next.description = d;
    else delete next.description;
  }
  return next;
}

// Inserts an empty frame (identical to the one before it) after `afterIndex`.
export function addFrame(play: Play, afterIndex: number): Play {
  if (play.frames.length >= MAX_FRAMES) return play;
  const at = Math.max(0, Math.min(play.frames.length - 1, afterIndex)) + 1;
  const frames = play.frames.slice();
  frames.splice(at, 0, { moved: {} });
  return { ...play, frames };
}

export function duplicateFrame(play: Play, i: number): Play {
  return addFrame(play, i);
}

// Removes frame i. Later frames now inherit from what precedes it (its changes
// disappear from everything after) — nothing is baked in. The one exception is
// frame 0, which must stay complete: the old frame 1 is resolved into the new
// frame 0 so the play still starts fully placed.
export function deleteFrame(play: Play, i: number): Play {
  if (play.frames.length <= 1 || !inRange(play, i)) return play;
  if (i > 0) {
    const frames = play.frames.slice();
    frames.splice(i, 1);
    return { ...play, frames };
  }
  const resolved = resolveAll(play);
  const second = play.frames[1];
  const first: Frame = { moved: resolved[1].positions, holder: resolved[1].holder };
  if (second.label) first.label = second.label;
  return { ...play, frames: [first, ...play.frames.slice(2)] };
}

// Clears moved + holder. Frame 0 is the base state and cannot be reset.
export function resetFrame(play: Play, i: number): Play {
  if (i <= 0 || !inRange(play, i)) return play;
  const kept = play.frames[i].label;
  return withFrame(play, i, kept ? { moved: {}, label: kept } : { moved: {} });
}

// Removes one player's placement in frame i (they inherit again). Not frame 0.
export function resetPlayer(play: Play, i: number, playerId: string): Play {
  if (i <= 0 || !inRange(play, i) || !(playerId in play.frames[i].moved)) return play;
  const moved = { ...play.frames[i].moved };
  delete moved[playerId];
  return withFrame(play, i, { ...play.frames[i], moved });
}

// ── construction ────────────────────────────────────────────────────────────

// A Scene as a one-frame play (a "setup"). Titles come from Player.label.
export function playFromScene(scene: Scene, name: string): Play {
  const players: PlayerRef[] = scene.players.map((p) => {
    const ref: PlayerRef = { id: p.id, team: p.team };
    const title = p.label ? cleanTitle(p.label) : "";
    if (title) ref.title = title;
    return ref;
  });
  const moved: Record<string, Vec2> = {};
  for (const p of scene.players) moved[p.id] = { x: p.pos.x, y: p.pos.y };
  const holder = scene.possession ?? scene.players.find((p) => p.team === "offense")!.id;
  return {
    formatVersion: PLAY_FORMAT_VERSION,
    name,
    players,
    frames: [{ moved, holder }],
  };
}

// PLACEHOLDER(fieldview-build): the default name and starting formation of a
// new play are stand-ins (docs/fieldview-placeholders.md #20).
export function newPlay(): Play {
  const scene = getPreset("vertStackForceSide");
  for (const p of scene.players) delete p.label;
  return playFromScene(scene, "Untitled play");
}
