# Module: fieldview

Play-design toolset at `/fieldview` and `/fieldview/designer` (renamed from `/field-view`, which
still redirects — the client has the old URLs). One shared scene model exposed
three ways: a coaching whiteboard, a keyframed play designer, and a live strong/weak space
heatmap implementing the client's validated space model. Entirely client-side — no backend
calls, no new dependencies. Lives under `frontend/src/fieldview/`; see
[`modules/frontend.md`](frontend.md) for the surrounding SPA.

The field renders **vertically, offense attacking up the screen**, inside a three-pane
"Light Film Room" shell (`ui/shell/`) on desktop and a bottom sheet on phones. **There is no
minimum viewport** — mobile-at-practice is a primary use case, not a blocked one.

The scene models a *play*, not just a formation: **possession** is explicit state, every defender
carries a **matchup**, and a throw is one click that moves the disc, the roles, and the mark
together. **Force is not stored** — it is read back from where the mark stands.

Since 2026-07-31 the model also has **time**. A coach gives an offensive player one or more
destinations and presses Run: the cut plays out under real acceleration limits while the assigned
defender pursues it non-naively, and the disc *travels* to a receiver rather than teleporting.

## Layout

- `scene/` — the shared model. `types.ts` (Team/Role/Vec2/Scene — Scene owns `possession` and
  `matchups`), `field.ts` (geometry, clamping), `scene.ts` (pure ops), `selection.ts`
  (`SelectionState` union + pure transitions), `possession.ts` (**`normalize()` — the only writer
  of `Player.role`** — plus `throwTo`, `nearestDefender`), `matchups.ts` (`autoAssign`,
  `reassign` with the 1-to-1 swap, `guardedBy`), `force.ts` (pure geometry: presets, `markPosFor`,
  `readForce`), `store.ts` (mutable subscribe-store, rAF-coalesced, **plus a selection field on its
  own subscriber set**), `presets.ts` + `presetRegistry.ts` + `presetFormat.ts` (built-ins and user
  presets on one path).
- `space/` — the headless model, framework-free and UI-free. `constants.ts` (tunables,
  `RAMP_STOPS`, `GAMMA`), `math.ts`, `layers.ts` (the five layer functions), `score.ts`
  (`computeGrid`), `explain.ts` (`explainCell`), `palette.ts`, `types.ts`.
- `motion/` — the second headless model, framework-free and UI-free, built to `space/`'s contract.
  `types.ts` (`Mover`, `Route`, `MotionState`, `MotionParams`, `Trajectory`, `DiscFlight`),
  `constants.ts` (every motion tunable + ranges, `DT`, the clamps and ceilings), `vec.ts`,
  `kinematics.ts` (`arrive()` — accel-limited steering with arrival braking), `route.ts` (leg
  sequencing), `pursuit.ts` (the cushion model), `step.ts` (**the single physics entry point**),
  `simulate.ts` (the same stepper run headlessly → `Trajectory`, plus `sampleAt`), `disc.ts`
  (flight interpolation; duration delegated to `space/layers.ts`).
- `ui/motion/` — the impure half. `driver.ts` (fixed-timestep accumulator over rAF, **the only
  wall-clock reader in the module**, plus the disc's own flight loop), `motionMode.ts` (transient
  routes / picking / run status as an external store), `useMotionRun.ts` (status only, never
  positions), `driverContext.tsx` (per-page provider, on the `sceneStore.tsx` pattern).
- `render/` — `tokens.ts` (**every** piece and field visual, plus `SHELL_TOKENS` for shell
  chrome), `fieldLayer.tsx`, `pieceLayer.tsx`, `heatmap.ts` (canvas painter), `coords.ts` (**the
  only place orientation lives**), `exportImage.ts` (PNG, composites heatmap under SVG), `routeLayer.tsx` (the selected player's
  numbered waypoint markers and dashed legs).
