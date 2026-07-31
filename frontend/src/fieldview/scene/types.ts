// The shared scene model (tech-design.md "Scene (the shared core)"). Every
// other Field View partition — whiteboard, space model, play designer,
// heatmap — builds on this shape without extension in this initiative.

export type Team = "offense" | "defense";
export type Role = "thrower" | "cutter" | "mark" | "defender";

// Yards; origin at the back of the defending endzone, +x = attacking.
export interface Vec2 {
  x: number;
  y: number;
}

export interface Player {
  id: string; // stable across keyframes — tweening pairs by id, never array index
  team: Team;
  role: Role;
  pos: Vec2;
  label?: string;
}

export interface Scene {
  // Exactly 14: 1 thrower + 6 cutters (offense), 1 mark + 6 defenders (defense).
  players: Player[];

  // Who holds the disc; null = loose (no thrower and no mark).
  //
  // The disc used to be derived from `role === "thrower"` precisely so it
  // "could not disagree with itself". That guarantee is RELOCATED here, not
  // retired (tech-design ADR-1): possession is now the one stored fact, and
  // `role: "thrower"` / `role: "mark"` are OUTPUTS recomputed by
  // possession.ts normalize(), which every mutation ends with. Setting a
  // role directly anywhere else re-creates exactly the bug the original rule
  // prevented — modelGuard.test.ts is what proves nobody has.
  possession: string | null;

  // defenderId -> offensiveId, or null for explicit free roam. Kept on Scene
  // as a map rather than a field on Player (ADR-2) because the invariant that
  // matters is a property of the whole set: it stays a permutation, no two
  // defenders sharing a target. matchups.ts is the only writer.
  matchups: Record<string, string | null>;
}
