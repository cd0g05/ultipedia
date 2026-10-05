// The four built-in setups (PRD FR-2.5) as coordinate data — a first pass,
// not a calibration exercise. The client replaces these later; the
// whiteboard partition wraps this data behind PresetFile/PresetRegistry
// (ADR-9) without changing the shape defined here.

import type { Player, Role, Scene, Team } from "./types";
import { normalize } from "./possession";

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
  // Matchups mirror the index pairing the positions already encode: d1 marks
  // the thrower, d(n) guards o(n). Stating them as data rather than letting
  // autoAssign() guess keeps the built-ins stable even when a preset's
  // geometry puts a sagging help defender closer to somebody else's cutter.
  const matchups: Record<string, string | null> = { d1: "o1" };
  cutters.forEach((c, i) => {
    players.push(player(`o${i + 2}`, "offense", "cutter", c.x, c.y, String(i + 1)));
    const off = defenderOffsets[i];
    players.push(
      player(`d${i + 2}`, "defense", "defender", c.x + off.x, c.y + off.y, String(i + 1)),
    );
    matchups[`d${i + 2}`] = `o${i + 2}`;
  });
  // o1 holds the disc in every built-in. The matchups stay explicit data (the
  // index pairing above) rather than autoAssign()'d: on the vert preset a
  // sagging help defender sits closer to somebody else's cutter, so
  // auto-assignment would quietly re-pair the built-in. normalize() then
  // derives the roles — the mark is whoever is within 10 ft of o1.
  const scene: Scene = { players, possession: "o1", matchups };
  normalize(scene);
  return scene;
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

// Vertical stack at a spacing the DISC-SIZED pieces can show: the six cutters
// four yards apart on the centre line (the older VERT_STACK_FORCE_SIDE packs
// them two yards apart, which suited the old small dots and is pinned by the
// space model's §8 acceptance geometry, so it stays as it is). Defenders stand
// alternately either side of the line so no two pieces overlap.
// PLACEHOLDER(fieldview-ui-rework): toy coordinates (docs/fieldview-placeholders.md #1).
const VERT_STACK = buildScene({
  throwerX: 38,
  throwerY: 20,
  markOffset: { x: -1, y: 3 },
  cutters: [
    { x: 48, y: 20 },
    { x: 52, y: 20 },
    { x: 56, y: 20 },
    { x: 60, y: 20 },
    { x: 64, y: 20 },
    { x: 68, y: 20 },
  ],
  defenderOffsets: [
    { x: 1, y: 3 },
    { x: 1, y: -3 },
    { x: 1, y: 3 },
    { x: 1, y: -3 },
    { x: 1, y: 3 },
    { x: 1, y: -3 },
  ],
});

// Ho stack: two handlers split wide behind the disc, the other four in a
// short vertical stack up the middle — one clean lane up the middle.
// PLACEHOLDER(fieldview-ui-rework): toy coordinates (docs/fieldview-placeholders.md #1).
const HO_STACK = buildScene({
  throwerX: 45,
  throwerY: 20,
  markOffset: { x: -1, y: 0 },
  cutters: [
    { x: 40, y: 8 },
    { x: 40, y: 32 },
    { x: 54, y: 20 },
    { x: 58, y: 20 },
    { x: 62, y: 20 },
    { x: 66, y: 20 },
  ],
  defenderOffsets: [
    { x: -1.5, y: 1 },
    { x: -1.5, y: -1 },
    { x: 2, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 0 },
  ],
});

// Side stack: the whole offense lined up along one sideline, so the entire far
// side is open to attack.
// PLACEHOLDER(fieldview-ui-rework): toy coordinates (#1).
const SIDE_STACK = buildScene({
  throwerX: 40,
  throwerY: 12,
  markOffset: { x: -1, y: -1 },
  cutters: [
    { x: 50, y: 6 },
    { x: 54, y: 6 },
    { x: 58, y: 6 },
    { x: 62, y: 6 },
    { x: 66, y: 6 },
    { x: 70, y: 6 },
  ],
  defenderOffsets: [
    { x: 1.5, y: 2 },
    { x: 1.5, y: 2 },
    { x: 1.5, y: 2 },
    { x: 1.5, y: 2 },
    { x: 1.5, y: 2 },
    { x: 1.5, y: 2 },
  ],
});

