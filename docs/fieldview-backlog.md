# Field View — Goals & Backlog

The living list of everything Field View is, should be, or might become. **Append new ideas here as
they come up** (Claude is asked to do this whenever one is mentioned). Move items between sections as
decisions are made; don't delete — mark `[x]` or move to "Decided against" with a reason.

Last re-planned: 2026-10-02 (UI/presentation re-approach).

## Purpose & success

Success looks like:
1. A coach uses it at practice to demonstrate field spacing to new players.
2. Teammates open the site and play with it to build spacing intuition.
3. A coach creates a play and sends it to the team to view.

**Audiences:** A new players · B coaches · C experienced players (new ways of seeing the field).
**Use cases:** A see how positioning affects spacing · B move players and watch the field shift ·
C author pre-programmed plays.
**Primary device for Watch/Explore:** phone/tablet, landscape, used in a huddle outdoors.
**Primary device for Build:** laptop/large screen (phone/tablet usable, not the target).

## Product shape

Implementation plan: `docs/fieldview-ui-rework-plan.md` (drafted 2026-10-03). Real-device checklist: `docs/fieldview-device-qa.md`. Things the Builder still has to supply: `docs/fieldview-placeholders.md`.

Three modes on one field: **Watch · Explore · Build**. Hamburger menu switches modes.
Layout reference: `design/fieldview-watch-explore-mockup.html` (single top bar; field fills the rest).

## MVP

Watch + Explore, optimized for phone/tablet. If nothing else ships, a visitor can drag players around
and see the field shading respond.

- [x] Explore: horizontal field, drag players, live heatmap
- [x] Explore: setup/preset picker (a few presets authored by the Builder, with one-line takeaways)
- [x] Explore: colour guide (tappable legend, “how to read the colours”)
- [x] Explore: "Defense follows" toggle **stub** (persisted pref, labelled "coming soon"; lives in the menu / sidebar) — behaviour deferred, see Future
- [x] Watch: play/pause, prev/next, progress dots, play selector (a few Builder-authored plays)
- [x] Hamburger menu: modes, how-to-read-colours, Settings
- [x] Settings: colour-blind mode (default is red/amber/green; CB mode = orange→blue)
- [x] Light theme by default
- [x] Touch dragging that works with a thumb (lifted piece + ghost at origin, ~44px hit area)
- [ ] Works on phone/tablet landscape; usable on laptop
- [x] Desktop layout (`design/fieldview-desktop-mockup.html`): tabs instead of hamburger, always-open
      right sidebar (setups/plays, options), dock under field (Explore: readout + selected player +
      colour guide; Watch: transport + frame filmstrip)
- [x] Build tab exists as a "coming next iteration" placeholder only (no designer in MVP)
- [ ] Offline-capable after first load (practice fields have bad signal) — *confirm as requirement*

## Stretch goals

- [ ] Build mode (frame-based designer; laptop-first, usable on tablet/phone) — layout deliberately
      undecided; desktop mockup only sketches empty regions (tools / properties / frames timeline)
- [ ] Desktop Explore: ideas to fill the space under the field (currently only a selected-player
      stats card) — TBD
- [ ] Optional "reading the field" hint sentence (cut from desktop Explore 2026-10-03; revisit if wanted)
- [x] Watch (desktop): 4-up frame filmstrip that scrolls sideways for plays with more frames; plays
      list shows 5 and scrolls for more (also applies to setups list)
- [x] Watch: playback speed (0.5×/1×/2×), loop, trails — shown in desktop sidebar
- [ ] Save a play and share it by link (play encoded in the URL; no accounts)
- [ ] Per-frame captions on plays (optional overlay in Watch)
- [ ] Tap a player for detail (e.g. distance to nearest defender)
- [ ] Coach-created presets
- [ ] Watch: speed, loop, show/hide trails
- [ ] Tablet layout that makes use of spare vertical room (open question)
- [x] Safe-area insets for notched phones

## Build (play designer) — functional model, drafted 2026-10-05

Builder's proposal, before any UI design. Decisions are in "Decided"; what is still open is in "Open questions".

