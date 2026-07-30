---
summary: "Field View is a client-only feature module (frontend/src/fieldview) in the existing Vite/React SPA. A framework-free scene model + headless space-model library (pure functions, no React/canvas) sit under a tiny subscribe-store; the field renders as a stacked canvas heatmap (offscreen 220x80 grid upscaled with image smoothing) beneath an SVG piece layer for drag ergonomics. Drag and slider updates bypass React re-render via a rAF-coalesced imperative repaint loop reading the mutable scene. No backend, no new runtime dependencies; play JSON is a versioned, schema-validated site-wide contract."
phase: "tech"
when_to_load:
  - "When implementing or reviewing the scene model, space model, render pipeline, play format, or module boundaries."
  - "When checking whether a change conforms to the agreed architecture or violates a model invariant."
depends_on:
  - "prd.md"
  - "ux.md"
modules:
  - "frontend/src/fieldview"
  - "frontend/src/router.tsx"
index:
  overview: "## Overview & Context"
  stack: "## Tech Stack & Dependencies"
  structure: "## Project / Module Structure"
  adrs: "## Architecture Decisions (ADRs)"
  space_model: "## The Space Model (verbatim from brief §4)"
  data_models: "## Data Models"
  interfaces: "## API & Interface Design"
  conventions: "## Implementation Patterns & Conventions"
  security_performance: "## Security & Performance"
  implementation_sequence: "## Implementation Sequence"
next_section: "Overview & Context"
---

# Tech Design: Field View

## Progress

- [x] Overview & Context
- [x] Tech Stack & Dependencies
- [x] Project / Module Structure
- [x] Architecture Decisions (ADRs)
- [x] The Space Model (verbatim)
- [x] Data Models
- [x] API & Interface Design
- [x] Implementation Patterns & Conventions
- [x] Security & Performance
- [x] Implementation Sequence

---

## Overview & Context

**Summary:** Field View is a **client-only feature module** added to the existing Vite/React
SPA at `frontend/src/fieldview/`. It is architected as four concentric layers, each depending
only inward:

```
  scene/     pure data + operations on the scene (no React, no DOM)
  space/     pure scoring model: (Scene, Params) -> Float32Array grid   (no React, no DOM)
  render/    canvas heatmap painter + SVG piece layer (DOM, no React state)
  ui/        React components: rail, timeline, readout, pages
```

The critical architectural pressure is **FR-2.1: the map repaints live during the drag.** A
naive React implementation (piece position in `useState`, heatmap in a `useEffect`) puts a full
reconciliation between every pointer move and the repaint and will not hold 60 fps at 17,600
cells. So the scene lives in a **tiny mutable subscribe-store**: pointer moves mutate the scene
and request a frame; a single `requestAnimationFrame` loop recomputes the grid and paints the
canvas imperatively. React re-renders only on *structural* change (mode, keyframe list, toggle
state) — never per pointer move.

The second pressure is **model integrity**. Brief §4 is validated and must not be re-derived, so
`space/` is a pure, headless library with the pipeline transcribed literally, each layer a named
exported function. It has no React import, no canvas import, and can be unit-tested and reused
by the future drill visualizer without dragging the UI along.

### Cross-Cutting Concerns

1. **The space model is a pure function of scene state.** No caching keyed on anything but
   `(scene, params, layers, lens)`; no hidden state; no time dependence. This is what lets the
   overlay drop into both modes and, in phase 2, run per animation frame.
2. **No receiver-reachability gate** may appear anywhere in the score (PRD FR-3.2, the v2
   prototype regression). Enforced by ADR-5 and a dedicated test.
3. **Nothing in `scene/` or `space/` may import React, the DOM, or canvas.** Enforceable by
   review and, optionally, a lint boundary rule.
4. **The play JSON is a site-wide contract**, not a local file format. Versioned from the first
   commit; validated on read; never widened silently.
5. **Coordinates are always yards, origin at the back of the defending endzone, +x = attacking.**
   Pixel space exists only inside `render/`. No component outside `render/` sees a pixel.

### Brownfield Notes

- **Touches:** `frontend/src/router.tsx` (two new routes), `frontend/package.json` (no new
  runtime deps expected), the top nav in `frontend/src/encyclopedia/components/Layout.tsx` (one
  link — pending the nav-placement open question).
- **Must not change:** the encyclopedia `Layout` shell's behaviour for existing routes, the
  intake app, anything in `backend/`. No migrations. No API calls.
- **Existing patterns to follow:** feature-folder layout mirroring `encyclopedia/` and
  `intake/`; kebab-case-free existing convention is actually PascalCase for components and
  camelCase for modules — match the sibling folders exactly. Plain modules + `localStorage`
  helpers for persistence (see `intake/state/draft.ts`), no state library. Vitest + RTL +
  axe-core for tests. Tailwind for chrome layout; Light Film Room tokens for visual language.

---