// Clumped: everyone bunched near the disc — a picture of how little space a
// crowded team leaves.
// PLACEHOLDER(fieldview-ui-rework): toy coordinates (#1).
const CLUMPED = buildScene({
  throwerX: 40,
  throwerY: 20,
  markOffset: { x: -1, y: 0 },
  cutters: [
    { x: 48, y: 18 },
    { x: 50, y: 22 },
    { x: 52, y: 18 },
    { x: 54, y: 22 },
    { x: 50, y: 20 },
    { x: 52, y: 20 },
  ],
  defenderOffsets: [
    { x: -1.5, y: 0 },
    { x: -1.5, y: 0 },
    { x: -1.5, y: 0 },
    { x: -1.5, y: 0 },
    { x: -1.5, y: 0 },
    { x: -1.5, y: 0 },
  ],
});

export const PRESET_NAMES = [
  "vertStackForceSide",
  "vertStack",
  "horizontalStack",
  "flatMark",
  "deepHelp",
  "hoStack",
  "sideStack",
  "clumped",
] as const;

export type PresetName = (typeof PRESET_NAMES)[number];

const PRESETS: Record<PresetName, Scene> = {
  vertStackForceSide: VERT_STACK_FORCE_SIDE,
  vertStack: VERT_STACK,
  horizontalStack: HORIZONTAL_STACK,
  flatMark: FLAT_MARK,
  deepHelp: DEEP_HELP,
  hoStack: HO_STACK,
  sideStack: SIDE_STACK,
  clumped: CLUMPED,
};

export const PRESET_LABELS: Record<PresetName, string> = {
  vertStackForceSide: "Vert Stack, Force Side",
  vertStack: "Vert Stack",
  horizontalStack: "Horizontal Stack",
  flatMark: "Flat Mark",
  deepHelp: "Deep Help",
  hoStack: "Ho Stack",
  sideStack: "Side Stack",
  clumped: "Clumped",
};

export function getPreset(name: PresetName): Scene {
  const preset = PRESETS[name];
  return {
    players: preset.players.map((p) => ({ ...p, pos: { ...p.pos } })),
    possession: preset.possession,
    matchups: { ...preset.matchups },
  };
}

export function listPresetNames(): PresetName[] {
  return [...PRESET_NAMES];
}

// The setups Explore offers, in the order it shows them, each with the one-line
// takeaway a new player reads. UI names and takeaways are separate from
// PRESET_LABELS (the registry's names) on purpose: this is the coach's
// vocabulary and the learner's sentence.
//
// PLACEHOLDER(fieldview-ui-rework): which setups, their order, their names and
// every takeaway are toy content the Builder replaces
// (docs/fieldview-placeholders.md #1, #2).
export interface CuratedSetup {
  name: PresetName;
  label: string;
  takeaway: string;
}

export const CURATED_SETUPS: CuratedSetup[] = [
  { name: "vertStack", label: "Vertical stack", takeaway: "Cutters have the deep and under lanes to themselves." },
  { name: "horizontalStack", label: "Horizontal stack", takeaway: "Wide and flat: the middle opens up." },
  { name: "hoStack", label: "Ho stack", takeaway: "Handlers split wide; one clean lane up the middle." },
  { name: "sideStack", label: "Side stack", takeaway: "Everyone on one side — the open side is free to attack." },
  { name: "clumped", label: "Clumped", takeaway: "See how little space a bunched team leaves." },
  { name: "deepHelp", label: "Deep help", takeaway: "One cutter deep, the rest underneath — watch the help defender sag." },
];
