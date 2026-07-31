---
summary: "Scene gains two fields: `possession` (the id holding the disc, or null) and `matchups` (defenderId -> offensiveId | null). Possession becomes the source of truth and `role: thrower|mark` is DERIVED from possession + matchups by a single normalize() pass run inside every mutation — so the invariant that made the derived disc safe is preserved, just relocated rather than abandoned. Force is never stored: force presets are yard-offset vectors applied to the mark's position, and the current force is read back by matching mark geometry within a tolerance (else `Custom`). Play format v2 adds possession/matchups additively; v1 files load and are backfilled by the same normalize()/auto-assign used for presets. All new logic is pure functions in scene/, wired into panels through the existing panelRegistry seam."
phase: "tech"
when_to_load:
  - "When implementing or reviewing possession, matchups, force geometry, or the play format bump."
  - "When checking conformance to the derived-role invariant or ADR-2."
depends_on:
  - "prd.md"
  - "ux.md"
modules:
  - "frontend/src/fieldview/scene"
  - "frontend/src/fieldview/play"
  - "frontend/src/fieldview/ui/shell/panels"
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

# Tech Design: fieldview-play-model

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

**Summary:** Three additions to the pure `scene/` layer, then thin UI on top. `Scene` gains
`possession` and `matchups`. A single `normalize(scene)` derives the `thrower` and `mark` roles from
those two facts and runs at the end of every mutation, which is what keeps this from becoming the
self-contradicting state the derived-disc invariant was written to avoid. Force is deliberately
*not* added to the model — it stays a reading of mark geometry, with presets that move the mark.
The play format gains the two new fields additively, and anything missing is backfilled on load.

### Cross-Cutting Concerns

1. **The invariant is relocated, not retired.** Canon says the disc "cannot disagree with itself"
   because it was derived. Making possession explicit only stays safe if the *roles* now derive
   from it. One direction of derivation, enforced in one function.
2. **`space/` must not change.** Force presets move a piece; the space model keeps deriving the
   force shadow from geometry. `spaceGuard.test.ts` should show zero diff in `space/`.
3. **ADR-2 (no React in the drag path).** Possession/matchup writes happen on discrete clicks, via
   `store.mutate`, never per frame.
4. **Backward compatibility.** Every v1 play file and every built-in/user preset must load
   unchanged — presets are one-keyframe `PlayFile`s, so this is the same code path.

### Brownfield Notes

- `scene/types.ts` `Scene` is currently `{ players: Player[] }` — additive change only.
- `scene/scene.ts` already owns `moveThrower` (mark carries the thrower). That stays; it will look
  up the thrower via the derived role exactly as it does now.
- `render/pieceLayer.tsx` currently derives the disc from `role === "thrower"`. It changes to read
  `possession` — a one-line change, since the thrower will still be the possessor.
- The three target panels are `OffensePlayerPanel`, `DefensePlayerPanel`, `MarkPanel`, currently
  placeholders registered in `ui/shell/panelRegistry.ts`.

---

## Tech Stack & Dependencies

| Category | Selection | Rationale |
|----------|-----------|-----------|
| Language/Runtime | TypeScript, existing React SPA | No change |
| State | Existing mutable `SceneStore` | Possession/matchups are scene state; they belong in the same store, mutated via `store.mutate` |
| Testing | Vitest + RTL (existing) | Pure `scene/` logic tested as mathematics, panels via RTL |

**New dependencies:** none.
**Rejected:** a state machine library for throwing mode — it is one boolean plus a cancel path, and
lives in shell UI state, not the scene.

---

## Project / Module Structure

```
frontend/src/fieldview/
├── scene/
│   ├── types.ts          # [MOD] Scene gains `possession`, `matchups`
│   ├── possession.ts     # NEW — normalize(), throwTo(), pure role derivation
│   ├── matchups.ts       # NEW — autoAssign(), reassign() 1-to-1 swap, clearAssignment()
│   ├── force.ts          # NEW — FORCE_PRESETS, markPosFor(), readForce() (geometry only)
│   ├── scene.ts          # [MOD] mutations end by calling normalize()
│   └── presets.ts        # [MOD] built-ins gain no data; matchups auto-assigned on load
├── play/
│   ├── format.ts         # [MOD] PLAY_FORMAT_VERSION 2; optional possession/matchups
│   ├── validate.ts       # [MOD] validate new optional fields; still drops unknown keys
│   └── serialize.ts      # [MOD] backfill on load
├── render/
│   └── pieceLayer.tsx    # [MOD] disc reads possession; throwing-mode emphasis
├── ui/
│   ├── FieldCanvas.tsx   # [MOD] throwing-mode click handling
│   └── shell/
│       ├── ToolRibbon.tsx        # [MOD] Throw button becomes live
│       ├── throwMode.ts          # NEW — armed/disarmed UI state (not scene state)
│       └── panels/               # [MOD] the three placeholders become real
```

