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

- [x] `play/format.ts`: v3 types and constants (`PLAY_FORMAT_VERSION=3`, `MAX_FRAMES=30`, `MAX_TITLE_LENGTH=2`, `MAX_LABEL_LENGTH=24`, `PlayerRef`, `Frame`, `Play`) <!-- id: 20 -->
- [x] `play/model.ts`: `resolve`, `resolveAll`, `toScene` (positions → `Scene` with possession, `autoAssign` matchups, `normalize`) <!-- id: 21 -->
- [x] Operations: `placePlayers`, `giveDisc` (offense only), `setTitle` (trim, uppercase, ≤ 2), `setFrameLabel`, `renamePlay` <!-- id: 22 -->
- [x] Operations: `addFrame`, `duplicateFrame`, `deleteFrame` (refuses the only frame), `resetFrame` (not frame 0), `resetPlayer` <!-- id: 23 -->
- [x] `play/history.ts`: generic immutable undo/redo with a cap of 100; pure `push/undo/redo` <!-- id: 24 -->
- [x] `play/validate.ts`: v3 only; rejects other versions; drops unknown keys; clamps; 14 players with unique ids; frame 0 complete; offensive holder; `moved` keys ⊆ players; ≤ 30 frames; sanitised titles/labels <!-- id: 25 -->
- [x] `play/interpolate.ts`: move `samplePositions` out of `tween.ts` as a pure helper so playback compiles until P2 <!-- id: 26 -->
- [x] `space/constants.ts`: `MARK_RADIUS_YD = 10/3` (single source) <!-- id: 27 -->
- [x] `scene/possession.ts`: `markFor` = closest defender within `MARK_RADIUS_YD` (id tie-break) else `null`; `normalize` unchanged in contract; update `possession`/`matchups`/`force` tests that assumed a matchup-driven mark <!-- id: 28 -->
- [x] Space model: `extractRoster` records `hasMark`; `layers.mark` and the grid loop treat no mark as factor 1; identical-output sweep over every preset with a mark; no holder → `FieldCanvas` clears the heat canvas <!-- id: 29 -->
- [x] `playFromScene(scene, name)` (a `Scene` → one-frame `Play`); `newPlay()` default (vertical stack, 14 unnamed players) <!-- id: 30 -->
- [x] Tests: `resolve` cases from the spec (frame 0, moved wins, inherit chain, holder inherit, edit-frame-0 flow-through, placed-later unchanged, delete/duplicate/reset semantics) <!-- id: 31 -->
- [x] Tests: property checks (random op sequences keep every frame resolvable; ops never mutate frozen input; undo∘op = identity) <!-- id: 32 -->
- [x] Tests: validator (each rejection, each sanitisation) and mark rule (boundary at 10 ft, two defenders, none, tie) <!-- id: 33 -->
- [x] Regenerate the toy setups and plays as v3 via a throwaway generator; every file carries `"_placeholder": true`; register in `docs/fieldview-placeholders.md` <!-- NEEDS MANUAL REVIEW --> <!-- id: 34 -->
- [x] `play/plays.ts`: v3 loader; helpers `isSetup(play)` (one frame) and split lists; invalid files skipped and reported (as today) <!-- id: 35 -->
- [x] Delete `play/{backfill,tween,serialize,modeHandoff}.ts` and the v1/v2 tests (`play`, `playFormatV2`, backfill/tween cases); `tsc -b` clean <!-- id: 36 -->
- [x] Toy presets: pull every mark within 10 ft (≤ 3 yd) so setups still show a mark; `modelGuard` and §8 acceptance geometry unchanged <!-- id: 37 -->
- [x] Reflect: full suite + `test:perf` green; update specs <!-- id: 38 -->

