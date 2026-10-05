---
summary: "Six partitions of ordered, testable tasks: Clean-up (12), Model (19), Disc/titles/sizes (19), Build UI (17), Library/sharing (15), QA (8), plus 8 initiative-boundary tasks. No PR boundaries — direct merges. Strictly sequential P0 → P5. Tasks that need the Builder's eyes or hands (real-device checks, real plays and setups) are marked NEEDS MANUAL REVIEW; every placeholder is registered in docs/fieldview-placeholders.md. Stacked on initiative/fieldview-ui-rework."
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
  - "frontend/src/router.tsx"
  - "frontend/package.json"
index:
  partition_cleanup: "## Partition: feat/fieldview-build-cleanup"
  partition_model: "## Partition: feat/fieldview-build-model"
  partition_disc: "## Partition: feat/fieldview-build-disc-titles"
  partition_ui: "## Partition: feat/fieldview-build-ui"
  partition_share: "## Partition: feat/fieldview-build-share"
  partition_qa: "## Partition: feat/fieldview-build-qa"
  initiative_boundary: "## Initiative Boundary"
next_section: "## Partition: feat/fieldview-build-cleanup"
---

# Tasks: fieldview-build

Baseline before any task: whole `src` suite on `initiative/fieldview-ui-rework` at kickoff (record the exact
count in P0 task 1; it was **69 files / 991 tests**, Field View alone 55 / 884, when the ui-rework finished).

## Partition: feat/fieldview-build-cleanup

- [x] Re-measure the baseline (`npx vitest run src`, `npm run test:perf`, `npx tsc -b`); record counts and perf numbers in the Reflect notes <!-- id: 1 -->
- [x] Consumer audit: for every file in FR-8.1 grep who imports it; list the tests that import it; record in Reflect <!-- id: 2 -->
- [x] Create `tests/fieldHarness.tsx`: renders `FieldCanvas` over a `SceneStore` with the 14-player scene, a stubbed SVG rect and the overlay settings — no shell, no page <!-- id: 3 -->
- [x] Port to the harness (or the Explore route) the tests worth keeping: piece drag, marquee group drag, keyboard nudge, nearest-grab (`drag.test`), the §8.9 frame budget and hover readout (`overlay.test`), the 0-commit drag test <!-- id: 4 -->
- [x] Delete `pages/{Whiteboard,Designer,FieldStage}.tsx`; remove the `/fieldview/designer` and `/field-view/designer` routes and their route tests <!-- id: 5 -->
- [x] Delete `ui/shell/{ShellLayout,LeftSidebar,RightSidebarSlot,BottomSheet,ToolRibbon,panelRegistry}.ts(x)` and `ui/shell/panels/*`; keep `throwMode.ts`, `sceneStore.tsx`, `useSelection.ts` <!-- id: 6 -->
- [x] Delete `ui/{PresetMenu,Timeline,PlayMeta,OverlayRail}.tsx` and `scene/{presetRegistry,presetFormat}.ts`; keep `AdvancedPanel.tsx`, `playModel.ts`, `motion/*`, `scene/{matchups,force}.ts` <!-- id: 7 -->
- [x] Delete the tests that only covered deleted code (`bottomSheet`, `shellDesktop`, `shellPanels`, `shellGuard`, `panelParity`, `presetMenu`, `presetRegistry`, `presetFormat`, `designer`, `responsive`, `pages`, `a11y`, `throwing`, `motionUi`) — and nothing else <!-- id: 8 -->
- [x] `tsc -b` clean with no unused exports from the deleted code; adjust `index.css`/comments that cite the deleted shell <!-- id: 9 -->
- [x] `docs/fieldview-backlog.md` "Built but not surfaced": point each removed UI at its last git commit instead of a path that no longer exists <!-- id: 10 -->
- [x] Reflect: full suite + `test:perf` green; update specs <!-- id: 11 -->
- [x] Confirm with the Builder that nothing deleted was wanted (it is all in git history) <!-- NEEDS MANUAL REVIEW --> <!-- id: 12 -->

