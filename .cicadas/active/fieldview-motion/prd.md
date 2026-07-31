---
summary: "fieldview-motion gives Field View a clock. A pure, framework-free motion/ library (mirroring space/) models accelerate–cruise–decelerate movement; a coach clicks an offensive player and one or more destinations and watches the cut run at real speed. The assigned defender pursues non-naively — it reacts on a delay, seeks a cushion point rather than the cutter itself, carries deep cuts, and matches horizontal movement — so a two-part cut can genuinely put a defender out of position. The disc's flight to a receiver animates using the space model's existing flight-time formula. Motion state is transient: Scene and the play format are unchanged, because Initiative D owns the frame format. Best-positioned-defender selection is deferred."
phase: "clarify"
when_to_load:
  - "When defining or reviewing fieldview-motion goals, scope, success criteria, and risks."
  - "When checking whether the motion library or pursuit behaviour still matches its intent."
depends_on:
  - ".cicadas/canon/modules/fieldview.md"
  - ".cicadas/drafts/fieldview-roadmap.md"
modules:
  - "frontend/src/fieldview/motion"
  - "frontend/src/fieldview/ui/motion"
  - "frontend/src/fieldview/ui/shell/panels"
index:
  executive_summary: "## Executive Summary"
  project_classification: "## Project Classification"
  success_criteria: "## Success Criteria"
  user_journeys: "## User Journeys"
  scope: "## Scope"
  functional_requirements: "## Functional Requirements"
  non_functional_requirements: "## Non-Functional Requirements"
  open_questions: "## Open Questions"
  risk_mitigation: "## Risk Mitigation"
next_section: "Executive Summary"
---

# PRD: fieldview-motion

## Progress

- [x] Executive Summary
- [x] Project Classification
- [x] Success Criteria
- [x] User Journeys
- [x] Scope & Phasing
- [x] Functional Requirements
- [x] Non-Functional Requirements
- [x] Open Questions
- [x] Risk Mitigation

## Executive Summary

Field View can draw a play but cannot *run* one. Every piece teleports: drag a cutter and it is
instantly somewhere else, so the tool can show a formation and a throw but never the thing coaching
actually turns on — whether a cut beats its defender, and by how much. There is no time in the
model at all. The rAF loop only fires when something is mutated; nothing in the codebase makes a
second pass.

This initiative gives Field View a clock and a physics model. A coach clicks an offensive player,
clicks one or more spots, and watches the cut run at real speed — accelerating out of the break,
reaching top speed, braking into the turn. The assigned defender pursues it the way a defender
actually does: on a reaction delay, holding a cushion rather than beelining, carrying a deep cut
before it arrives, matching horizontal movement. Because the defender reacts to changes in
direction, a two-part cut can genuinely put it out of position — which is the entire coaching point
of setting up a cut, and something a straight-line follower cannot demonstrate.

It ships third in the roadmap because it is the highest-risk and most self-contained piece, and
because Initiative D (the frame designer) consumes it: D's frames record *actions*, and an action
without motion is a teleport. Delivering C as a pure library behind a stable interface means D can
build against it while the physics is still being tuned by eye.

### What Makes This Special

- **Time is a first-class thing the model can be asked about**, not an animation bolted on. The same
  physics that renders live can be run headlessly to produce a trajectory — so Initiative D replays
  a cut instead of re-deriving it.
- **The defender is not a follower.** It seeks a *cushion point* offset from the cutter, on a
  reaction delay. That one decision produces gap-closing, carrying, and horizontal matching as
  consequences rather than as three hand-coded special cases.
- **One answer per question.** Top speed and reaction time come from the space model's existing
  sliders, and disc flight time from its existing `flightTime()`. The animation and the heatmap
  cannot disagree about how fast a player runs or how long a throw hangs.

## Project Classification

