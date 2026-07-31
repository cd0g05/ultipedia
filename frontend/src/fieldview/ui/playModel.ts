// The panels' (and FieldCanvas's) read side of the play model: possession,
// matchups, derived roles, and the current force reading.
//
// ADR-2 is the whole design constraint here. `store.subscribe` fires on EVERY
// mutation, which during a drag means once per pointer move — so a panel that
// naively re-rendered on it would put React straight back into the drag path
// that FieldCanvas works so hard to stay out of. Instead this builds a small
// key string from only the facts a panel can actually display, and returns a
// cached snapshot object whose identity changes only when that key changes.
// `useSyncExternalStore` compares snapshots with Object.is, so:
//
//   - dragging a cutter          → key unchanged → 0 React commits
//   - dragging the thrower       → the mark is carried, so the force offset is
//                                  unchanged → key unchanged → 0 commits
//   - dragging the mark off a preset → the reading flips to "custom" ONCE, at
//                                  the tolerance boundary, and then stays
//                                  there → 1 commit for the whole drag
//   - a throw / a reassignment / a force button → 1 commit, on a click
//
// Positions are deliberately NOT in the key. They change 60 times a second and
// no panel shows them; the only position-derived fact any panel displays is
// the force reading, which is in the key in its already-collapsed form.

import { useCallback, useSyncExternalStore } from "react";
import type { SceneStore } from "../scene/store";
import type { Player, Role, Team } from "../scene/types";
import { readForce } from "../scene/force";
import type { ForceReading } from "../scene/force";

// A player as a panel sees one: identity and role, never a live position. A
// copy, not the live object, because the store mutates player objects in
// place — handing a panel the live one would let a "snapshot" change under it.
export interface PlayerIdentity {
  id: string;
  team: Team;
  role: Role;
  label?: string;
}

export interface PlayModelView {
  possession: string | null;
  players: PlayerIdentity[];
  matchups: Record<string, string | null>;
  force: ForceReading;
}

const EMPTY_VIEW: PlayModelView = {
  possession: null,
  players: [],
  matchups: {},
  force: "custom",
};

function identityOf(p: Player): PlayerIdentity {
  return { id: p.id, team: p.team, role: p.role, label: p.label };
}

function forceKey(force: ForceReading): string {
  return force === "custom" ? "custom" : `${force.side}/${force.angle}`;
}

function keyFor(store: SceneStore): string {
  const scene = store.getScene();
  const parts: string[] = [scene.possession ?? "-"];
  for (const p of scene.players) {
    parts.push(`${p.id}:${p.team}:${p.role}:${p.label ?? ""}`);
    // Matchups are read in player order, not Object.keys order, so the key
    // does not change when a map is rebuilt with the same content in a
    // different insertion order (autoAssign does exactly that).
    if (p.team === "defense") parts.push(`>${scene.matchups[p.id] ?? "-"}`);
  }
  parts.push(forceKey(readForce(scene)));
  return parts.join("|");
}

function build(store: SceneStore): PlayModelView {
  const scene = store.getScene();
  const matchups: Record<string, string | null> = {};
  for (const p of scene.players) {
    if (p.team === "defense") matchups[p.id] = scene.matchups[p.id] ?? null;
  }
  return {
    possession: scene.possession,
    players: scene.players.map(identityOf),
    matchups,
    force: readForce(scene),
  };
}

// Per-store, so two pages' stores (whiteboard, designer) never share a cache
// entry, and a dead store's cache is collectable with it.
const cache = new WeakMap<SceneStore, { key: string; view: PlayModelView }>();

function snapshotOf(store: SceneStore): PlayModelView {
  const key = keyFor(store);
  const cached = cache.get(store);
  if (cached && cached.key === key) return cached.view;
  const view = build(store);
  cache.set(store, { key, view });
  return view;
}

// `store` is nullable so a panel rendered outside a SceneStoreProvider (a
// focused unit test, say) degrades to an empty model rather than throwing —
// the panels all have a real "nothing to act on" state anyway.
export function usePlayModel(store: SceneStore | null): PlayModelView {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (!store) return () => {};
      const unsubscribe = store.subscribe(cb);
      return () => {
        unsubscribe();
      };
    },
    [store],
  );
  const getSnapshot = useCallback(() => (store ? snapshotOf(store) : EMPTY_VIEW), [store]);
  return useSyncExternalStore(subscribe, getSnapshot);
}

// Display name for a piece in panel copy: ux.md writes matchups as `#3`.
export function pieceName(player: PlayerIdentity | undefined): string {
  if (!player) return "nobody";
  return player.label ? `#${player.label}` : player.id;
}