**Reflect notes (P0)**
- Baseline at kickoff: tsc clean; 69 files / 991 tests; `test:perf` 4 files / 27 tests (computeGrid best ≈ 9.7 ms).
- After P0: tsc clean; 55 files / 793 tests; `test:perf` 4 files / 27 tests green (computeGrid best ≈ 9.8 ms; §8.9 frame ≈ 10 ms).
- Audit: `FieldStage` had no importers. `Whiteboard` was imported by 9 tests; `Designer` by 5 tests + `router.tsx`; `presetFormat` also by `modelGuard` and `playFormatV2` (their preset round-trip cases removed).
- `tests/fieldHarness.tsx` (FieldCanvas over the vert-stack scene + `SelectionProbe` + `CellReadout`) now backs `drag.test` and `overlay.test`. Kept in `overlay.test`: hover readout, ADR-2 zero-commit tests (incl. one-commit selection change), live repaint, §8.5, §8.9 frame budget, prefs parsing, reduced-motion. Dropped: rail, team-visibility, advanced-panel and persist-across-remount cases (they only exercised deleted UI).
- Deleted tests: bottomSheet, shellDesktop, shellPanels, shellGuard, panelParity, presetMenu, presetRegistry, presetFormat, designer, responsive, pages, a11y, throwing, motionUi.
- Kept (unmounted, harvest later): `ui/AdvancedPanel`, `ui/shell/{throwMode,sceneStore,useSelection}`, `motion/*`, `scene/{matchups,force}`, `playModel`.
- `/fieldview/designer` and `/field-view/designer` removed from `router.tsx`; router test asserts they no longer render anything.
- Backlog "Built but not surfaced" now points at commit `085621f` for the removed UI.

## Partition: feat/fieldview-build-model

- [ ] `play/format.ts`: v3 types and constants (`PLAY_FORMAT_VERSION=3`, `MAX_FRAMES=30`, `MAX_TITLE_LENGTH=2`, `MAX_LABEL_LENGTH=24`, `PlayerRef`, `Frame`, `Play`) <!-- id: 20 -->
- [ ] `play/model.ts`: `resolve`, `resolveAll`, `toScene` (positions → `Scene` with possession, `autoAssign` matchups, `normalize`) <!-- id: 21 -->
- [ ] Operations: `placePlayers`, `giveDisc` (offense only), `setTitle` (trim, uppercase, ≤ 2), `setFrameLabel`, `renamePlay` <!-- id: 22 -->
- [ ] Operations: `addFrame`, `duplicateFrame`, `deleteFrame` (refuses the only frame), `resetFrame` (not frame 0), `resetPlayer` <!-- id: 23 -->
- [ ] `play/history.ts`: generic immutable undo/redo with a cap of 100; pure `push/undo/redo` <!-- id: 24 -->
- [ ] `play/validate.ts`: v3 only; rejects other versions; drops unknown keys; clamps; 14 players with unique ids; frame 0 complete; offensive holder; `moved` keys ⊆ players; ≤ 30 frames; sanitised titles/labels <!-- id: 25 -->
- [ ] `play/interpolate.ts`: move `samplePositions` out of `tween.ts` as a pure helper so playback compiles until P2 <!-- id: 26 -->
- [ ] `space/constants.ts`: `MARK_RADIUS_YD = 10/3` (single source) <!-- id: 27 -->
- [ ] `scene/possession.ts`: `markFor` = closest defender within `MARK_RADIUS_YD` (id tie-break) else `null`; `normalize` unchanged in contract; update `possession`/`matchups`/`force` tests that assumed a matchup-driven mark <!-- id: 28 -->
- [ ] Space model: `extractRoster` records `hasMark`; `layers.mark` and the grid loop treat no mark as factor 1; identical-output sweep over every preset with a mark; no holder → `FieldCanvas` clears the heat canvas <!-- id: 29 -->
- [ ] `playFromScene(scene, name)` (a `Scene` → one-frame `Play`); `newPlay()` default (vertical stack, 14 unnamed players) <!-- id: 30 -->
- [ ] Tests: `resolve` cases from the spec (frame 0, moved wins, inherit chain, holder inherit, edit-frame-0 flow-through, placed-later unchanged, delete/duplicate/reset semantics) <!-- id: 31 -->
- [ ] Tests: property checks (random op sequences keep every frame resolvable; ops never mutate frozen input; undo∘op = identity) <!-- id: 32 -->
- [ ] Tests: validator (each rejection, each sanitisation) and mark rule (boundary at 10 ft, two defenders, none, tie) <!-- id: 33 -->
- [ ] Regenerate the toy setups and plays as v3 via a throwaway generator; every file carries `"_placeholder": true`; register in `docs/fieldview-placeholders.md` <!-- NEEDS MANUAL REVIEW --> <!-- id: 34 -->
- [ ] `play/plays.ts`: v3 loader; helpers `isSetup(play)` (one frame) and split lists; invalid files skipped and reported (as today) <!-- id: 35 -->
- [ ] Delete `play/{backfill,tween,serialize,modeHandoff}.ts` and the v1/v2 tests (`play`, `playFormatV2`, backfill/tween cases); `tsc -b` clean <!-- id: 36 -->
- [ ] Toy presets: pull every mark within 10 ft (≤ 3 yd) so setups still show a mark; `modelGuard` and §8 acceptance geometry unchanged <!-- id: 37 -->
- [ ] Reflect: full suite + `test:perf` green; update specs <!-- id: 38 -->

## Partition: feat/fieldview-build-disc-titles