**Technical Type:** Pure simulation library + real-time client-side rendering (React SPA module)
**Domain:** Sports coaching tool — kinematics and pursuit AI
**Complexity:** High — the highest technical risk in the roadmap. Not in code volume, but because
"looks right to a coach" is the acceptance bar for a physics model with a dozen interacting
tunables, and because it introduces the module's first free-running frame loop, which must not
break the load-bearing ADR-2 performance invariant.
**Project Context:** Brownfield — builds on `fieldview-shell` (2026-07-30) for its panels and
sliders and on `fieldview-play-model` (2026-07-31) for matchups, which are what tell a defender who
to chase.

---

## Success Criteria

### User Success

A user achieves success when they can:

1. **Run a cut and watch it happen** — click an offensive player, click a destination, and see the
   player accelerate, cruise, and brake into the spot at a speed that reads as real.
2. **Set up a defender with a two-part cut** — click point A then point B, and see the defender lose
   ground on the direction change in a way it does not lose on a straight cut.
3. **Believe the defense** — a defender playing 10 yards deep does not sprint at an approaching
   cutter; it lets the gap close, and when the cutter turns deep it is already moving.
4. **Tune it by feel** — movement sliders in Advanced Settings change the behaviour immediately,
   without a reload.

### Technical Success

1. `motion/` is pure: no React, no DOM, no canvas, no imports from `ui/` or `render/` — testable as
   mathematics, exactly as `space/` is (canon ADR-1). A guard test enforces it.
2. The same stepper drives the live animation and the headless trajectory. There is no second
   physics implementation for playback, and a fixed-`dt` run is deterministic and reproducible.
3. ADR-2 holds: React is never in the per-frame path. The Profiler test records 0 React commits
   during a drag **and** during a running simulation.
4. `Scene` and `PlayFile` are unchanged. Motion adds no persisted state.
5. Player top speed and reaction time are read from `SpaceParams`, and disc flight duration from
   `space/layers.ts`'s `flightTime()` — not redefined.

### Measurable Outcomes

- All existing 527 fieldview tests pass, plus new coverage for kinematics, routes, pursuit, and the
  driver's clock handling.
- A running simulation holds the existing frame budget (< 16 ms/frame) with 14 movers plus the space
  heatmap repainting.
- Zero changes to `scene/` model semantics — verified by `modelGuard.test.ts` still passing
  unmodified.

---

## User Journeys

### Journey 1: Running a Single Cut

A coach selects a cutter, clicks **Set Destination**, and clicks a spot on the open side. A marker
appears at the spot. They press **Run**. The cutter accelerates out of its stance, tops out, and
brakes into the target; its assigned defender starts a beat late and trails it in. When both stop,
the space heatmap has repainted around the new positions.

**Requirements Revealed:** destination-setting interaction; accel/top-speed/decel kinematics;
defender reaction delay; simulation start/stop; heatmap staying live during motion.

### Journey 2: Setting Up a Defender

The same coach wants to show why you sell the deep cut first. They set two waypoints — five yards
deep, then hard back under — and run it. The cutter drives deep, plants, and comes back; the
defender, having committed to the deep leg on its reaction delay, has to decelerate and turn, and
arrives at the under cut yards late. The coach drags the first waypoint shallower and runs it again
to show how much of the separation the setup was actually worth.

**Requirements Revealed:** multi-waypoint routes; deceleration and turn cost on both sides; the
defender reacting to direction changes rather than to the final destination; cheap re-run.

### Journey 3: Seeing the Throw Travel

With a receiver open, the coach uses **Throw to Player**. Instead of the disc jumping, it leaves the
thrower and travels, arriving after a delay that scales with the distance — a huck visibly hangs
longer than a dump. Possession changes when it lands, not when it is clicked.

**Requirements Revealed:** disc flight animation; flight duration from the existing space-model
formula; possession changing on arrival, not on click.

### Journey 4: Tuning the Model

The defense looks too fast to the coach's eye. They open **Advanced Settings**, pull reaction time
up and defensive cushion out, and re-run the same cut. The change applies immediately. Nothing about
the drawn play is lost.

**Requirements Revealed:** motion tunables as sliders alongside the existing space sliders; live
application; a reset path.

