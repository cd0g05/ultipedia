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

- [x] Add `possession: string | null` and `matchups: Record<string, string | null>` to `Scene`; update every construction site <!-- id: 1 -->
- [x] Implement `normalize(scene)` deriving `thrower`/`mark` roles from possession + matchups (ADR-1) <!-- id: 2 -->
- [x] Implement `nearestDefender(scene, targetId)` for the unassigned-receiver case <!-- id: 3 -->
- [x] Implement `throwTo(scene, receiverId)` — move possession, then normalize <!-- id: 4 -->
- [x] Implement `autoAssign(scene)` nearest-available pairing <!-- id: 5 -->
- [x] Implement `reassign(scene, defenderId, offensiveId | null)` with 1-to-1 swap; `null` clears without cascading <!-- id: 6 -->
- [x] Implement `guardedBy(scene, offensiveId)` <!-- id: 7 -->
- [x] Call `normalize()` at the end of the existing `scene.ts` mutations <!-- id: 8 -->
- [x] Unit tests: role derivation, `possession: null` (no thrower/mark, no throw), throw role handoff <!-- id: 9 -->
- [x] Property tests: matchups stay a permutation across arbitrary reassignment sequences <!-- id: 10 -->
- [x] Guard test: no public op can leave a `thrower` who is not the possessor <!-- id: 11 -->
- [x] Run full fieldview suite; confirm existing `scene/` tests pass unmodified <!-- id: 12 -->

### Deviation notes (Partition 1: Model)

- `normalize()` also **clears stale possession** — an id naming a player who is not on the field,
  or naming a defence player, is reset to `null`. Not in the plan, but without it a scene could
  hold a non-null `possession` with no thrower, which is the same disagreement ADR-1 exists to
  prevent, just in the other direction.
- `scene/presets.ts` states matchups as **explicit index-pairing data** (d1→o1, dN→oN) rather than
  calling `autoAssign()`. On the vert preset the sagging help defenders sit closer to other cutters,
  so auto-assignment would silently re-pair the built-ins.
- `play/tween.ts` `sceneFrom` and `scene/presetFormat.ts` `presetToScene` construct a `Scene`, so
  task 1 forced a decision there. They recover `possession` from the stored `thrower` role and leave
  `matchups` empty (unassigned → normalize derives the mark by proximity, reproducing the stored
  mark). The real load-time backfill is Partition 3's task 32 (ADR-4); this is the minimum to
  compile without pre-empting it.
- The guard (task 11) has a **static half** as well as the behavioural one: it greps every non-test
  source file for direct `Player.role` assignment, so a future mutation that sets a role by hand
  fails even if no behavioural test happens to exercise it. Both halves were mutation-tested —
  removing `normalize()` from `throwTo` and removing the swap from `reassign` produces 15 failures.
- Scene literals in `acceptance.test.ts`, `space-model.test.ts` and `play.test.ts` gained the two
  new fields (task 1: "update every construction site"). No assertion or behaviour was changed;
  all 329 pre-existing tests pass unmodified.

## Partition: feat/fieldview-play-model-force

- [x] Define `FORCE_PRESETS` (3 sides × 3 angles → field-relative yard offsets) and `FORCE_TOLERANCE_YD` <!-- id: 20 -->
- [x] Implement `markPosFor(side, angle, throwerPos)` <!-- id: 21 -->
- [x] Implement `readForce(scene)` returning a named force or `"custom"` <!-- id: 22 -->
- [x] Unit test all 9 combinations produce distinct positions, and the snap→read round-trip <!-- id: 23 -->
- [x] Unit test the custom threshold at and beyond `FORCE_TOLERANCE_YD` <!-- id: 24 -->
- [x] Confirm `space/` has zero diff and `spaceGuard.test.ts` passes (ADR-3) <!-- id: 25 -->

## Partition: feat/fieldview-play-model-format

- [x] Bump `PLAY_FORMAT_VERSION` to 2; add optional `possession`/`matchups` to `PlayFile` <!-- id: 30 -->
- [x] Validate the new fields in `validate.ts`, preserving the drop-unknown-keys rule <!-- id: 31 -->
- [x] Backfill missing possession/matchups on load in `serialize.ts` (thrower-role → possession, `autoAssign` → matchups) <!-- id: 32 -->
- [x] Route `scene/presets.ts` through the same backfill so built-ins need no data edits <!-- id: 33 -->
- [x] Add a v1 fixture regression test: loads, backfills, behaves identically <!-- id: 34 -->
- [x] Test v2 round-trip of possession and matchups, and that malformed new fields are ignored not rejected <!-- id: 35 -->
- [x] Run full fieldview suite; confirm existing `play/` tests pass unmodified <!-- id: 36 -->

### Deviation notes (Partition 3: Persistence)

