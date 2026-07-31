---
summary: "60 tasks across 5 partitions (Kinematics 13, Pursuit & runner 17, Driver 12, Route UI & tuning 10, Disc flight 8) plus 7 initiative-boundary tasks. No PR boundaries — direct merges. Strictly sequential 1→2→3, then 4 and 5 in parallel off 3."
phase: "tasks"
when_to_load:
  - "When selecting the next implementation task or reviewing partition completion state."
depends_on:
  - "prd.md"
  - "ux.md"
  - "tech-design.md"
  - "approach.md"
modules:
  - "frontend/src/fieldview"
index:
  partition_core: "## Partition: feat/fieldview-motion-core"
  partition_pursuit: "## Partition: feat/fieldview-motion-pursuit"
  partition_driver: "## Partition: feat/fieldview-motion-driver"
  partition_ui: "## Partition: feat/fieldview-motion-ui"
  partition_disc: "## Partition: feat/fieldview-motion-disc"
  initiative_boundary: "## Initiative Boundary"
next_section: "## Partition: feat/fieldview-motion-core"
---

# Tasks: fieldview-motion

## Partition: feat/fieldview-motion-core

- [x] Create `motion/types.ts` — `Mover`, `Route`, `DiscFlight`, `MotionState`, `MotionParams`, `Trajectory` <!-- id: 1 -->
- [x] Create `motion/constants.ts` — `accel`/`decel`/`cushion` defaults + slider ranges, the single source (ADR-3) <!-- id: 2 -->
- [x] Create `motion/vec.ts` — add, sub, scale, len, norm, clampLen; unit tests <!-- id: 3 -->
- [x] Implement `arrive()` — accel-limited vector steering, speed clamped to `vmax` <!-- id: 4 -->
- [x] Add braking inside `v²/(2·decel)`, final leg only <!-- id: 5 -->
- [x] Implement `route.ts` leg advance + arrival test; intermediate waypoints rounded through at speed <!-- id: 6 -->
- [x] Clamp destinations to field bounds consistently with existing drag clamping <!-- id: 7 -->
- [x] Unit tests: accel ramp reaches `vmax` in ≈`vmax/accel`s; arrival without overshoot or oscillation <!-- id: 8 -->
- [x] Unit test: braking begins within one step of the threshold <!-- id: 9 -->
- [x] Property test: a two-leg route is strictly slower than the straight run to the same endpoint (turn cost is emergent) <!-- id: 10 -->
- [x] Write `motionGuard.test.ts` — purity scan (no React/DOM/canvas/`ui/`/`render/` imports) and no-duplicate-constants scan for `vmax`/`react`/flight time <!-- id: 11 -->
- [x] Mutation-test `motionGuard`: introduce a violation of each half, confirm failure, restore <!-- id: 12 -->
- [x] Run full fieldview suite; confirm no existing test changed <!-- id: 13 -->

### Deviation notes (Partition 1: Kinematics)

- **`coast()` added to `kinematics.ts`, not in the task list.** Stopping a run mid-flight (ux.md
  Flow 5, "freeze it right there") leaves movers carrying velocity with no target to steer at.
  Without a way to shed it they glide forever. It is four lines and uses the same `decel` tunable.
- **`motionGuard` grew two scans beyond the two specified.** Tasks called for purity and
  no-duplicate-`vmax`/`react`/flight-time. Added: a **determinism** scan (no `Math.random`,
  `Date.now`, `performance.now`, `new Date` in `motion/`) because ADR-5 makes the driver the only
  wall-clock reader and PRD Determinism is what Initiative D's replay rests on; and an
  **inlined-constant** scan mirroring `spaceGuard`'s, because a tunable copied into a second file is
  how a slider silently stops controlling half the model. All four halves mutation-tested.
- **The `vmax`/`react` scan matches assignment, not the identifier.** `motion/` must be free to read
  `sp.vmax` and to annotate `vmax: number` parameters — using the space model's number is the point
  of ADR-3. Only `vmax: 7.0` / `const react = 0.4` style value statements fail.
