---
summary: "Execution plan for Field View across six partitions. P1 freezes the scene model and routes; P2 (whiteboard UI) and P3 (headless space model) run concurrently off it; P4 adds the keyframe designer; P5 integrates the heatmap overlay UI; P6 runs the client acceptance pass and polish. Lifecycle opens a PR only at the initiative->main boundary, so feature branches merge directly into initiative/field-view."
phase: "tasks"
when_to_load:
  - "When selecting the next implementation task or checking partition progress."
  - "When verifying which acceptance criteria a task is meant to satisfy."
depends_on:
  - "prd.md"
  - "ux.md"
  - "tech-design.md"
  - "approach.md"
modules:
  - "frontend/src/fieldview"
  - "frontend/src/router.tsx"
index:
  scene_foundation: "## Partition: feat/scene-foundation"
  whiteboard: "## Partition: feat/whiteboard"
  space_model: "## Partition: feat/space-model"
  play_designer: "## Partition: feat/play-designer"
  heatmap_overlay: "## Partition: feat/heatmap-overlay"
  acceptance_polish: "## Partition: feat/acceptance-polish"
  initiative_boundary: "## Initiative Boundary"
next_section: "## Partition: feat/acceptance-polish"
---

# Tasks: Field View

<!-- Lifecycle: PR at initiative->main only. No feature-boundary PR tasks. -->

## Partition: feat/scene-foundation

