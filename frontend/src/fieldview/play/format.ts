// The play document (fieldview-build ADR-36/37). A play is a list of frames;
// a frame is a still state of the field that INHERITS from the frame before it.
// Identity (who the 14 players are, their titles) is stated once at play level;
// each frame states only the players it explicitly placed and, optionally, who
// holds the disc. Resolving a frame into a full set of positions is the one job
// of play/model.ts — nothing else walks frames.
//
// v3 is a clean break: the validator accepts this version only (no v1/v2
// readers, no backfill).

import type { Team, Vec2 } from "../scene/types";

export const PLAY_FORMAT_VERSION = 3;
export const MAX_FRAMES = 30;
export const MAX_TITLE_LENGTH = 2;
export const MAX_LABEL_LENGTH = 24;
export const MAX_PLAY_NAME_LENGTH = 80;
export const MAX_PLAY_DESCRIPTION_LENGTH = 500;
export const PLAYER_COUNT = 14;

export interface PlayerRef {
  id: string; // stable across frames; identity is never the title
  team: Team;
  title?: string; // ≤ MAX_TITLE_LENGTH, uppercase, drawn inside the piece
}

export interface Frame {
  label?: string;
  // ONLY the players placed in this frame. Anyone absent inherits.
  moved: Record<string, Vec2>;
  // Set when "Give disc" was used in this frame; absent = inherit.
  holder?: string;
}

export interface Play {
  formatVersion: typeof PLAY_FORMAT_VERSION;
  name: string;
  description?: string;
  players: PlayerRef[]; // exactly PLAYER_COUNT
  frames: Frame[]; // 1..MAX_FRAMES; frame 0 places everyone and names a holder
}
