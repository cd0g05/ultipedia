---
summary: "A new pure library frontend/src/fieldview/motion/ mirroring space/: vec, constants, kinematics (vector accel-limited steering with arrival braking), route, pursuit, step, simulate. One stepper drives both live playback and headless trajectories. The defender seeks a cushion point offset from the cutter along the disc→cutter axis, steering on a reaction delay served from a fixed-size history ring — from which gap-closing, carrying a deep cut, and horizontal matching all fall out as consequences rather than special cases. A fixed-timestep accumulator in ui/motion/driver.ts gives determinism and clamps long frames; it writes through store.mutate so React stays out of the frame path (ADR-2). Top speed and reaction come from SpaceParams and disc flight from space/layers.ts flightTime() — no second answers. Scene and PlayFile unchanged."
phase: "tech"
when_to_load:
  - "When implementing any motion partition, or reviewing the physics, pursuit model, or clock."
  - "When Initiative D needs to consume trajectories."
depends_on:
  - "prd.md"
  - "ux.md"
  - ".cicadas/canon/modules/fieldview.md"
modules:
  - "frontend/src/fieldview/motion"
  - "frontend/src/fieldview/ui/motion"
  - "frontend/src/fieldview/ui/shell/panels"
  - "frontend/src/fieldview/render/tokens.ts"
index:
  overview: "## Overview & Context"
  stack: "## Tech Stack & Dependencies"
  structure: "## Project / Module Structure"
  adrs: "## Architecture Decisions (ADRs)"
  data_models: "## Data Models"
  interfaces: "## API & Interface Design"
  patterns: "## Implementation Patterns & Conventions"
  security_perf: "## Security & Performance"
  sequence: "## Implementation Sequence"
next_section: "Overview & Context"
---

# Tech Design: fieldview-motion

## Progress

- [x] Overview & Context
- [x] Tech Stack & Dependencies
- [x] Project / Module Structure
- [x] Architecture Decisions
- [x] Data Models
- [x] API & Interface Design
- [x] Implementation Patterns & Conventions
- [x] Security & Performance
- [x] Implementation Sequence

## Overview & Context

Field View has no clock. `store.onFrame` fires only in response to a mutation — the rAF is a
coalescer for repaints, not a simulation loop. Nothing in the module advances time on its own.

This initiative adds two things: a pure library that answers "where is everyone `dt` later", and a
driver that calls it sixty times a second and writes the answers into the existing store. The
library is `motion/`, built to the same contract `space/` already honours (canon ADR-1): no React,
no DOM, no canvas, no module-level mutable state, testable as mathematics. The driver is the only
new thing in the codebase that knows about wall-clock time.

The load-bearing constraint is canon ADR-2. React is out of the drag path today because pointer
handlers mutate the store directly and painters subscribe to frames. A simulation is the same shape
of problem at sixty times the frequency, so it takes the same solution: the driver mutates, painters
repaint, React is not told. Any design here that renders positions from React state is wrong at the
architecture level, not merely slow.

### Cross-Cutting Concerns

- **Consistency with the space model.** `space/` already asserts a top speed (`vmax`), a reaction
  time (`react`), and a disc flight time (`flightTime()`). If motion declares its own, the heatmap's
  prediction and the animation the coach watches will disagree — the exact failure mode canon's
  derived-disc and derived-force rules exist to prevent (ADR-3 below).
- **Determinism.** Initiative D replays plays. A simulation whose result depends on the host's frame
  pacing is not replayable, so the timestep must be fixed and internal (ADR-5).
- **Termination.** Pursuit is a feedback loop with tunable gains exposed to a slider. Feedback loops
  with user-tunable gains oscillate. `simulate()` needs a hard ceiling and a settle test.
- **Two writers of position.** Drag and the simulation both write `Player.pos`. Only one may be live
  at a time (PRD FR-4.4).

### Brownfield Notes

- `SceneStore.mutate()` already notifies subscribers *and* schedules a frame. Calling it per
  simulation tick is the intended usage, not an abuse — it is what keeps painters on one path.
- `matchups` (canon ADR-18) already answers "who does this defender chase", so pursuit needs no new
  assignment model. Free roam (`null`) already means "do not automate this defender", which maps
  exactly onto "does not move during a run".