- [ ] Accessible-name fallback: pieces announce `Offense n` / `Defense n` (+ "has the disc", "is the mark"); helper for tests <!-- id: 50 -->
- [ ] One mechanical pass over every test that looked pieces up by T/M/1–6 names <!-- id: 51 -->
- [ ] `scene/presets.ts` and the generator: players unnamed (no `T`/`M`/`1–6`); regenerate content <!-- id: 52 -->
- [ ] `pieceLayer`: title centred inside the piece (baseline offset follows the font size), uppercase, ≤ 2 chars <!-- id: 53 -->
- [ ] Tokens + `pieceLayer`: green holder ring and disc icon (new token); mark keeps its heavy ring; selection stays pink <!-- id: 54 -->
- [ ] Piece scale: `.fv-piece-body` scaled by `--fv-piece-scale` (0.85 / 0.7 from ~1000 px / 0.5 at `desktop`); title scale `max(scale, 0.65)`; strokes scale with the body; grab radius unchanged <!-- id: 55 -->
- [ ] Piece-scale values and the 1000 px tablet boundary are placeholders: markers + register rows <!-- NEEDS MANUAL REVIEW --> <!-- id: 56 -->
- [ ] `ui/playback/playback.ts` on `resolveAll` frames: per-frame holder; transitions over `TRANSITION_SECONDS` <!-- id: 57 -->
- [ ] Disc flight in transitions: old holder's start → new holder's end via `setFlightPos`; possession flips on arrival; reduced motion jumps <!-- id: 58 -->
- [ ] Watch on v3: library-less for now (built-in examples), frame label shown as the caption <!-- id: 59 -->
- [ ] Explore: setups from built-in one-frame plays; the selected-player card gains title field and Give disc (live scene only, not persisted) <!-- id: 60 -->
- [ ] Tests: titles, holder ring, names, scale variables/classes, a title never changes when the disc moves <!-- id: 61 -->
- [ ] Tests: playback with a holder change (disc path, arrival flip, interrupted step, pause lands on a keyframe, reduced motion, 0 commits per frame) <!-- id: 62 -->
- [ ] Tests: Explore Give disc + title; the mark appears/disappears as a defender crosses 10 ft; touch/grab tests unchanged <!-- id: 63 -->
- [ ] Update `frameGuard`, `tokensGuard` (new tokens) and the placeholder audit for the new markers <!-- id: 64 -->
- [ ] axe on Explore/Watch with a titled, holder-ringed scene <!-- id: 65 -->
- [ ] Piece sizes and title legibility on real devices <!-- NEEDS MANUAL REVIEW --> <!-- id: 66 -->
- [ ] Register new placeholders (names, ring colour, sizes) in `docs/fieldview-placeholders.md` <!-- id: 67 -->
- [ ] Reflect: full suite + `test:perf` green; update specs <!-- id: 68 -->

## Partition: feat/fieldview-build-ui

- [ ] `ui/build/BuildSession.ts`: document + history + frame index + store sync (`toScene` into the store on frame/document change) + subscribe <!-- id: 80 -->
- [ ] `useBuildSession` hook (`useSyncExternalStore`) for structural state only <!-- id: 81 -->
- [ ] `FieldCanvas`: track moved ids per gesture (piece, group, keyboard-nudge burst) and call `onGestureEnd({ movedIds })` on release/cancel <!-- id: 82 -->
- [ ] `pages/Build.tsx` desktop layout per the mockup: top bar slots (undo/redo, Saved, Share), sidebar (play name/description), dock <!-- id: 83 -->
- [ ] `FrameStrip`: thumbnails (static SVG from `resolve`), badges (placed / disc), add tile, select, 4-up scroll, current kept in view <!-- id: 84 -->
- [ ] `FrameCard`: label, duplicate, reset frame, delete <!-- id: 85 -->
- [ ] Build `SelectedPlayerCard`: title, Give disc, Reset player, "placed in this frame" status <!-- id: 86 -->
- [ ] `PreviewCard` + preview through the playback controller (play all / from this frame); editing disabled while running <!-- id: 87 -->
- [ ] `GhostLayer` (ghost circle + arrow for players placed in the current frame) and the placed marker on pieces (`pieceLayer` prop) <!-- id: 88 -->
- [ ] Undo/redo buttons and shortcuts (⌘/Ctrl-Z, Shift-⌘/Ctrl-Z); disabled states <!-- id: 89 -->
- [ ] Compact layout: frame chip in the top bar, frame strip, actions row, selected-player bar <!-- id: 90 -->
- [ ] In-memory "Saved" state and the autosave interface P4 plugs into <!-- id: 91 -->
- [ ] Tests: session ops end to end (drag → placement → inheritance visible in later frames and badges), history, gesture commit as one undo step <!-- id: 92 -->
- [ ] Tests: 0 React commits across a Build drag, a marquee drag and a preview; `test:perf` budgets hold <!-- id: 93 -->
- [ ] axe in every Build state; keyboard operation of strip, cards, undo/redo; extend `frameGuard` (inheritance only in `play/model.ts`) <!-- id: 94 -->
- [ ] Layout matches the approved mockup on desktop and tablet <!-- NEEDS MANUAL REVIEW --> <!-- id: 95 -->
- [ ] Reflect: full suite + `test:perf` green; update specs and backlog <!-- id: 96 -->