### Journey Requirements Summary

| User Type | Key Requirements |
|-----------|-----------------|
| **Coach demonstrating a cut** | destination clicks, real-speed movement, defender pursuit, run/stop |
| **Coach teaching cut setup** | multi-waypoint routes, direction-change cost, repeatable re-runs |
| **Coach walking a play** | animated disc flight, possession on arrival |
| **Coach calibrating** | movement sliders, immediate effect, reset |

---

## Scope

### MVP (v1)

**Core Deliverables:**
- `motion/` — a pure, framework-free library: accel-limited kinematics, multi-waypoint routes,
  non-naive defender pursuit, a `step()` function, and a headless `simulate()` producing a
  sampled trajectory.
- A run-time driver: a free-running rAF clock that advances the stepper and writes positions to the
  existing `SceneStore`, outside React.
- Interaction: select an offensive player → set one or more destinations → run; stop/reset; clear
  route. Route markers drawn on the canvas.
- Assigned-defender auto-tracking, driven by the `matchups` map that `fieldview-play-model` already
  ships. Free-roam (`null`) defenders stand still.
- Animated disc flight on a throw, timed by `space/layers.ts`'s `flightTime()`.
- Motion tunables as sliders in the shell's existing Advanced Settings panel.

**Quality Gates:**
- All 527 existing tests green; `motionGuard` proves `motion/` has no UI imports; Profiler test
  records 0 React commits during a running simulation.
- `Scene`, `PlayFile`, and `space/` all have zero semantic diff.
- Reduced-motion users get the end state without an animation.

### Growth (Post-MVP)

- **Best-positioned defender selection** (explicitly deferred, per Builder decision at kickoff) —
  choosing which defender takes a cut by leverage rather than by assignment or proximity. Layered on
  top of pursuit; `matchups` gives a defensible default until then.
- Curved routes / arcs rather than straight legs between waypoints.
- Zone and switch behaviours, which need a defensive scheme model that does not exist yet.
- Recording a run as a reusable route on a player.

### Vision

The trajectory artifact is what Initiative D's frames replay: D records "cutter #4 a → b" as an
action and asks `motion/` what that looks like over time, rather than storing baked positions.

---

## Functional Requirements

### 1. Motion Model

**FR-1.1:** Players move under acceleration limits: they accelerate from rest toward a top speed,
cruise, and decelerate to arrive at a destination rather than stopping instantly.

**FR-1.2:** Top speed and reaction time are the space model's existing `vmax` and `react`
parameters. Motion must not introduce a second, independent answer to either.

**FR-1.3:** Acceleration, deceleration, and the defensive pursuit parameters are new tunables with
documented defaults and slider ranges, defined in exactly one place.

**FR-1.4:** The motion model is a pure library. It takes state and a timestep and returns new state.
It performs no rendering, holds no module-level mutable simulation state, and imports nothing from
`ui/`, `render/`, or React.

**FR-1.5:** The same model can be run headlessly to completion, producing a trajectory that can be
sampled at an arbitrary time. Live playback and headless playback must agree for the same inputs and
timestep.

### 2. Offensive Routes

**FR-2.1:** A selected offensive player can be given a destination by clicking a point on the field.

**FR-2.2:** Additional clicks append further waypoints, forming a multi-leg route run in order.

**FR-2.3:** The pending route is visible on the canvas before it is run, and can be cleared.

**FR-2.4:** Running the simulation moves the player along its route with correct kinematics through
each leg, including the speed cost of changing direction at an intermediate waypoint.

**FR-2.5:** A route destination outside the field bounds is clamped to the field, consistent with
existing drag clamping.

**FR-2.6:** More than one offensive player may carry a route; all routed players run simultaneously
when the simulation runs.

### 3. Defensive Pursuit

**FR-3.1:** A defender with a matchup pursues its assigned offensive player automatically whenever
the simulation runs. A defender with a `null` matchup (free roam) does not move.