## Tech Stack & Dependencies

| Category | Selection | Rationale |
|----------|-----------|-----------|
| **Language/Runtime** | TypeScript 5.5, browser only | Matches repo; the model is closed-form arithmetic that JS runs fast enough (proven in the prototype, brief §9) |
| **Framework** | React 18 + react-router-dom 6 (existing) | Already the app; two new routes in the existing tree |
| **Build** | Vite 5 (existing) | No change |
| **Heatmap rendering** | 2D Canvas — offscreen `ImageData` at grid resolution, drawn upscaled with `imageSmoothingEnabled` | Prototype-proven (brief §9); gives a clean interpolated map with zero shader work and no WebGL context management |
| **Piece rendering** | SVG (React-rendered structure, imperatively transformed during drag) | Drag ergonomics, hit-testing, focusability, and a11y come free; prototype confirmed SVG-over-canvas works well |
| **State** | Custom ~50-line mutable subscribe-store in `scene/store.ts` | Per-pointer-move React state is the one thing that breaks the frame budget; also matches the repo's "plain modules, no state lib" convention |
| **Styling** | Tailwind 3 + Light Film Room tokens (existing) | Repo standard |
| **Animation** | `requestAnimationFrame` (own loop) | framer-motion exists in the repo but is for DOM transitions, not a 60 fps canvas repaint or scene tweening |
| **Testing** | Vitest + RTL + axe-core (existing) | Repo standard; model gets pure unit tests, UI gets RTL, chrome gets axe |
| **Export (PNG)** | `canvas.toBlob` on a composited offscreen canvas | No dependency; SVG piece layer is drawn into the same canvas for export |

**New runtime dependencies introduced:** *none expected.* If PNG export of the SVG layer proves
awkward, the fallback is to draw pieces to canvas directly for export only — still no dependency.

**Dependencies explicitly rejected:**
- `zustand` / `jotai` / Redux — the store needed is ~50 lines and per-frame updates must bypass
  React anyway; a library adds surface without solving the actual constraint.
- `d3` — needed only for scales we can write in four lines; large for the benefit.
- WebGL / `regl` / shaders — brief §9 proved plain canvas meets the budget; a GPU path is a
  contingency, not a starting point.
- `konva` / `fabric` — impose their own scene graph, which would compete with the scene model
  that is the whole architecture.

---

## Project / Module Structure

```
frontend/src/fieldview/
├── scene/
│   ├── types.ts                # Scene, Player, Team, Role, Vec2, FieldSpec — the shared model
│   ├── field.ts                # FIELD constants (110x40, endzones, brick marks), bounds clamp
│   ├── scene.ts                # pure ops: movePlayer, moveThrower (carries mark), setLens...
│   ├── presets.ts              # built-in setups as DATA (see ADR-9) + the preset registry
│   ├── presetFormat.ts         # PresetFile type + validation (a one-keyframe PlayFile)
│   └── store.ts                # mutable subscribe-store + rAF frame scheduler
├── space/
│   ├── types.ts                # SpaceParams, LayerFlags, Lens, ScoreGrid, CellExplain
│   ├── constants.ts            # DEFAULTS + slider ranges (brief §4.4) — single source of truth
│   ├── math.ts                 # ss() smoothstep, wrap(), bearing(), clamp(), projection
│   ├── layers.ts               # comp(), mark(), coverage(), lane(), value() — one per layer
│   ├── score.ts                # scoreCell() + computeGrid() -> Float32Array
│   ├── explain.ts              # explainCell() -> the hover readout's structured payload
│   └── palette.ts              # ramp stops + gamma -> RGBA
├── render/
│   ├── heatmap.ts              # grid -> ImageData -> offscreen canvas -> upscaled draw
│   ├── tokens.ts               # ALL piece/field visual tokens — the only file a restyle touches
│   ├── fieldLayer.tsx          # SVG field: sidelines, goal lines, brick marks, attack arrow
│   ├── pieceLayer.tsx          # SVG pieces + pointer drag handlers (imperative transforms)
│   └── exportImage.ts          # composite canvas + SVG -> PNG blob
├── play/
│   ├── format.ts               # PlayFile v1 types + PLAY_FORMAT_VERSION
│   ├── serialize.ts            # toPlayFile / fromPlayFile
│   ├── validate.ts             # hand-written schema guard for untrusted imports
│   └── tween.ts                # sampleAt(play, t) -> Scene (linear interpolation)
├── ui/
│   ├── FieldCanvas.tsx         # stacks heatmap canvas + SVG layers; owns the rAF loop
│   ├── OverlayRail.tsx         # Space toggle, lens, layer toggles, legend
│   ├── TuningPanel.tsx         # six sliders, collapsed, reset-to-defaults
│   ├── PresetMenu.tsx          # built-in + user presets, save/rename/delete/export, confirms
│   ├── CellReadout.tsx         # hover readout (live region)
│   ├── Timeline.tsx            # keyframe chips, playhead, transport
│   └── PlayMeta.tsx            # name/description, import/export buttons
├── pages/
│   ├── Whiteboard.tsx          # /field-view
│   └── Designer.tsx            # /field-view/designer
├── prefs.ts                    # localStorage for rail/tuning prefs (mirrors intake/state/draft.ts)
└── tests/
    ├── space-model.test.ts     # layer-by-layer unit tests
    ├── acceptance.test.ts      # brief §8 checks 1-8 as executable assertions
    ├── scene.test.ts           # ops incl. thrower-carries-mark, bounds clamping
    ├── play-format.test.ts     # round-trip + malformed-import rejection
    └── ui.test.tsx             # RTL + axe on rail, timeline, readout

frontend/src/router.tsx          # [MODIFIED] add /field-view and /field-view/designer
frontend/src/encyclopedia/components/Layout.tsx  # [MODIFIED] one nav link (pending placement)
```

