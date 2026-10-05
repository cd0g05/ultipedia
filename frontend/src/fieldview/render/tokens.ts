// Every colour, radius, stroke width, glyph, and label style for pieces and
// field markings lives here (ADR-10). Components read tokens; they never
// hardcode a visual value. The client's end-of-initiative review (P6)
// produces edits to this file, not a component sweep.

export const FIELD_TOKENS = {
  lineColor: "#a1a1aa", // zinc-400
  lineWidth: 1.5,
  brickRadius: 2.5,
  attackLabel: {
    // Said in words, inside the field at the bottom near midfield (the stage
    // has no spare margin for an arrow). Colour is the style guide's pink.
    text: "ATTACKING →",
    fill: "#be185d", // film-accentPink
    fontSize: 11,
    letterSpacing: 1.5,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    insetPx: 6, // baseline distance from the bottom sideline
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
    stroke: "#be185d", // film-accentPink
    strokeWidth: 1.5,
    strokeDasharray: "4 3",
    fill: "#be185d",
    fillOpacity: 0.08,
  },
};

// Sizes are in SVG user units, i.e. PIXELS_PER_YARD (8) per yard. This is a
// coaching diagram, not a scale drawing: pieces are drawn ~2.9 yd across so
// they read across a huddle. The stage is scaled to fit, so on a phone it
// shrinks (~0.93x at 844 px wide) — radius 11.5 draws a ~21 px piece there,
// which is what the approved mockups assume.
// PLACEHOLDER(fieldview-ui-rework): radius is a first guess; tune on a real
// phone in the P5 real-device pass (docs/fieldview-placeholders.md #12).
//
// Grab distance is deliberately NOT derived from these (see pick.ts), which
// is what lets the pieces change size without the board getting fiddlier to
// use.
//
// Team identity never rests on hue alone (heatmap runs red → green): offense
// is a FILLED dark disc, defense a WHITE disc with a dark ring.
export const PIECE_TOKENS = {
  offense: {
    fill: "#18181b", // zinc-900
    stroke: "#ffffff",
    strokeWidth: 1.5,
    labelFill: "#ffffff",
    radius: 11.5,
  },
  defense: {
    fill: "#ffffff",
    stroke: "#18181b",
    strokeWidth: 2.5,
    labelFill: "#18181b",
    radius: 11.5,
  },
  special: {
    // The MARK is the same size as everyone else — a bigger dot read as "more
    // important" rather than "different". Its heavier ring is what shows on
    // the white disc (the mark is geometric: the closest defender within 10 ft
    // of the holder — fieldview-build ADR-38).
    radius: 11.5,
    stroke: "#18181b", // zinc-900
    strokeWidth: 4,
  },
  // Build: a small corner mark on a piece that was placed in the current frame
  // (the others inherit their spot). Pink = "an edit", like selection.
  placed: {
    fill: "#be185d",
    size: 7,
  },
  // The disc holder: a ring outside the piece, plus the disc beside it.
  // PLACEHOLDER(fieldview-build): the colour is a first pass the Builder
  // confirms (docs/fieldview-placeholders.md #21). Selection stays pink.
  holder: {
    stroke: "#047857", // emerald-700
    strokeWidth: 3,
    gap: 4,
  },
  disc: {
    fill: "#ffffff",
    stroke: "#18181b",
    strokeWidth: 1.5,
    radius: 5,
    offsetPx: { dx: 14, dy: -14 }, // docked this far from the thrower, in screen pixels
  },
  markDirection: {
    stroke: "#18181b",
    strokeWidth: 2,
    lengthPx: 26,
  },
  label: {
    // Tracks the piece radius: an 11 px glyph in a 11.5 px circle touches the rim.
    fontSize: 12,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  },
  focusRing: {
    stroke: "#be185d",
    strokeWidth: 2.5,
    // Sits outside the glyph rather than on it, so the piece's own colour
    // stays readable while focused.
    gap: 3,
  },
  // Throwing mode (fieldview-play-model): eligible receivers are emphasised
  // and everything else recedes, so an armed tool is never invisible.
  //
  // The canvas accent is now the style guide's #be185d, the same as shell
  // chrome — canon ADR-16's two-accent split is superseded by the UI rework
  // (the "client review" it waited for decided on one system). The
  // de-emphasis is opacity rather than a second grey, so it composes over
  // whatever the heatmap is painting underneath.
  throwTarget: {
    stroke: "#be185d",
    strokeWidth: 2.5,
    strokeDasharray: "3 2",
    // Outside the focus ring, so a focused receiver shows both rather than
    // one covering the other.
    gap: 7,
    dimOpacity: 0.35,
  },
};

// Watch's movement trails: where each piece went to reach the current frame.
// Ink dashes with an arrowhead, so they never read as a route marker (pink,
// ROUTE_TOKENS) or as a piece.
export const TRAIL_TOKENS = {
  stroke: "#18181b", // zinc-900
  strokeWidth: 2.5,
  dash: "7 5",
  opacity: 0.7,
  // A piece that moved less than this (yards) draws no trail — noise, not a move.
  minYards: 0.5,
};

// Touch dragging (fieldview-ui-rework ADR-35): the piece is held ABOVE the
// finger so a thumb never hides it, and a dashed ghost marks where it came
// from. All in SVG user units.
// PLACEHOLDER(fieldview-ui-rework): lift distance is a first guess, tuned in the
// real-device pass (docs/fieldview-placeholders.md #13).
export const TOUCH_TOKENS = {
  liftPx: 30,
  ghost: {
    stroke: "#18181b", // zinc-900
    strokeWidth: 1.5,
    dash: "4 3",
    opacity: 0.7,
  },
  connector: {
    stroke: "#18181b",
    strokeWidth: 1.2,
    dash: "3 3",
    opacity: 0.5,
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
// FIELD_TOKENS/PIECE_TOKENS above. (Both now use the same #be185d accent —
// fieldview-ui-rework superseded canon ADR-16's two-accent split — but the
// token groups stay separate so shell chrome and canvas can still diverge.)
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

// Route markers and the running indicator (fieldview-motion). These use the
// CANVAS palette, not SHELL_TOKENS: a waypoint is a game entity a coach reads
// alongside the pieces, not chrome around them (canon ADR-16). Square rather
// than round, both to match the design system's hard-corner rule and so a
// marker is never mistaken for a piece at a glance.
export const ROUTE_TOKENS = {
  marker: {
    size: 1.6, // yards, per side
    fill: "#ffffff",
    stroke: "#be185d",
    strokeWidth: 0.28,
  },
  // The number inside the marker: which leg this is, counting from 1.
  markerLabel: {
    fill: "#be185d",
    fontSize: 1.15,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  },
  // Legs are dashed so a planned path never reads as a drawn annotation —
  // Initiative D's arrows will be solid, and the two must stay tellable apart.
  leg: {
    stroke: "#be185d",
    strokeWidth: 0.22,
    dash: "1.2 0.8",
    opacity: 0.75,
  },
  // Shown on the canvas itself while a run is in progress, because on mobile
  // the bottom sheet may be collapsed over the panel that would otherwise say
  // so — and the field is read-only in that state (ux.md UI States).
  runningIndicator: {
    fill: "#be185d",
    textFill: "#ffffff",
    fontSize: 1.6,
  },
} as const;