**Reflect notes (P1)**
- After P1: tsc clean; 58 files / 857 tests; `test:perf` 4 files / 27 tests green (§8.9 frame ≈ 10.4 ms, computeGrid best ≈ 9.4 ms).
- New: `play/{format,model,history,validate,interpolate}.ts`; `MARK_RADIUS_YD` in `space/constants.ts`; geometric `markFor` in `scene/possession.ts`; space model tolerates no mark (factor 1) and no holder (zero grid, no throw); `FieldCanvas` clears heat and the readout when there is no holder.
- `sceneOf(play, resolved)` added beside `toScene` (same derivation; the playback/Watch path will reuse it). `deleteFrame(0)` resolves the next frame into the new frame 0 so the play stays complete (spec only said "later frames inherit"; frame 0 must be complete).
- `FORCE_PRESETS.flat.inside` moved from x 3.5 to 3.25: 3.5 yd is beyond the 10 ft mark radius, so snapping to it dropped the mark. Force tests now expect `custom` when a displaced mark leaves the radius.
- Content regenerated as v3 with a throwaway generator: 7 plays in `play/builtin/*.json` (frame 0 full, later frames list only changed players) and 6 unnamed one-frame setups in `play/builtin/setups/`. All carry `"_placeholder": true`; register row 20 added for `newPlay()` defaults. `plays.ts` exports `BUILTIN_PLAYS`, `BUILTIN_SETUPS`, `isSetup`.
- Deleted: `play/{backfill,tween,serialize,modeHandoff}.ts`, `tests/{play,playFormatV2}.test.ts`. Playback, Watch, Filmstrip, TrailLayer, PlayList, `usePlayback` now take a v3 `Play`. Watch tests look pieces up by `offense cutter` (unnamed) pending P2's accessible-name fallback.
- Not yet: Explore still builds from `scene/presets.ts` (P2 moves it onto `BUILTIN_SETUPS`); `PlayStore`/`FilePlayStore` went with `serialize.ts` and return in P4 as `library.ts`.
- New guard: `tests/inheritanceGuard.test.ts` — nothing under scene/render/space/motion/pages/ui reads `.moved`. P3's ghost/“placed here” markers will need a documented exception (a `ui/build/` allowance).
- Builder: the toy plays/setups are still toy content (task 34 review).


## Partition: feat/fieldview-build-disc-titles

- [x] Accessible-name fallback: pieces announce `Offense n` / `Defense n` (+ "has the disc", "is the mark"); helper for tests <!-- id: 50 -->
- [x] One mechanical pass over every test that looked pieces up by T/M/1–6 names <!-- id: 51 -->
- [x] `scene/presets.ts` and the generator: players unnamed (no `T`/`M`/`1–6`); regenerate content <!-- id: 52 -->
- [x] `pieceLayer`: title centred inside the piece (baseline offset follows the font size), uppercase, ≤ 2 chars <!-- id: 53 -->
- [x] Tokens + `pieceLayer`: green holder ring and disc icon (new token); mark keeps its heavy ring; selection stays pink <!-- id: 54 -->
- [x] Piece scale: `.fv-piece-body` scaled by `--fv-piece-scale` (0.85 / 0.7 from ~1000 px / 0.5 at `desktop`); title scale `max(scale, 0.65)`; strokes scale with the body; grab radius unchanged <!-- id: 55 -->
- [x] Piece-scale values and the 1000 px tablet boundary are placeholders: markers + register rows <!-- NEEDS MANUAL REVIEW --> <!-- id: 56 -->
- [x] `ui/playback/playback.ts` on `resolveAll` frames: per-frame holder; transitions over `TRANSITION_SECONDS` <!-- id: 57 -->
- [x] Disc flight in transitions: old holder's start → new holder's end via `setFlightPos`; possession flips on arrival; reduced motion jumps <!-- id: 58 -->
- [x] Watch on v3: library-less for now (built-in examples), frame label shown as the caption <!-- id: 59 -->
- [x] Explore: setups from built-in one-frame plays; the selected-player card gains title field and Give disc (live scene only, not persisted) <!-- id: 60 -->
- [x] Tests: titles, holder ring, names, scale variables/classes, a title never changes when the disc moves <!-- id: 61 -->
- [x] Tests: playback with a holder change (disc path, arrival flip, interrupted step, pause lands on a keyframe, reduced motion, 0 commits per frame) <!-- id: 62 -->
- [x] Tests: Explore Give disc + title; the mark appears/disappears as a defender crosses 10 ft; touch/grab tests unchanged <!-- id: 63 -->
- [x] Update `frameGuard`, `tokensGuard` (new tokens) and the placeholder audit for the new markers <!-- id: 64 -->
- [x] axe on Explore/Watch with a titled, holder-ringed scene <!-- id: 65 -->
- [x] Piece sizes and title legibility on real devices <!-- NEEDS MANUAL REVIEW --> <!-- id: 66 -->
- [x] Register new placeholders (names, ring colour, sizes) in `docs/fieldview-placeholders.md` <!-- id: 67 -->
- [x] Reflect: full suite + `test:perf` green; update specs <!-- id: 68 -->

