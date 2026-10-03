---
summary: "Technical approach for fieldview-ui-rework. Flip the field to horizontal inside render/coords.ts (the one place orientation lives, ADR-11's principle kept, its vertical choice superseded). Field View becomes its own full-viewport shell outside the site Layout, owning one SceneStore + motion driver + prefs for the whole /fieldview/* subtree (layout route + Outlet), with mode pages (explore/watch/build) configuring it. One set of content components is arranged by two CSS-switched frames (compact, desktop) so FieldCanvas mounts once. Heat is always on with palette as a painter parameter (colour-blind ramp) and a legend derived from the same stops. 'Defense follows' ships as a persisted toggle only (behaviour deferred; ADR-33 reserved). Advanced settings are deferred. Watch is a thin imperative playback layer over the existing keyframe format and tween sampler. Old shell, Whiteboard and PresetMenu UI are retired; engines for unsurfaced features stay. New ADRs 28–35 continue the canon numbering (33 reserved/deferred)."
phase: "tech"
when_to_load:
  - "When implementing or reviewing architecture, interfaces, data models and sequencing for fieldview-ui-rework."
depends_on:
  - "prd.md"
  - "ux.md"
  - ".cicadas/canon/modules/fieldview.md"
modules:
  - "frontend/src/fieldview/render"
  - "frontend/src/fieldview/ui"
  - "frontend/src/fieldview/pages"
  - "frontend/src/fieldview/space/palette.ts"
  - "frontend/src/fieldview/play"
  - "frontend/src/router.tsx"
  - "frontend/tailwind.config.js"
index:
  overview: "## Overview & Context"
  stack: "## Tech Stack & Dependencies"
  structure: "## Project / Module Structure"
  adrs: "## Architecture Decisions (ADRs)"
  data_models: "## Data Models"
  interfaces: "## API & Interface Design"
  conventions: "## Implementation Patterns & Conventions"
  security_performance: "## Security & Performance"
  implementation_sequence: "## Implementation Sequence"
next_section: "Overview & Context"
---

# Tech Design: fieldview-ui-rework

## Progress

- [x] Overview & Context
- [x] Tech Stack & Dependencies
- [x] Project / Module Structure
- [x] Architecture Decisions (ADRs)
- [x] Data Models
- [x] API & Interface Design
- [x] Implementation Patterns & Conventions
- [x] Security & Performance
- [x] Implementation Sequence

---

## Overview & Context

**Summary:** Replace the presentation layer, keep the engines. The field is re-oriented in `coords.ts`; a new app frame (layout route + two CSS-switched frames) replaces `ShellLayout`/`BottomSheet`; Explore and Watch compose shared content components; three small pieces of wiring (colour-blind palette, defense-follows, Watch playback) connect existing algorithm code to the new UI.

### Cross-Cutting Concerns

1. **ADR-2 (React never in the frame path).** Every new interactive path — touch lift, defense-follows, Watch playback — writes imperatively to the store; React sees only structural changes.
2. **One canvas, one driver, one prefs store.** Both frames are in the DOM; stateful things mount once above them.
3. **Visuals only in tokens (ADR-10).** New colours/sizes go in `render/tokens.ts` or the Tailwind `film.*` palette; `tokensGuard.test.ts` keeps the rule.
4. **Colour never the sole carrier of meaning.** The hover readout stays screen-reader-only.

### Brownfield Notes