- **Constants landed for later partitions.** `DT`, `MAX_FRAME_SECONDS`, `SETTLE_SPEED`, and
  `MAX_SIM_SECONDS` are consumed in Partitions 2–3, but live in `constants.ts` now: ADR-3 says one
  file states every value, and staging them by partition would mean two sources during the gap.
- **Task 10 shipped as three tests, not one.** Speed loss through a 90° turn, a two-leg route slower
  than the straight run, and a **distance-matched** out-and-back — the last so the extra time is
  attributable to the turn rather than to the longer path. Plus a straight-line control asserting
  the model does *not* bleed speed everywhere, without which "turning is slower" could pass
  vacuously.
- **Final-leg completion is by exact arrival, not proximity.** `advance()` only completes the last
  leg when `dist === 0`, which `arrive()`'s snap guarantees. Proximity would report a route finished
  a yard early while the piece was still visibly moving.
- Suite: **683 tests / 54 files** (was 634 / 50). `tsc --noEmit` clean.

---

## Partition: feat/fieldview-motion-pursuit

- [x] Implement the reaction ring in `MotionState` — fixed size `react/DT`, preallocated, no per-tick allocation <!-- id: 14 -->
- [x] Implement `delayedPos(state, id, react, dt)` reading the ring <!-- id: 15 -->
- [x] Implement `cushionPoint(lead, disc, cushion)` — leverage along disc→cutter (ADR-2) <!-- id: 16 -->
- [x] Handle `possession === null` → `cushion = 0` fallback without throwing <!-- id: 17 -->
- [x] Implement the defender target: `arrive()` toward the cushion point under the same kinematic limits <!-- id: 18 -->
- [x] Free-roam (`matchups[d] === null`) defenders do not move <!-- id: 19 -->
- [x] Implement `step(state, dt, motionParams, spaceParams)` — routed movers, then defenders, then disc; one pass, no allocation <!-- id: 20 -->
- [x] Implement `isSettled()` and `simulate()` with fixed step, settle test, and hard time ceiling <!-- id: 21 -->
- [x] Implement `sampleAt(trajectory, seconds)` <!-- id: 22 -->
- [x] Behaviour test: defender 10 yd deep does not close on an approaching cutter (FR-3.2) <!-- id: 23 -->
- [x] Behaviour test: on a deep turn the defender's downfield speed rises before the cutter arrives (FR-3.4) <!-- id: 24 -->
- [x] Behaviour test: lateral movement matched within cushion tolerance (FR-3.5) <!-- id: 25 -->
- [x] Headline test: a two-leg cut yields strictly more separation **gained on the final leg** than a one-leg cut to the same endpoint <!-- id: 26 -->
- [x] Invariant test: defender never exceeds `vmax`, never reverses instantly (FR-3.6) <!-- id: 27 -->
- [x] Property test: `simulate()` terminates for randomised tunables across the full slider ranges <!-- id: 28 -->
- [x] Agreement test: `n` × `step(DT)` equals `simulate()` sampled at `n·DT`, exactly — mutation-tested <!-- id: 29 -->
- [x] Static check: no `Math.random`, no wall-clock read anywhere in `motion/` <!-- id: 30 -->

### Deviation notes (Partition 2: Pursuit & runner)

- **`MotionParams` gained a 4th tunable, `lead` (0.6 s, range 0–1.5).** Signalled. The three-param
  cushion model in ADR-2 is not sufficient on its own: a defender 10 yd deep of a cutter who breaks
  deep finds the cushion point *under* itself and drifts toward the disc to reclaim its 3 yd, rather
  than turning and carrying the cut — a direct FR-3.4 failure. Projecting the cutter's delayed
  velocity forward by `lead` swings the target past the defender as the cutter builds speed, which
  is what makes the carry emerge. This also **resolves the PRD open question** on whether cushion
  varies with speed: it does not — cushion is fixed, and the lead is what scales. Touches P1 files
  (`types.ts`, `constants.ts`) from the P2 branch; P4's slider group and `prefs.ts` clamping cover
  four motion params, not three.
