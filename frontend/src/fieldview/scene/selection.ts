// Pure selection transitions (tech-design.md ADR-1: selection state lives in
// the SceneStore, never React state). These functions only compute the next
// SelectionState from the current one — they never touch the store. Callers
// invoke them from inside store.setSelection(fn(store.getSelection(), ...)),
// mirroring the scene.ts convention of pure ops + store-owned notification.

import type { Player } from "./types";

// "offense"/"defense" cover a thrower or cutter on that team; "mark" is its
// own kind because the mark is carried by the thrower (see scene.ts
// moveThrower) and a later partition's UI treats it distinctly from a plain
// defender. "multi" is marquee-drag selection over several ids at once.
export type SelectionState =
  | { kind: "none" }
  | { kind: "multi"; ids: string[] }
  | { kind: "offense"; id: string }
  | { kind: "defense"; id: string }
  | { kind: "mark"; id: string };

export function clearSelection(): SelectionState {
  return { kind: "none" };
}

function singleKindFor(player: Player): "offense" | "defense" | "mark" {
  if (player.role === "mark") return "mark";
  return player.team;
}

// Selecting a single piece. Clicking the one piece that is already
// singly-selected toggles the selection off, rather than re-selecting it —
// that's the click-to-deselect affordance a later UI partition wires up to
// clicking empty grass without a marquee.
export function selectPlayer(current: SelectionState, player: Player): SelectionState {
  const isSameSinglePiece =
    (current.kind === "offense" || current.kind === "defense" || current.kind === "mark") &&
    current.id === player.id;
  if (isSameSinglePiece) return clearSelection();
  return { kind: singleKindFor(player), id: player.id };
}

// Marquee-drag selection over a set of ids. Always "multi", even for a
// single id: unlike selectPlayer, callers here only have ids (no Player
// objects) to inspect, and a marquee result is a different affordance from a
// direct click regardless of how many pieces it swept up.
export function selectMarquee(ids: string[]): SelectionState {
  if (ids.length === 0) return clearSelection();
  return { kind: "multi", ids };
}