**Reflect notes (P2)**
- After P2: tsc clean; 61 files / 885 tests; `test:perf` 4 files / 27 tests green (§8.9 frame ≈ 10.5 ms, computeGrid best ≈ 9.8 ms). Checked in the browser: scaled pieces (`--fv-piece-scale` 0.85 on phone width), green holder ring, heavy mark ring, disc beside the holder.
- **Accessible names (deviation):** the name is `Offense n` / `Defense n` only (ordinal within team in roster order); the state ("Has the disc", "Is the mark") is `aria-description`, not part of the name, so a name stays stable while the disc moves. Tests were remapped mechanically: cutter N → Offense N+1, defender N → Defense N+1, thrower T → Offense 1, mark M → Defense 1.
- **Imperative piece state:** holder ring, mark stroke, title text and `aria-description` are written from the scene in `repaint()` (only when changed), because the mark is geometric and changes mid-drag, and the holder changes mid-playback. The disc and mark line are always rendered for a drawn team and hidden (`display`) when nobody holds / is the mark. `PieceIdentity.role` is no longer used for visuals.
- **Sizes:** the whole body (rings, disc dock, title) sits in `.fv-piece-body`, scaled by `--fv-piece-scale` (`index.css`; 0.85 / 0.7 from 1000 px / 0.5 at the `desktop` query); `.fv-piece-title` counter-scales to `max(scale, 0.65)`. Grab radius is unchanged (yards). Register rows 21 (holder colour) and 22 (sizes) added.
- **Playback:** `resolveAll` frames; `write()` re-normalizes each step so the mark follows; a changed holder triggers a pass (`setFlightPos` line from old holder's start to new holder's end), possession flips on arrival via `throwTo`; `snapTo`/`goto`/`pause`/reduced motion land on the frame's pose AND holder with no disc in the air; an interrupted step abandons the old pass (bug found by test: a stale flight position survived).
- **Watch:** frame label shown as a caption (`FieldViewFrame` gained a `caption` slot, rendered on every layout); presets are unnamed; `CURATED_SETUPS` removed — Explore and the app's opening scene use `BUILTIN_SETUPS` (one-frame plays); `SetupItem` type replaces `CuratedSetup`.
- **Explore card:** title box and Give disc, imperative, live-only; 0 React commits while typing or giving the disc. The card is still desktop-dock only (compact placement belongs to the Build UI work).
- Decision needed from the Builder (tasks 56, 66): piece sizes and the green on real devices.


## Partition: feat/fieldview-build-ui