> Implementation note: two small files not named in approach.md were added within
> the declared module scope — `render/coords.ts` (yard→pixel transform, factored
> out of `fieldLayer.tsx` so the whiteboard partition's piece layer can reuse it)
> and `pages/FieldStage.tsx` (the shared static-scene SVG wrapper used by both
> `Whiteboard.tsx` and `Designer.tsx`, holding crude placeholder piece circles
> until P2 replaces them with `render/pieceLayer.tsx` + `render/tokens.ts`).

- [x] Define `scene/types.ts`: `Team`, `Role`, `Vec2`, `Player`, `Scene`; disc derived from the thrower, never stored <!-- id: 1 -->
- [x] Define `scene/field.ts`: 110 × 40 yd field, 20-yd endzones, brick marks at 20 yd, +x attacking, bounds clamp helper <!-- id: 2 -->
- [x] Implement `scene/scene.ts` pure ops: `movePlayer`, `moveThrower` (carries the mark by the same delta), all clamping to field bounds <!-- id: 3 -->
- [x] Implement `scene/store.ts`: mutable subscribe-store with `getScene`/`mutate`/`subscribe`/`onFrame`, coalescing all mutations in a frame into one rAF callback (ADR-2) <!-- id: 4 -->
- [x] Author `scene/presets.ts` with the four built-in setups from PRD FR-2.5 as coordinate **data** — a first pass, not a calibration exercise; the client replaces these later <!-- id: 5 -->
- [x] Build `render/fieldLayer.tsx`: SVG sidelines, goal lines, brick marks, attacking-direction indicator, and the yard→pixel transform (pixels exist only in `render/`) <!-- id: 6 -->
- [x] Add `pages/Whiteboard.tsx` and `pages/Designer.tsx` shells rendering a static preset scene <!-- id: 7 -->
- [x] Wire `/field-view` and `/field-view/designer` into `frontend/src/router.tsx` and add the nav link in the encyclopedia `Layout` <!-- id: 8 -->
- [x] Tests: scene ops (incl. thrower-carries-mark and clamping), preset integrity (14 pieces, in bounds), store frame coalescing, `scene/` imports-nothing-from-React check, and no regression to existing router tests <!-- id: 9 -->
- [x] Reflect: update specs to match implementation; confirm all P1 acceptance criteria in approach.md are met <!-- id: 10 -->

## Partition: feat/whiteboard

> Implementation notes:
> - jsdom has no `PointerEvent` constructor (confirmed via direct probe), so
>   `clientX`/`clientY` never reached handlers in RTL's `fireEvent.pointer*`.
>   Fixed with the standard workaround — aliasing `window.PointerEvent` to
>   `window.MouseEvent` in the shared `intake/tests/setup.ts` (PointerEvent
>   extends MouseEvent in real browsers, so this is transparent in production).
> - "Duplicate-name handling" (task 34) is satisfied by construction rather
>   than by an explicit check: user preset `id`s are always
>   timestamp+random-generated, so two presets sharing a display `name` is
>   harmless (both list correctly, neither overwrites the other).
> - `render/coords.ts` grew two small additions beyond P1's yard/pixel
>   transform: `getStageViewBox`/`viewBoxToString` (shared by `FieldStage.tsx`
>   and the new interactive stage in `Whiteboard.tsx`, so their viewBoxes —
>   and therefore pointer math — never drift apart) and `clientToYard` (the
>   inverse transform drag needs). `pages/FieldStage.tsx` (P1) was updated in
>   this partition to read `render/tokens.ts` instead of its original literal
>   colours, per ADR-10.

- [x] Produce the mock-up at `.cicadas/active/field-view/mockups/whiteboard-overlay.html` (field + rail + pieces + legend + readout, static representative heatmap) and share it for early signal — **non-blocking**, the binding review is task 131 <!-- id: 20 -->
- [x] Build `render/tokens.ts` — every piece and field visual token (colour, radius, stroke, glyph, label style) in one module; components read tokens and never hardcode a visual value (ADR-10) <!-- id: 21 -->
- [x] Build `render/pieceLayer.tsx`: SVG pieces reading `tokens.ts` — offense/defense distinct, thrower and mark individually identifiable, mark directional, disc docked to the thrower <!-- id: 22 -->
- [x] Implement pointer drag: mouse + touch, imperative SVG transforms writing to the store, zero React state per pointer move (ADR-2) <!-- id: 23 -->
- [x] Verify drag behaviour: thrower carries the mark, mark drags independently, pieces clamp at boundaries, hit areas ≥ 44 × 44 px <!-- id: 24 -->
- [x] Confirm there is no force control anywhere in the UI — the mark's bearing is the only force input (FR-2.3) <!-- id: 25 -->
- [x] Define `scene/presetFormat.ts` — `PresetFile` as a one-keyframe `PlayFile`, plus validation that strips any incoming `builtin` flag (ADR-9) <!-- id: 26 -->
- [x] Implement the `PresetRegistry`: built-ins and `localStorage` user presets on one path — `list`/`save`/`rename`/`remove`/`importFile`/`export`; validate on read and drop corrupt entries with a notice <!-- id: 33 -->
- [x] Build `ui/PresetMenu.tsx`: grouped `Built-in` / `Your presets` list, one-click loading, `Save current as preset` with inline naming, rename/delete/export on user presets only, the `Replace the current setup?` confirm on a modified scene, duplicate-name handling, and 5 s `Undo` on delete (FR-2.6) <!-- id: 34 -->
- [x] Implement `render/exportImage.ts` — `Export frame` → PNG; resolve SVG-over-canvas compositing here, with the draw-pieces-to-canvas fallback if needed <!-- id: 27 -->
- [x] Add keyboard piece movement: focusable pieces, 1 yd per arrow key, 5 yd with Shift; verify focus order <!-- id: 28 -->
- [x] Tests: RTL pointer-event drag, thrower-carries-mark, clamping, preset save→reload→load round-trip, preset export/import fidelity, `builtin`-flag stripping, corrupt-`localStorage` tolerance, built-ins undeletable, confirm flow, export invocation, a no-visual-literals-outside-`tokens.ts` guard, axe-core clean on `/field-view` <!-- id: 29 -->
- [x] Reflect + Code Review; confirm all P2 acceptance criteria are met <!-- id: 30 -->

## Partition: feat/space-model

> Runs concurrently with `feat/whiteboard`. Headless — **no UI in this partition.**

> Implementation notes:
> - **Vert preset recalibrated** (`scene/presets.ts` — outside this partition's
>   declared modules; a data-only change, signalled). The P1 first-pass vert
>   defense (all defenders trailing ±2 off a 20-yd-long stack) does not
>   exhibit the brief's §8.1 calibration under the transcribed model: with no
>   last back, no bracket, and no open-side sag, the empty mid-depth wings,
>   the stack shoulders, and the deep third all outscore the near-thrower
>   open lane (probed at 0.68–0.78 vs ≈0.62). The recalibrated preset is a
>   realistic vert-vs-man look — mark angled upfield-lateral (force takes the
>   break-side downfield wedge), 2-yd stack spacing ending at gain 20, two
>   unders, a sag into each mid-depth half, and a deep-centre last back.
>   Cutter 1 stays at (50, 20), which `drag.test.tsx` depends on. §8.1 now
>   holds as a global-argmax property. Deep Help / Horizontal / Flat Mark
>   presets untouched.
> - Each §4.3 layer exists once, as a scalar kernel (`markKernel`,
>   `coverageKernel`, `laneFactorFast`/`laneKernel`, `valueKernel`) carrying
>   the brief's formula as its comment; the tech-design's Scene-signature
>   functions (`comp`/`mark`/`coverage`/`lane`/`value`) are thin wrappers over
>   those kernels, so the hot path and the public API cannot drift apart.
> - Hot-path work beyond the plan: the lane bump uses d⊥² directly (no sqrt),
>   defender−thrower deltas are precomputed per grid, and defenders beyond
>   coverage reach (τ_i ≥ t_f − COV_SS_LO) skip both smoothsteps via a
>   squared-distance early-out.
> - Readout labels (`explain.ts`) derive from the ramp's interior anchors
>   applied to the gamma'd score — closed below 0.42, strong from 0.68 — so
>   the verbal label and the paint never disagree.
> - §8.4's "no deep defender" baseline is the Flat Mark preset (symmetric,
>   all defenders underneath); the recalibrated vert has a last back by
>   design, and §8.1 + §8.4-clause-1 are mutually exclusive on one scene.
> - **Measured budget (id 58)**: `computeGrid` on the full 220 × 80 × 14
>   problem: best 9.9 ms / avg ~10 ms (M-series laptop, Node/vitest),
>   asserted < 12 ms in `spaceBench.test.ts` — leaving ~6 ms of the 16 ms
>   frame for paint in `feat/heatmap-overlay`. `GRID_STEP` remains the
>   pressure valve (ADR-4).