## Partition: feat/fieldview-build-share

- [ ] Add `fflate` and `qrcode-generator` to `package.json` (+ lockfile); note licences <!-- id: 120 -->
- [ ] `play/share.ts`: `encodePlay`/`decodePlay`/`shareLink`; length cap; bounded inflate (≤ 64 KB); validator on decode <!-- id: 121 -->
- [ ] Tests: round trip for every built-in and a 30-frame play; zip-bomb, oversized, tampered, wrong-version payloads rejected; size budget recorded <!-- id: 122 -->
- [ ] `play/library.ts`: `LocalPlayStore` (`fieldview.plays.v3`), validate on read, quota errors returned, cross-tab `storage` sync, `useLibrary()` <!-- id: 123 -->
- [ ] Tests: persistence across reload, invalid entries dropped, quota error leaves memory intact, cross-tab update <!-- id: 124 -->
- [ ] `LibraryList` (My plays): new / open / duplicate / delete / rename; route `build/:playId`; built-ins read-only with "Duplicate to edit" <!-- id: 125 -->
- [ ] Autosave to the library with Saved / "Couldn't save" states <!-- id: 126 -->
- [ ] `QrCode` component (SVG from the module matrix) with the too-long fallback message <!-- id: 127 -->
- [ ] `ShareDialog` per the mockup: link + Copy, QR, Download file, Open a file…, snapshot note <!-- id: 128 -->
- [ ] File export/import (`.fieldview.json`) through the validator <!-- id: 129 -->
- [ ] Watch: read `#p=` on mount and `hashchange`; play it; "Save to my plays"; invalid-link message <!-- id: 130 -->
- [ ] Watch list = built-in examples + library multi-frame plays; Explore picker = built-in setups + library one-frame plays <!-- id: 131 -->
- [ ] Tests: share → open in Watch → save → open in Build, end to end; axe on the dialog and lists <!-- id: 132 -->
- [ ] A shared link and QR work on a real phone <!-- NEEDS MANUAL REVIEW --> <!-- id: 133 -->
- [ ] Register copy placeholders; Reflect: full suite + `test:perf` + `vite build` green; update specs <!-- id: 134 -->

## Partition: feat/fieldview-build-qa

- [ ] Real-device pass on a phone, tablet and laptop (update `docs/fieldview-device-qa.md` for Build, titles, sizes, share) <!-- NEEDS MANUAL REVIEW --> <!-- id: 150 -->
- [ ] Apply tuning from the pass (piece scale, title minimum, lift, breakpoints) <!-- id: 151 -->
- [ ] Full axe/keyboard pass across Explore, Watch, Build and the dialogs <!-- id: 152 -->
- [ ] Extend the placeholder audit and frame guard; grep audits (inheritance only in `play/model.ts`; orientation only in `render/coords.ts`) <!-- id: 153 -->
- [ ] Update `docs/fieldview-backlog.md` (checked items, deferred items still listed) and `docs/fieldview-placeholders.md` <!-- id: 154 -->
- [ ] Write the `handoff.md` with canon notes: ADR-36…43 added; what they supersede (matchup-driven mark, ADR-18/19; the single piece radius; the v1/v2 formats) <!-- id: 155 -->
- [ ] Full suite + `test:perf` + `tsc -b` + `vite build` green <!-- id: 156 -->
- [ ] Final placeholder report to the Builder (what content still has to be supplied) <!-- id: 157 -->

## Initiative Boundary

- [ ] Merge `feat/fieldview-build-cleanup` → `initiative/fieldview-build` <!-- id: 200 -->
- [ ] Merge `feat/fieldview-build-model` → `initiative/fieldview-build` <!-- id: 201 -->
- [ ] Merge `feat/fieldview-build-disc-titles` → `initiative/fieldview-build` <!-- id: 202 -->
- [ ] Merge `feat/fieldview-build-ui` → `initiative/fieldview-build` <!-- id: 203 -->
- [ ] Merge `feat/fieldview-build-share` → `initiative/fieldview-build` <!-- id: 204 -->
- [ ] Merge `feat/fieldview-build-qa` → `initiative/fieldview-build` <!-- id: 205 -->
- [ ] Full suite green on the initiative branch, including `npm run test:perf` <!-- id: 206 -->
- [ ] Builder-approved merge to `main` (after the ui-rework PR), then canon synthesis and archive <!-- id: 207 -->