- `play/` — `format.ts` (the versioned `PlayFile` contract, owns `PlayEntity`; **v2** adds optional
  `possession`/`matchups`), `validate.ts` (boundary guard), `backfill.ts` (**the one place a
  `Scene` is built from stored data** — recovers possession/matchups, then normalizes),
  `serialize.ts` (`PlayStore` seam + `FilePlayStore`), `tween.ts` (linear interpolation, pairs
  entities by stable id), `modeHandoff.ts` (whiteboard→designer scene stash).
- `ui/` — `FieldCanvas.tsx` (shared stage, owns the frame loop; also writes selection to the
  store), `CellReadout.tsx`, `Timeline.tsx`, `PlayMeta.tsx`, `PresetMenu.tsx`, `prefs.ts`
  (localStorage overlay prefs, **a shared external store** — see Conventions).
  `OverlayRail.tsx` / `TuningPanel.tsx` / `AdvancedPanel.tsx` survive **only for
  `Designer.tsx`**, which still composes the pre-shell layout; the whiteboard no longer uses
  them. `SmallScreenNotice.tsx` is gone.
- `ui/shell/` — the Light Film Room chrome. `ShellLayout.tsx` (three-pane desktop grid /
  mobile sheet, CSS-only switch at `lg` = 1024 px), `LeftSidebar.tsx`, `RightSidebarSlot.tsx`
  (Play Designer placeholder), `ToolRibbon.tsx` (shared row of 4, desktop + mobile),
  `BottomSheet.tsx` (mobile), `panelRegistry.ts`, `useSelection.ts`, and `panels/`
  (`DefaultVisibilityPanel`, `AdvancedSettingsPanel`, and three `PENDING` placeholders).
- `pages/` — `Whiteboard.tsx` (composes `ShellLayout`), `Designer.tsx` (**not** shell-composed
  yet), `FieldStage.tsx`.

## Key decisions

- **ADR-1** — the space model is a pure, framework-free library. No React, no DOM, no canvas.
  Testable as mathematics.
- **ADR-2** — mutable subscribe-store + rAF loop; **React is never in the drag path**. A
  `Profiler` test records 0 React commits across 25 pointer moves during a drag. Extended by the
  designer (keyframes in a ref) and the overlay (imperative hover readout via
  `useImperativeHandle`). This is the load-bearing performance decision — do not "fix" a
  component here by lifting drag state into React.
- **ADR-3** — canvas heatmap *under* an SVG piece layer, so the model repaints without touching
  the piece tree.
- **ADR-4** — `GRID_STEP = 0.5` yd is a tunable; the renderer reads dimensions from the returned
  buffer rather than recomputing them.
- **ADR-5 / ADR-6** — the model is transcribed from the brief, not re-derived, and layer identity
  is preserved in code. Lens (offense on/off) is a coverage-layer parameter, not a second model.
- **ADR-7** — the play format is versioned and validated at the boundary. `validate.ts` **drops
  unknown keys rather than rejecting them**; that property is the forward-compatibility
  guarantee that lets `annotations` (a confirmed future need, name reserved in `format.ts`) be
  added additively instead of via a `formatVersion` bump.
- **ADR-8** — play persistence is storage-agnostic behind a `PlayStore` interface.
- **ADR-9 / ADR-10** — presets are data behind one registry (a preset is a one-keyframe
  `PlayFile`); all piece and field visuals live in `render/tokens.ts`. Both exist so visual
  feedback costs a token edit, not a component sweep.

### Shell ADRs (fieldview-shell, 2026-07-30)

- **ADR-11 — orientation lives only in `render/coords.ts`.** `yardToPixel`/`pixelToYard` rotate
  downfield yards onto the screen's vertical axis (`FIELD.length - x`, so pixel-y stays
  non-negative). `scene/` stays orientation-agnostic: `+x = attacking` remains a *model* fact,
  never a screen fact. `fieldLayer.tsx`'s `FIELD_PX_WIDTH`/`HEIGHT` are **screen** dimensions and
  are therefore swapped relative to the yard axes; `pick.ts` needed no change at all (pure
  yard-space), and `exportImage.ts` needed none either (it reads the live `viewBox`).