- [x] Transcribe `space/constants.ts` from brief §4.4: defaults + slider ranges + fixed constants; this is the only file where those numbers may appear <!-- id: 40 -->
- [x] Implement `space/math.ts`: `ss` (clamped-Hermite smoothstep), `wrap`, `bearing`, `clamp`, point-to-segment projection <!-- id: 41 -->
- [x] Implement `space/layers.ts` — `comp`, `mark`, `coverage`, `lane`, `value` as five separate exported functions, each with the brief's formula transcribed verbatim as its comment (ADR-5) <!-- id: 42 -->
- [x] Implement the lens as a single branch inside `coverage` — `defense-only` skips only the `beat` term; no second pipeline (ADR-6) <!-- id: 43 -->
- [x] Implement `space/score.ts`: `scoreCell` (product of the five factors) and `computeGrid` at `GRID_STEP`, with per-defender precompute outside the cell loop and an allocation-free reused output buffer <!-- id: 44 -->
- [x] Implement layer toggles by substituting `1.0` at the call site in `score.ts`, never by branching inside a layer function <!-- id: 45 -->
- [x] Implement `space/explain.ts` → `CellExplain` (distance, flight time, nearest defender arrival, best cutter effective arrival, score, verbal label) <!-- id: 46 -->
- [x] Implement `space/palette.ts`: `score^0.7` gamma, ramp stops `#D64B4A`/`#EF9F27`/`#97C459`/`#4F941D` → RGBA <!-- id: 47 -->
- [x] Unit-test each layer function directly against the brief's formulas <!-- id: 48 -->
- [x] **FR-3.2 regression test** — remove all six cutters and assert far open-side space still scores open (no receiver-reachability gate anywhere) <!-- id: 49 -->
- [x] Acceptance test §8.1 — open-side lane 5–15 yd upfield is the highest-scoring region on the vert/force-side preset <!-- id: 50 -->
- [x] Acceptance test §8.2 — break side behind the shadow scores lowest near the force bearing, rises with angular distance; short break-side reset escapes the shadow <!-- id: 51 -->
- [x] Acceptance test §8.3 — wide-open dump/reset scores above the closed threshold (yellow, never red) <!-- id: 52 -->
- [x] Acceptance test §8.4 — deep third mid-range with no deep defender; *deep help* preset lowers it; a deep cutter raises it again <!-- id: 53 -->
- [x] Acceptance test §8.6 — cutter adjacent to its matched defender yields contested mid-range scores, with no special-casing in the code <!-- id: 54 -->
- [x] Acceptance test §8.7 — a lane-parked defender lowers scores behind it even where it cannot beat the disc <!-- id: 55 -->
- [x] Acceptance test §8.8 — each of the 6 sliders and 4 layer toggles produces a non-zero score delta on default presets <!-- id: 56 -->
- [x] Guard tests: `space/` imports nothing from React/DOM/canvas; no brief-§4.4 constant appears outside `space/constants.ts` <!-- id: 57 -->
- [x] Benchmark `computeGrid` on 220 × 80 × 14 and record the measured budget in the spec <!-- id: 58 -->
- [x] Reflect + Code Review; confirm all P3 acceptance criteria are met <!-- id: 59 -->