**FR-3.2:** Pursuit is **not** a beeline at the cutter's current position. The defender seeks a
position offset from the cutter by a cushion, in a documented leverage direction, so that a defender
positioned deep allows an approaching cutter's gap to close rather than closing it itself.

**FR-3.3:** The defender responds to the cutter's movement on a **delay** — it steers using the
cutter's state as of `react` seconds ago. A change of direction therefore costs the defender ground.

**FR-3.4:** When the cutter attacks deep, the defender begins accelerating deep rather than
converging on the cutter's current position — it carries the cut.

**FR-3.5:** The defender matches the cutter's horizontal (cross-field) movement.

**FR-3.6:** The defender is bound by the same kinematic limits as the offense — the same top speed,
acceleration, and deceleration model — with no ability to teleport, reverse instantly, or exceed
`vmax`.

**FR-3.7:** The mark is a defender like any other for pursuit purposes; if it has a matchup it
pursues it. Force positioning from `fieldview-play-model` is a static placement and is not
re-derived mid-simulation.

### 4. Simulation Control

**FR-4.1:** The user can run the simulation, and stop it before it completes.

**FR-4.2:** The simulation ends on its own when every routed player has arrived and no motion
remains.

**FR-4.3:** The user can reset the field to the positions held before the run, so the same cut can
be re-run after a tuning change.

**FR-4.4:** While a simulation runs, direct dragging of pieces is suppressed — the two are competing
writers of position.

**FR-4.5:** Elapsed simulation time is driven by real wall-clock time, and a long frame gap (a
backgrounded tab) must not teleport players by integrating one enormous timestep.

**FR-4.6:** Users who prefer reduced motion get the simulation's end state applied directly, without
animation.

### 5. Disc Flight

**FR-5.1:** Completing a throw animates the disc from thrower to receiver rather than moving it
instantly.

**FR-5.2:** Flight duration comes from the space model's existing flight-time function, so it scales
with distance and respects the `hang` slider — a huck hangs longer than a dump.

**FR-5.3:** Possession changes when the disc **arrives**, not when the receiver is clicked; the
roles and the mark update at that moment, per the existing throw semantics.

**FR-5.4:** A cancelled or interrupted flight cannot leave the disc orphaned — possession is either
its old value or its new one, never neither.

### 6. Tuning

**FR-6.1:** The motion tunables appear as sliders in the shell's existing Advanced Settings panel,
alongside the space-model sliders.

**FR-6.2:** Changes take effect on the next run without a reload, and there is a reset-to-defaults
path consistent with the existing one.

**FR-6.3:** Motion tunables persist with the existing overlay preferences, and are validated and
clamped on read like the existing ones (localStorage is untrusted).

### 7. Non-Persistence

**FR-7.1:** Routes, simulation state, and in-flight disc state are **transient**. `Scene` gains no
fields and the play format is not versioned up by this initiative.

**FR-7.2:** Saving a play mid-simulation saves positions, as it does today. No motion state is
written to a file.

---

## Non-Functional Requirements

- **Performance:** A running simulation with 14 movers plus a repainting heatmap must hold the
  existing < 16 ms frame budget. The stepper allocates no per-frame garbage in the hot path
  (buffers reused, per module convention). ADR-2 is absolute: no React commit per frame.
- **Reliability:** The simulation must terminate. No route, tuning combination, or pursuit geometry
  may produce oscillation that never settles, and a hard time ceiling backstops it.
- **Determinism:** Given identical initial state, route, tunables, and timestep sequence, the
  simulation produces identical output. No `Math.random`, no wall-clock reads inside `motion/`.
- **Security:** N/A — client-only. The only new persisted data is numeric slider values on the
  existing validated-and-clamped preferences path.
- **Maintainability:** `motion/` mirrors `space/` in structure and discipline: constants in one
  file, a guard test enforcing purity, and physics testable without a DOM.
- **Accessibility:** Motion is announced, not merely shown — a live region reports a run starting
  and finishing. Reduced motion is honoured (FR-4.6). Nothing in the initiative makes an existing
  control keyboard-inaccessible.