- `normalize()` (canon ADR-17) is the only writer of `Player.role`. Motion writes **positions only**
  and never touches roles — except through the existing `throwTo()` at disc arrival.
- `prefs.ts` already persists, validates, and clamps `SpaceParams` from localStorage, with a shared
  external store and a reset. Motion tunables extend that structure rather than adding a second one.
- `Designer.tsx` is still pre-shell and is untouched here, as in the previous two initiatives. The
  driver is designed so a second page can own its own clock (ADR-5), which is what Initiative D will
  need — but no clock is mounted there in this initiative.

## Tech Stack & Dependencies

No new dependencies. TypeScript, React 18, Vite, Vitest, Tailwind — as-is.

Everything here is arithmetic over `Vec2`. A physics or ECS library would be many times the size of
the code it replaced and would drag in an update-loop opinion that conflicts with ADR-2 and ADR-5.
Game-AI pursuit literature (steering behaviours: seek, arrive, pursue) informs the model; none of it
is taken as a dependency.

## Project / Module Structure

```
frontend/src/fieldview/
├── motion/                       — NEW. Pure, framework-free (ADR-1)
│   ├── types.ts                  — Mover, MotionState, Route, Trajectory, MotionParams
│   ├── constants.ts              — every motion tunable + slider ranges, single source (ADR-3)
│   ├── vec.ts                    — Vec2 arithmetic (add, scale, sub, len, norm, clampLen)
│   ├── kinematics.ts             — accel-limited steering + arrival braking
│   ├── route.ts                  — waypoint sequencing, leg advance, arrival test
│   ├── pursuit.ts                — cushion point, reaction history, defender target (ADR-2)
│   ├── step.ts                   — step(state, dt) → state; the one physics entry point
│   ├── simulate.ts               — headless run to settle → Trajectory; sampleAt()
│   └── disc.ts                   — flight interpolation, duration via space flightTime() (ADR-3)
├── ui/motion/                    — NEW. The impure half
│   ├── motionMode.ts             — transient interaction state, external store (ADR-4)
│   ├── driver.ts                 — fixed-timestep accumulator + rAF, writes via store (ADR-5)
│   └── useMotionRun.ts           — React binding for status/controls only, never positions
├── ui/shell/panels/
│   └── OffensePlayerPanel.tsx    — MODIFIED: gains the Route section
├── ui/AdvancedPanel.tsx          — MODIFIED: gains the Movement slider group
├── ui/prefs.ts                   — MODIFIED: MotionParams persisted alongside SpaceParams
├── ui/FieldCanvas.tsx            — MODIFIED: destination picking, drag suppression while running
├── render/tokens.ts              — MODIFIED: route marker + running indicator tokens
├── render/routeLayer.tsx         — NEW: route markers and legs (SVG, selected player only)
└── tests/
    ├── motionGuard.test.ts       — NEW: purity + no-duplicate-constants guard
    ├── kinematics.test.ts, route.test.ts, pursuit.test.ts, simulate.test.ts — NEW
    ├── motionDriver.test.ts      — NEW: clamped dt, determinism, stop/reset
    └── motionUi.test.tsx         — NEW: panel controls, picking, cancel paths
```

`scene/`, `play/`, and `space/` gain **no files and no semantic changes**. `space/` is read from
(`flightTime`, `SpaceParams`) and never written to; `spaceGuard.test.ts` continues to prove it.

## Architecture Decisions (ADRs)

### ADR-1: One stepper, driven live or run headlessly

**Decision.** `motion/step.ts` exports a single pure function `step(state: MotionState, dt: number):
MotionState`. Live playback is a driver calling it each tick. A headless trajectory is
`simulate()` calling the *same* function in a loop until the state settles, recording samples.

**Why.** The alternatives each duplicate physics. Precompute-only still has to simulate reactive
pursuit internally — the stepper exists either way, just unexposed and undrivable. Live-only leaves
Initiative D either re-deriving motion or storing baked positions, and makes physics untestable
without a fake clock. With one stepper, a test asserts live and headless runs of the same inputs
produce identical output, which is a real guarantee rather than a hope.

**Consequence.** `MotionState` must be self-contained — everything the physics needs is in it,
including the reaction history. Nothing may be read from a closure, a module-level variable, or the
`Scene`. That is what makes both drivers possible and the whole thing testable.

