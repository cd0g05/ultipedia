// Every colour, radius, stroke width, glyph, and label style for pieces and
// field markings lives here (ADR-10). Components read tokens; they never
// hardcode a visual value. The client's end-of-initiative review (P6)
// produces edits to this file, not a component sweep.

export const FIELD_TOKENS = {
  lineColor: "#a1a1aa", // zinc-400
  lineWidth: 1.5,
  brickRadius: 2.5,
  attackArrowColor: "#EF4B8A", // film-accentPink
  attackLabel: {
    // The arrow alone reads as decoration. Say what it means.
    text: "ATTACKING",
    fill: "#EF4B8A",
    fontSize: 11,
    letterSpacing: 1.5,
    gapPx: 10, // between the end of the label and the tail of the arrow
  },
};

// Sizes are in SVG user units, i.e. PIXELS_PER_YARD (8) per yard. A real
// player occupies about a yard, but this is a coaching diagram, not a scale
// drawing — pieces are drawn at roughly 2.25 yd across so they read across a
// room. Grab distance is deliberately NOT derived from these (see pick.ts).
export const PIECE_TOKENS = {
  offense: {
    fill: "#4F941D", // film-accentGreen
    radius: 9,
  },
  defense: {
    fill: "#D64B4A",
    radius: 9,
  },
  special: {
    // thrower + mark get a heavier stroke and a slightly larger radius so
    // they're identifiable at a glance
    radius: 11,
    stroke: "#18181b", // zinc-900
    strokeWidth: 1.5,
  },
  disc: {
    fill: "#f4f4f5", // zinc-100
    stroke: "#18181b",
    strokeWidth: 1,
    radius: 4,
    offsetPx: { dx: 10, dy: -10 }, // docked this far from the thrower, in screen pixels
  },
  markDirection: {
    stroke: "#18181b",
    strokeWidth: 1.5,
    lengthPx: 20,
  },
  label: {
    fill: "#ffffff",
    fontSize: 9,
  },
  focusRing: {
    stroke: "#EF4B8A",
    strokeWidth: 2,
    // Sits outside the glyph rather than on it, so the piece's own colour
    // stays readable while focused.
    gap: 3,
  },
};

export const NUDGE = {
  yards: 1,
  shiftYards: 5,
};

export const EXPORT_TOKENS = {
  background: "#ffffff",
};