- **Frames:** a frame is a full still state of the field (positions + who holds the disc). Build =
  Explore's drag surface plus controls to add / duplicate / delete / reorder / save frames. A new
  frame starts as a copy of the previous one.
- **Playback = automatic transitions** between consecutive frames (the same engine as Watch). A
  cutter glides A→B; a thrown disc flies holder→receiver; they should arrive together. Defense is
  authored by hand, exactly like offense, and animates the same way.
- **Presets are single frames.** "Save this frame as a setup" reuses the same save path.
- **Dynamic possession:** no permanent thrower. Select a player → **Give disc**. The holder is shown
  with the disc icon (maybe a ring/designator — undecided). Possession changes do not change anyone's
  title.
- **Player titles replace T / M / 1–6:** every player starts **unnamed**; selecting one lets you set
  a title (**max 5 chars**, e.g. "H" for handlers, "C" for cutters). Titles are identity — they
  persist across frames and throws. The selected-player panel (one of the boxes under the field on
  desktop) is where naming and Give disc live.
- **Reuse, don't rebuild:** `play/` format (a preset is already a one-keyframe play), the Watch
  playback controller, the unsurfaced throw engine (`scene/possession.ts`, `motion/disc.ts`
  flight timing), selection + marquee, trails layer, filmstrip.

## Built but not surfaced (re-attach later)

> **Reference implementation removed (fieldview-build P0):** the old `pages/Whiteboard.tsx`, `pages/Designer.tsx`, `ui/shell/*` (ribbon, sidebar, bottom sheet, panels), `ui/PresetMenu.tsx`, `ui/Timeline.tsx`, `ui/PlayMeta.tsx`, `ui/OverlayRail.tsx` and `scene/preset*.ts` were deleted. They are all in git history at commit `085621f` (e.g. `git show 085621f:frontend/src/fieldview/pages/Whiteboard.tsx`); start there when re-attaching a feature. The engines below are still in the tree.

Already implemented in some form, with code and tests in the repo, but **deliberately not in the new
UI's MVP** (rework decision D2 and friends, 2026-10-03). Each should be quick to add back because the
substance exists — the work is mostly UI entry points. Paths are under `frontend/src/fieldview/`.

- **Throw to player** — possession moves to a chosen receiver; the new thrower gets a mark; the disc
  flies as an animation and lands before possession changes. `scene/possession.ts`, `motion/disc.ts`,
  `ui/shell/throwMode.ts`, ribbon button (at `085621f:…/ui/shell/ToolRibbon.tsx`), throw-click in `ui/FieldCanvas.tsx`.
- **Cuts / routes** — click a destination (multi-waypoint, so two-part cuts) and run it with real
  accel/decel physics; stop, rewind, drag waypoint markers to reshape. `motion/route.ts`,
  `motion/kinematics.ts`, `motion/simulate.ts`, `ui/motion/*`, `render/routeLayer.tsx`.
- **Defender pursuit on a cut** — the assigned defender seeks a cushion point on a reaction delay.
  `motion/pursuit.ts`, `motion/step.ts`. (The new "Defense follows" toggle reuses this on drag.)
- **Advanced settings panel** — space-model sliders, lens/layers, and the motion tunables `accel`,
  `decel`, `cushion`, `lead`. `ui/AdvancedPanel.tsx`, `motion/constants.ts`, `space/constants.ts`.
  Deferred (see Future); the panel component stays in the tree, unmounted.
- **Force controls** — flat / flick / backhand × default / inside / around, plus a "custom" reading.
  `scene/force.ts`, panel at `085621f:…/ui/shell/panels/MarkPanel.tsx`.
- **Matchups** — auto-assign and manual reassign of who guards whom. `scene/matchups.ts`,
  panel at `085621f:…/ui/shell/panels/DefensePlayerPanel.tsx`.
- **Marquee multi-select + group drag** — draw a box on empty grass, move the group rigidly.
  `scene/selection.ts`, marquee code in `ui/FieldCanvas.tsx`.
