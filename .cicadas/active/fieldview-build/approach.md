---
summary: "Six sequential partitions. P0 clean-up deletes the dormant pre-rework UI, the old designer/presets code and their tests, porting the few still-valuable Whiteboard-driven tests to a harness or the Explore route. P1 model builds the pure play library (v3 format, resolve, operations, undo history, validator), the geometric mark and the space model's no-mark tolerance, and regenerates toy setups/plays as v3. P2 disc/titles/sizes gives playback a per-frame holder and an animated pass, titles inside pieces, the holder ring, accessible-name fallback and per-device piece scale, and adds title + Give disc to Explore. P3 Build UI is the session, page, indicators, panels, undo/redo and preview. P4 library/sharing adds the local library, link/QR/file sharing and Watch link handling (two small dependencies). P5 QA is the real-device pass, audits and canon notes. No PRs at any boundary; direct merges; stacked on initiative/fieldview-ui-rework."
phase: "approach"
when_to_load:
  - "When starting a registered feature branch for fieldview-build or checking partition scope."
depends_on:
  - "prd.md"
  - "ux.md"
  - "tech-design.md"
modules:
  - "frontend/src/fieldview"
  - "frontend/src/router.tsx"
  - "frontend/package.json"
index:
  strategy: "## Strategy"
  partitions: "## Partitions (Feature Branches)"
  sequencing: "## Sequencing"
  migrations_compat: "## Migrations & Compat"
  risks: "## Risks & Mitigations"
  alternatives: "## Alternatives Considered"
next_section: "Strategy"
---

# Approach: fieldview-build

## Strategy

Order by **what everything else stands on**. The pure model (P1) has no UI and is cheap to test exhaustively, so
it goes first — after a clean-up (P0) that removes the second, older way of doing everything so no task has to
work around it. Disc, titles and sizes (P2) are valuable on their own (Explore and Watch improve) and are what
Build's panels reuse, so they precede Build (P3). Library and sharing (P4) come after Build because they need
something to save and share. QA (P5) is last and inside the initiative, because "merged ahead of review" has
happened to this module repeatedly.

