---
summary: "40 tasks across 4 partitions (Model, Force, Persistence, Panels & throw) plus the initiative-boundary merge. No PR boundaries — direct merges. Model and Force start in parallel; Persistence needs Model; Panels & throw needs all three."
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
  partition_core: "## Partition: feat/fieldview-play-model-core"
  partition_force: "## Partition: feat/fieldview-play-model-force"
  partition_format: "## Partition: feat/fieldview-play-model-format"
  partition_ui: "## Partition: feat/fieldview-play-model-ui"
  initiative_boundary: "## Initiative Boundary"
next_section: "## Partition: feat/fieldview-play-model-core"
---

# Tasks: fieldview-play-model

## Partition: feat/fieldview-play-model-core

- [ ] Add `possession: string | null` and `matchups: Record<string, string | null>` to `Scene`; update every construction site <!-- id: 1 -->
- [ ] Implement `normalize(scene)` deriving `thrower`/`mark` roles from possession + matchups (ADR-1) <!-- id: 2 -->
- [ ] Implement `nearestDefender(scene, targetId)` for the unassigned-receiver case <!-- id: 3 -->
- [ ] Implement `throwTo(scene, receiverId)` — move possession, then normalize <!-- id: 4 -->
- [ ] Implement `autoAssign(scene)` nearest-available pairing <!-- id: 5 -->
- [ ] Implement `reassign(scene, defenderId, offensiveId | null)` with 1-to-1 swap; `null` clears without cascading <!-- id: 6 -->
- [ ] Implement `guardedBy(scene, offensiveId)` <!-- id: 7 -->
- [ ] Call `normalize()` at the end of the existing `scene.ts` mutations <!-- id: 8 -->
- [ ] Unit tests: role derivation, `possession: null` (no thrower/mark, no throw), throw role handoff <!-- id: 9 -->
- [ ] Property tests: matchups stay a permutation across arbitrary reassignment sequences <!-- id: 10 -->
- [ ] Guard test: no public op can leave a `thrower` who is not the possessor <!-- id: 11 -->
- [ ] Run full fieldview suite; confirm existing `scene/` tests pass unmodified <!-- id: 12 -->

## Partition: feat/fieldview-play-model-force

- [ ] Define `FORCE_PRESETS` (3 sides × 3 angles → field-relative yard offsets) and `FORCE_TOLERANCE_YD` <!-- id: 20 -->
- [ ] Implement `markPosFor(side, angle, throwerPos)` <!-- id: 21 -->
- [ ] Implement `readForce(scene)` returning a named force or `"custom"` <!-- id: 22 -->
- [ ] Unit test all 9 combinations produce distinct positions, and the snap→read round-trip <!-- id: 23 -->
- [ ] Unit test the custom threshold at and beyond `FORCE_TOLERANCE_YD` <!-- id: 24 -->
- [ ] Confirm `space/` has zero diff and `spaceGuard.test.ts` passes (ADR-3) <!-- id: 25 -->

## Partition: feat/fieldview-play-model-format

- [ ] Bump `PLAY_FORMAT_VERSION` to 2; add optional `possession`/`matchups` to `PlayFile` <!-- id: 30 -->
- [ ] Validate the new fields in `validate.ts`, preserving the drop-unknown-keys rule <!-- id: 31 -->
- [ ] Backfill missing possession/matchups on load in `serialize.ts` (thrower-role → possession, `autoAssign` → matchups) <!-- id: 32 -->
- [ ] Route `scene/presets.ts` through the same backfill so built-ins need no data edits <!-- id: 33 -->
- [ ] Add a v1 fixture regression test: loads, backfills, behaves identically <!-- id: 34 -->
- [ ] Test v2 round-trip of possession and matchups, and that malformed new fields are ignored not rejected <!-- id: 35 -->
- [ ] Run full fieldview suite; confirm existing `play/` tests pass unmodified <!-- id: 36 -->

## Partition: feat/fieldview-play-model-ui

- [ ] Build `ui/shell/throwMode.ts` — armed/disarmed UI state, not scene state (ADR-5) <!-- id: 40 -->
- [ ] Make the ribbon's Throw button live: `aria-pressed` when armed; disabled with `Nobody has the disc.` when possession is null <!-- id: 41 -->
- [ ] `FieldCanvas`: complete a throw on clicking an offensive player while armed <!-- id: 42 -->
- [ ] `FieldCanvas`: cancel on Escape, empty grass, a defender, re-clicking Throw, or starting a drag; throw-to-self is a no-op exit <!-- id: 43 -->
- [ ] `pieceLayer`: render the disc from `possession`; add throwing-mode receiver emphasis using `PIECE_TOKENS` <!-- id: 44 -->
- [ ] Defender panel: matchup selector + `No assignment`, replacing the placeholder <!-- id: 45 -->
- [ ] Defender panel: swap confirmation line naming the displaced defender's new mark <!-- id: 46 -->
- [ ] Mark panel: 3×3 force grid that repositions the mark; active state on the current force <!-- id: 47 -->
- [ ] Mark panel: `Custom` readout when off-preset; disabled state with the no-thrower message <!-- id: 48 -->
- [ ] Offense panel: possession status + `Guarded by` readout <!-- id: 49 -->
- [ ] Accessibility: live-region announcements for arming, throw completion, and swaps; labelled force groups <!-- id: 50 -->
- [ ] Verify panels render identically in the desktop sidebar and mobile sheet (canon ADR-14) <!-- id: 51 -->
- [ ] Confirm Profiler drag test still records 0 React commits <!-- id: 52 -->
- [ ] Re-confirm `space/` zero diff after UI work <!-- id: 53 -->
- [ ] Run the full fieldview suite; fix any regressions <!-- id: 54 -->

## Initiative Boundary

- [ ] Merge `initiative/fieldview-play-model` directly into `main` (no PR at this boundary — confirm with Builder before merging) <!-- id: 100 -->