- **ADR-12 — selection lives in the `SceneStore`, never React state.** A `selection` field with
  its **own** subscriber set (separate from `subscribers`/`frameSubscribers`, so a click doesn't
  wake every scene subscriber), read through `useSelection()` → `useSyncExternalStore`. This is
  ADR-2 extended to a second kind of state: `FieldCanvas`'s pointer handlers write selection
  imperatively, and the Profiler test still records 0 React commits during a drag.
- **ADR-13 — the left sidebar's middle section is a typed panel registry.**
  `Record<SelectionStateKind, ComponentType<PanelProps>>` keyed by a closed union, plus
  `registerPanel()`. Downstream initiatives (play model, motion, designer v2) add real panels by
  registering them — **never by editing a shell layout file**. A missing kind is a compile error,
  and `shellGuard.test.ts` asserts the registry starts complete.
- **ADR-14 — one registry, two presentational shells.** `LeftSidebar` (desktop) and `BottomSheet`
  (mobile) read the *same* `panelRegistry` + `useSelection()`; they differ only in chrome. The one
  sanctioned divergence is the mobile SELECTION tab's empty-state copy. Do not grow a second path
  to panel content — drift between the two shells is exactly what this prevents.
- **ADR-15 — the breakpoint switch is CSS-only** (`lg` = 1024 px), continuing the module's
  no-resize-listener rule. Both trees are in the DOM; CSS picks one. Critically, `children`
  (the `FieldCanvas`) renders **exactly once** and is never nested inside a branch that goes
  `display:none` — mounting it twice would make the two instances fight over the single shared
  `svgRef`/`canvasRef`/`stageRef` objects.
- **ADR-16 — shell chrome and canvas keep separate accents.** `SHELL_TOKENS.accent` is `#be185d`
  (matching the `film.*` Tailwind palette the encyclopedia shell already ships); `PIECE_TOKENS`/
  `FIELD_TOKENS` keep `#EF4B8A`. Chrome and game entities mean different things, and the canvas
  palette is still awaiting its own client review — recolouring it here would have pre-empted that.

### Play-model ADRs (fieldview-play-model, 2026-07-31)

- **ADR-17 — possession is stored; `thrower`/`mark` roles are derived.** This *inverts* the old
  derived-disc rule rather than retiring it. `Scene.possession` is the single fact;
  `possession.ts`'s `normalize()` recomputes `thrower` (the possessor) and `mark` (the possessor's
  assigned defender, else the nearest), and every mutation ends with it. **`normalize()` is the only
  writer of `Player.role`** — `tests/modelGuard.test.ts` enforces that both behaviourally (random
  op sequences re-checking the invariant after every step) and statically (grepping source for
  direct `role` assignment). It also clears stale possession, since an id naming an absent or
  defence player would otherwise mean "possession with no thrower" — the same disagreement running
  backwards.
- **ADR-18 — matchups live on `Scene` as a map, not per `Player`.** The invariant that matters
  (it stays a *permutation*; no two defenders share a target) is a property of the whole set, so it
  belongs somewhere it can be validated at once. `reassign()` does a 1-to-1 swap; `null` is explicit
  free roam and cascades nothing. `Player` stays a pure positional record, which is why `PlayEntity`
  needed no change.
- **ADR-19 — force is geometry, never stored.** The space model already answers "what is the
  force?" (`markKernel` derives `θ_shadow` from mark position — brief §4.3, *the mark's position IS
  the force*). So `force.ts` only offers presets that **move the mark**, plus `readForce()` which
  matches the mark's actual offset back to a name or `"custom"`. A stored force would be a second
  answer that can contradict the drawn scene. `FORCE_TOLERANCE_YD` is capped by geometry — it must
  stay under half the smallest gap between presets, or one position satisfies two forces at once —
  and a test asserts that relationship survives any future tuning of the offsets.
- **ADR-20 — play format v2 backfills on read, never migrates on write.** `possession`/`matchups`
  are optional; anything missing is derived at load (`play/backfill.ts`) from the stored `thrower`
  role and `autoAssign()`. Nothing rewrites stored data, so a user who never re-saves keeps a valid
  v1 file indefinitely. Consistent with ADR-7: forward compatibility is a property of the reader.