### ADR-2: The defender seeks a cushion point on a delay, not the cutter

**Decision.** A pursuing defender does not steer at its assigned cutter. It steers at a **cushion
point**:

```
lead      = cutterPos(t − react)                    # what the defender has actually seen
leverage  discPos → lead, normalised                # goalside: away from the disc
target    = lead + cushion · leverage
```

and then moves toward `target` under the same kinematic limits as the offense (`kinematics.arrive`).
The reaction delay is served from a fixed-size ring of past cutter states inside `MotionState`.

**Why.** The PRD's three pursuit requirements (FR-3.2 gap-closing, FR-3.4 carrying, FR-3.5
horizontal matching) read like three behaviours, and a naive implementation would hand-code three
rules that then fight each other at the boundaries. They are all consequences of this one formula:

- A defender playing 10 yd deep of an approaching cutter finds `target` *underneath* itself but only
  by the cushion margin, so it drifts under slowly and lets the gap close instead of charging.
- When the cutter turns deep, `target` moves deep at the cutter's speed plus the leverage swing, so
  the defender is accelerating deep before the cutter arrives.
- `target` tracks the cutter laterally one-for-one, so horizontal movement is matched for free.
- Because the input is delayed, a direction change costs the defender exactly `react` seconds of
  committed momentum — which is why a two-part cut beats it and a straight cut does not.

**Consequence.** Cushion magnitude and reaction are the two dials that decide whether the defense
"looks right", and both are sliders from the first UI partition. Leverage is defined relative to the
**disc**, so it needs `possession`; when possession is null there is no disc to be goalside of, and
the defender falls back to `cushion = 0` (pure delayed follow). This is a documented fallback, not
an accident.

### ADR-3: Motion does not redefine top speed, reaction time, or flight time

**Decision.** `MotionParams` covers acceleration, deceleration, and cushion. Top speed and reaction
time are read from the **existing** `SpaceParams` (`vmax`, `react`), and disc flight duration from
the **existing** `flightTime(d, hang)` in `space/layers.ts`. `motionGuard.test.ts` fails the build if
`motion/` declares a constant for any of the three.

**Why.** `space/` already answers all three questions, and the heatmap the coach is looking at is
computed from those answers. A separate motion top speed would mean the heatmap says a cutter can
reach a cell while the animation shows it cannot — two answers to one question, which is precisely
the failure canon ADR-17 and ADR-19 were written to prevent, appearing in a third place.

**Consequence.** Moving the `vmax` slider changes both the heatmap and how fast pieces run. That is
the intended behaviour and should be stated in the panel grouping (ux.md puts them in one
**Movement** group for this reason). It also means `motion/` imports from `space/` — a one-way
dependency that `motionGuard` pins, since the reverse would be a cycle.

### ADR-4: Motion state is transient and lives outside `Scene`

**Decision.** Routes, run status, saved pre-run positions, and in-flight disc state live in
`ui/motion/motionMode.ts` as a module-level external store, exactly as `throwMode.ts` does. `Scene`
gains no fields; `PlayFile` is not versioned up.

**Why.** This is canon ADR-21 applied unchanged: `Scene` is *what a play is*. A pending route is a
property of this session's pointer, not of the play. Putting it on the scene would leak it into the
play format, into every preset, and into Initiative D's frames — where D will define its own,
better-shaped representation of the same idea as part of its action model. Defining a route format
here would mean defining it twice.

**Consequence.** A coach cannot save a route in this initiative. That is a deliberate, Builder-
confirmed deferral to D, and should be stated plainly in the panel rather than left to be discovered.

### ADR-5: A fixed-timestep accumulator, owned by the page, writing through the store

**Decision.** `ui/motion/driver.ts` creates a driver bound to one `SceneStore`. Each rAF frame it
adds the real elapsed time to an accumulator, **clamps** the accumulated total to a ceiling, then
consumes it in fixed `DT` increments (`1/120 s`), calling `step()` once per increment and writing the
resulting positions in a single `store.mutate()` at the end of the frame.