- `main` has the **committed vertical** layout: `yardToPixel` maps `y*PIXELS_PER_YARD → x` and `(FIELD.length - x) → y`; `STAGE_MARGIN = {top:36,right:20,bottom:20,left:20}`; `fieldLayer.tsx` draws goal lines horizontally. *(Corrected in P1: committed `heatmap.ts` blits the grid straight, with no rotation, so the vertical field's heat map was distorted — the quarter-turn fix existed only in the parked WIP. The horizontal flip makes the straight blit correct.)* The vertical-tuning experiment (1.2 lateral stretch, margin 12, shell open by default, etc.) lives only on `checkpoint/fieldview-vertical-tuning` and is **not** carried forward.
- Deferred, not built here: defense following on drag; Advanced settings UI.
- Must NOT change: `space/*` (except `palette.ts`: additive second ramp), `motion/*`, `scene/*` (except additive presets/takeaways and an additive helper or two), `play/*` semantics, `useOverlayState` as a module-level external store (canon convention), `scene/possession.ts`'s sole-writer rule for `Player.role` (ADR-17).
- The encyclopedia `Layout.tsx` currently wraps `/fieldview` (64 px sticky header + mobile nav row + footer).
- `Designer.tsx`, `Timeline.tsx`, `PlayMeta.tsx`, `OverlayRail.tsx`, `AdvancedPanel.tsx` (the old rail) stay, unlinked, as the internal authoring tool for curated plays.

---

## Tech Stack & Dependencies

| Category | Selection | Rationale |
|---|---|---|
| Language/Runtime | TypeScript, React 18, Vite | Existing |
| Routing | react-router-dom (existing `routes`) | Mode-as-route; nested layout route |
| Styling | Tailwind + `film.*` tokens, one new screen `desktop` | CSS-only breakpoint (ADR-15 continued) |
| Rendering | SVG pieces over canvas heatmap | Existing (ADR-3) |
| Testing | Vitest + Testing Library (jsdom) | Existing; real-device pass is manual |
| New dependencies | **None** | |

---

## Project / Module Structure

```
frontend/src/fieldview/
  render/        coords.ts · fieldLayer.tsx · heatmap.ts · pieceLayer.tsx · tokens.ts      (MODIFY)
  space/palette.ts                                                                          (MODIFY: + colour-blind ramp)
  scene/presets.ts                                                                          (MODIFY: + curated presets, takeaways)
  play/          format.ts / validate.ts (+ optional keyframe label) · plays.ts (registry)  (MODIFY / NEW)
    builtin/*.json                                                                          (NEW: curated plays)
  ui/
    app/         FieldViewApp.tsx (layout route) · CompactFrame.tsx · DesktopFrame.tsx
                 TopBar.tsx · MenuDrawer.tsx · SetupSlideOver.tsx · RotateNotice.tsx        (NEW)
    content/     SetupList · SetupChip · PlayList · Legend · ColourGuide · Options
                 SelectedPlayerCard · PlaybackOptions · Transport · Filmstrip               (NEW; shared by both frames)
    motion/      driver.ts · driverContext.tsx · motionMode.ts                              (KEEP; follow mode deferred)
    playback/    playback.ts (imperative controller) · usePlayback.ts                       (NEW)
    FieldCanvas.tsx                                                                        (MODIFY: width-bound sizing, touch lift)
    prefs.ts                                                                               (MODIFY: colourBlind, follow, heat default)
    shell/       ShellLayout · LeftSidebar · RightSidebarSlot · BottomSheet · ToolRibbon · panelRegistry · panels/*   (RETIRE)
                 sceneStore.tsx · useSelection.ts · throwMode.ts                            (KEEP)
  pages/         Explore.tsx · Watch.tsx · Build.tsx (NEW) · Whiteboard.tsx (RETIRE) · Designer.tsx (KEEP, unlinked) · FieldStage.tsx (MODIFY)
frontend/src/router.tsx · tailwind.config.js · encyclopedia/components/Layout.tsx (extract SiteHeader)
```

---

## Architecture Decisions (ADRs)

Numbering continues the canon (ADR-1…27). ADR-33 is reserved for the deferred defense-following work.

### ADR-28 — Horizontal field; orientation still lives only in `coords.ts`
`yardToPixel`/`pixelToYard` become the horizontal mapping (`x → x`, `y → y`, scaled by `PIXELS_PER_YARD`); `FIELD_PX_WIDTH/HEIGHT`, `STAGE_MARGIN`, `getStageViewBox`, `fieldPixelSize`, goal-line and brick drawing, and the heatmap blit (rotation deleted) follow. **Supersedes ADR-11's vertical choice, keeps its principle** (`scene/` stays orientation-agnostic: `+x = attacking`). No vertical/portrait mode (D4); the isolation keeps one possible later.

### ADR-29 — Field View is its own full-viewport shell, outside the site `Layout`
`/fieldview/*` is a sibling of the `Layout` route tree, not a child. The site header is extracted from `Layout.tsx` as `SiteHeader` and rendered **only by the desktop frame** (D8); compact frames show none and link back to Ultipedia from the hamburger menu. No footer. Rationale: a 390 px-tall phone cannot spare 64 px+, and the approved UI has its own bar.

### ADR-30 — One content set, two CSS-switched frames; `FieldCanvas` mounts once
Continues ADR-14/15. Content components in `ui/content/` are frame-agnostic. *(As built in P2: one `FieldViewFrame` component holds both the compact and desktop parts — mode pages pass slots — rather than two separately named components; the rest of this ADR stands.)* `CompactFrame` and `DesktopFrame` are **chrome sets** (top bar, drawers, sidebar, dock) rendered as siblings of one shared field cell inside a single CSS grid whose areas change at `desktop`; both chrome sets are in the DOM and CSS shows one. A new Tailwind screen `desktop: { raw: "(min-width: 1280px) and (min-height: 640px)" }` is the single switch. `FieldCanvas` (and its `svgRef`/`canvasRef`) is rendered **once** by `FieldViewApp` in that shared field cell — never inside a `display:none` branch. *(Design detail to confirm in P2: the grid-area approach vs. portalling; the one-canvas invariant is what matters.)* **Supersedes ADR-14's panel-registry half**: nothing registers panels any more; `panelRegistry`/`registerPanel` are retired with their guard (`shellGuard.test.ts`), replaced by a frame guard (see conventions).

### ADR-31 — Mode = route; one app-level store, driver and prefs for the subtree
`FieldViewApp` is a layout route (`<Outlet/>`) that creates the `SceneStore`, mounts the single `MotionDriverProvider` (ADR-26), and provides the selection/scene context. `explore`, `watch`, `build` pages configure the store (Explore loads a setup; Watch loads a play frame) and render mode-specific content into the frames. Switching mode keeps the store alive; the page loads its own scene on mount. `/fieldview` redirects to `/fieldview/explore`; legacy `/field-view*` redirects stay; `/fieldview/designer` stays routed but unlinked.

### ADR-32 — Heat is always on; palette is a painter parameter; legend derives from the same stops
`prefs.on` stops being a user toggle in the new UI. *(As built in P2: `FieldHost` forces `on: true`; the pref and its default are left alone for the unlinked designer, so no v2 storage key was needed and a stale stored `false` is harmless.)* `space/palette.ts` gains a second stop set (orange→neutral→blue) and a `scoreToRgba` variant; `createHeatmapPainter({ colorize })` already accepts it. `Legend` and `ColourGuide` read the **same** stop arrays so legend and map cannot drift. `colourBlind` is a persisted, validated pref. Legend terms: **Closed / Contested / Strong space** (D7).

### ADR-33 — RESERVED / DEFERRED: "Defense follows" behaviour
Builder decision (2026-10-03): the toggle and its persisted pref (`defenseFollows`) ship in this initiative, labelled "coming soon", but the following behaviour is **on hold** until the rest of the initiative is complete, then designed deliberately as its own piece. **Sketch only (not binding):** drive the existing pure `step()` for the dragged player's assigned defender through the existing driver, one store write per rendered frame (ADR-22/26), no new constants (ADR-24), imperative publish from the pointer handler (ADR-2). This number is reserved so the eventual ADR keeps continuity.

### ADR-34 — Watch plays curated `PlayFile` keyframes; frame stepping is a thin imperative controller
Plays are validated JSON (`play/builtin/*.json` via `play/plays.ts` through `validate.ts`; invalid plays are skipped and reported). Frames = keyframes. `playback.ts` owns `{play, frameIndex, status, speed, loop}` and, for a step or play, animates between consecutive keyframes using the existing `samplePositions` (`play/tween.ts`) on an rAF with a fixed-timestep accumulator mirroring the driver's, writing positions to the store imperatively. React state holds only structural values (frame index, status). Reduced motion jumps. Optional `PlayKeyframe.label` is added **additively** (ADR-7: validate drops unknown keys; length-capped).

### ADR-35 — Touch lift: the piece is held above the finger, imperatively
For `pointerType === "touch"`, the dragged piece is held **above** the finger with a dashed ghost at its origin and a faint connector, drawn via imperative DOM writes (modelled on `drawMarquee`). *(As built in P5, amended from the first draft: the lift is baked into the existing grab offset, so the piece's real position — and therefore the picture, the heat and the data — is where it is drawn, with the finger as a handle below it. The first draft said "render offset, never a data offset", but a render-only offset would have shown the heat for the spot under the thumb while drawing the piece elsewhere. Nothing moves on the press itself, so a tap never nudges a piece; the lift appears with the first move.)* Touch grab radius is computed from the rendered scale so targets are ≥ ~44 px; mouse behaviour is unchanged.

---

## Data Models

- **`Scene`**: unchanged (`players`, `possession`, `matchups`).
- **Curated setups**: `PRESETS` in `scene/presets.ts` extended; new `PRESET_TAKEAWAYS: Record<PresetName, string>` and an ordered `CURATED_SETUPS: PresetName[]` for the UI. (User presets in `presetRegistry` remain, dormant.)
- **`OverlayPrefs`** (`ui/prefs.ts`): add `colourBlind: boolean`, `defenseFollows: boolean` (stored only; no behaviour yet); `on` retained for forward compatibility but forced true by the new UI; storage key bumped (`fieldview.overlayPrefs.v2`) with a read-through of the old key that ignores its `on`.
- **`PlayKeyframe`**: add `label?: string` (additive; ≤ `MAX_KEYFRAME_LABEL_LENGTH`).
- **Playback state** (structural): `{ playId, frameIndex, status: "idle"|"playing"|"paused", speed: 0.5|1|2, loop: boolean }`.
- **Selected-player card view-model**: `{ markedBy, nearestDefenderYd, side, movedFromStartYd }` derived from `scene/matchups`, `scene/possession`, `space/explain`, and a start-snapshot of the loaded setup.

---

## API & Interface Design

Component contracts (illustrative):

```ts
// ui/app/FieldViewApp.tsx — layout route; owns store, driver, prefs, selection context
<FieldViewApp />                      // renders <Outlet/>; exposes useFieldViewApp(): { store, mode }

// ui/content/* — frame-agnostic, read state via hooks, never via props from a frame
<SetupList /> <SetupChip /> <PlayList /> <Legend /> <ColourGuide />
<Options /> <PlaybackOptions /> <SelectedPlayerCard /> <Transport /> <Filmstrip />   // Options: Defense follows toggle (stub, "coming soon")

// chrome sets arrange content; neither owns state
<CompactChrome mode="explore"|"watch"|"build" />   // top bar + drawers (hidden at `desktop`)
<DesktopChrome mode=… />                                 // site header + app bar + sidebar + dock (shown at `desktop`)

// playback
createPlaybackController(store, play, opts): { next(), prev(), goto(i), play(), pause(), setSpeed(), setLoop(), dispose() }

// driver: no change in this initiative (follow mode deferred, ADR-33)
```

Routes: `/fieldview` → redirect `/fieldview/explore`; `/fieldview/{explore,watch,build}`; `/fieldview/designer` (unlinked); `/field-view*` → `/fieldview*`.

---

## Implementation Patterns & Conventions

- **No resize listeners** for layout (ADR-15). The one JS check retained is `prefers-reduced-motion` (ADR-27).
- **Frame guard test** (replaces `shellGuard.test.ts`): (a) `FieldCanvas` renders exactly once under `FieldViewApp`; (b) exactly one `MotionDriver`; (c) no component under `ui/content/` imports a frame; (d) no hex colour literal outside `tokens.ts` (extends `tokensGuard`).
- **Stale-prefs hazard:** users who toggled Space View off in the old ribbon have `on:false` in localStorage; the v2 key + read-through prevents an invisible heat.
- **Never lift drag/frame state into React** (ADR-2). Playback (and, later, follow) write imperatively.
- **Placeholders (NFR-6):** any Builder-supplied content, copy or first-guess tuning value is marked `// PLACEHOLDER(fieldview-ui-rework): <what is needed>` (or a `"_placeholder": true` key in JSON) and registered in `docs/fieldview-placeholders.md`. P5 greps for the marker and reconciles it against the register.
- **Engines for unsurfaced features keep their tests** (throwing, motion run, force, matchups, selection). Where a test drove them through a retired UI (ribbon, panel), it is rewritten to drive the engine/canvas API directly.
- **Piece radius** is a token (~11–12 units at 8 px/yd ≈ 22 px on a phone); `pick.ts` grab distance remains independent of visuals.
- **Preset coordinates are yards**, so presets are orientation-agnostic; verify visually after the flip.

---

## Security & Performance

- **Security:** all play data is local JSON validated at the boundary (ADR-7); no network, no new inputs beyond prefs (validated/clamped on read).
- **Performance:** frame budget unchanged (`computeGrid` ≈ 10–12 ms at 220×80×14); no new per-frame React work; filmstrip thumbnails render once per play (static SVG), not per frame; `test:perf` must stay green; Profiler 0-commit drag test must stay green.

---

## Implementation Sequence

1. **P1 render:** orientation, tokens, piece language, heat registration.
2. **P2 frame:** routes, `FieldViewApp`, frames, menu, legend + colour-blind, rotate notice, Build placeholder.
3. **P3 explore ∥ P4 watch:** disjoint pages/content; P3 also retires the old shell. (Defense-following behaviour and Advanced settings are intentionally absent from both.)
4. **P5 touch/QA/cleanup:** lift, grab radius, safe-area, real-device pass, guard tests, dead-code sweep.