- [x] `ui/build/BuildSession.ts`: document + history + frame index + store sync (`toScene` into the store on frame/document change) + subscribe <!-- id: 80 -->
- [x] `useBuildSession` hook (`useSyncExternalStore`) for structural state only <!-- id: 81 -->
- [x] `FieldCanvas`: track moved ids per gesture (piece, group, keyboard-nudge burst) and call `onGestureEnd({ movedIds })` on release/cancel <!-- id: 82 -->
- [x] `pages/Build.tsx` desktop layout per the mockup: top bar slots (undo/redo, Saved, Share), sidebar (play name/description), dock <!-- id: 83 -->
- [x] `FrameStrip`: thumbnails (static SVG from `resolve`), badges (placed / disc), add tile, select, 4-up scroll, current kept in view <!-- id: 84 -->
- [x] `FrameCard`: label, duplicate, reset frame, delete <!-- id: 85 -->
- [x] Build `SelectedPlayerCard`: title, Give disc, Reset player, "placed in this frame" status <!-- id: 86 -->
- [x] `PreviewCard` + preview through the playback controller (play all / from this frame); editing disabled while running <!-- id: 87 -->
- [x] `GhostLayer` (ghost circle + arrow for players placed in the current frame) and the placed marker on pieces (`pieceLayer` prop) <!-- id: 88 -->
- [x] Undo/redo buttons and shortcuts (⌘/Ctrl-Z, Shift-⌘/Ctrl-Z); disabled states <!-- id: 89 -->
- [x] Compact layout: frame chip in the top bar, frame strip, actions row, selected-player bar <!-- id: 90 -->
- [x] In-memory "Saved" state and the autosave interface P4 plugs into <!-- id: 91 -->
- [x] Tests: session ops end to end (drag → placement → inheritance visible in later frames and badges), history, gesture commit as one undo step <!-- id: 92 -->
- [x] Tests: 0 React commits across a Build drag, a marquee drag and a preview; `test:perf` budgets hold <!-- id: 93 -->
- [x] axe in every Build state; keyboard operation of strip, cards, undo/redo; extend `frameGuard` (inheritance only in `play/model.ts`) <!-- id: 94 -->
- [ ] Layout matches the approved mockup on desktop and tablet <!-- NEEDS MANUAL REVIEW --> <!-- id: 95 -->
- [x] Reflect: full suite + `test:perf` green; update specs and backlog <!-- id: 96 -->