- **ADR-21 — transient interaction state stays out of `Scene`.** Throwing mode lives in
  `ui/shell/throwMode.ts`, not on the scene, because `Scene` is *what a play is* — putting it there
  would leak "was the throw tool armed" into the play format, into presets, and into Initiative D's
  frames, where it is meaningless.

### Motion ADRs (fieldview-motion, 2026-07-31)

- **ADR-22 — one stepper, driven live or run headlessly.** `motion/step.ts` exports a single pure
  `step(state, dt, motionParams, spaceParams)`. The live driver calls it once per fixed substep;
  `simulate()` calls the *same* function in a loop to a settle, recording a `Trajectory`. A test
  asserts `n × step(DT)` equals `simulate()` sampled at `n·DT` **exactly** — which is the guarantee
  Initiative D replays against instead of storing baked positions or re-deriving physics. The cost
  is that `MotionState` must be entirely self-contained: nothing read from a closure, a module
  variable, or the `Scene`. `step()` **consumes** its input (the reaction ring is written in place,
  because copying it every substep is O(movers × react/dt) of garbage at 120 Hz); `simulate()`
  clones on entry, and a test proves callers are protected.
- **ADR-23 — the defender seeks a cushion point on a delay, not the cutter.** Pursuit steers at
  `lead = cutterPos(t−react) + cutterVel(t−react)·leadTime`, pushed `cushion` yards goalside along
  the disc→cutter axis. Gap-closing, carrying a deep cut, and matching lateral movement are all
  *consequences* of that one expression rather than three hand-coded rules that fight at the
  boundaries — and because the input is delayed, a direction change costs the defender exactly
  `react` seconds of committed momentum, which is why a two-part cut beats it and a straight cut
  does not. **The velocity lead is load-bearing and was discovered in implementation:** with a fixed
  cushion alone, a defender playing 10 yd deep of a cutter breaking deep drifts *under* to reclaim
  its cushion instead of turning. Cushion is fixed; the lead is what scales with speed. Falls back
  to a plain delayed follow when nobody has the disc (no axis to be goalside of).
- **ADR-24 — motion never redeclares `vmax`, `react`, or a flight time.** Those are `SpaceParams`
  and `space/layers.ts`'s `flightTime()`, and the heatmap the coach is looking at is computed from
  them. A second answer would let the overlay say a cutter reaches a cell while the animation shows
  it cannot — canon ADR-17/ADR-19's failure mode in a third place. `motionGuard.test.ts` fails the
  build on a *value* being stated for either (type annotations and property reads are fine and are
  the point). Consequence: the `vmax` slider moves both models, and the sliders stay in one panel.
- **ADR-25 — motion state is transient.** Routes, run status, pre-run positions and in-flight disc
  state live in `ui/motion/motionMode.ts` and `ui/shell/throwMode.ts`. `Scene` gains no fields and
  the play format is **not** versioned up. This is ADR-21 applied unchanged: a pending route is a
  property of this session's pointer, not of the play, and Initiative D will define a better-shaped
  representation of the same idea as part of its action model. A coach therefore cannot yet save a
  route — a deliberate deferral, stated in the panel rather than left to be discovered.
- **ADR-26 — a fixed-timestep accumulator, owned by the page, writing through the store.** Real
  elapsed time is clamped **per frame** (`MAX_FRAME_SECONDS`) then consumed in `DT = 1/120` bites,
  with **one `store.mutate()` per rendered frame, never per substep**. Fixed steps are what make a
  run reproducible whatever the host's frame pacing — the property ADR-22's agreement guarantee and
  Initiative D's replay both rest on. The clamp is per-frame rather than on the running total so a
  backgrounded tab *costs* the run the time it was away instead of replaying it in fast-forward.
  The driver is bound to one `SceneStore` rather than being a singleton, so a second page can own
  its own clock; its provider must be mounted **once per page, wrapping both shells**, since the
  breakpoint is CSS-only and both trees are live (ADR-15). ADR-2 holds throughout: React sees run
  *status*, never positions, proven by Profiler tests at driver and page level.