**Why.** Fixed steps make the simulation deterministic and reproducible regardless of host frame
pacing, which is what ADR-1's live/headless agreement guarantee and Initiative D's replay both
require. The clamp is what stops a backgrounded tab from integrating a five-second timestep and
teleporting everyone (PRD FR-4.5). One `mutate()` per frame rather than per substep keeps the
existing repaint coalescing intact. Binding the driver to a store instance rather than making it a
singleton is what lets `Designer.tsx` own its own clock later without two rAF loops fighting.

**Consequence.** The driver is the only place in `fieldview/` that reads wall-clock time. React sees
run *status* transitions (`useMotionRun`), never per-frame positions — the Profiler test is extended
to prove it. The reaction ring in `MotionState` is sized in fixed steps (`react / DT`), which is
only well-defined because `DT` is fixed.

### ADR-6: Reduced motion is a JS check here — a documented exception

**Decision.** The driver reads `prefers-reduced-motion` in JS. When set, `Run` calls `simulate()`
and applies the end state in one mutation, with no animation.

**Why.** The module's convention is reduced motion via Tailwind `motion-safe:` variants and no JS
`matchMedia` listener, for the same no-resize-listener reasons as the breakpoint. That convention
holds for CSS transitions. This animation is a JS integration loop; there is no CSS to vary, so the
convention cannot apply and a variant would silently do nothing.

**Consequence.** Recorded explicitly so a future reader does not "restore consistency" by deleting
the check. It is one query at run start, not a subscription, which keeps the no-listener half of the
convention intact.

## Data Models

### New (motion/types.ts)

```ts
export interface Mover {
  id: string;          // Player.id — pairs by stable id, never index (module convention)
  pos: Vec2;           // yards, model space (+x = attacking) — never screen space
  vel: Vec2;           // yards/second
}

export interface Route {
  legs: Vec2[];        // ordered waypoints; empty = no route
  leg: number;         // index of the leg currently being run
}

export interface DiscFlight {
  from: Vec2;
  to: Vec2;
  receiverId: string;
  elapsed: number;
  duration: number;    // from space flightTime() — never computed here (ADR-3)
}

export interface MotionState {
  movers: Mover[];
  routes: Record<string, Route>;        // offensive id → route
  matchups: Record<string, string | null>;  // snapshot of Scene.matchups at run start
  possession: string | null;            // for leverage direction (ADR-2)
  history: Record<string, Vec2[]>;      // ring of past cutter positions, length react/DT
  historyHead: number;
  disc: DiscFlight | null;
  elapsed: number;
}

export interface MotionParams {
  accel: number;       // yd/s²
  decel: number;       // yd/s² — braking is separate; players stop faster than they start
  cushion: number;     // yd — defensive goalside gap (ADR-2)
}

export interface Trajectory {
  dt: number;                       // the fixed step it was produced at
  samples: Record<string, Vec2[]>;  // player id → position per sample
  duration: number;
}
```

`vmax` and `react` are deliberately **absent** from `MotionParams` (ADR-3); the stepper takes a
`SpaceParams` alongside it.

### Modified

- `ui/prefs.ts` — the persisted preferences object gains a `motion: MotionParams` key, validated and
  clamped on read exactly as `params` is. Absent or malformed values fall back to defaults, so
  existing stored preferences load unchanged.
- `render/tokens.ts` — route marker and running-indicator visuals (canon ADR-10 keeps them here).

**Unchanged, and asserted as such:** `scene/types.ts`, `play/format.ts`, all of `space/`.

## API & Interface Design

```ts
// motion/step.ts — the one physics entry point
export function step(s: MotionState, dt: number, mp: MotionParams, sp: SpaceParams): MotionState;

// motion/simulate.ts — the same stepper, headless
export function simulate(
  s0: MotionState, mp: MotionParams, sp: SpaceParams,
  opts?: { dt?: number; maxSeconds?: number },
): Trajectory;
export function sampleAt(t: Trajectory, seconds: number): Record<string, Vec2>;
export function isSettled(s: MotionState): boolean;

// motion/kinematics.ts
export function arrive(m: Mover, target: Vec2, dt: number, mp: MotionParams, vmax: number): Mover;

// motion/pursuit.ts
export function cushionPoint(lead: Vec2, disc: Vec2 | null, cushion: number): Vec2;
export function delayedPos(s: MotionState, id: string, react: number, dt: number): Vec2;

// motion/disc.ts
export function beginFlight(from: Vec2, to: Vec2, receiverId: string, hang: number): DiscFlight;
export function discPos(f: DiscFlight): Vec2;

// ui/motion/driver.ts
export interface MotionDriver {
  run(): void;    // start; no-op if already running
  stop(): void;   // freeze in place (ux.md Flow 5)
  reset(): void;  // restore pre-run positions
  isRunning(): boolean;
  dispose(): void;
}
export function createMotionDriver(store: SceneStore): MotionDriver;
```

