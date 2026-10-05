// Pure derivation of the selected-player card's rows (fieldview-ui-rework
// FR-4.5). Everything comes from existing scene functions; the only things
// that are new here are the two small definitions flagged below.
//
// PLACEHOLDER(fieldview-ui-rework): row labels and the definitions of "Side of
// field" and "Moved from start" are stand-ins the Builder confirms
// (docs/fieldview-placeholders.md #10).

import type { Player, Scene } from "../../scene/types";
import { FIELD } from "../../scene/field";
import { guardedBy } from "../../scene/matchups";

export interface StatRow {
  label: string;
  value: string;
}

export interface PlayerStats {
  title: string;
  rows: StatRow[];
}

// "Offense 3" — the same stable name the piece announces; a title, when the
// player has one, leads it ("AB · Offense 3").
function nameOf(scene: Scene, p: Player | undefined): string {
  if (!p) return "Nobody";
  const ordinal = scene.players.filter((q) => q.team === p.team).findIndex((q) => q.id === p.id) + 1;
  const base = `${p.team === "offense" ? "Offense" : "Defense"} ${ordinal}`;
  return p.label ? `${p.label} · ${base}` : base;
}

function distance(a: Player, b: Player): number {
  return Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
}

function yd(value: number): string {
  return `${value.toFixed(1)} yd`;
}

// Orientation-agnostic: y = 0 is the near sideline (scene/types.ts), so the
// words are about the field, not about the screen.
const MIDDLE_BAND_YD = 4;

export function sideOfField(y: number): string {
  const mid = FIELD.width / 2;
  if (Math.abs(y - mid) <= MIDDLE_BAND_YD) return "Middle";
  return y < mid ? "Near side" : "Far side";
}

export function playerStats(scene: Scene, id: string, baseline: Scene | null): PlayerStats | null {
  const player = scene.players.find((p) => p.id === id);
  if (!player) return null;

  const others = scene.players.filter((p) => p.team !== player.team);
  let nearest: Player | undefined;
  for (const o of others) {
    if (!nearest || distance(player, o) < distance(player, nearest)) nearest = o;
  }

  const start = baseline?.players.find((p) => p.id === id);
  const moved = start ? Math.hypot(player.pos.x - start.pos.x, player.pos.y - start.pos.y) : 0;

  const byId = (pid: string | null | undefined) =>
    pid ? scene.players.find((p) => p.id === pid) : undefined;

  const isOffense = player.team === "offense";
  const relation: StatRow = isOffense
    ? { label: "Marked by", value: nameOf(scene, byId(guardedBy(scene, id))) }
    : { label: "Marking", value: nameOf(scene, byId(scene.matchups[id])) };

  return {
    title: nameOf(scene, player),
    rows: [
      relation,
      {
        label: isOffense ? "Nearest defender" : "Nearest attacker",
        value: nearest ? yd(distance(player, nearest)) : "—",
      },
      { label: "Side of field", value: sideOfField(player.pos.y) },
      { label: "Moved from start", value: yd(moved) },
    ],
  };
}
