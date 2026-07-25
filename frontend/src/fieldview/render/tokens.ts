// Every colour, radius, stroke width, glyph, and label style for pieces and
// field markings lives here (ADR-10). Components read tokens; they never
// hardcode a visual value. The client's end-of-initiative review (P6)
// produces edits to this file, not a component sweep.

export const FIELD_TOKENS = {
  lineColor: "#a1a1aa", // zinc-400
  lineWidth: 1.5,
  brickRadius: 2.5,
  attackArrowColor: "#EF4B8A", // film-accentPink
};

export const PIECE_TOKENS = {
  offense: {
    fill: "#4F941D", // film-accentGreen
    radius: 5,
  },
  defense: {
    fill: "#D64B4A",
    radius: 5,
  },
  special: {
    // thrower + mark get a heavier stroke and a slightly larger radius so
    // they're identifiable at a glance
    radius: 6,
    stroke: "#18181b", // zinc-900
    strokeWidth: 1.5,
  },
  disc: {
    fill: "#f4f4f5", // zinc-100
    stroke: "#18181b",
    strokeWidth: 1,
    radius: 2.5,
    offsetPx: { dx: 6, dy: -6 }, // docked this far from the thrower, in screen pixels
  },
  markDirection: {
    stroke: "#18181b",
    strokeWidth: 1.5,
    lengthPx: 14,
  },
  label: {
    fill: "#ffffff",
    fontSize: 5,
  },
  hitArea: {
    // Invisible pointer target; kept well above the visual radius so every
    // piece clears the 44x44px minimum hit target regardless of its glyph size.
    radiusPx: 22,
  },
  focusRing: {
    stroke: "#EF4B8A",
    strokeWidth: 2,
  },
};

export const NUDGE = {
  yards: 1,
  shiftYards: 5,
};

export const EXPORT_TOKENS = {
  background: "#ffffff",
};