**Key structural decisions:**
- `scene/` and `space/` are framework-free and dependency-free. They are the reusable core; the
  future drill visualizer imports them without importing a single React component.
- One file per model layer in `space/layers.ts`-adjacent form, matching the brief's own
  decomposition — so a reader can diff the code against brief §4.3 line by line.
- `space/constants.ts` is the *only* place a magic number from brief §4.4 appears. No literal
  `0.92`, `2.2`, `0.55`, `75`, or `0.3` anywhere else.

---

## Architecture Decisions (ADRs)

### ADR-1: Headless space model, framework-free

**Decision:** `space/` is a pure library: `computeGrid(scene, params, layers, lens) ->
Float32Array` plus `explainCell(...)`. It imports nothing from React, the DOM, or canvas.

**Rationale:** The model is the validated asset and the reusable one — the encyclopedia's drill
visualizer and the phase-2 heatmap-through-time both need it without the editor UI. It also
makes brief §8 acceptance checks expressible as fast unit tests instead of screenshot diffing.

**Affects:** `space/*`, `tests/space-model.test.ts`, `tests/acceptance.test.ts`.

---

### ADR-2: Mutable subscribe-store + rAF loop; React is not in the drag path

**Decision:** Scene state lives in a small mutable store (`scene/store.ts`) exposing
`getScene()`, `mutate(fn)`, and `subscribe(cb)`. Pointer-move handlers mutate the scene and call
`requestFrame()`. One rAF loop per mounted `FieldCanvas` recomputes the grid and paints. React
components subscribe only to *structural* selectors (mode, keyframe count, toggle flags) and
re-render at human speed, not pointer speed.

**Rationale:** FR-2.1 is non-negotiable and is the single hardest constraint in the initiative.
React reconciliation per `pointermove` at 17,600 cells will not hold the budget, and fighting it
with memoization is more complex than not entering it. This is the standard canvas-app pattern.

**Affects:** `scene/store.ts`, `ui/FieldCanvas.tsx`, `render/pieceLayer.tsx`, every rail control.

---

### ADR-3: Canvas heatmap under an SVG piece layer

**Decision:** Two stacked layers in one positioned container: a `<canvas>` painted from an
offscreen 220 × 80 `ImageData` scaled up with `imageSmoothingEnabled = true`, and an `<svg>`
above it holding the field markings and the draggable pieces.

**Rationale:** Prototype-proven (brief §9). Canvas gives cheap per-cell fill and free bilinear
interpolation on upscale; SVG gives drag ergonomics, hit areas, focus, and screen-reader
labelling for the 14 pieces, which are exactly the things canvas makes painful.

**Affects:** `render/*`, `ui/FieldCanvas.tsx`, `render/exportImage.ts`.

**As built (P5):** `render/heatmap.ts` takes a `ScoreGrid` and a colour function and knows
nothing about the model — which is what let it be built and measured against a synthetic grid
before the real model was wired in. `ui/FieldCanvas.tsx` owns the stack and the frame loop, and
is shared by both routes. Measured: grid 9.42 ms + paint 0.70 ms = **10.18 ms** best-of-30 on
220 × 80 × 14. Because the map now lives on its own canvas, `exportFrameAsPng` takes an optional
overlay layer and composites it beneath the rasterized SVG — without that, the PNG would silently
lose the heatmap the screen was showing.

---

### ADR-4: Grid resolution is a tunable constant, defaulting to 0.5 yd

**Decision:** `GRID_STEP = 0.5` (→ 220 × 80) lives in `space/constants.ts`. The renderer reads
the grid's dimensions from the returned buffer rather than assuming them.

**Rationale:** Brief §9 says 0.5 yd fits the frame budget in plain JS, so it is the default. But
it is the one dial that trades fidelity for frames on weak hardware, and hardcoding it in three
places would make that trade impossible to make later.

**Affects:** `space/constants.ts`, `space/score.ts`, `render/heatmap.ts`.