---

## Open Questions

Resolved by Builder before drafting (2026-07-30):

- **Execution model** — RESOLVED: a pure `step(state, dt)` plus a headless `simulate()` that runs
  the same stepper to completion and yields a sampled trajectory. One physics implementation, drivable
  live and replayable deterministically. Rejected: precompute-only (still needs the stepper
  internally, and cannot be driven live) and live-tick-only (leaves Initiative D re-deriving motion,
  and makes physics hard to test without a fake clock).
- **Growth scope** — RESOLVED: multi-waypoint cuts are **in** (without a direction change there is
  nothing for the pursuit model to be beaten by, so the headline requirement cannot be demonstrated
  or tuned). Disc flight animation is **in** (it reuses this initiative's clock and closes an item
  deferred out of `fieldview-play-model`). Best-positioned-defender selection is **deferred**.
- **Persistence** — RESOLVED: transient. No `Scene` change, no format bump. Initiative D redefines
  what a saved play is and will own the real v3.

Still open for tech-design to settle:

- ~~The precise cushion/leverage formulation for FR-3.2 — what direction the cushion points, and
  whether its magnitude varies with the cutter's speed or distance from the disc.~~ **RESOLVED in
  Partition 2**: the cushion points goalside (along disc→cutter) and its magnitude is **fixed**. What
  scales with speed is a separate `lead` term projecting the cutter's delayed velocity forward.
  Without it FR-3.4 fails — see tech-design ADR-2 and tasks.md Partition 2 deviation notes.
- ~~How the reaction delay of FR-3.3 is implemented (a history buffer of cutter states versus a
  lagged first-order filter), and what that costs per frame.~~ **RESOLVED in Partition 2**: a
  fixed-size ring of past positions, one entry per substep, written in place. Delayed velocity is
  differenced from the two oldest entries rather than stored. Cost is one array write per mover per
  substep and no allocation.
- ~~Whether intermediate waypoints are rounded through at speed or braked into, and whether that is
  a tunable.~~ **RESOLVED in Partition 1**: rounded through at speed, not a tunable. Braking applies
  to the final leg only; the speed cost of a turn is emergent from vector accel-limiting.
- The trajectory sampling rate for `simulate()`, and whether Initiative D consumes samples or
  re-steps.
- Where the driver lives such that both `Whiteboard.tsx` and (later) `Designer.tsx` can own a clock
  without two competing rAF loops.

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| The pursuit model looks wrong to a coach's eye despite being mathematically sound | High | High | Tunables are exposed as sliders from the first UI partition, so calibration is a drag not a code change; acceptance criteria include named by-eye scenarios flagged `NEEDS MANUAL REVIEW` for the deployed preview |
| A free-running rAF loop breaks ADR-2 by lifting per-frame state into React | Medium | High | The driver writes through `store.mutate` only; the existing Profiler test is extended to cover a running simulation, and reviewers check no per-frame `useState` appears |
| Frame budget blown once the heatmap repaints every frame instead of on discrete edits | Medium | High | Perf assertion added to the quarantined `test:perf` suite; the stepper reuses buffers; heatmap repaint stays on the existing `onFrame` path rather than gaining a second trigger |
| A tuning combination produces oscillation or a simulation that never ends | Medium | Medium | Hard time ceiling plus a settle threshold in `simulate()`; property tests run randomised tunables within slider ranges and assert termination |
| Motion redefines top speed or flight time, so the heatmap and the animation disagree | Medium | High | FR-1.2 and FR-5.2 forbid it; a guard test asserts `motion/` declares no `vmax`/`react`/flight-time constant of its own |
| Scope creeps into Initiative D via "the run should be saveable" | Medium | Medium | FR-7.1 makes non-persistence a requirement, not a default; `Scene` and `PlayFile` zero-diff is an explicit quality gate |
| Long-frame integration teleports players when a tab is backgrounded | Low | Medium | FR-4.5 requires a clamped timestep; a unit test feeds a 5-second gap and asserts bounded displacement |