---

## Architecture Decisions (ADRs)

### ADR-1: Possession is the source of truth; `thrower`/`mark` roles are derived

**Decision:** `Scene.possession: string | null` holds the id of the player with the disc.
`role: "thrower"` and `role: "mark"` are **outputs**, recomputed by `normalize(scene)`:
the possessor gets `thrower`; the possessor's assigned defender (or nearest, if unassigned) gets
`mark`; everyone else falls back to `cutter`/`defender` by team. `normalize()` runs at the end of
every scene mutation that could invalidate it.

**Rationale:** Canon's derived-disc rule existed so possession could not disagree with itself. The
roadmap wants explicit possession, which is genuinely needed (a throw is a possession event, and
Initiative D must record it). Rather than dropping the guarantee, this inverts the derivation: one
fact is stored, the dependent facts are computed. Storing *both* possession and thrower-role, and
keeping them in sync by hand at each call site, is precisely the failure mode canon warned about.

**Affects:** `scene/types.ts`, `scene/possession.ts`, `scene/scene.ts`, `render/pieceLayer.tsx`.

---

### ADR-2: Matchups live on `Scene` as a map, not on each `Player`

**Decision:** `Scene.matchups: Record<string, string | null>` keyed by defender id.

**Rationale:** A matchup is a *relation*, and the invariant that matters (it stays a permutation
with no duplicate targets) is a property of the whole set. On a per-player field, validating that
means scanning every player anyway, and a stale entry on a removed player is invisible. As a map it
is one object to validate, swap within, and serialise. `Player` also stays a pure positional record,
which keeps `PlayEntity` (which mirrors it) unchanged.

**Affects:** `scene/types.ts`, `scene/matchups.ts`, `play/format.ts`.

---

### ADR-3: Force is geometry, never stored

**Decision:** `scene/force.ts` exports `FORCE_PRESETS` (side × angle → yard offset from the
thrower), `markPosFor(side, angle, throwerPos)` to snap, and `readForce(scene)` which matches the
mark's actual offset against the presets within `FORCE_TOLERANCE_YD` and returns a named force or
`"custom"`. Nothing about force is persisted or read by `space/`.

**Rationale:** The validated space model states "the mark's position IS the force" — it derives
`θ_shadow` from mark geometry. A stored force would create a second answer to the same question and
could contradict the drawn scene. Builder chose the hybrid explicitly: buttons snap, dragging is
still free, and the readout tells the truth (`Custom`). Force also then round-trips through the
existing play format for free, because mark position already persists (FR-5.3).

**Affects:** `scene/force.ts`, `ui/shell/panels/MarkPanel.tsx`. **`space/` unmodified.**

---

### ADR-4: Play format v2 is additive with load-time backfill

**Decision:** `PLAY_FORMAT_VERSION = 2`. `PlayFile` gains optional `possession?: string | null` and
`matchups?: Record<string, string | null>`. `validate.ts` accepts them when well-formed and ignores
them otherwise (unknown keys still dropped). On load, a file missing them is backfilled: possession
from any entity whose stored role is `thrower`, matchups from `autoAssign()`.

**Rationale:** ADR-7 in canon makes forward compatibility a property of the validator, not the
version number. Backfilling on load means presets (one-keyframe `PlayFile`s) need no data edits at
all, and every existing user-saved play keeps working with no migration step.

**Affects:** `play/format.ts`, `play/validate.ts`, `play/serialize.ts`, `scene/presets.ts`.

---

### ADR-5: Throwing mode is UI state, not scene state

**Decision:** The armed/disarmed flag lives in shell UI state (`ui/shell/throwMode.ts`, a small
store mirroring the selection pattern), not on `Scene`.

**Rationale:** It is a transient property of *this session's pointer*, not of the play. Putting it
on `Scene` would leak it into the play format, into presets, and into Initiative D's frames, where
"was the throw tool armed" is meaningless. Keeping it out preserves the rule that `Scene` is what a
play *is*.

**Affects:** `ui/shell/throwMode.ts`, `ui/shell/ToolRibbon.tsx`, `ui/FieldCanvas.tsx`.

---

## Data Models

```typescript
// scene/types.ts
export interface Scene {
  players: Player[];
  // Who holds the disc. null = loose (no thrower, no mark).
  possession: string | null;
  // defenderId -> offensiveId, or null for free roam. A permutation: no two
  // defenders may share a target (enforced by matchups.ts, asserted by a guard test).
  matchups: Record<string, string | null>;
}
```

