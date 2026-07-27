// The four built-in setups (PRD FR-2.5) as coordinate data — a first pass,
// not a calibration exercise. The client replaces these later; the
// whiteboard partition wraps this data behind PresetFile/PresetRegistry
// (ADR-9) without changing the shape defined here.

import type { Player, Role, Scene, Team } from "./types";

function player(id: string, team: Team, role: Role, x: number, y: number, label?: string): Player {
  return { id, team, role, pos: { x, y }, label };
}

// One thrower + 6 cutters (offense) and one mark + 6 defenders (defense),
// paired by index so each defender roughly shadows the cutter of the same
// index. `midY` is the field's lateral center (40 / 2 = 20).
function buildScene(params: {
  throwerX: number;
  throwerY: number;
  markOffset: { x: number; y: number };
  cutters: Array<{ x: number; y: number }>;
  defenderOffsets: Array<{ x: number; y: number }>;
}): Scene {
  const { throwerX, throwerY, markOffset, cutters, defenderOffsets } = params;
  const players: Player[] = [
    player("o1", "offense", "thrower", throwerX, throwerY, "T"),
    player("d1", "defense", "mark", throwerX + markOffset.x, throwerY + markOffset.y, "M"),
  ];
  cutters.forEach((c, i) => {
    players.push(player(`o${i + 2}`, "offense", "cutter", c.x, c.y, String(i + 1)));
    const off = defenderOffsets[i];
    players.push(
      player(`d${i + 2}`, "defense", "defender", c.x + off.x, c.y + off.y, String(i + 1)),
    );
  });
  return { players };
}

// Vertical stack, force side: cutters lined up single-file downfield of the
// thrower on the center line; the mark angles upfield-lateral so its shadow
// takes away the break-side downfield wedge (the force); defenders are
// matched and shading open/under, with one sag into each mid-depth half
// (bracket look) and the deep-most defender playing true last-back — as a
// real vert defense does. (The sags and last-back are what make the §8.1
// acceptance geometry hold: without them the empty mid-depth wings and the
// deep third outscore the near-thrower open lane.)
const VERT_STACK_FORCE_SIDE = buildScene({
  throwerX: 40,
  throwerY: 20,
  markOffset: { x: 1, y: 3 },
  cutters: [
    { x: 50, y: 20 },
    { x: 52, y: 20 },
    { x: 54, y: 20 },
    { x: 56, y: 20 },
    { x: 58, y: 20 },
    { x: 60, y: 20 },
  ],
  defenderOffsets: [
    { x: 10, y: -6 }, // sagging off the front of the stack onto the open shoulder
    { x: -1, y: 0 }, // matched tight, playing the under
    { x: 0, y: 10 }, // sagging into the break-side mid space
    { x: -1, y: 0 }, // matched tight, playing the under
    { x: 4, y: 3 }, // bracket behind the stack, break side
    { x: 10, y: 0 }, // last back — deep centre, hang time gives him both corners
  ],
});

// Horizontal stack: cutters spread across the width at a shared depth.
const HORIZONTAL_STACK = buildScene({
  throwerX: 40,
  throwerY: 20,
  markOffset: { x: -1, y: 0 },
  cutters: [
    { x: 55, y: 4 },
    { x: 55, y: 10 },
    { x: 55, y: 16 },
    { x: 55, y: 24 },
    { x: 55, y: 30 },
    { x: 55, y: 36 },
  ],
  defenderOffsets: [
    { x: -2, y: 1 },
    { x: -2, y: 1 },
    { x: -2, y: 1 },
    { x: -2, y: -1 },
    { x: -2, y: -1 },
    { x: -2, y: -1 },
  ],
});

// Flat mark: no lateral force bias — the mark squares up directly between
// thrower and goal.
const FLAT_MARK = buildScene({
  throwerX: 40,
  throwerY: 20,
  markOffset: { x: -1, y: 0 },
  cutters: [
    { x: 50, y: 20 },
    { x: 54, y: 20 },
    { x: 58, y: 20 },
    { x: 62, y: 20 },
    { x: 66, y: 20 },
    { x: 70, y: 20 },
  ],
  defenderOffsets: [
    { x: -2, y: 2 },
    { x: -2, y: -2 },
    { x: -2, y: 2 },
    { x: -2, y: -2 },
    { x: -2, y: 2 },
    { x: -2, y: -2 },
  ],
});

// Deep help: five cutters underneath, one deep; defense sags a help
// defender toward the deep space rather than tightly man-marking it.
const DEEP_HELP = buildScene({
  throwerX: 40,
  throwerY: 20,
  markOffset: { x: -1, y: 2 },
  cutters: [
    { x: 50, y: 10 },
    { x: 50, y: 30 },
    { x: 56, y: 14 },
    { x: 56, y: 26 },
    { x: 62, y: 20 },
    { x: 82, y: 20 },
  ],
  defenderOffsets: [
    { x: -2, y: 1 },
    { x: -2, y: -1 },
    { x: -2, y: 1 },
    { x: -2, y: -1 },
    { x: -2, y: 0 },
    { x: -6, y: 0 },
  ],
});

export const PRESET_NAMES = [
  "vertStackForceSide",
  "horizontalStack",
  "flatMark",
  "deepHelp",
] as const;

export type PresetName = (typeof PRESET_NAMES)[number];

const PRESETS: Record<PresetName, Scene> = {
  vertStackForceSide: VERT_STACK_FORCE_SIDE,
  horizontalStack: HORIZONTAL_STACK,
  flatMark: FLAT_MARK,
  deepHelp: DEEP_HELP,
};

export const PRESET_LABELS: Record<PresetName, string> = {
  vertStackForceSide: "Vert Stack, Force Side",
  horizontalStack: "Horizontal Stack",
  flatMark: "Flat Mark",
  deepHelp: "Deep Help",
};

export function getPreset(name: PresetName): Scene {
  const preset = PRESETS[name];
  return { players: preset.players.map((p) => ({ ...p, pos: { ...p.pos } })) };
}

export function listPresetNames(): PresetName[] {
  return [...PRESET_NAMES];
}