- The backfill lives in a new `play/backfill.ts` (`backfillScene`, `playModelOf`, `StoredPlayModel`)
  and is re-exported from `serialize.ts` rather than living there. `scene/presets.ts` and
  `scene/presetFormat.ts` both need it, and `serialize.ts` also owns `FilePlayStore`, which touches
  `document`/`FileReader` — importing it from `scene/` would have pulled DOM code into modules that
  are pure by rule (`tests/imports.test.ts`). Same contract, one import edge fewer.
- **Ordering, since ADR-4 does not state it:** possession is resolved first (stored value wins, else
  recovered from the `thrower` role), then matchups (stored map taken as given, else `autoAssign()`),
  then `normalize()` last. Last is what matters — `normalize()` clears stale possession, so running
  it after the backfill turns a hand-edited file naming a departed player into a loose disc, while
  leaving a genuine v1 thrower holding the disc. Asserted directly in the v1 fixture test and in
  three `backfillScene` ordering tests.
- **A dangling `possession` id is treated as absent, not as null.** ADR-4 says malformed fields are
  ignored; an id matching no entity is ignored *back to the v1 recovery path*, so the thrower role
  still finds the right player instead of the stale string silently emptying the disc. An explicit
  `null` is honoured as a real statement (loose disc).
- **`matchups` is sanitised rather than accepted-or-dropped whole:** entries survive only when the
  key is a declared defender and the value is null or a declared offensive player, and a target
  already claimed by an earlier defender is dropped to null — so ADR-2's permutation invariant holds
  on arrival rather than being repaired afterwards. A `matchups` value that is not an object at all
  is dropped entirely and backfilled.
- `presets.ts` built-ins now go through `backfillScene()` too, passing their explicit index pairing
  as the *stored* model — so the built-ins share the one code path (task 33) while keeping the
  hand-stated matchups Partition 1 deliberately chose over `autoAssign()`. A test asserts every
  built-in's `d(n) → o(n)` pairing survives, which is what would catch a future "simplification".
- **Two load sites outside the stated module list were fixed:** `pages/Whiteboard.tsx` `applyScene`
  and `pages/Designer.tsx` `importPlay` copied only `players` onto the store, leaving the *previous*
  scene's possession and matchups pointing into a roster that no longer existed. Loading a play or
  preset replaces the whole play, so the whole model is now copied. Designer's export also writes
  `playModelOf(scene)`: the thrower role would recover possession on its own, but matchups are a
  coach's choice and geometry cannot re-derive them.
- Mutation-tested: removing the thrower-role fallback, and ignoring stored matchups, each produce 11
  failures. 458 pre-existing tests pass unmodified (no test file was edited); 34 new tests added,
  493 total green, `tsc --noEmit` clean.

## Partition: feat/fieldview-play-model-ui

- [x] Build `ui/shell/throwMode.ts` — armed/disarmed UI state, not scene state (ADR-5) <!-- id: 40 -->
- [x] Make the ribbon's Throw button live: `aria-pressed` when armed; disabled with `Nobody has the disc.` when possession is null <!-- id: 41 -->
- [x] `FieldCanvas`: complete a throw on clicking an offensive player while armed <!-- id: 42 -->
- [x] `FieldCanvas`: cancel on Escape, empty grass, a defender, re-clicking Throw, or starting a drag; throw-to-self is a no-op exit <!-- id: 43 -->
- [x] `pieceLayer`: render the disc from `possession`; add throwing-mode receiver emphasis using `PIECE_TOKENS` <!-- id: 44 -->
- [x] Defender panel: matchup selector + `No assignment`, replacing the placeholder <!-- id: 45 -->
- [x] Defender panel: swap confirmation line naming the displaced defender's new mark <!-- id: 46 -->
- [x] Mark panel: 3×3 force grid that repositions the mark; active state on the current force <!-- id: 47 -->
- [x] Mark panel: `Custom` readout when off-preset; disabled state with the no-thrower message <!-- id: 48 -->
- [x] Offense panel: possession status + `Guarded by` readout <!-- id: 49 -->
- [x] Accessibility: live-region announcements for arming, throw completion, and swaps; labelled force groups <!-- id: 50 -->
- [x] Verify panels render identically in the desktop sidebar and mobile sheet (canon ADR-14) <!-- id: 51 -->
- [x] Confirm Profiler drag test still records 0 React commits <!-- id: 52 -->
- [x] Re-confirm `space/` zero diff after UI work <!-- id: 53 -->
- [x] Run the full fieldview suite; fix any regressions <!-- id: 54 -->

### Deviation notes (Partition 4: Panels & throw)