- **`step()` consumes its input state.** The reaction ring is written in place rather than copied.
  Copying every mover's ring each substep is O(movers × react/dt) of garbage at 120 Hz, against the
  module's standing "buffers in the hot path are reused" convention. Determinism is unaffected —
  the same state stepped the same way always gives the same result — and `simulate()` clones on
  entry, so callers holding a state (the driver's reduced-motion path) are safe. A test asserts the
  clone actually protects the input.
- **Ring-discipline bug found and fixed during the partition.** Reads must happen at the head
  *after* the write, not before: reading at the pre-write head hands the defender the cutter's
  current position and, worse, a `delayedVel` differenced backwards, sending defenders chasing a
  point behind the cutter. Six tests caught it. Worth keeping in mind for anyone touching the ring.
- **Task 26's metric changed, three times, and the reasons matter.** Separation at rest converges on
  the cushion whatever the path. Separation at arrival is dominated by the final leg's length — over
  twenty yards an equal-speed defender always recovers, which is correct physics, not a bug. Raw
  peak separation flatters the *straight* cut, because both start from rest and the straight one
  still has its one-time reaction-delay burst to spend while the setup has already spent it. The
  landed metric is **separation gained on the final leg**, which compares like with like: 4.4 yd for
  the setup versus 2.5 yd for the straight cut.
- **The FR-3.6 "no instant reversal" assertion carries one exemption**: arrival. A mover within a
  single substep's travel (< 0.08 yd) of its target snaps onto it and stops, which is what stops a
  defender chattering around a cushion point it has effectively reached. Removing the snap instead
  produces a genuine oscillation that never settles, since desired speed `sqrt(2·decel·d)` stays
  above `SETTLE_SPEED` arbitrarily close in.
- **Observation for the by-eye review**: at default tunables a defender starting with a 3 yd cushion
  ends *level* with a cutter who sprints deep from a standstill — it loses the cushion during its
  reaction and, at equal top speed, can never win it back. That is physically right and may still
  read as too generous to the offense. It is a `cushion`/`react` calibration question, not a code
  one.
- Suite: **719 tests / 56 files** (was 683 / 54). `tsc --noEmit` clean.

---

## Partition: feat/fieldview-motion-driver

- [x] Create `ui/motion/motionMode.ts` — routes, run status, saved pre-run positions, on the `throwMode.ts` external-store pattern (ADR-4) <!-- id: 31 -->
- [x] Implement `createMotionDriver(store)` — fixed-timestep accumulator, `DT = 1/120` (ADR-5) <!-- id: 32 -->
- [x] Clamp the accumulated total so a long frame gap cannot integrate a huge step (FR-4.5) <!-- id: 33 -->
- [x] Write exactly one `store.mutate()` per rendered frame regardless of substep count <!-- id: 34 -->
- [x] Implement `run` / `stop` (freeze in place) / `reset` (restore pre-run positions) / `isRunning` / `dispose` <!-- id: 35 -->
- [x] End the run on settle and transition status; expose it via `useMotionRun` (status only, never positions) <!-- id: 36 -->
- [x] Reduced-motion branch: `simulate()` + apply end state in one mutation, no rAF loop (ADR-6) <!-- id: 37 -->
- [x] Test: 5-second frame gap produces bounded displacement <!-- id: 38 -->
- [x] Test: two drivers on two stores do not interfere <!-- id: 39 -->
- [x] Test: `dispose()` cancels the rAF; no leak across mount/unmount <!-- id: 40 -->
- [x] Extend the Profiler test — 0 React commits across a full run; confirm the drag test still records 0 <!-- id: 41 -->
- [x] Add the frame-budget assertion to the quarantined `test:perf` suite (< 16 ms, 14 movers + heatmap) <!-- id: 42 -->

### Deviation notes (Partition 3: Driver)

- **The driver takes an injected clock and scheduler** (`now`, `schedule`, `cancel`,
  `prefersReducedMotion`), defaulting to `performance.now` / `requestAnimationFrame` / `matchMedia`.
  Not in the task list, and load-bearing for the tests: without the seam every timing assertion
  would depend on jsdom's rAF pacing, which is precisely the host-dependent non-determinism the
  fixed timestep exists to remove. Tests pump frames by hand.
- **Tunables arrive through a `getParams()` callback, not by importing `prefs.ts`.** The driver has
  no opinion about where tunables live and needs no React tree to be tested. Partition 4 wires it to
  the overlay prefs store.
- **The clamp is per-frame, not on the accumulator's running total.** `min(elapsed,
  MAX_FRAME_SECONDS)` means a stall *costs* the run the time it was away rather than replaying it in
  fast-forward. Fast-forwarding would satisfy FR-4.5's letter and look wrong.
- **`reset()` rewinds routes rather than clearing them**, so the same cut re-runs after a tuning
  change without the coach re-clicking it (ux.md Flow 1 step 6). `rewindRoutes()` sets every
  route's `leg` back to 0 while keeping its waypoints.
- **The ADR-2 Profiler assertion is at driver level, not page level.** The driver is not mounted in
  `Whiteboard.tsx` until Partition 4, so a page-level assertion is not yet possible. What is
  asserted here is stronger in one respect and weaker in another: 0 commits across 60 driven frames
  while positions demonstrably change, plus a companion test proving the Profiler *does* fire on a
  status change — so the zero is not vacuous. **Task 68 added to Partition 4** for the page-level
  version.
- **`motionMode` is a module singleton while drivers are per-store.** Routes, picking, and status
  are shared; positions are not. Only one fieldview page mounts at a time, so this is safe today,
  and the "two drivers do not interfere" test covers the part that matters (positions). If
  Initiative D ever mounts two scenes at once, status must move into the driver.
- **`package.json` edited** to add `motionBench.test.ts` to the quarantined `test:perf` list — a
  file outside this partition's declared modules, unavoidable for task 42.
- **Measured**: stepper ×4 substeps with 14 movers, best **0.0117 ms**; a whole simulated frame
  including the heatmap grid recompute, best **9.57 ms** against the 16 ms budget. The grid still
  dominates, exactly as predicted — motion's share is a rounding error.
- Suite: **738 tests / 58 files** (was 719 / 56). `tsc --noEmit` clean; `npm run test:perf` green.

---

## Partition: feat/fieldview-motion-ui

- [x] Add the Route section to `OffensePlayerPanel` with all six ux.md states and copy <!-- id: 43 -->
- [x] Wire Set Destination / Add Waypoint / Clear / Run / Stop / Reset, with disabled reasons (`Set a destination first.`) <!-- id: 44 -->
- [x] Destination picking in `FieldCanvas` + throwMode's cancel grammar (Escape, re-click, other selection, clicking a piece) <!-- id: 45 -->
- [x] Suppress dragging while a run is in progress (FR-4.4) <!-- id: 46 -->
- [x] Create `render/routeLayer.tsx` — numbered square markers and legs for the selected player only; add tokens (canon ADR-10) <!-- id: 47 -->
- [x] Make route markers draggable to reposition a waypoint, reusing FieldCanvas's existing pointer path (Builder decision 2026-07-31; ux.md Journey 2 depends on it) <!-- id: 69 -->
- [x] Add the canvas running indicator (visible with the mobile sheet collapsed) <!-- id: 48 -->
- [x] Add the Movement slider group to `AdvancedPanel`, alongside the space sliders <!-- id: 49 -->
- [x] Persist `MotionParams` in `prefs.ts` — validated and clamped on read; absent key falls back to defaults <!-- id: 50 -->
- [x] Accessibility pass: `aria-pressed`, keyboard order, live-region announcements for run start / `Cut complete.` / `Stopped.` <!-- id: 51 -->
- [x] Verify parity in the desktop sidebar and the mobile sheet (canon ADR-14); run the full suite <!-- id: 52 -->
- [x] Page-level ADR-2 assertion: 0 React commits across a run driven through a mounted `Whiteboard`, now that the driver is wired to the page (deferred from Partition 3, where the driver was not yet mounted) <!-- id: 68 -->

### Deviation notes (Partition 4: Route UI & tuning)

- **Marker dragging is imperative, not React.** ux.md Journey 2's tighten-and-re-run loop needs
  draggable waypoints, but committing to the motion store per pointer move would re-render
  `RouteLayer` sixty times a second and put React straight back in the pointer path — the exact
  thing canon ADR-2 exists to prevent. So the marker and its two adjacent legs are moved in the DOM
  during the drag (`drawWaypointDrag`, modelled on the existing `drawMarquee`) and committed once,
  on release. A Profiler test asserts 0 commits across 20 pointer moves.
- **`drawRouteOrigin` was needed as a consequence.** Leg 0 starts at the player, so dragging a
  player who is carrying a route has to bring that leg with it — imperatively, for the same reason.
  Without it the leg pointed at where the player used to be until the next render.
- **Two files outside the declared module scope.** `ui/motion/driverContext.tsx` (new) and
  `pages/Whiteboard.tsx` (modified). The driver is created per page, not as a module singleton
  (ADR-5), so panels reach it exactly the way they reach the scene store — the `sceneStore.tsx`
  context precedent, copied deliberately rather than invented.
- **The provider is mounted ONCE per page, wrapping both shells.** Putting it inside `LeftSidebar`
  and `BottomSheet` would create two drivers over one store: the breakpoint is CSS-only so both
  trees are live at once (canon ADR-15), and each would run its own rAF loop. That is the same class
  of bug `useOverlayState` was rewritten to fix, and it is called out in a comment at the mount site.
- **`readPrefs()` added to `prefs.ts`** — a non-hook read of the existing store. The driver reads
  tunables inside a rAF callback, outside React, where a hook is neither legal nor correct. Reading
  live per frame is also what makes a slider take effect on the next run with no reload (FR-6.2).
- **Out-of-bounds destinations clamp rather than cancel.** First implemented as cancel-on-outside,
  which read better to me but contradicts FR-2.5. The spec is the contract, and clamping is also
  what dragging a piece off the field already does, so there is one answer to "where can a waypoint
  be". Changed to clamp and the test rewritten.
- **Shell parity is asserted by the existing `panelParity.test.tsx`, not by a new test.** It already
  compares the offense panel's whole control-and-copy contract between the two shells field for
  field, and it passed unchanged when the Route section landed — a stronger proof than counting
  buttons. A duplicate was written, found redundant, and removed.
- **Reset is one button for both slider groups.** `resetParams()` now restores space *and* motion
  defaults: the control says "Reset to defaults", and a coach dragging sliders in one panel does not
  think of them as two models. `motionParamsAreDefault()` feeds the same modified indicator.
- **`Top speed` and `Reaction time` stay in the space group**, not the Movement group, even though
  motion reads them — they are `SpaceParams` and duplicating the sliders would be a second control
  for one value (ADR-3).
- **`OverlayRail.tsx` and `pages/Designer.tsx` touched** only to thread the two new
  `AdvancedPanel` props through. Designer remains pre-shell and otherwise untouched, as in the
  previous two initiatives.
- Suite: **755 tests / 59 files** (was 738 / 58). `tsc --noEmit` clean; `npm run test:perf` green.
  (There is no `lint` script in this project.)

---

## Partition: feat/fieldview-motion-disc

- [x] Implement `motion/disc.ts` — `beginFlight()` with duration from `space/layers.ts` `flightTime(d, hang)`; `discPos()` interpolation (ADR-3) <!-- id: 53 -->
- [x] Wire flight into `step()`'s disc branch and the driver's completion callback <!-- id: 54 -->
- [x] Defer `throwTo()` and the announcement to arrival, not click <!-- id: 55 -->
- [x] Render the disc from flight state while airborne; nobody shows as holding it <!-- id: 56 -->
- [x] Interrupt/cancel paths; assert possession is never neither old nor new (FR-5.4) <!-- id: 57 -->
- [x] Reduced motion resolves the throw instantly, as today <!-- id: 58 -->
- [x] Update `throwing.test.tsx` only where arrival timing legitimately changed <!-- id: 59 -->
- [x] Confirm `space/` zero diff; `spaceGuard.test.ts` passes <!-- id: 60 -->

### Deviation notes (Partition 5: Disc flight)

- **The live flight runs on its own loop in the driver, not through `MotionState` and the
  run-status machinery.** A throw is not a "run": routing it through `setStatus()` would put the
  route panel into *Running…*/Stop for something the coach never started there, and would freeze the
  field read-only for a second and a half. `MotionState.disc` stays the model fact a headless
  trajectory carries for Initiative D, and `step()` still advances it; the driver's flight loop is
  the live animation. Two loops, one duration formula.
- **The flight position is published through `throwMode`** (`setFlightPos`/`getFlightPos`) rather
  than passed as a prop. `pieceLayer` needs a position sixty times a second and has no way to reach
  the driver's private state; publishing it is the same shape as the SceneStore publishing positions
  that painters read, and it lands in `pieceLayer`'s existing `onFrame` repaint with no new
  subscription. `DiscFlight` stays the pure model type — the arrival callback is held beside it in
  the driver, never on it.
- **`throwDisc(receiverId, apply)` returns a boolean** and the caller falls back to the instant
  throw when it declines: reduced motion, no provider at all (a unit test rendering `FieldCanvas`
  alone), a throw to the current holder, or no holder. That fallback is why every existing
  cancel-path test still passes untouched.
- **The disc is not shoulder-offset while airborne.** `PIECE_TOKENS.disc.offsetPx` docks it beside
  whoever holds it; in flight nobody does, so the offset is dropped and it flies on the true line.
- **`throwing.test.tsx`: three tests became async** with a `landDisc()` helper, and one gained a new
  mid-flight assertion that possession stays with the *old* thrower (FR-5.4). The throw semantics
  they assert are unchanged — they just happen a second later. The helper jumps the clock rather
  than waiting: note that each frame still advances at most `MAX_FRAME_SECONDS`, which is FR-4.5
  working exactly as intended, so a ~1.5 s flight needs several ticks rather than one.
- **Straight-line interpolation, deliberately.** A real disc curves, but the space model's `hang`
  already encodes how long it stays up, and an arc here would be a second opinion about flight shape
  with nothing to validate it against. Drawn curves belong to Initiative D's annotations.
- **`space/` zero diff confirmed** (`git diff --stat` empty); `spaceGuard.test.ts` passes.
- Suite: **773 tests / 60 files** (was 755 / 59). `tsc --noEmit` clean; `npm run test:perf` green.

---

## Initiative Boundary

- [ ] Merge `feat/fieldview-motion-core` → `initiative/fieldview-motion` <!-- id: 61 -->
- [ ] Merge `feat/fieldview-motion-pursuit` → `initiative/fieldview-motion` <!-- id: 62 -->
- [ ] Merge `feat/fieldview-motion-driver` → `initiative/fieldview-motion` <!-- id: 63 -->
- [ ] Merge `feat/fieldview-motion-ui` → `initiative/fieldview-motion` <!-- id: 64 -->
- [ ] Merge `feat/fieldview-motion-disc` → `initiative/fieldview-motion` (expect a hand-resolved `FieldCanvas.tsx` conflict with partition 4; signal on first merge) <!-- id: 65 -->
- [ ] Full suite green on the initiative branch, including `npm run test:perf` <!-- id: 66 -->
- [ ] Builder-approved merge to `main`, then canon synthesis and archive <!-- id: 67 -->
