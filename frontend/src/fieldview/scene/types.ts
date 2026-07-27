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
  // The disc is not an entity — it is defined as "with the thrower" and is
  // derived at render time, never stored, so it cannot disagree with itself.
  players: Player[];
}