- **Panels reach the store through a new React context (`ui/shell/sceneStore.tsx`), not through
  `PanelProps`.** Canon ADR-13 fixes `PanelProps` at `{ selection }` and says a panel needing more
  state manages it itself — `DefaultVisibilityPanel` does that with `useOverlayState()`. That trick
  does not transfer: unlike overlay prefs, the scene is *not* a module-level singleton (`Whiteboard`
  and `Designer` each build their own store), so there is nothing global to reach for. Context keeps
  the registry's type untouched and puts both shells on the same seam; each shell gained one
  provider wrapper and no per-kind branching, which is the part ADR-13 actually prohibits. The
  context is nullable rather than throwing, so a panel rendered in isolation degrades to the empty
  state it has to have anyway.
- **`ui/playModel.ts` is new and is the ADR-2 pressure point of this partition.** Panels must react
  to possession/matchup/force changes, but `store.subscribe` fires once per pointer move, so
  subscribing naively would put React back in the drag path. The hook builds a key string from only
  the facts a panel can display — **positions are deliberately excluded**, with the one
  position-derived fact (the force) collapsed to its already-reduced reading — and returns a cached
  snapshot whose identity changes only when that key does. Dragging a cutter or the thrower costs
  zero commits; dragging the mark off a preset costs exactly one, at the tolerance boundary, which
  is the honest `Custom` transition the panel exists to show.
- **The mark panel ships 6 controls in two labelled rows, not 9 buttons.** tasks id 47 and
  approach.md say "3×3 grid" / "9 force buttons"; ux.md's UI States, Flow 3 ("clicks **Backhand**…
  then clicks **Around**"), and the accessibility requirement for groups named `Force side` and
  `Force angle` all describe two rows. The six controls still span the full 3×3 space, and nine
  loose buttons could not carry those two group labels. ux.md won as the primary spec.
  - Corollary, since no spec states it: **from `Custom`, one row alone does not determine the
    other**, so the missing half anchors on the neutral force (`flat` / `default`). The readout
    immediately states the whole answer ("Flat · Around") and the mark visibly moves, so nothing is
    guessed silently.
- **Throwing mode exits at pointer*down*, not pointer*up*.** A press on a receiver while armed only
  records a *pending* throw in a ref; it completes on release if the pointer never travelled past
  `THROW_CLICK_SLOP_YD` (0.75 yd), and is dropped as an ordinary drag if it did (ux.md Flow 1
  Alternate C). Disarming at the press means the mode-exit's single React commit lands before the
  moves rather than inside them — ADR-2 again. `setThrowArmed` is a no-op when the value is
  unchanged, so the cancel paths that fire while disarmed cost nothing.
- **`FieldCanvas` now re-derives the `players` identity list's roles from the store.** Roles are
  outputs of possession (ADR-1), so a throw changes them — but `players` is owned by the page and
  only rebuilt on a preset load, so without this the ring, the T/M glyphs and the aria-labels would
  keep describing the situation *before* the throw. Membership and labels still come from the prop
  (visibility filtering is unaffected); only the role is overlaid, off the same zero-commit snapshot.
- **The swap confirmation is module-level state, not `useState`.** The CSS-only breakpoint means the
  desktop sidebar and the mobile sheet both mount these panels at once; per-instance state would let
  the two copies disagree about whether a swap just happened — the exact drift ADR-14 prevents and
  the exact bug `ui/prefs.ts` documents.
- `PIECE_TOKENS.throwTarget` was added for the receiver emphasis (canvas accent `#EF4B8A`, ADR-16);
  `tokensGuard` pins values, not the key set, so this is additive and the guard passes untouched.
  The armed *hint banner* uses the shell accent instead — it is chrome that happens to overlay the
  stage, not a game entity.
- **Seven pre-existing assertions were updated, all in the one legitimate category:** the three
  `PENDING FIELDVIEW-PLAY-MODEL` placeholders are gone, so `shellPanels`/`shellDesktop`/`bottomSheet`
  could no longer assert their copy, and Throw is no longer one of the two "Ships in a future
  update." buttons. Each was replaced with an assertion on the shipped behaviour at the same seam;
  no test was weakened or deleted. Every other pre-existing test passes **unmodified**, including
  both ADR-2 Profiler tests, `spaceGuard`, `modelGuard` and `tokensGuard`.
- Verification: `space/` has **zero diff** against both `main` and the initiative branch; the
  Profiler drag test still records **0 commits**, and a second Profiler test was added for 25 moves
  *while armed*. 527 tests green, `tsc --noEmit` clean.
- Still open (unchanged from Partition 2): `FORCE_PRESETS` offsets are a first pass flagged
  `NEEDS VISUAL TUNING`, and approach.md's `NEEDS MANUAL REVIEW` on force positions and throw feel
  wants a deployed preview — neither is resolvable in jsdom.

## Initiative Boundary

- [ ] Merge `initiative/fieldview-play-model` directly into `main` (no PR at this boundary — confirm with Builder before merging) <!-- id: 100 -->
