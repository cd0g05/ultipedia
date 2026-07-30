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
  // The hover reticle marks the cell the readout is describing. White rather
  // than black: it sits on top of the heatmap, which runs red → amber → green,
  // and a dark mark on a dark red cell reads as a rendering artefact.
  reticle: {
    stroke: "#ffffff",
    strokeWidth: 1.5,
    opacity: 0.9,
  },
  // The marquee: drag a box over empty grass to select the players inside it.
  marquee: {
    stroke: "#EF4B8A", // film-accentPink
    strokeWidth: 1.5,
    strokeDasharray: "4 3",
    fill: "#EF4B8A",
    fillOpacity: 0.08,
  },
};

// Sizes are in SVG user units, i.e. PIXELS_PER_YARD (8) per yard. A real
// player occupies about a yard, but this is a coaching diagram, not a scale
// drawing — pieces are drawn at roughly 1.9 yd across so they read across a
// room. Grab distance is deliberately NOT derived from these (see pick.ts),
// which is what lets the pieces shrink without the board getting fiddlier to
// use: at 9 (2.25 yd) all fourteen read as crowded and made the field itself
// feel small, so this is a third of a yard back off that.
export const PIECE_TOKENS = {
  offense: {
    fill: "#4F941D", // film-accentGreen
    radius: 7.5,
  },
  defense: {
    fill: "#D64B4A",
    radius: 7.5,
  },
  special: {
    // thrower + mark are the same size as everyone else — a bigger dot read as
    // "more important" rather than "different". Their outline and their T / M
    // labels are what identify them.
    radius: 7.5,
    stroke: "#18181b", // zinc-900
    strokeWidth: 1.5,
  },
  disc: {
    fill: "#f4f4f5", // zinc-100
    stroke: "#18181b",
    strokeWidth: 1,
    radius: 3.5,
    offsetPx: { dx: 10, dy: -10 }, // docked this far from the thrower, in screen pixels
  },
  markDirection: {
    stroke: "#18181b",
    strokeWidth: 1.5,
    lengthPx: 20,
  },
  label: {
    fill: "#ffffff",
    // Tracks the piece radius: a 9 px glyph in a 7.5 px circle touches the rim.
    fontSize: 8,
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

// "Light Film Room" — the shell-chrome design system (fieldview-shell ADR-6).
// Scope is deliberately narrow: buttons, borders, and panel backgrounds for
// ui/shell/. Never import this into render/pieceLayer.tsx, render/fieldLayer.tsx,
// or anywhere else that draws a piece or a field marking — those read
// FIELD_TOKENS/PIECE_TOKENS above, whose #EF4B8A accent identifies game
// entities and is intentionally left untouched (ADR-6 resolves what would
// otherwise be a two-accent inconsistency: chrome and canvas are allowed to
// diverge because they mean different things).
//
// Values are kept in sync by hand with the `film` colors in
// tailwind.config.js (base/panel/border/accentPink) — that Tailwind palette
// already existed for the encyclopedia shell (Layout.tsx's `.film-room`
// scope, which wraps /fieldview too) and shell components should reach for
// those utility classes directly rather than inline styles. SHELL_TOKENS
// exists for the rare case something needs the raw value in TS/JS (e.g. a
// non-Tailwind style prop), not as a second source of truth to drift from
// the first.
export const SHELL_TOKENS = {
  accent: "#be185d", // film-accentPink — sole interactive accent for shell chrome
  ground: {
    base: "#ffffff", // film-base — page/canvas background
    panel: "#f4f4f5", // film-panel — sidebar/panel background, zinc-100
  },
  border: "#d4d4d8", // film-border — 1px dividers, zinc-300
};