---

### ADR-5: The model is transcribed, not re-derived — and layer identity is preserved in code

**Decision:** Each factor in brief §4.3 (`comp`, `mark`, `coverage_i`, `lane_i`, `value`) is a
separately exported, separately tested function multiplied together in `score.ts`. The layer
toggles work by substituting `1.0` for a factor, not by branching inside the pipeline. Constants
come only from `space/constants.ts`. The brief's formulas are reproduced as comments directly
above their implementations.

**Rationale:** Two requirements meet here: the model must not be silently reinterpreted (brief §4
is validated), and layer isolation is a *product feature* (FR-3.6), not a debug affordance. Both
are served by making each layer a first-class function. A reviewer can diff the code against the
brief without reading control flow.

**Affects:** `space/layers.ts`, `space/score.ts`, `space/constants.ts`.

---

### ADR-6: Lens = offense on/off is a coverage-layer parameter, not a separate model

**Decision:** `Lens = "offense" | "defense-only"`. With `defense-only`, the `beat` term is
skipped inside `coverage_i` — the rest of the pipeline is untouched. There is no second code
path and no "v1 model" kept alive alongside the v3 one.

**Rationale:** Brief §4.5 defines offense-off as *pure v1 coverage*, which is exactly the v3
coverage layer with the cutter-contest discount removed. Expressing it as one branch inside one
function keeps the two lenses guaranteed-consistent; a parallel implementation would drift.

**Affects:** `space/layers.ts`, `space/types.ts`, `ui/OverlayRail.tsx`.

---

### ADR-7: Play format is versioned and validated at the boundary

**Decision:** `PlayFile` carries `formatVersion` from the first commit. `play/validate.ts`
hand-validates every imported file (shape, ranges, roster integrity) before it constructs a
`Scene`. Unknown-newer versions are rejected with a specific message; the current scene is never
mutated by a failed import.

**Rationale:** The format is a site-wide contract that the drill visualizer and the AI pipeline
will both write, and imported JSON is untrusted input in a browser. A hand-written guard (no
dependency) is enough at this schema size and keeps the error messages user-legible.

**Affects:** `play/format.ts`, `play/validate.ts`, `play/serialize.ts`, `ui/PlayMeta.tsx`.

---

### ADR-9: Presets are data behind a registry; built-ins and user presets share one path

**Decision:** A preset is a `PresetFile` — structurally a one-keyframe `PlayFile` — and all
presets load through one `PresetRegistry`. Built-ins are a static array of `PresetFile` objects
in `scene/presets.ts`; user presets are the same shape in `localStorage`. The only difference the
UI knows about is a `builtin: true` flag that suppresses delete/rename.

**Rationale:** The client's stated intent (PRD FR-2.6) is to author conventionally correct setups
personally, later, and to promote a whiteboard formation to a site-wide preset. Both are free if
presets are data flowing through one path: site-wide promotion becomes "paste the exported JSON
into the built-ins array", and phase-2 server-backed publishing becomes a second registry source
rather than a rewrite. A privileged code path for the four built-ins would have to be dismantled
to get there.

**Affects:** `scene/presets.ts`, `scene/presetFormat.ts`, `ui/PresetMenu.tsx`, `prefs.ts`.

---

### ADR-10: All piece and field visuals live in one tokens module

**Decision:** Every colour, radius, stroke width, glyph, and label style for pieces and field
markings is defined in `render/tokens.ts`. Components read tokens; they never hardcode a visual
value.

**Rationale:** The client reviews visuals **at the end** of the initiative rather than gating on
a mock-up (PRD FR-5.3), and this language becomes the site-wide diagram standard. That review
will produce adjustments, and their cost is decided now: a token edit, or a component sweep. It
also gives the encyclopedia a single import when it adopts the language.

**Affects:** `render/tokens.ts`, `render/fieldLayer.tsx`, `render/pieceLayer.tsx`,
`render/exportImage.ts`.

---

### ADR-8: Storage-agnostic play persistence

**Decision:** `serialize.ts` produces a `PlayFile`; *how* it is stored is a separate concern
behind a `PlayStore` interface with a `FilePlayStore` (download/upload) implementation in v1.

**Rationale:** PRD FR-4.7 requires that account persistence later be a storage swap, not a
rewrite. The seam costs a 6-line interface now and mirrors how `EncyclopediaService` already
sits over a swappable store elsewhere in this repo.

**Affects:** `play/serialize.ts`, `ui/PlayMeta.tsx`.

---

## The Space Model (verbatim from brief §4)

> **Do not modify this section.** It is transcribed from `Ultimate Play Tools Handoff.md` §4,
> which is a validated requirement. Changes require a demonstrated acceptance-check failure and
> client sign-off. `ss(e0, e1, x)` is the standard smoothstep (clamped Hermite); all soft
> thresholds use it and there are **no hard cutoffs anywhere**.