```typescript
// scene/force.ts — geometry only, nothing persisted
export type ForceSide = "flat" | "flick" | "backhand";
export type ForceAngle = "default" | "inside" | "around";
export type ForceReading = { side: ForceSide; angle: ForceAngle } | "custom";

export const FORCE_TOLERANCE_YD = 0.75; // how far a dragged mark may sit and still read as named
export const FORCE_PRESETS: Record<ForceSide, Record<ForceAngle, Vec2>>; // offset from thrower, yards
export function markPosFor(side: ForceSide, angle: ForceAngle, throwerPos: Vec2): Vec2;
export function readForce(scene: Scene): ForceReading;
```

**Key field decisions:**
- `possession: string | null` rather than a boolean on `Player` — one place to look, and `null`
  expresses "loose disc" which the UI needs for the disabled-Throw state.
- `matchups` values are nullable rather than omitting the key, so "explicitly free roam" and
  "unknown defender" are distinguishable.
- Offsets are in **yards, field-relative** (downfield/lateral), so they are orientation-agnostic and
  survive the vertical rendering without change (canon ADR-11).

### Modified Models

| Model | Change | Migration |
|-------|--------|-----------|
| `Scene` | + `possession`, `matchups` | None persisted at runtime; constructed by presets/load |
| `PlayFile` | + optional `possession`, `matchups`; version 2 | None — v1 backfilled on load (ADR-4) |
| `Player` | unchanged | — |

---

## API & Interface Design

```typescript
// scene/possession.ts — all pure, mutate the draft like scene.ts does
export function normalize(scene: Scene): void;              // derive thrower/mark roles
export function throwTo(scene: Scene, receiverId: string): void; // possession move + normalize
export function nearestDefender(scene: Scene, targetId: string): string | null;

// scene/matchups.ts
export function autoAssign(scene: Scene): void;             // nearest-available pairing
export function reassign(scene: Scene, defenderId: string, offensiveId: string | null): void;
export function guardedBy(scene: Scene, offensiveId: string): string | null;
```

`reassign` implements the 1-to-1 swap: if another defender already holds `offensiveId`, it receives
the caller's previous target (which may be `null`). Passing `null` clears without cascading.

### Backward Compatibility

`validatePlayFile` continues to accept v1 (`formatVersion: 1`) files. Only the reader changes;
nothing that previously loaded stops loading.

---

## Implementation Patterns & Conventions

- New `scene/` modules follow `scene.ts`/`selection.ts`: pure, mutate the passed draft, no React,
  no DOM, called from inside `store.mutate`.
- Every mutation that changes possession, matchups, or player membership **must end with
  `normalize()`**. A guard test asserts no scene reachable through the public ops has a `thrower`
  who is not the possessor.
- Panels read scene state via the store and write via `store.mutate` — no local copies of scene
  facts (the `useOverlayState` lesson from `fieldview-shell`).
- Force never appears as a stored field anywhere; adding one is a review-blocking change.

**Coverage expectations:** pure `scene/` modules at parity with existing `scene/` tests, including
sequence/property tests for swap permutation integrity. Panels via RTL.

---

## Security & Performance

**Security:** N/A beyond the existing validated import boundary; new optional fields are validated
and ignored when malformed.

**Performance:** `normalize()` and `autoAssign()` are O(n²) over **14 players** — trivial, and run
only on discrete events, never per frame. The Profiler drag test must stay at 0 React commits;
dragging does not change possession or matchups, so nothing new runs in the drag path.

---

## Implementation Sequence

1. **Model foundation** *(blocking)* — `types.ts` fields, `possession.ts`, `matchups.ts`, plus
   `normalize()` wiring into `scene.ts`. Pure, fully unit-tested.
2. **Force geometry** *(parallel with 1)* — `force.ts` presets, snap, and readback. Pure.
3. **Persistence** *(depends on 1)* — format v2, validation, backfill on load, preset path.
4. **Panels** *(depends on 1, 2)* — offense/defense/mark panels replacing placeholders.
5. **Throw interaction** *(depends on 1, 3)* — `throwMode.ts`, live ribbon button, `FieldCanvas`
   click handling, disc reads possession, throwing-mode emphasis.
6. **Verification** *(depends on all)* — v1 fixture regression, `space/` zero-diff check, Profiler
   test, full suite.

**Parallel opportunities:** 1 and 2 are independent (force is pure geometry, no possession
dependency). 4 and 5 both depend on 1 but not on each other.

**Known risks:** the `FORCE_PRESETS` offsets are a first pass and will want visual tuning — they are
constants in one file precisely so that is a token edit, not a rewrite.