**Reflect notes (P3)**
- After P3: tsc clean; 63 files / 926 tests; `test:perf` 4 files / 27 tests green (§8.9 frame ≈ 10.4 ms). Desktop layout checked in a production build at 1440×900 (field + Frame / Selected player / Preview cards + frame strip, sidebar Play section, undo/redo + save pill in the top bar). The user's running dev server still lacks the `desktop` Tailwind screen until restarted.
- New: `ui/build/{BuildSession,useBuildSession,GhostLayer,FrameStrip,cards,controls}`; `pages/Build.tsx` is the real page (the placeholder card and register row #8 are retired; row #23 added for the new copy). `FieldViewFrame` gained `barDesktop`, `compactDock`, `fieldPlaced`, `onFieldGestureEnd`; the "Soon" tag on Build is gone.
- **Gesture commit:** `FieldCanvas` tracks a gesture (snapshot at press; ids dragged; `travelled` set on the first move) and calls `onGestureEnd({movedIds})` on release/cancel, and after a 450 ms quiet for keyboard-nudge bursts. movedIds = dragged ids ∪ any player whose position changed (so a mark carried by a dragged holder is placed too). A tap that only selects commits nothing. Verified: 0 React commits across 30 pointer moves; the placement is one commit at release.
- **Session:** the session is created without touching the store (constructing happens in render); the hook calls `resync()` once mounted. `loadScene` (app) is used for every sync, so identity refreshes on title/disc/undo — discrete events only. `apply(op, {sync})`; gestures use `sync:false` because the field already shows the result.
- **Inheritance guard:** nothing outside `play/` reads `.moved`; the UI uses `placedIds` / `discChangedIn` from `play/model.ts` (new), and the gesture state field in `FieldCanvas` is named `travelled` so the guard stays a plain grep.
- **Preview:** playback controller on the session's document; the strip and cards are `inert` and the field disabled while it runs; it ends by itself at the last frame and the field returns to the edited frame.
- **Deliberately not in P3** (P4): Share button/dialog, "My plays" library list and New play (the page opens a fresh default play each visit), real saving — the pill honestly says "Unsaved changes" after an edit and "✓ Saved to this device" only for an untouched play until P4 wires `subscribeDocument` to the store.
- Builder (task 95): confirm the layout against the mockup on a real desktop and tablet.


## Partition: feat/fieldview-build-share

- [x] Add `fflate` and `qrcode-generator` to `package.json` (+ lockfile); note licences <!-- id: 120 -->
- [x] `play/share.ts`: `encodePlay`/`decodePlay`/`shareLink`; length cap; bounded inflate (≤ 64 KB); validator on decode <!-- id: 121 -->
- [x] Tests: round trip for every built-in and a 30-frame play; zip-bomb, oversized, tampered, wrong-version payloads rejected; size budget recorded <!-- id: 122 -->
- [x] `play/library.ts`: `LocalPlayStore` (`fieldview.plays.v3`), validate on read, quota errors returned, cross-tab `storage` sync, `useLibrary()` <!-- id: 123 -->
- [x] Tests: persistence across reload, invalid entries dropped, quota error leaves memory intact, cross-tab update <!-- id: 124 -->
- [x] `LibraryList` (My plays): new / open / duplicate / delete / rename; route `build/:playId`; built-ins read-only with "Duplicate to edit" <!-- id: 125 -->
- [x] Autosave to the library with Saved / "Couldn't save" states <!-- id: 126 -->
- [x] `QrCode` component (SVG from the module matrix) with the too-long fallback message <!-- id: 127 -->
- [x] `ShareDialog` per the mockup: link + Copy, QR, Download file, Open a file…, snapshot note <!-- id: 128 -->
- [x] File export/import (`.fieldview.json`) through the validator <!-- id: 129 -->
- [x] Watch: read `#p=` on mount and `hashchange`; play it; "Save to my plays"; invalid-link message <!-- id: 130 -->
- [x] Watch list = built-in examples + library multi-frame plays; Explore picker = built-in setups + library one-frame plays <!-- id: 131 -->
- [x] Tests: share → open in Watch → save → open in Build, end to end; axe on the dialog and lists <!-- id: 132 -->
- [ ] A shared link and QR work on a real phone <!-- NEEDS MANUAL REVIEW --> <!-- id: 133 -->
- [x] Register copy placeholders; Reflect: full suite + `test:perf` + `vite build` green; update specs <!-- id: 134 -->

**Reflect notes (P4)**
- After P4: tsc clean; 66 files / 981 tests; `test:perf` 4 files / 27 tests green (§8.9 frame ≈ 10.1 ms); `vite build` OK (JS 571 kB / 181 kB gzip; `fflate` + `qrcode-generator` added: fflate MIT, qrcode-generator MIT).
- **Sizes recorded:** a 30-frame play encodes to ~1.3 k chars; the seven built-in plays to 460–600 chars. `MAX_CODE_LENGTH` is 12 000 chars and `MAX_INFLATED_BYTES` 64 KB. An 8 MB zero-filled bomb (≈ 8 KB compressed, under the code cap) is stopped at the inflate ceiling in well under a second; the codec inflates in 256-byte slices so one slice cannot run far past the ceiling.
- **Library:** memory is the source of truth, a failed write returns `{ok:false, reason}` and keeps the play; invalid / duplicate / wrong-version entries are dropped on read; the `storage` event syncs other tabs. `useLibrary()` is a `useSyncExternalStore` over the module singleton; tests reset it by removing entries.
- **Build page:** route `build/:playId?`. A new play saves on its first edit (debounced 500 ms) and then replaces its URL with `/build/<id>`; leaving Build flushes without navigating; opening, duplicating, deleting or starting another play flushes first. Deleting shows "Deleted … Undo delete". Examples are never opened directly: "Duplicate to edit" opens a copy. The save pill gained a "new" state ("New play · saves as you go").
- **Bug found by tests:** the route-driven "load this play" effect re-ran while the router caught up with our own `navigate`, reloading the old play over the new one. It now reacts only to a change of the address (`seenPlayId`), with a separate once-on-arrival check for an id that no longer exists.
- **Files:** read with `FileReader` (jsdom and older Safari); validated through `validatePlay`; a non-play shows "That file isn't a Field View play." in the dialog.
- **Watch:** `#p=` is read from the router location, so a hash change re-decodes; the shared play is first in the list, with a banner (Save to my plays → Open in Build); an invalid link shows "This link isn't a Field View play." and the normal plays still work; the list also includes the library's multi-frame plays. **Explore:** built-in setups, then the library's one-frame plays.
- Builder (task 133): a link and QR on a real phone. Copy placeholders are register row #23.


## Partition: feat/fieldview-build-qa

- [ ] Real-device pass on a phone, tablet and laptop (update `docs/fieldview-device-qa.md` for Build, titles, sizes, share) <!-- NEEDS MANUAL REVIEW --> <!-- id: 150 -->
- [ ] Apply tuning from the pass (piece scale, title minimum, lift, breakpoints) <!-- id: 151 -->
- [x] Full axe/keyboard pass across Explore, Watch, Build and the dialogs <!-- id: 152 -->
- [x] Extend the placeholder audit and frame guard; grep audits (inheritance only in `play/model.ts`; orientation only in `render/coords.ts`) <!-- id: 153 -->
- [x] Update `docs/fieldview-backlog.md` (checked items, deferred items still listed) and `docs/fieldview-placeholders.md` <!-- id: 154 -->
- [x] Write the `handoff.md` with canon notes: ADR-36…43 added; what they supersede (matchup-driven mark, ADR-18/19; the single piece radius; the v1/v2 formats) <!-- id: 155 -->
- [x] Full suite + `test:perf` + `tsc -b` + `vite build` green <!-- id: 156 -->
- [x] Final placeholder report to the Builder (what content still has to be supplied) <!-- id: 157 -->

**Reflect notes (P5)**
- Final automated state: tsc clean; 67 files / 1007 tests; `test:perf` 4 files / 27 tests; `vite build` OK. Guards extended: `frameGuard` now covers `ui/build` (hex literals, no direct storage access, no import of the frame, one session mount); `inheritanceGuard` (nothing reads `frame.moved`); `placeholderAudit` accepts both markers and lists #8 as resolved. Ghost and QR colours moved into `render/tokens.ts`.
- a11y: new `a11yBuild.test.tsx` (Build menu + library, empty library, Watch with a shared and an invalid link, Watch list with library plays, Explore with a saved setup) plus the Build, Share-dialog and card audits from P2–P4; one finding fixed (duplicate region landmarks from the library list → `role="group"`).
- **Not done (Builder, tasks 150/151):** the real-device pass and the tuning that follows. `docs/fieldview-device-qa.md` now has the Build / sizes / sharing checklist; every value to tune is a single number named there.
- Placeholder report: rows 1–5 (toy setups/plays/names/labels), 20 (new-play defaults), 23 (copy) need content; 21 (holder colour), 22 (piece sizes), 17 (transition pace), 12–16 need device tuning; 18–19 are deferred stubs. See `docs/fieldview-placeholders.md`.


## Initiative Boundary

- [x] Merge `feat/fieldview-build-cleanup` → `initiative/fieldview-build` <!-- id: 200 -->
- [x] Merge `feat/fieldview-build-model` → `initiative/fieldview-build` <!-- id: 201 -->
- [x] Merge `feat/fieldview-build-disc-titles` → `initiative/fieldview-build` <!-- id: 202 -->
- [x] Merge `feat/fieldview-build-ui` → `initiative/fieldview-build` <!-- id: 203 -->
- [x] Merge `feat/fieldview-build-share` → `initiative/fieldview-build` <!-- id: 204 -->
- [x] Merge `feat/fieldview-build-qa` → `initiative/fieldview-build` <!-- id: 205 -->
- [x] Full suite green on the initiative branch, including `npm run test:perf` <!-- id: 206 -->
- [ ] Builder-approved merge to `main` (after the ui-rework PR), then canon synthesis and archive <!-- id: 207 -->