- **ADR-27 — reduced motion is a JS check here, and that is the sanctioned exception.** The module's
  rule is `motion-safe:` variants and no JS `matchMedia`, which holds for CSS transitions; this is a
  JS integration loop with no CSS to vary, so a variant would silently do nothing. `run()` instead
  calls `simulate()` and applies the end state in one mutation, and a throw resolves instantly.
  Queried once per run rather than subscribed, keeping the no-listener half of the convention. Do
  not "restore consistency" by deleting it.

## Conventions

- Buffers in the paint path are reused across frames, never retained by callers.
- Repaints are driven by `store.onFrame` (scene mutations only), not a free-running rAF;
  `paint()` early-returns while the overlay is off.
- Entities are paired by stable `id`, never array index.
- **Never assign `Player.role` directly** — call the `scene/` ops and let `normalize()` derive it
  (ADR-17). A static guard test greps for violations, so this fails loudly rather than silently.
- Anything that builds a `Scene` from stored data goes through `play/backfill.ts`, not a bespoke
  construction — that is what keeps v1 files, presets, and tween frames on one code path.
- Responsive is CSS-only — no resize listener, no hydration flash. The shell switches at `lg`
  (1024 px): three-pane grid above, bottom sheet below. **No viewport is blocked.** (`Designer.tsx`
  still carries the old pre-shell rail, which is a horizontal bar until `xl`.)
- Reduced motion is handled with Tailwind `motion-safe:` variants, not a JS `matchMedia` listener
  — same reasoning as the breakpoint.
- Scene state is deliberately **not** persisted; overlay prefs are (`fieldview.overlayPrefs`,
  validated and clamped on read since localStorage is untrusted).
- `useOverlayState()` is a **module-level external store**, not per-instance `useState`. The shell
  mounts several consumers at once (`Whiteboard`, `ToolRibbon`, the panels); per-instance state
  meant each held a snapshot from its own mount, so toggling Space View in the ribbon updated
  localStorage but never re-rendered the copy actually driving `FieldCanvas`. If you add a
  consumer, read it through this hook — do not reintroduce a local copy.
- Colour is never the sole carrier of meaning — the readout speaks the verdict too.
- **Every drag is imperative, not just the piece drag.** Waypoint markers move in the DOM during a
  drag (`drawWaypointDrag`, modelled on `drawMarquee`) and commit to the motion store once, on
  release. Committing per pointer move would re-render `routeLayer` sixty times a second and put
  React back in the pointer path — ADR-2 is about the pointer, not about one particular draggable.
- Turn cost in the motion model is **emergent**, never a rule: `arrive()` caps the change applied to
  the velocity *vector*, so a mover changing direction spends its budget rotating rather than
  lengthening and loses speed automatically. There is no turn-penalty constant to tune, and
  therefore no way for one to disagree with the straight-line case.
- Intermediate waypoints are rounded through at speed; only the final leg is braked into. That
  asymmetry is what makes a two-part cut a *setup* rather than two sprints with a stop between.
- A throw is applied when the disc **lands**, never when the receiver is clicked. The old thrower
  keeps possession for the whole flight, so the disc never belongs to nobody.

## Testing

773 tests across 60 files (up from 634 at the play model). Notable:

- `motionGuard.test.ts` — four scans, each mutation-tested when written: `motion/` imports nothing
  from React/DOM/canvas/`ui/`/`render/`; reads no random source and no wall clock (determinism is
  what Initiative D's replay rests on); states no value for `vmax`/`react`/flight time (ADR-24);
  and inlines no tunable outside `constants.ts`.
- `pursuit.test.ts` — the Builder's wishlist scenario as executable geometry: a defender 10 yd deep
  does not charge an approaching cutter, is already accelerating deep before the cutter reaches it,
  and matches lateral movement. Plus the headline property: **a fake-then-break gains more
  separation on its final leg than the same break from a standstill** (≈4.4 yd vs ≈2.5 yd). That
  metric took three attempts — separation at rest converges on the cushion whatever the path,
  separation at arrival is dominated by the final leg's length, and raw peak separation flatters the
  *straight* cut because both start from rest and it still has its one-time reaction burst to spend.
- `simulate.test.ts` — the ADR-22 agreement test, plus termination across every corner of the slider
  ranges (pursuit is a feedback loop with user-draggable gains; it must not oscillate past the
  ceiling).
- `motionDriver.test.tsx` — the clock, driven by hand through an injected `now`/`schedule` seam so
  nothing depends on jsdom's rAF pacing. Covers the 5-second-gap clamp, one-mutation-per-frame, two
  drivers not interfering, and 0 React commits across a run **with a companion test proving the
  Profiler does fire on a status change**, so the zero is not vacuous.

- `modelGuard.test.ts` — the ADR-17 guard, in two halves: random 300-op sequences re-asserting
  after every step that the thrower set is exactly `[possession]`, and a static grep proving
  `possession.ts` is still the only writer of a role. Both halves were mutation-tested when written
  (removing `normalize()` from `throwTo`, or the swap from `reassign`, each produce ~15 failures),
  so they are known non-vacuous — the usual failure mode of invariant tests.
- `playFormatV2.test.ts` — a frozen v1 fixture that must keep loading with its thrower actually
  holding the disc, and must be byte-identical afterwards (the backfill is a reading, not a
  migration).

- `motionUi.test.tsx` / `disc.test.ts` — the route interaction through the real page, and flight
  duration proven equal to `flightTime()` rather than merely similar.
- `space-model.test.ts` / `acceptance.test.ts` — brief §8 model properties (1, 2, 3, 4, 6, 7, 8)
  and the FR-3.2 no-receiver-gate regression, as executable checks.
- `spaceGuard.test.ts`, `tokensGuard.test.ts`, `shellGuard.test.ts` — architectural guards.
  `tokensGuard` also pins `FIELD_TOKENS`/`PIECE_TOKENS` against accidental recolouring (ADR-16);
  `shellGuard` pins registry completeness (ADR-13).
- `responsive.test.tsx` — asserts the responsive **class contract**, and is explicit that jsdom
  cannot verify computed layout.
- **Perf assertions are quarantined**: `npm run test:perf` runs the timing files with
  `--no-file-parallelism`, because the same code measures 2–3× slower under a parallel suite.
  Isolated budgets — grid < 12 ms, frame < 16 ms. `motionBench.test.ts` measures the stepper at
  **0.012 ms for four substeps** with 14 movers, and a whole simulated frame including the heatmap
  recompute at **9.6 ms** of the 16 ms budget. The grid still dominates; motion's share is a
  rounding error. The everyday suite keeps a loose ceiling that
  still catches an order-of-magnitude regression.

**jsdom limitations that have bitten this module**: no `PointerEvent`, no `Blob.text()` (hence
the `FileReader` fallback in `serialize.ts`, which also fixes older Safari), no 2d canvas
context, and `toBeVisible()` reads only the `hidden` attribute — that last one let a visibly
broken idle readout pass the entire suite, since `hidden` loses on specificity to a Tailwind
`flex` class on the same element. Visibility here is set via inline style for that reason.

## Outstanding

The **client visual review is not done** — piece visuals, field markings, the four built-in
presets, the heatmap ramp, and copy. It was deferred from P2 to the initiative end, then past
the merge to a deployed preview by Builder decision, along with the two by-eye acceptance checks
(§8.5 live-during-drag, §8.9 frame budget on the client's hardware). Built-in preset coordinates
were always understood to be a first pass, not a calibration. Expect a follow-up `tweak/` branch
touching `render/tokens.ts`, `scene/presets.ts`, and possibly `space/constants.ts`.
**The shell merged to `main` ahead of its own review too** (Builder decision, 2026-07-30) — the
same debt the roadmap warned recurs.

Carried out of fieldview-play-model (2026-07-31), which also merged ahead of review:

- **`FORCE_PRESETS` offsets are a first pass and want visual tuning.** They are reasoned from
  standard force semantics, not measured against a coach's eye. They are constants in one file, so
  correction is a token edit — but note `FORCE_TOLERANCE_YD` is capped at half the smallest gap
  between presets, and a test enforces it, so retuning offsets may require retuning the tolerance.
- **Throw *feel* is unvalidated** — the cancel paths, the pointer-down/pointer-up slop, and the
  receiver emphasis all pass in jsdom but have never been used by a human.
- **The mark panel ships 6 controls (two labelled rows), not the 9-button grid** that `tasks.md`
  and `approach.md` described. `ux.md` specified `Force side` / `Force angle` groups throughout,
  which nine loose buttons cannot carry; the UX spec won. Recorded because two of the five specs
  say otherwise.
- **Panels reach the store through a React context** (`ui/shell/sceneStore.tsx`), not `PanelProps`.
  The `useOverlayState` precedent does not transfer: overlay prefs are a singleton, but each page
  builds its own `SceneStore`. `panelRegistry`'s type is unchanged and neither shell branches per
  selection kind, so ADR-13's seam holds.

Carried out of fieldview-motion (2026-07-31), which also merged ahead of review — the **third**
Field View initiative to do so, which is the recurring debt the roadmap warned about:

- **The motion tunables are reasoned, not measured.** `accel` 6.0, `decel` 9.0, `cushion` 3.0,
  `lead` 0.6 — the same standing as `FORCE_PRESETS` before them. Unlike those, they are draggable
  from Advanced Settings, so correcting them costs a slider rather than a commit.
- **A specific calibration question for the client review**: at defaults, a defender starting with a
  3 yd cushion ends **level** with a cutter who sprints deep from a standstill. It loses the cushion
  during its reaction and, at equal top speed, can never win it back. That is physically correct and
  may still read as too generous to the offense — a `cushion`/`react` question, not a code one.
- **Best-positioned-defender selection is deferred** (Builder decision at kickoff): the defender who
  takes a cut is the assigned one, never the better-placed one. `matchups` is the defensible
  default until a leverage heuristic lands.
- **Routes cannot be saved.** Deliberate (ADR-25) — Initiative D owns the format that will carry
  them.
- **Only the selected player's route is drawn**, though several players may hold routes and all run
  together. A whole play's routes at once is an unreadable tangle; frames are D's answer to it.
- **Setting a destination is pointer-only.** Every route *control* is keyboard-reachable and Escape
  cancels, but there is no coordinate-entry affordance — a gap, recorded rather than skipped.
- **`Designer.tsx` still owns no clock.** The driver is per-store precisely so it can, but nothing
  is mounted there; Initiative D wires it.

Carried out of fieldview-shell specifically:

- **The 1024 px breakpoint is unvalidated on a real tablet.** It was reasoned from the fixed pane
  widths (280 + 320), not measured. A portrait tablet currently gets the bottom sheet.
- **`Designer.tsx` is not shell-composed.** It still renders `OverlayRail` + `AdvancedPanel`
  directly, which is why those files still exist. Initiative D (`fieldview-designer-v2`) replaces
  that page wholesale; until then the two pages look different, deliberately.
- **Three ribbon buttons are inert by design** — Throw to Player and Advanced Stats are
  `aria-disabled` with a "Ships in a future update." tooltip, and the Play Designer slot holds a
  placeholder. Initiatives B and D fill them.
- **The overlay legend (Closed / Contested / Strong space) was dropped** when the whiteboard
  stopped composing `OverlayRail` — the shell IA has no slot for it. That is an upstream scope
  consequence, not an oversight; if the client wants it back it needs a home in the sidebar.
- **`prefs.ts` re-seeds from localStorage during render** when no consumer is subscribed (a test-
  isolation affordance). It converges and the suite is green, but it is a mutation-during-render
  that a future refactor should replace with an explicit test-reset export.

**Known model tension, documented not defective**: brief §8.1 and §8.4's first clause cannot
both hold on a single scene by the model's own design, so §8.4 uses the Flat Mark preset as its
no-deep-defender baseline.