**Primitives**

```
Field: 110 x 40 yd — 70-yd central field + two 20-yd endzones. Attacking direction +x.
       Brick marks 20 yd from each goal line.
Rosters: 7 offense (1 thrower + 6 cutters), 7 defense (1 mark + 6 defenders). Disc with thrower.

t_f(d) = 0.4 + d/20 + hang * 1.6 * (d/70)^2        # disc flight time (superlinear: hucks hang)
tau(p) = react + max(0, dist(p, cell) - 1) / vmax   # player arrival time at a cell
tau_O  = min over the six cutters (thrower excluded)
head   = cutter head start — the initiative asymmetry (cutter knows the throw; defender reacts)
```

**Score pipeline (per cell)**

```
score(cell) = comp(d) · mark(cell) · Π_defenders coverage_i(cell) · Π_defenders lane_i(cell) · value(cell)

comp(d)      = 1 − 0.6 · ss(15, 75, d)                    # throw-range completion decay

mark(cell):                                                # the mark's position IS the force
  θ_shadow   = bearing(thrower → mark)
  Δ          = |wrap(bearing(thrower → cell) − θ_shadow)|
  bump       = max(0, 1 − (Δ/W)²)²                         # W = shadow half-width, radians
  mark       = 1 − markStr · bump · ss(2, 10, d)           # distance ramp: short break resets escape

coverage_i(cell):                                          # includes the mark as a defender
  cov        = ss(−0.35, 0.35, t_f(d) − τ_i)               # can defender i beat the disc here
  if offense on:
    beat     = ss(−0.15, 0.55, τ_i − τ_O + head)           # would the best cutter beat THIS defender
    cov      = cov · (1 − beat)                            # contested coverage is voided coverage
  coverage_i = 1 − 0.92 · cov

lane_i(cell):                                              # poaches shade everything behind them
  project defender i onto segment thrower→cell; keep if projection t ∈ (0.06, 0.94)
  bump       = max(0, 1 − (d⊥ / 2.2)²)²                    # d⊥ = distance to the segment, yards
  lane_i     = 1 − 0.55 · bump

value(cell):                                               # what separates strong from merely open
  gain       = cell.x − thrower.x
  value      = 0.3 + 0.7 · clamp((gain + 15) / 55, 0, 1)
  value      = 1.0 inside the attacking endzone
```

**Display:** `score^0.7` gamma, mapped red → amber → green. Anchor stops: `#D64B4A` @ 0,
`#EF9F27` @ 0.42, `#97C459` @ 0.68, `#4F941D` @ 1. The value floor of `0.3` is deliberate — a
wide-open reset must read yellow (open, low value), never red (closed).

**Invariants that must survive implementation** (brief §4.1):
1. **No receiver-reachability gate anywhere in the score.** Openness never requires a receiver.
2. **Red means *closed off*, never "no cutter nearby yet."**
3. **Near-thrower open-side space must render as the strongest space on a normal setup.**

**Constants** (brief §4.4 — `space/constants.ts` is the single source of truth):

| Parameter | Default | Slider range | Meaning |
|---|---|---|---|
| `vmax` | 7.0 yd/s | 5–9 | player top speed |
| `react` | 0.4 s | 0.1–0.8 | reaction time |
| `head` | 0.25 s | 0–0.6 | cutter head start (offense initiative) |
| `hang` | 1.0 | 0.5–1.6 | huck hang factor in `t_f` |
| `markStr` | 0.8 | 0–1 | mark shadow strength (never 1.0 — breaks exist) |
| `W` (markW) | 38° | 15–60° | mark shadow half-width |
| lane radius | 2.2 yd | fixed | poach lane influence radius |
| lane strength | 0.55 | fixed | max lane penalty |
| coverage cap | 0.92 | fixed | max single-defender coverage penalty |
| range | 75 yd | fixed | completion-decay scale in `comp` |
| sigmoid widths | as written | fixed | softness of all thresholds |

---

## Data Models

### Scene (the shared core)

```ts
// scene/types.ts
export type Team = "offense" | "defense";
export type Role = "thrower" | "cutter" | "mark" | "defender";

export interface Vec2 { x: number; y: number }        // yards; origin at back of defending EZ

export interface Player {
  id: string;                 // stable across keyframes — tweening pairs by id
  team: Team;
  role: Role;
  pos: Vec2;
  label?: string;             // display numeral/letter
}

export interface Scene {
  players: Player[];          // exactly 14: 1 thrower + 6 cutters + 1 mark + 6 defenders
  // The disc is not an entity: it is defined as "with the thrower" (brief §2/§4.2).
  // If a phase-2 in-flight disc is needed, add `disc?: Vec2` — an additive change.
}
```

**Key field decisions:**
- `pos` in **yards**, never pixels — the model's units are physical and every formula in §4.3
  assumes yards. Pixel conversion lives only in `render/`.