**Stacked branch.** This initiative branches from `initiative/fieldview-ui-rework` (PR #6 not yet on `main`).
Merge that PR first, or retarget this initiative's PR to `main` after it lands.

No PRs at any boundary (the Builder's standing preference): partitions merge directly into
`initiative/fieldview-build`; the final merge to `main` waits for Builder approval.

## Partitions (Feature Branches)

### Partition 0: Clean-up → `feat/fieldview-build-cleanup`
**Modules**: `pages/{Whiteboard,Designer,FieldStage}.tsx`, `ui/shell/*` (except `throwMode.ts`, `sceneStore.tsx`, `useSelection.ts`), `ui/{PresetMenu,Timeline,PlayMeta,OverlayRail}.tsx`, `scene/{presetRegistry,presetFormat}.ts`, `router.tsx`, tests
**Scope**: Delete the dormant legacy UI and the user-preset code. Before deleting, audit consumers; build a small field harness and port the Whiteboard-driven tests worth keeping (drag/marquee/nudge, §8.9 frame budget, hover readout) onto it; delete the tests that only covered deleted UI (ribbon, panels, preset menu, designer, shell, motion route UI, throw UI). Keep `AdvancedPanel`, `motion/*`, `scene/{matchups,force}.ts`, `throwMode`, `playModel` (engines and future-feature harvest).
**Dependencies**: None

#### Artifact Type
library

#### How to Run
- start: N/A — verify via `cd frontend && npx tsc -b && npx vitest run src`
- teardown: N/A

#### Acceptance Criteria
- [ ] `npx tsc -b` and the whole suite are green
- [ ] No file in the FR-8.1 list remains; a grep shows no consumer of any deleted module
- [ ] Ported tests still prove: piece drag, marquee group drag, keyboard nudge, nearest-grab, the §8.9 frame budget and 0 React commits per drag
- [ ] `/fieldview/designer` and `/field-view/designer` no longer exist; `/fieldview/{explore,watch,build}` unchanged

#### Implementation Steps
1. Baseline and consumer audit. 2. Harness + port. 3. Delete pages, shell, widgets, preset code, tests. 4. Route cleanup.

### Partition 1: Model → `feat/fieldview-build-model`
**Modules**: `play/{format,model,history,validate,interpolate,plays}.ts`, `play/builtin/*`, `scene/{possession,presets}.ts`, `space/{constants,score,layers}.ts`, `ui/FieldCanvas.tsx` (no-holder clear), tests
**Scope**: v3 format and validator; `resolve`/`resolveAll`/`toScene`; every operation; generic undo/redo history; `MARK_RADIUS_YD`, geometric `markFor`; the space model tolerates no mark with identical output otherwise; `playFromScene`; regenerate toy setups and plays as v3 (`_placeholder`); delete `backfill`, continuous `tween`, `serialize`, `modeHandoff` and the v1/v2 tests (`samplePositions` becomes a pure `interpolate.ts` helper so playback still compiles until P2).
**Dependencies**: Requires Partition 0

#### Artifact Type
library

#### How to Run
- start: N/A — verify via `cd frontend && npx vitest run src/fieldview`
- teardown: N/A

#### Acceptance Criteria
- [ ] `resolve` obeys inheritance for every case in the spec (frame 0 complete; moved wins; inherit chain; holder inherit); editing frame 0 moves everyone who inherits; a player placed later is unchanged
- [ ] Every operation returns a new `Play`, never mutates its (frozen) input; delete/duplicate/reset semantics as specified; undo/redo restore exact documents
- [ ] The v3 validator rejects other versions and malformed input, drops unknown keys, clamps ranges, enforces 14 players, frame 0 complete, offensive holder, ≤ 30 frames, ≤ 2-char uppercase titles
- [ ] Mark: closest defender within 10/3 yd, else none; ties by id; no matchups involved
- [ ] Space model: identical grids to before for every preset that has a mark (sweep test); no mark → no mark force, no exception; no holder → heat canvas cleared
- [ ] Frame-budget benchmarks unchanged

#### Implementation Steps
1. Types, constants, validator. 2. `resolve` + ops + history with tests. 3. Mark rule + space model. 4. Regenerate content; delete v1/v2.

### Partition 2: Disc, titles, sizes → `feat/fieldview-build-disc-titles`
**Modules**: `render/{pieceLayer,tokens}.tsx`, `ui/playback/*`, `ui/content/SelectedPlayerCard.tsx`, `ui/app/FieldViewFrame.tsx`, `index.css`, `pages/{Explore,Watch}.tsx`, `scene/presets.ts`, tests
**Scope**: Accessible-name fallback (`Offense n`); presets lose T/M/1–6 (unnamed); titles centred inside pieces; green holder ring; piece scale per device via CSS variable + scaled body (+ title minimum); playback controller on resolved frames with per-frame holder, animated pass, arrival flip; Watch on v3 with the frame label as caption; Explore's setups come from built-in one-frame plays and its card gains title + Give disc (live, not persisted).
**Dependencies**: Requires Partition 1

#### Artifact Type
web-ui

#### How to Run
- start: `cd frontend && npm run dev`
- ready-check: `GET http://localhost:5173/fieldview/explore` shows 14 unnamed pieces, one with a green ring
- teardown: `Ctrl+C`

#### Acceptance Criteria
- [ ] Pieces announce "Offense n"/"Defense n" (+ "has the disc", "is the mark"); no test or UI depends on T/M/1–6
- [ ] A 2-char title renders centred inside the piece at all three scales; outlines scale with the piece
- [ ] Piece scale is 0.85 / 0.7 / 0.5 via CSS variables at phone / tablet / `desktop`; the grab radius is unchanged
- [ ] Playback: a holder change flies the disc from the old holder's start to the new holder's end, arriving with the receiver; possession flips on arrival; reduced motion jumps; 0 React commits per animation frame
- [ ] Explore: Give disc and title work; the mark ring follows defenders in/out of 10 ft live
- [ ] Piece size and title legibility on a real phone/tablet/laptop <!-- NEEDS MANUAL REVIEW -->

#### Implementation Steps
1. Names, labels, titles, rings, scale. 2. Playback rewrite. 3. Watch + Explore wiring. 4. Tests.

### Partition 3: Build UI → `feat/fieldview-build-ui`
**Modules**: `ui/build/*`, `ui/FieldCanvas.tsx` (gesture hook), `ui/app/FieldViewFrame.tsx`, `render/pieceLayer.tsx` (placed markers), `pages/Build.tsx`, tests
**Scope**: `BuildSession` (document, history, frame index, store sync); the Build page per the approved mockup on desktop and compact; frame strip, frame card, selected-player card, preview card, ghost + arrow + placed markers, undo/redo (buttons and shortcuts), preview via the playback controller, default new play, in-memory "Saved" state (P4 supplies persistence).
**Dependencies**: Requires Partition 2

#### Artifact Type
web-ui

#### How to Run
- start: `cd frontend && npm run dev`
- ready-check: `GET http://localhost:5173/fieldview/build` shows a play with a frame strip and cards
- teardown: `Ctrl+C`

#### Acceptance Criteria
- [ ] Dragging places the player in the current frame; later frames that inherit follow; a player placed later keeps their position; marquee group drags place every moved player
- [ ] Add / duplicate / delete / reset-frame / reset-player / Give disc / title / label each work and each undo and redo as one step
- [ ] Ghost + arrow and the placed marker show exactly the players placed in the current frame; thumbnails show correct badges
- [ ] Preview plays all frames or from the current one and disables editing while running
- [ ] 0 React commits across a Build drag (Profiler test); `test:perf` budgets hold
- [ ] axe clean in every Build state; frame strip and panels keyboard-operable; undo/redo shortcuts
- [ ] Layout matches the approved mockup on desktop and tablet <!-- NEEDS MANUAL REVIEW -->

#### Implementation Steps
1. Session + gesture hook. 2. Desktop page and cards. 3. Indicators. 4. Compact layout. 5. Preview, shortcuts, tests.

### Partition 4: Library and sharing → `feat/fieldview-build-share`
**Modules**: `play/{share,library}.ts`, `ui/build/{LibraryList,ShareDialog}.tsx`, `ui/content/QrCode.tsx`, `pages/{Build,Explore,Watch}.tsx`, `router.tsx`, `package.json`, tests
**Scope**: Add `fflate` and `qrcode-generator`; `encodePlay`/`decodePlay` with bounded inflate; `LocalPlayStore` + `useLibrary`; My plays list (new/open/duplicate/delete/rename) and autosave with Saved/error states; route `build/:playId`; Share dialog (link, QR, file export/import); Watch opens `#p=` links with "Save to my plays"; Watch and Explore lists include the library (multi-frame / one-frame) beside built-ins.
**Dependencies**: Requires Partition 3

#### Artifact Type
web-ui

#### How to Run
- start: `cd frontend && npm run dev`
- ready-check: building a play and clicking Share yields a link that opens in Watch
- teardown: `Ctrl+C`

#### Acceptance Criteria
- [ ] encode → decode round-trips every built-in play and a 30-frame play; a zip-bomb, oversized, tampered or wrong-version payload is rejected with a clear message and never throws unhandled
- [ ] Library entries survive reload; invalid stored entries are dropped; a full storage shows the error state, never loses the in-memory play
- [ ] Share → open link in Watch → Save to my plays → open it in Build works end to end
- [ ] The QR renders for a typical play and is replaced by a clear message when the link is too long
- [ ] File export/import round-trips; a non-play file is rejected clearly
- [ ] Setups (one-frame) appear in Explore's picker, multi-frame plays in Watch's list
- [ ] A shared link works on a real phone <!-- NEEDS MANUAL REVIEW -->

#### Implementation Steps
1. Deps + codec. 2. Library store + lists. 3. Autosave + routing. 4. Share dialog + QR + files. 5. Watch/Explore integration + tests.

### Partition 5: QA and cleanup → `feat/fieldview-build-qa`
**Modules**: `tests/*`, `docs/*`, `ui/**` (tuning only)
**Scope**: Real-device pass (phone, tablet, laptop) including piece sizes and titles; apply tuning; full a11y pass; extend the frame guard and placeholder audit; grep audits (inheritance only in `play/model.ts`; orientation only in `coords.ts`); update backlog/device-QA docs; handoff with canon notes.
**Dependencies**: Requires Partition 4

#### Artifact Type
web-ui

#### How to Run
- start: `cd frontend && npm run dev -- --host`
- ready-check: `/fieldview/build` loads on the device
- teardown: `Ctrl+C`

#### Acceptance Criteria
- [ ] Real-device pass recorded; tuned values applied <!-- NEEDS MANUAL REVIEW -->
- [ ] Frame guard and placeholder audit extended and green; axe clean everywhere
- [ ] Full suite + `test:perf` + `tsc -b` + `vite build` green

#### Implementation Steps
1. Device pass and tuning. 2. Audits and guards. 3. Docs and handoff.

## Sequencing

```
P0 → P1 → P2 → P3 → P4 → P5
```

Strictly sequential on purpose: each partition changes the contract the next one builds on (names, format,
disc, session). P4's pure codec/store could start after P1, but the lists and dialogs need P3, and one
branch is simpler than two.

## Migrations & Compat

None by design: no v1/v2 reader, no migration, no backfill; the toy content is regenerated. The one carried-over
compatibility is **routes**: `/fieldview/designer` goes away (it was unlinked). Existing localStorage prefs
are untouched; there is no prior play library to migrate.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Deleting the legacy UI deletes coverage that still matters | Audit first; port the engine/pointer tests to a harness; delete only tests of deleted code |
| Changing accessible names breaks many tests | One mechanical pass in P2 with a helper for piece lookup |
| Space-model change regresses output | Identical-output sweep across presets; benchmarks |
| Inheritance bugs corrupt plays | Pure model, exhaustive + property tests, frozen inputs, undo |
| Share links too long | Deflate, partial frames, size-budget test, QR fallback message, file export |
| Dependencies | Two small libs behind two thin modules |

## Alternatives Considered

- **Snapshot-per-frame storage:** rejected (the Builder's inheritance model; also larger files and no flow-through).
- **Keep the legacy UI "just in case":** rejected by the Builder (nothing older is relevant).
- **Server-side saved plays / short links:** deferred (accounts, backend) — the fragment approach needs neither.
- **Parallel partitions:** rejected — shared contracts change at each step.