- **Keyboard nudge** of the selected player(s). `ui/FieldCanvas.tsx`.
- **User presets** — save / rename / delete (with undo) / import / export JSON, persisted to
  localStorage. Removed in P0 (see `085621f`); superseded by the one play library in fieldview-build. *(Also listed
  under Future: coach-made presets.)*
- **PNG export** of the field with the painted heatmap. `render/exportImage.ts`.
- **Present / fullscreen mode** — field alone fullscreen for showing a team. `ui/useFullscreen.ts`,
  `.fv-stage:fullscreen` in `index.css`. Dropped from the MVP: the default layout should be enough.
- **Hover cell readout** — "why is this spot open", spoken by the space model. `ui/CellReadout.tsx`,
  `space/explain.ts` (kept screen-reader-only today).
- **Team visibility toggles** — show/hide offense or defense (display-only). `ui/prefs.ts`,
  `ui/shell/panels/DefaultVisibilityPanel.tsx`.
- **Space-model lens and layer toggles** — which layers feed the map, offense vs. defense lens.
  `space/layers.ts`, `ui/AdvancedPanel.tsx`.
- **Old keyframed play designer** — continuous-tween timeline, play JSON export/import, play store.
  `pages/Designer.tsx`, `ui/Timeline.tsx`, `ui/PlayMeta.tsx`, `play/*`. Kept unlinked as the internal
  authoring tool for the curated Watch plays; it is the seed for Build.
- **Overlay legend** (Closed / Contested / Strong space) — dropped in the shell rework; coming back
  in the new UI as the top-bar legend.

## Future / ideas

- **Defense following (behaviour)** — *on hold until the rest of the UI rework is complete, then do it
  deliberately.* While an offensive player is dragged, the assigned defender trails using the existing
  pursuit model (`motion/pursuit.ts`, `motion/step.ts`, driver in `ui/motion/driver.ts`). The toggle and
  its pref ship in the MVP as a "coming soon" stub. ADR-33 is reserved for it.
- **Realistic animation** — *future.* Transitions currently start and finish together over one fixed time. Later:
  duration derived from the longest move, per-frame speed override, easing, and physically plausible paths
  (acceleration/deceleration from the motion model; a disc that leads the receiver).
- **Automatic defense** — *future.* Let the system place the defense (pursuit, cushion, shading) instead of
  the user dragging every defender, e.g. a "suggest defense" action in Build. Builds on the deferred
  defense-following work (`motion/pursuit.ts`, `motion/step.ts`).
- **Advanced settings** — *do later.* The old panel exists (`ui/AdvancedPanel.tsx`: space-model sliders,
  lens, layers, motion tunables). Intended eventual home: the open space under the Explore field on
  desktop. Not in the MVP UI.

- Best-positioned-defender selection (not just the closest) when covering a cut
- Saving routes (format owned by Build)
- Multi-waypoint cuts surfaced in the UI
- Installable PWA / home-screen icon
- Guided "lessons" for new players (scenario + takeaway)
- Auto-generated readout sentence describing what the shading means *(dropped from the phone
  layout for now; could return as an optional hint or on tablet)*
- Accounts / a saved library of plays and teams

## Open questions

- **Build — still open (small):** reordering frames (assumed out of v1); max frames (suggest 30); which characters a title may use; whether the faint 10 ft circle around the holder ships. See `docs/fieldview-build-functional-spec.md` §9.
- **Piece size per device (being evaluated 2026-10-05):** proposal is phone 85% / tablet 70% / desktop 50% of today's size (≈ 19 / 21 / 14 px across vs 22 / 30 / 28 today). Needs a way to set it per breakpoint in `PIECE_TOKENS` (today one radius for everything). Mockup: `design/fieldview-build-mockup.html` (Current/Proposed switch).
- **Space model must accept "no mark":** today `requireRole(scene, "mark")` throws. See Decided (mark rule).