- `id` is stable and required, because keyframe tweening pairs players across frames by id, not
  by array index (reordering must not teleport pieces).
- The disc is **derived**, not stored — brief §4.2 states the disc sits with the thrower.
  Storing it separately would create a state that can disagree with itself.

### Space model inputs/outputs

```ts
// space/types.ts
export type Lens = "offense" | "defense-only";

export interface SpaceParams {          // the six tunables (brief §4.4)
  vmax: number; react: number; head: number;
  hang: number; markStr: number; markW: number;   // markW in RADIANS internally, degrees in UI
}

export interface LayerFlags {           // FR-3.6 — each substitutes 1.0 when false
  markForce: boolean; coverage: boolean; lanes: boolean; value: boolean;
}

export interface ScoreGrid {
  cols: number; rows: number; step: number;   // step = GRID_STEP yards
  values: Float32Array;                       // length cols*rows, raw score (pre-gamma), 0..1
}

export interface CellExplain {          // FR-3.8 — the hover readout payload
  distance: number;            // yards from thrower
  flightTime: number;          // t_f(d)
  nearestDefenderArrival: number;
  bestCutterEffectiveArrival: number | null;   // null when lens = "defense-only"
  score: number;
  label: "strong" | "contested" | "closed";
}
```

### Play file (the site-wide contract)

```ts
// play/format.ts
export const PLAY_FORMAT_VERSION = 1;

export interface PlayEntity {           // an entity's identity, stated once
  id: string; team: Team; role: Role; label?: string;
}

export interface PlayKeyframe {
  t: number;                            // seconds from play start; strictly increasing
  positions: Record<string, Vec2>;      // entity id -> position, yards
}

export interface PlayFile {
  formatVersion: number;                // PLAY_FORMAT_VERSION
  name: string;
  description?: string;
  field: { length: 110; width: 40; endzone: 20 };   // explicit, so a reader never assumes
  entities: PlayEntity[];
  keyframes: PlayKeyframe[];            // >= 1, sorted by t
  interpolation: "linear";              // enumerated now so easing can be added without a v2
}
```

**Key field decisions:**
- `entities` + `keyframes` are separated (identity stated once, position per frame) exactly as
  brief §2 specifies — this is what makes it a sane target for an AI generator and cheap to diff.
- `interpolation` is an enum with one member today. Naming the axis now means adding
  `"ease-in-out"` later is additive, not a format version bump.
- `field` is written explicitly rather than assumed, so a future non-regulation field is not a
  breaking change.
- Timestamps are seconds (floats), not frame indices — playback rate is a rendering concern.
- `PlayEntity` is **owned by `play/format.ts`**; `scene/presetFormat.ts` re-exports it, so a
  preset (the format with one frame) cannot drift from a play on entity identity.
- **`annotations` is a reserved key.** Arrows, text, and cone markers are a confirmed future
  need (client review of the schema, P4 task 71) whose *shape* is deliberately undesigned. What
  is decided now is the property that makes adding it additive rather than a `formatVersion`
  bump: `play/validate.ts` **drops unknown keys rather than rejecting them**, so a future v1.x
  annotated play still imports into a reader that predates annotations, minus the annotations.
  A regression test asserts exactly this.

### Preset file (FR-2.6, ADR-9)

```ts
// scene/presetFormat.ts
export interface PresetFile {
  formatVersion: number;          // shares PLAY_FORMAT_VERSION
  id: string;                     // stable; built-ins use readable slugs ("vert-force-side")
  name: string;
  builtin?: boolean;              // set by the registry, never trusted from an imported file
  field: { length: 110; width: 40; endzone: 20 };
  entities: PlayEntity[];
  positions: Record<string, Vec2>;   // one frame — a preset is a play with a single keyframe
}

export interface PresetRegistry {
  list(): PresetFile[];                       // built-ins first, then user presets
  save(name: string, scene: Scene): PresetFile;
  rename(id: string, name: string): void;     // user presets only
  remove(id: string): void;                   // user presets only
  importFile(raw: unknown): PresetFile;       // validated; builtin flag stripped
  export(id: string): PresetFile;
}
```

**Key field decisions:**
- A preset is deliberately *the play format with one frame*, not a parallel schema — so a saved
  formation and an exported play share validation, entity representation, and the site-wide
  contract. Promoting a preset to site-wide is then a paste, and phase-2 server publishing adds
  a registry source rather than a format.
- `builtin` is assigned by the registry and **stripped on import**, so a downloaded file cannot
  claim undeletable status.
- `id` uses readable slugs for built-ins so the data file stays hand-editable — the client edits
  it directly to ship new site-wide presets in v1.

### Modified Models

| Model | Change | Migration Required? |
|-------|--------|-------------------|
| *(none)* | No backend, DB, or existing frontend model changes | No |

### Schema / Migration Notes