**Initiative D's seam** is `simulate()` + `sampleAt()`: D builds a `MotionState` from a frame's
recorded actions and asks for the trajectory, rather than storing baked positions or re-implementing
physics. Keeping `MotionState` self-contained (ADR-1) is what makes that possible.

### Backward Compatibility

Nothing to break. No format change, no `Scene` change, no `space/` change. Stored preferences
missing the `motion` key load with defaults. Every existing play file, preset, and test is unaffected
by construction, and the quality gate is a zero semantic diff on `scene/`, `play/`, and `space/`.

## Implementation Patterns & Conventions

- **Steering is vector-limited, so turn cost is emergent.** `arrive` clamps the *acceleration*
  applied to the velocity vector, and clamps speed to `vmax`. A player changing direction spends its
  acceleration budget on turning, which costs speed automatically. There is no separate "turn
  penalty" rule to tune or to disagree with the straight-line case. Braking applies only when the
  remaining distance drops below `v²/(2·decel)`, and only on the final leg — intermediate waypoints
  are rounded through at speed, which is what a real cut does.
- **Model space only.** `motion/` works in yards with `+x = attacking`. It never sees a pixel.
  Orientation stays exclusively in `render/coords.ts` (canon ADR-11).
- **Reuse buffers in the hot path**, per module convention: the ring is preallocated at run start,
  and the stepper writes into reused mover arrays rather than allocating per tick.
- **Never assign `Player.role`.** Motion writes positions. The one role change in the initiative is
  disc arrival, which calls the existing `throwTo()` and lets `normalize()` derive (canon ADR-17).
- **`motion/` imports nothing from `ui/`, `render/`, or React**, and one-way from `space/` only.
  `motionGuard.test.ts` enforces both directions by scanning imports — the same technique
  `spaceGuard` uses.
- **The armed-mode grammar is copied, not reinvented**: destination picking mirrors `throwMode`'s
  arming, hint line, and cancel paths, so the two modes behave identically from the coach's side.
- **Guard tests are mutation-tested when written.** The previous initiative's `modelGuard` was, and
  it is the reason that invariant is trusted. `motionGuard` and the determinism test get the same
  treatment: break the thing deliberately, confirm the test fails, restore.

## Security & Performance

**Security.** Client-only; no network, no new parsing. The one new persisted surface is numeric
motion tunables in localStorage, which is untrusted and therefore validated and clamped on read on
the existing `prefs.ts` path — a hostile value there could otherwise produce a NaN position and a
blank field.

**Performance.**

- Budget: < 16 ms per frame with 14 movers, the heatmap repainting, and up to 120 fixed substeps per
  second. The stepper is O(movers) per substep with no allocation; the heatmap remains the dominant
  cost and is unchanged.
- Repaint stays on the single existing `onFrame` path. The driver must not add a second repaint
  trigger — one `store.mutate()` per rendered frame, not per substep.
- The Profiler assertion is extended: 0 React commits across a run, not merely across a drag.
- New timing assertions go in the **quarantined** `test:perf` suite, per the module's existing rule
  that timing measured under a parallel suite is 2–3× pessimistic.

## Implementation Sequence

1. **motion/ core** — types, constants, vec, kinematics, route. Pure math, no pursuit, no clock.
2. **motion/ pursuit + runner** — cushion model, reaction ring, `step()`, `simulate()`, and the
   live/headless agreement test.
3. **Driver** — accumulator, clamping, store writes, run/stop/reset, reduced-motion path, Profiler
   assertion.
4. **UI** — offense panel Route section, destination picking in `FieldCanvas`, `routeLayer`,
   Movement sliders, prefs persistence.
5. **Disc flight** — `disc.ts`, throw completion deferred to arrival. Independent of (4); depends on
   (3).