## Partition: feat/play-designer

> Implementation notes:
> - **Client gate (id 71) closed**: schema approved as drafted, with one
>   forward-looking requirement — *annotations* (arrows, text, cone markers)
>   are wanted "at some point". Their shape is deliberately **not** designed
>   yet; instead the key name is reserved in `format.ts` and the guarantee
>   that makes adding them additive is now enforced in `validate.ts`:
>   **unknown keys are dropped, never rejected**, so a future v1.x annotated
>   play still imports into a reader that predates annotations. Covered by a
>   test that imports a play carrying `annotations` and asserts it loads and
>   the key does not survive.
> - `PlayEntity` moved to `play/format.ts` (P2 had declared it in
>   `scene/presetFormat.ts`); presetFormat now re-exports the type. One line
>   in `scene/` — outside this partition's declared modules, type-only, no
>   behaviour change — so a preset and a play cannot drift apart on identity.
> - **Reorder is retime.** Chips lay out by timestamp, so dragging a chip
>   past its neighbour changes its `t` and the parent re-sorts. One source of
>   truth for ordering rather than an index that timestamps could contradict.
>   Keyframe 1 is pinned at 0.0s (the play's origin): retiming it would
>   silently reinterpret every other timestamp.
> - **Keyframes live in a ref, not state** (ADR-2 extended to Mode 2). With a
>   chip selected, each coalesced frame writes the live scene into that
>   keyframe — so "select a chip, drag a piece, the keyframe updates in
>   place" needs no save step and no per-frame React render. React state
>   carries only structure (chip count, selection, playhead).
> - **Edits blocked** while playing or scrubbed between keyframes via a new
>   optional `disabled` prop on `render/pieceLayer.tsx` (pointer-events off,
>   `tabIndex -1`, `aria-disabled`) — a second small change outside the
>   declared modules, chosen over a `pointer-events: none` wrapper so the
>   keyboard nudge path is blocked too, not just the pointer.
> - `play/modeHandoff.ts` carries the whiteboard scene into Designer over
>   `sessionStorage` (the two modes are separate routes with separate
>   stores). The scene is explicitly not persisted across sessions; the
>   stash is consumed on read.
> - `FilePlayStore.loadFromFile` reads via `FileReader` when `Blob.text()` is
>   absent (older Safari, and jsdom) — a failed read would otherwise surface
>   to the user as the wrong message, "this isn't a Field View play".
> - Three P2 test files now wrap `<Whiteboard />` in `MemoryRouter` (it gained
>   a `Link` to Designer), and the two P1 tests asserting the Designer stage's
>   `role="img"` now expect `role="group"` — its pieces are interactive, and
>   an image role forbids interactive descendants (same rationale as P2's
>   whiteboard stage).

- [x] Define `play/format.ts`: `PlayFile` v1 (`formatVersion`, `name`, `description`, explicit `field`, `entities`, sorted `keyframes`, `interpolation: "linear"`) + `PLAY_FORMAT_VERSION` <!-- id: 70 -->
- [x] **STOP — client review of the play JSON schema before it is treated as a site-wide contract** (brief §10; the one client gate the spec review left open) <!-- id: 71 -->
- [x] Implement `play/serialize.ts` (`toPlayFile`/`fromPlayFile`) behind the `PlayStore` seam with `FilePlayStore` (ADR-8) <!-- id: 72 -->
- [x] Implement `play/validate.ts`: boundary validation of untrusted imports — shape, ranges, roster integrity, newer-version rejection, known-keys-onto-fresh-objects, length-capped strings <!-- id: 73 -->
- [x] Implement `play/tween.ts` — `sampleAt(play, t)` pairing entities by stable `id`, never array index <!-- id: 74 -->
- [x] Build `ui/Timeline.tsx`: keyframe chips laid out proportionally by timestamp, draggable playhead, select, add, delete, reorder, inline retime <!-- id: 75 -->
- [x] Implement transport: play/pause/scrub with real-time linear tweening; drag disabled while playing <!-- id: 76 -->
- [x] Handle the single-keyframe state (Play disabled + `Add a second keyframe to play.`) and the between-keyframes state (edits blocked + `Select a keyframe to edit, or add one here.` inserting a keyframe at the playhead) <!-- id: 77 -->
- [x] Implement delete-with-5s-`Undo` toast <!-- id: 78 -->
- [x] Build `ui/PlayMeta.tsx`: name/description (text nodes only, never `dangerouslySetInnerHTML`), `Export play`, import <!-- id: 79 -->
- [x] Carry the whiteboard scene into Designer mode as keyframe 1 at `0.0s` on mode switch <!-- id: 80 -->
- [x] Tests: export→import round-trip fidelity, malformed/wrong-type/newer-version rejection leaving the scene untouched, tween correctness under reordering, timeline RTL interactions, axe-core clean on `/field-view/designer`, full keyboard operation of the timeline <!-- id: 81 -->
- [x] Reflect + Code Review; confirm all P4 acceptance criteria are met <!-- id: 82 -->

## Partition: feat/heatmap-overlay

> Integration only — **this partition must not modify any file under `space/`.**

> Implementation notes:
> - **Measured budget (id 109)**: grid 9.42 ms + paint 0.70 ms = **10.18 ms**
>   best-of-30 on the full 220 × 80 × 14 problem (M-series laptop,
>   Node/vitest, `drawImage` stubbed since the upscale is the browser's cost,
>   not ours). Comfortably inside the 16 ms frame; asserted < 16 ms in
>   `overlay.test.tsx` and the colourise pass alone < 6 ms in
>   `heatmap.test.ts`. `GRID_STEP` remains the pressure valve (ADR-4).
> - The `space/`-untouched guard (id 112) is enforced against **git**
>   (`git diff --name-only initiative/field-view...HEAD`) in
>   `tests/spaceUntouched.test.ts`, not against file contents — the claim is
>   about the diff. Skips rather than fails when the base ref is absent
>   (shallow clone, post-merge checkout). This added `@types/node` as a
>   devDependency, the partition's only new dependency.
> - **`ui/FieldCanvas.tsx` is a new shared stage** not named in approach.md:
>   both pages previously built their own `<svg>`, and the overlay is a
>   toggle on both routes (id 106). Rather than duplicate the canvas/SVG
>   stack, the stage moved into one component that owns the frame loop.
>   `Whiteboard.tsx` and `Designer.tsx` now render `<FieldCanvas>`.
> - **Hover readout is imperative** (`CellReadout` exposes `update()` via
>   `useImperativeHandle`; pointer tracking is a native listener on the SVG,
>   not a React prop). A hover is a 60 Hz event, so a props-driven readout
>   would put React back in exactly the path ADR-2 exists to keep it out of.
>   The render-count test asserts **0 commits across 25 pointer moves**.
> - The readout is skipped while a piece drag is in progress (pointerdown
>   inside a `[role="button"]` sets a dragging flag) — during a drag the
>   scene is being rearranged, not inspected.
> - `prefs.ts` lives at `ui/prefs.ts` and validates on read: a hand-edited or
>   version-skewed entry falls back to defaults and out-of-range slider
>   values are clamped, same posture as the preset registry (P2) and the play
>   importer (P4).
> - **Export regression fixed.** `Export frame` (P2) rasterized the SVG only,
>   so once the heatmap moved to its own canvas the PNG would have silently
>   lost the map. `exportFrameAsPng` takes an optional overlay layer and
>   composites it underneath, in the same order as the live stack (ADR-3).
> - Reduced motion (id 111) is structural: the only transition in the overlay
>   is the canvas fade, and it carries Tailwind's `motion-safe:` prefix. The
>   live repaint and playback tweening are canvas/transform work with no CSS
>   animation, so nothing suppresses them. Asserted in `overlay.test.tsx`.
> - §8.5 (id 110) is verified as a model-level property through the public
>   API — mirroring the mark across the thrower flips which side of the
>   near-thrower band scores higher, and swinging the thrower re-scores >10%
>   of the field. `space/` is read, never modified.

- [x] Build `render/heatmap.ts` against a *synthetic* grid first: offscreen `ImageData` at grid resolution, single upscaled `drawImage` with `imageSmoothingEnabled`; measure before wiring the real model <!-- id: 100 -->
- [x] Build `ui/FieldCanvas.tsx`: stack the heatmap canvas beneath the SVG layers, own the rAF loop, subscribe via `store.onFrame` <!-- id: 101 -->
- [x] Wire `computeGrid` into the frame loop and verify the map repaints on `pointermove`, not on release (FR-2.1) <!-- id: 102 -->
- [x] Build `ui/OverlayRail.tsx`: `SPACE` toggle, `Offense`/`Defense only` lens with helper sentences, four layer toggles, three-swatch legend <!-- id: 103 -->
- [x] Build `ui/TuningPanel.tsx`: six sliders (collapsed by default) with live numeric values, repaint during slider drag, `Reset to defaults`, and a modified marker on the header <!-- id: 104 -->
- [x] Build `ui/CellReadout.tsx`: hover sampling via `explainCell`, live region, cell reticle, and the defense-only variant that drops the cutter row <!-- id: 105 -->
- [x] Mount the overlay in both `/field-view` and `/field-view/designer` (it is a toggle, not a route) <!-- id: 106 -->
- [x] Implement `prefs.ts`: persist rail/tuning preferences in `localStorage`; do **not** persist the scene <!-- id: 107 -->
- [x] Add the `?perf=1` dev frame-timing readout (grid-compute ms + paint ms) <!-- id: 108 -->
- [x] Verify §8.9 — recompute + paint within the frame budget while dragging on ordinary hardware; record the measurement <!-- id: 109 -->
- [x] Verify §8.5 — dragging the mark side-force→flat rotates which side is closed, and swinging the thrower flips strong space, live during the drag <!-- id: 110 -->
- [x] Apply `prefers-reduced-motion` to the overlay fade and chip transitions only — never to the live repaint or playback tweening <!-- id: 111 -->
- [x] Tests: render-count assertion (zero React re-renders per pointer move), RTL for rail/tuning/readout, axe-core on both routes, perf test, and a guard that no `space/` file changed in this branch <!-- id: 112 -->
- [x] Reflect + Code Review; confirm all P5 acceptance criteria are met <!-- id: 113 -->

## Partition: feat/acceptance-polish

> Implementation notes:
> - **The P5 `space/`-untouched guard was retired** (`tests/spaceUntouched.test.ts`
>   deleted). It was scoped to `feat/heatmap-overlay` and did its job there
>   (verified non-vacuous by confirming it failed on a throwaway branch that
>   touched `space/`). Keeping it would forbid *every* future branch from
>   touching `space/` — including this one, which may need `RAMP_STOPS` edits
>   from the task-131 review.
> - **Perf assertions moved out of the parallel suite.** `spaceBench` and the
>   §8.9 frame-budget test were both flaky under full-suite CPU contention
>   (grid measured 16–21 ms against a ~9.4 ms isolated figure; the frame
>   measured 28–32 ms against 10.18 ms) — pure scheduling, not code. They now
>   assert the real budget only under `npm run test:perf`
>   (`--no-file-parallelism`), and keep a loose order-of-magnitude ceiling in
>   the everyday run. **Isolated: grid 10.93 ms (< 12), frame 10.10 ms (< 16).**
>   A timing assertion that fires on a busy machine trains people to ignore it.
> - Also de-flaked one P4 test that asserted the SVG had *not* repainted yet —
>   a race on a loaded machine. The synchronous-flush behaviour it guards is
>   proven by the exported value instead of by DOM timing.
> - **Bug found by looking at the running app, not by the tests** (this is why
>   the manual pass exists): the hover readout's idle skeleton was visible in
>   a real browser. `CellReadout` hid it with the `hidden` attribute, which is
>   `display: none` at the lowest specificity — and the element also carries
>   Tailwind's `flex`, which wins. jsdom's `toBeVisible()` only reads the
>   attribute, so every test passed against a visibly broken UI. Now hidden by
>   inline style, with a regression test that asserts the inline style rather
>   than the attribute.
> - Breakpoint work is CSS-only (no resize listener, no hydration flash): the
>   sub-768 notice is `md:hidden` and the tool is `hidden md:flex`. Rail is a
>   horizontal bar until `xl` (1280) and a 320 px column above it, matching
>   ux.md's tablet/desktop split. `responsive.test.tsx` asserts the class
>   contract and is explicit that jsdom cannot verify computed layout — the
>   visual confirmation belongs to the manual pass.
> - The sub-768 notice carries its own `h1` with distinct wording. Only one of
>   the two headings is ever displayed (the other is `display: none`, so it is
>   out of the a11y tree), but distinct text keeps DOM-level queries
>   unambiguous.
> - Verified in a real browser at 1440 px: heatmap paints, prefs persist across
>   a reload, hover readout populates coherently (verdict matches the paint),
>   and `?perf=1` reports **grid 3.1 ms · paint 0.5 ms · total 3.6 ms** —
>   roughly 3× faster than the Node/vitest figure, as expected.

- [x] Write `.cicadas/active/field-view/acceptance-checklist.md` mapping all nine §8 checks to their automated test or manual script, each marked automated/manual <!-- id: 130 -->
- [~] **DEFERRED past the initiative boundary by Builder decision (2026-07-27)** — the manual acceptance checks and the end-of-initiative visuals/presets/UI review now run against a *deployed preview* rather than localhost, so the initiative merges to `main` with this review outstanding. Rationale and consequences recorded in `acceptance-checklist.md` → "Where the manual review happens". This is a sequencing choice, **not** a passed check. <!-- id: 131 -->
- [~] Apply the review's adjustments — deferred with 131. Lands as a follow-up `tweak/` branch off `main` (Cicadas lightweight path), which suits the work: ADR-9 and ADR-10 confine it to `render/tokens.ts`, `scene/presets.ts`, and `space/constants.ts`. <!-- id: 132 -->
- [x] Implement the tablet layout (768–1279 px): field full-width, rail as a horizontal control bar, touch drag verified <!-- id: 133 -->
- [x] Implement the sub-768 px message pointing to desktop/tablet instead of a broken canvas <!-- id: 134 -->
- [x] Full a11y sweep: axe-core clean on both routes at both breakpoints, full keyboard traversal, reduced-motion verification <!-- id: 135 -->
- [x] Run the full frontend suite and confirm no regressions to the existing 107 frontend tests <!-- id: 136 -->
- [x] Reflect + Code Review; confirm all P6 acceptance criteria are met <!-- id: 137 -->

> **Code Review (P6, feat/acceptance-polish → initiative/field-view).** Verdict: **pass**.
> Diff is 13 files, +345/−109, inside the declared module scope (tests, pages, ui).
> - No blocking findings. The one thing worth checking — that wrapping both routes in
>   `hidden md:flex` leaves a phone mounting a live rAF loop — does not happen: `paint()`
>   early-returns while the overlay is off, and repaints are driven by `store.onFrame`
>   (scene mutations only), not a free-running loop.
> - Advisory, fixed in review: the JSX bodies of both page components were left at their
>   original indentation after being wrapped in a fragment. Re-indented; `tsc` and 336/336 green.
> - Advisory, accepted: `test:perf` uses POSIX `VAR=value` prefix syntax and will not run
>   under Windows `cmd`. The repo is already macOS/POSIX-only in its tooling; adding
>   `cross-env` for one script is not worth the dependency.
> - `spaceUntouched.test.ts` was deleted deliberately: it was a P5-scoped guard asserting
>   `space/` stayed untouched, and would have wrongly blocked P6.

## Initiative Boundary

- [ ] Open PR: initiative/field-view -> main and await merge approval before continuing <!-- id: 200 -->
