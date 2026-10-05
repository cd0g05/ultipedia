---
summary: "fieldview-build adds the play designer to Field View. A play is a list of frames; each frame stores only the players placed in it and everything else (positions and the disc holder) inherits the previous frame, so editing an early frame flows forward. Build is Explore plus frame controls: drag players, Give disc, 2-character titles, add/duplicate/delete/reset frames, undo/redo, preview. The mark becomes geometry (closest defender within 10 ft of the holder, else none); the disc holder is dynamic with a per-frame holder and an animated pass; titles replace T/M/1–6; pieces shrink per device (phone 85%, tablet 70%, desktop 50%). Plays save to a local library and travel by link, QR or file. The play format becomes a clean v3 with no legacy support and the dormant pre-rework UI is deleted first. Defense is hand-placed, transitions are fixed-time straight lines, plays are single paths; automatic defense, realistic timing, branching and reordering are deferred."
phase: "clarify"
when_to_load:
  - "When defining or reviewing fieldview-build goals, scope, success criteria and risks."
  - "When checking whether Build, the v3 format or the mark rule still match the Builder's decisions."
depends_on:
  - "docs/fieldview-build-functional-spec.md"
  - "design/fieldview-build-mockup.html"
  - "docs/fieldview-backlog.md"
  - ".cicadas/active/fieldview-ui-rework/"
modules:
  - "frontend/src/fieldview"
  - "frontend/src/router.tsx"
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

# PRD: fieldview-build

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

Field View can show a play (Watch) and explore spacing (Explore), but a coach cannot yet **make** a play. This
initiative adds Build: a laptop-first designer where a play is a short list of frames, the animation between
frames is automatic, and the finished play can be sent to a team's phones.

### What Makes This Special

- **Frames that inherit.** A frame stores only what you changed; everyone else follows the frame before. Fix the
  starting formation once and every later frame moves with it.
- **Geometry, not bookkeeping.** The mark is whoever is within 10 ft of the disc holder; the holder is whoever
  you gave the disc to. Nothing to assign, nothing to keep in sync.
- **Phone-ready by construction.** Build and Watch share one engine, so what the coach previews is what the
  team sees; a link or QR code carries the play with no account.

## Project Classification