No database work in this initiative. `PLAY_FORMAT_VERSION` is the only versioned surface; the
import guard rejects `formatVersion > PLAY_FORMAT_VERSION` with a user-legible message and
tolerates older versions via an explicit upgrade function when the first v2 arrives.

---

## API & Interface Design

No HTTP API. The public interfaces are module boundaries.

### Space model (the reusable core)

```ts
// space/score.ts
export function computeGrid(
  scene: Scene, params: SpaceParams, layers: LayerFlags, lens: Lens,
): ScoreGrid;

export function scoreCell(
  cell: Vec2, scene: Scene, params: SpaceParams, layers: LayerFlags, lens: Lens,
): number;

// space/explain.ts
export function explainCell(
  cell: Vec2, scene: Scene, params: SpaceParams, layers: LayerFlags, lens: Lens,
): CellExplain;

// space/layers.ts — one exported function per factor of brief §4.3
export function comp(d: number): number;
export function mark(cell: Vec2, scene: Scene, p: SpaceParams): number;
export function coverage(cell: Vec2, defender: Player, scene: Scene, p: SpaceParams, lens: Lens): number;
export function lane(cell: Vec2, defender: Player, scene: Scene): number;
export function value(cell: Vec2, scene: Scene): number;
```

### Scene store

```ts
// scene/store.ts
export interface SceneStore {
  getScene(): Scene;                      // returns the live object — treat as read-only
  mutate(fn: (draft: Scene) => void): void;   // mutate + notify + requestFrame
  subscribe(cb: () => void): () => void;      // structural subscribers (React)
  onFrame(cb: () => void): () => void;        // per-frame subscribers (canvas painter)
}
```

### Play storage seam (ADR-8)

```ts
// play/serialize.ts
export interface PlayStore {
  save(play: PlayFile): Promise<void>;
  load(): Promise<PlayFile>;
}
export class FilePlayStore implements PlayStore { /* download / file picker */ }
```

### Backward Compatibility

Additive only. Two new routes; no existing route, component, or backend contract changes. The
one shared-surface edit is a nav link in the encyclopedia `Layout`.

---

## Implementation Patterns & Conventions

### Naming Conventions

Match the sibling feature folders (`encyclopedia/`, `intake/`) exactly:

| Construct | Convention | Example |
|-----------|-----------|---------|
| React components | PascalCase file + export | `OverlayRail.tsx` |
| Non-component modules | camelCase file | `scene/store.ts`, `space/layers.ts` |
| Functions | camelCase | `computeGrid()`, `explainCell()` |
| Types/interfaces | PascalCase | `ScoreGrid`, `PlayFile` |
| Constants | UPPER_SNAKE | `GRID_STEP`, `DEFAULT_PARAMS`, `PLAY_FORMAT_VERSION` |

### Model transcription pattern (mandatory)

```ts
// brief §4.3: comp(d) = 1 − 0.6 · ss(15, 75, d)      # throw-range completion decay
export function comp(d: number): number {
  return 1 - COMP_DEPTH * ss(COMP_NEAR, COMP_RANGE, d);
}
```

**Rules:**
- Every model function carries the brief's formula verbatim as the comment directly above it.
- No numeric literal from brief §4.4 appears outside `space/constants.ts`.
- Layer toggles substitute `1.0` for a factor at the call site in `score.ts`. They never add a
  branch inside a layer function.
- The inner loop uses polynomial falloffs only — no `exp`, `pow`, or trig inside the per-cell
  path beyond what the formulas require (bearings are precomputed per cell, `score^0.7` is
  applied once at colour-mapping time, not per layer).

### Error Handling Pattern

```ts
const result = validatePlayFile(raw);
if (!result.ok) {
  setImportError(result.reason);   // user-legible, names the cause
  return;                          // the current scene is untouched
}
```

**Rules:**
- Untrusted input (imported JSON) is validated at the boundary and never partially applied.
- Interaction code has no throwing paths: dragging out of bounds clamps, it does not error.
- No silent catches. A failed export surfaces a toast.

### Testing Pattern

```ts
// tests/acceptance.test.ts — brief §8 check 3
it("wide-open dump/reset space reads yellow, never red", () => {
  const grid = computeGrid(presets.vertStackForceSide, DEFAULT_PARAMS, ALL_LAYERS, "offense");
  expect(sampleAt(grid, dumpSpace)).toBeGreaterThan(YELLOW_FLOOR);
});
```

**Coverage expectations:**
- `space/` and `scene/`: near-total on logic; every layer function has a direct unit test.
- Brief §8 checks that are properties of the model (1, 2, 3, 4, 6, 7, 8) are expressed as
  executable assertions where falsifiable — relative orderings, non-zero deltas, floor/ceiling
  thresholds. Check 5 (drag rotates/flips strong space live) and check 9 (60 fps) are properties
  of the render loop: check 5 is an RTL pointer-drag assertion plus manual confirmation, check 9
  is a measured perf test with a logged budget plus manual confirmation.