- Sharing: URL-only (long links, can't update after sending) vs. accounts + saved library
- Offline: hard requirement?
- Piece size: larger for huddle legibility vs. smaller so the field doesn't feel crowded
- What counts as a "custom" setup (the ✎ marker once something is dragged)?
- Tablet landscape leaves empty space below a width-limited field — how to use it?
- Existing code: keep as base and replace the presentation layer, or rewrite the UI layer and keep
  only `space/`, `motion/`, `scene/`?

## Decided

- 2026-10-02 · Three modes (Watch / Explore / Build). Build is laptop-first.
- 2026-10-02 · Phone/tablet layout: one top bar, no bottom bar, no readout/caption in MVP.
- 2026-10-02 · Tablet keeps the phone layout (no expanded cards).
- 2026-10-02 · Light theme default. Default heatmap stays red/amber/green; colour-blind mode in
  Settings swaps the palette.
- 2026-10-02 · "Defense follows" lives in the menu, not the top bar.
- 2026-10-03 · Watch/Explore layout approved as mocked. Styling follows the Light Film Room system
  (`style-guide/design.md`): hard corners, zinc neutrals, pink interactive, green on-states,
  Archivo Black / JetBrains Mono / Helvetica Neue.

- 2026-10-03 · Desktop Explore/Watch layouts approved (Watch near-final). Explore dock = selected-player
  stats only; second colour guide and readout cut. Build stays a blank placeholder.

- 2026-10-03 · UI rework plan decisions (see plan §5): vertical-tuning WIP parked on branch
  `checkpoint/fieldview-vertical-tuning`; throw/marquee/force/matchups/cuts out of MVP UI (catalogued
  above); saved presets are a future feature; portrait phone shows a "rotate to landscape" message;
  default route is Explore; Present button dropped; legend uses Closed / Contested / Strong space;
  site header visible on desktop, reached via the hamburger menu on phone/tablet; run as Cicadas
  initiative `fieldview-ui-rework`.

- 2026-10-03 · Defense-following *behaviour* put on hold (toggle stub only) and Advanced settings
  moved to do-later; placeholders (toy setups/plays/copy) are allowed and tracked in
  `docs/fieldview-placeholders.md`. `fieldview-motion` archived; all five ui-rework specs approved.

- 2026-10-05 · **Build model.** Frames are full field states; **always 14 players; no turnovers; straight-line
  transitions; titles ≤ 2 characters, drawn inside the piece; defense is hand-placed** (automatic defense is a
  Future item). Saving/sharing: encode the play in a link (+ QR, + file export as backup); links are snapshots.
- 2026-10-05 · **The mark is geometry, not an assignment.** The mark is the *closest* defender to the disc holder
  **within 10 ft (10/3 yd)**; if none is that close there is **no mark**; any other defender is a standard
  defender (double-team rule deliberately not modelled). Matchups stop determining the mark.
- 2026-10-05 · **Frames inherit.** Per player, per frame: either an explicit ("moved") position or inherit the
  previous frame's resolved position; the first frame is fully explicit. Editing an earlier frame moves everyone
  who inherits from it. The disc holder inherits the same way. Reset = drop this frame's explicit positions.
- 2026-10-05 · Undo/redo wanted (snapshots of the small play document, one step per completed gesture).
- 2026-10-05 · **Timing (v1):** every piece starts and arrives together over one fixed transition time; the
  disc flies in the same time. Realistic timing is a Future item. **Plays are single paths** (no branching).
- 2026-10-05 · **Deleting a frame resets the defaults:** later frames simply inherit from what is now before them
  (no "locking in" positions). Frame reordering is out of v1.
- 2026-10-05 · **No legacy support.** Nothing from before the rework is relevant: the play format becomes a clean
  v3 (no v1/v2 readers or backfill), the toy plays are regenerated, and the dormant old shell / Whiteboard /
  PresetMenu / old Designer are deleted as the first step of the Build work.
- 2026-10-05 · One saved list of plays (a one-frame play is a setup); disc holder drawn with a green ring for now.

## Decided against

*(none yet)*
- **Force presets and the 10 ft mark rule (2026-10-05, P1):** `flat/inside` moved to 3.25 yd so every force preset stays within `MARK_RADIUS_YD`; a force-picker UI must keep that invariant.