**Technical Type:** Client-side web app feature (React, SVG + canvas), plus a pure model/format library
**Domain:** Sports coaching / ultimate frisbee education
**Complexity:** High — a new document model and format, a change to the space model's contract, an editing UI with undo, and sharing
**Project Context:** Brownfield and **stacked**: it builds on `initiative/fieldview-ui-rework` (PR #6, not yet merged to `main`), which provides the frame, Explore, Watch, the playback controller and the heat. The ui-rework's toy content and dormant legacy UI are deliberately thrown away here.

---

## Success Criteria

### User Success

1. **A coach builds "Go deep" on a laptop** (five frames: set, cutter drives under, throw, deep cut, throw deep) in a few minutes without help. *Verified by walking the journey in the browser.*
2. **A teammate watches it on a phone** after the coach shares a link or QR code, with no account. *Verified end to end; real-device check by the Builder.*
3. **Editing is forgiving.** Undo/redo work, Reset puts things back, and editing an earlier frame visibly carries forward.

### Technical Success

- The play model is a pure, framework-free library with exhaustive tests (resolution, every frame operation, undo history).
- v3 is the only play format; no v1/v2 code, tests or toy plays remain.
- The space model tolerates "no mark" with identical output whenever a mark exists.
- Dragging in Build commits zero React renders during the drag (canon ADR-2); the frame-budget benchmarks still pass.
- Everything the Builder approved in `design/fieldview-build-mockup.html` is implemented at the approved sizes.

### Business / Product Success

- Backlog items for Build, Give disc, titles, piece size, library and sharing are checked off; deferred items stay catalogued.

---

## User Journeys

### Coach designing (audience B) — laptop
Opens Build, picks "New play", arranges a vertical stack, names the handlers **H** and cutters **C**, gives the disc to a handler. Adds a frame, drags a cutter under (a ghost shows where it was), adds a frame and **Give disc** to the cutter, and so on. Hits **Preview** to see it run, **Share** to get a link and QR.

### Coach presenting (audience B) — tablet at practice
Opens the shared link in Watch, steps through the frames with the team around the tablet.

### New player (audience A) — phone
Taps a link from the coach and watches the play; in Explore can give the disc to a player and watch the mark and the heat change.

### Experienced player (audience C)
Builds their own plays, watches the heat shift as the disc and mark move through the frames.

---

## Scope

### In Scope
- **Clean-up first:** delete the dormant pre-rework UI and the v1/v2 play code, tests and toy plays.
- **Play model and v3 format** (frames, inheritance, per-frame disc holder, titles) with frame operations and undo history.
- **The mark rule** (10 ft) and the space-model change it needs.
- **Dynamic disc holder and titles** in Explore, Watch and Build; unnamed by default; holder ring.
- **Playback v3:** partial-frame resolution, per-frame holder, an animated pass that arrives with the receiver.
- **Piece size per device:** phone 85%, tablet 70%, desktop 50% of today's size, with strokes and titles kept legible.
- **Build page** on desktop and tablet/phone per the approved mockup.
- **One local play library** and **sharing**: link in the URL fragment, QR code, file export/import.
- One-frame plays replace "setups"; toy setups and plays are re-authored as v3 (placeholders, tracked).

### Out of Scope (deferred — tracked in `docs/fieldview-backlog.md`)
- Automatic defense / defense following; realistic timing (distance-derived durations, easing, curved paths).
- Branching plays ("continue options"); frame reordering; per-frame captions beyond the label; turnovers or a loose disc.
- Roster other than 14; accounts or cross-device library; offline/PWA; Advanced settings UI.
- The faint 10 ft circle around the holder.

### Phasing
Six partitions (see approach.md): clean-up → model/format/mark → disc/titles/sizes → Build UI → library/sharing → QA.

---

## Functional Requirements

### FR-1 Play model and format
- **FR-1.1** A play has a name, optional description, 14 players (`id`, `team`, optional `title` ≤ 2 chars) and 1..30 frames.
- **FR-1.2** A frame has an optional `label`, a `moved` map (explicit positions for players placed in that frame) and an optional `holder`.
- **FR-1.3** `resolve(play, i)` returns a complete scene: frame 0 is fully explicit; for later frames a player is at `moved[id]` or at their position in the previous resolved frame; the holder is `holder` or inherited.
- **FR-1.4** Operations (pure, tested): place players, give disc, set title, add (empty) frame after *i*, duplicate (an empty frame), delete (later frames now inherit from what precedes), reset frame, reset player, set label, rename play. Deleting the only frame is refused.
- **FR-1.5** Format `formatVersion: 3` is the only accepted version; unknown keys are dropped; ranges clamped; frame 0 must be complete with an offensive holder; titles trimmed, uppercased, ≤ 2 chars.
- **FR-1.6** A one-frame play is a setup; presets and setups use the same format.

### FR-2 The mark
- **FR-2.1** `MARK_RADIUS_YD = 10/3`. The mark is the defender closest to the holder within that radius (ties broken by id); none in range means no mark; all other defenders are standard.
- **FR-2.2** `normalize()` remains the only writer of `Player.role`; matchups no longer decide the mark.
- **FR-2.3** The space model accepts "no mark" (the mark layer contributes 1) and produces identical output whenever a mark exists; no holder renders a blank grid, never an exception.

### FR-3 Disc holder and titles
- **FR-3.1** "Give disc" on a selected offensive player sets the holder for the current frame (disabled for defenders and in Watch).
- **FR-3.2** Players are unnamed by default; selecting one offers a title ≤ 2 chars drawn inside the piece; titles are play-level identity (not per frame, not changed by throws).
- **FR-3.3** The holder is drawn with a green ring and the disc icon; the mark keeps a heavy ring; selection stays pink.
- **FR-3.4** Accessible names never depend on titles (stable "Offense 3" / "Defense 5" fallback).
- **FR-3.5** Explore's selected-player card gains the title field and Give disc.

### FR-4 Playback
- **FR-4.1** Transitions between consecutive resolved frames: every piece moves in a straight line over one fixed time; all start and arrive together.
- **FR-4.2** When the holder changes the disc flies a straight line from the old holder's start position to the new holder's end position in the same time; possession flips on arrival.
- **FR-4.3** Watch and Build's preview share one controller; React is not involved per animation frame.

### FR-5 Piece size
- **FR-5.1** Pieces render at 85% / 70% / 50% of today's size on phone / tablet / desktop (the `desktop` screen); outlines scale with the piece; titles keep a readable minimum; the grab target is unchanged.

### FR-6 Build page
- **FR-6.1** `/fieldview/build` replaces the placeholder, desktop and compact layouts per the approved mockup.
- **FR-6.2** Dragging a player writes a placement in the current frame; later frames that inherit follow; marquee group drags place all moved players.
- **FR-6.3** Change indicators: a faint ghost at the inherited position plus an arrow, and a small mark on every piece placed in the current frame; frame thumbnails show a placed/disc badge.
- **FR-6.4** Frame strip (four across, scrolls) with add / duplicate / delete / reset-frame; selected-player card (title, Give disc, Reset player, status); frame card (label); preview card (play all / from this frame).
- **FR-6.5** Undo/redo for every completed gesture and operation (≥ 100 steps).
- **FR-6.6** Autosave to this device with a visible "Saved" state.

### FR-7 Library and sharing
- **FR-7.1** One local library of plays (`LocalPlayStore`); new / open / duplicate / delete / rename; setups are one-frame plays and appear in Explore's picker, multi-frame plays in Watch's list.
- **FR-7.2** Share: a link carrying the whole play in the URL fragment (never sent to a server), a QR code of it, and file export/import.
- **FR-7.3** Opening a link in Watch plays it and offers "Save to my plays"; invalid or oversized payloads are rejected with a clear message.

### FR-8 Clean-up
- **FR-8.1** Deleted: `Whiteboard`, the old shell (`ShellLayout`, `LeftSidebar`, `RightSidebarSlot`, `BottomSheet`, `ToolRibbon`, `panelRegistry`, `panels/*`), `PresetMenu`, the old `Designer`, `Timeline`, `PlayMeta`, `OverlayRail`, `FieldStage`, `modeHandoff`, `scene/presetRegistry`, `scene/presetFormat`, v1/v2 format code and backfill, the seven toy plays, and every test that only covered them.
- **FR-8.2** Kept for later (catalogued in the backlog): `AdvancedPanel` (Advanced settings), `scene/matchups.ts`, `scene/force.ts`, the whole `motion/` engine and `throwMode`.

---

## Non-Functional Requirements

- **NFR-1 Performance:** drag, touch drag, marquee drag and playback commit zero React renders per pointer/animation frame; `test:perf` budgets still pass.
- **NFR-2 Accessibility:** keyboard-operable frame strip and panels; dialogs modal and labelled; axe clean in every Build state; reduced motion jumps instead of animating.
- **NFR-3 Style:** Light Film Room; all visual values in tokens; no hex literals outside token files (existing frame guard).
- **NFR-4 Untrusted input:** link and file payloads go through the v3 validator; fragment size capped; titles/labels can never inject markup.
- **NFR-5 Dependencies:** two small, licence-compatible, self-contained libraries only (deflate and QR); no network calls.
- **NFR-6 Placeholder tracking:** new toy content, copy and tuning values follow the existing `PLACEHOLDER(fieldview-build)` marker + `docs/fieldview-placeholders.md` register + audit test.
- **NFR-7 Licensing:** only OFL fonts; `fonts/Arena Font/` and `fonts/Druk_Collection/` stay uncommitted.

---

## Open Questions

Defaults chosen from the Builder's "use all your recommendations"; flagged for review:

1. **Max frames 30**; **title characters:** any printable character, trimmed, uppercased, ≤ 2.
2. **Faint 10 ft circle** around the holder: out of scope (backlog).
3. **Frame reordering:** out of v1.
4. **Frame label** doubles as the caption shown in Watch (a small line above/below the transport).
5. **Piece sizes** are the Builder's proposal (85/70/50); desktop at 50% is ~14 px across, so titles need a readable minimum — tuned in the real-device pass.
6. **Share link host:** the link uses the site's own origin; the production domain is not known to the code, so it is derived from `window.location`.
7. **Stacking:** this initiative branches from `initiative/fieldview-ui-rework`; PR #6 should merge to `main` first (or this PR retargets after).

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| The inheritance model confuses users ("why did frame 5 change?") | Ghost + arrow + placed marker + thumbnail badges; Reset player/frame; undo |
| Space-model "no mark" change regresses existing behaviour | Identical-output tests for every preset with a mark; property test that mark-present output is unchanged |
| Deleting the legacy UI deletes useful coverage | Delete only tests that exercised deleted code; model/engine tests stay; frame guard extended |
| Share links too long for QR / messaging apps | Deflate; partial frames; size budget test (a 30-frame play); file export as the fallback |
| Piece sizes unreadable on desktop | One CSS variable per breakpoint + title minimum; real-device pass |
| Two new dependencies | Small, pinned, MIT/permissive, wrapped behind two tiny modules so they can be swapped |