- A dedicated **regression test for FR-3.2**: with all six cutters removed from the scene, far
  open-side space must still score as open. This is the v2 prototype failure and the single most
  important test in the suite.
- UI: RTL for rail/timeline/readout behaviour; axe-core on both pages, matching the repo's
  existing accessibility test approach.

**Mocking strategy:** none needed — no network, no time dependence in the model. Tween tests
drive `sampleAt(play, t)` directly rather than faking timers.

---

## Security & Performance

### Security

| Concern | Mitigation |
|---------|-----------|
| Imported play JSON is untrusted | Hand-written structural validation before use; reject unknown-newer `formatVersion`; never partially apply |
| Imported preset JSON is untrusted | Same validator path (a preset is a one-keyframe play); `builtin` is stripped on import so a file cannot claim undeletable status |
| `localStorage` preset data is user-modifiable | Validated on read exactly like an imported file; a corrupt entry is dropped with a notice, never crashes the menu |
| Prototype pollution via `JSON.parse` of user files | Validator reads only known keys onto fresh objects; never `Object.assign` into a scene |
| XSS via play `name` / `description` | Rendered as React text nodes only — never `dangerouslySetInnerHTML`; length-capped on import |
| Secrets / user data | None exist: no auth, no network calls, nothing leaves the browser in v1 |
| New backend surface | None added |

### Performance

| Concern | Target | Approach |
|---------|--------|---------|
| Repaint during drag | Perceptually 60 fps; grid + paint < 16 ms p95 | rAF-coalesced single recompute per frame (ADR-2); closed-form per-cell evaluation, no timestep sim; polynomial falloffs only |
| Grid cost | 220 × 80 × 14 players | Per-cell inner loop allocation-free; reuse one `Float32Array` and one `ImageData` across frames; precompute per-defender constants outside the cell loop |
| React overhead | Zero re-renders per pointer move | Pointer handlers mutate the store and transform SVG nodes imperatively; React subscribes to structural state only |
| Paint cost | — | Offscreen canvas at grid resolution, single upscaled `drawImage` with smoothing (brief §9) |
| Pressure valve | — | `GRID_STEP` is one constant (ADR-4); doubling it quarters the cell count if a weak-hardware target appears |

### Observability

No telemetry in v1 (consistent with the rest of the client app; the site uses
Plausible/Umami-style analytics elsewhere and nothing here needs event capture yet).
- **Dev-only:** a frame-timing readout behind a query flag (`?perf=1`) reporting grid-compute and
  paint milliseconds — needed to defend the acceptance-check-9 budget during development.
- **Logs/metrics/traces:** none.

---

## Implementation Sequence

1. **Scene foundation** *(blocking)* — `scene/types.ts`, `field.ts`, `scene.ts`, `store.ts`,
   `presets.ts`; SVG field rendering; routes wired. Everything else depends on the scene model
   and the yard-space coordinate contract.
2. **Whiteboard** *(depends on 1)* — piece layer, pointer drag, thrower-carries-mark, bounds
   clamping, the preset menu and registry (save/rename/delete/export/import), the piece visual
   language via `render/tokens.ts`, frame export.
3. **Space model, headless** *(depends on 1; parallel with 2)* — `space/*` in full, plus the
   §8 acceptance checks as unit tests. No UI. This is deliberately built against the scene model
   alone so the math lands before it has a viewport to hide in.
4. **Play designer** *(depends on 2)* — `play/*`, timeline UI, tween, transport, JSON
   import/export, metadata.
5. **Heatmap overlay** *(depends on 3, and on 4 per the brief's mandated build order)* —
   canvas painter, overlay rail, lens, layer toggles, tuning panel, hover readout, legend, perf
   validation.
6. **Polish & verification** *(depends on 5)* — the manual acceptance-check pass with the
   client, a11y sweep, reduced-motion, tablet layout.

**Parallel work opportunities:** Step 3 (headless model) runs alongside step 2 (whiteboard UI)
with zero file overlap — they share only `scene/`, which step 1 froze. This is the one genuine
parallelization and it is worth taking, because the model is the highest-risk work and benefits
from the longest runway.

**Known implementation risks:**
- **60 fps at 0.5 yd:** proven in the prototype but not in this codebase. Mitigation: build the
  painter against a synthetic grid early in step 5 and measure before wiring the real model;
  `GRID_STEP` is the escape hatch.
- **Between-keyframe editing semantics** (UX Flow 2, alternate D): the interaction is specified
  but is the most likely source of surprising behaviour. Mitigation: it is blocked-with-an-offer
  rather than silently permitted, and it is covered by an RTL test.
- **PNG export compositing SVG + canvas:** the standard `foreignObject`/`XMLSerializer` route has
  browser quirks. Mitigation: fallback of drawing pieces directly to the export canvas — decided
  in step 2, not deferred to step 6.
