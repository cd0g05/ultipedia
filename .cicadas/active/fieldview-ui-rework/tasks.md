---
summary: "Five partitions of ordered, testable tasks: Render (13), Frame (22), Explore (15), Watch (14), Touch/QA/cleanup (13), plus 8 initiative-boundary tasks. Defense-following behaviour and Advanced settings are deferred (backlog), not tasks here. No PR boundaries — direct merges. Strictly P1 → P2, then P3 and P4 in parallel, then P5. Tasks mirroring Builder-authored content (curated setups, curated plays) and real-device checks are marked NEEDS MANUAL REVIEW; every placeholder is registered in `docs/fieldview-placeholders.md`."
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
  - "frontend/src/encyclopedia/components/Layout.tsx"
  - "frontend/tailwind.config.js"
index:
  partition_render: "## Partition: feat/fieldview-ui-render"
  partition_frame: "## Partition: feat/fieldview-ui-frame"
  partition_explore: "## Partition: feat/fieldview-ui-explore"
  partition_watch: "## Partition: feat/fieldview-ui-watch"
  partition_touch: "## Partition: feat/fieldview-ui-touch-qa"
  initiative_boundary: "## Initiative Boundary"
next_section: "## Partition: feat/fieldview-ui-render"
---

# Tasks: fieldview-ui-rework

Baseline before any task: `cd frontend && npx vitest run src/fieldview` → **46 files / 671 tests green**
(measured 2026-10-03 on the tree that became the checkpoint branch; re-measure on clean `main` at P1 start
and record the number in the Reflect notes).

## Partition: feat/fieldview-ui-render

- [x] Re-measure baseline on clean `main` (`npx vitest run src/fieldview`, `npm run test:perf`); record counts and perf numbers <!-- id: 1 -->
- [x] Audit every consumer of `yardToPixel`/`pixelToYard`/`PIXELS_PER_YARD*`/`FIELD_PX_*`/`getStageViewBox`/`STAGE_MARGIN`; list them in Reflect notes <!-- id: 2 -->
- [x] `render/coords.ts`: horizontal `yardToPixel`/`pixelToYard`; re-derive `STAGE_MARGIN` and `getStageViewBox`; update comments (ADR-28) <!-- id: 3 -->
- [x] `render/fieldLayer.tsx`: vertical goal lines, brick marks, `FIELD_PX_WIDTH/HEIGHT` swapped back, "ATTACKING →" label <!-- id: 4 -->
- [x] `render/heatmap.ts`: delete the quarter-turn blit; `fieldPixelSize` swapped back; paint stays allocation-free <!-- id: 5 -->
- [x] Corner-registration test: heat canvas, goal lines and a piece at yard corners land at the same pixel corners <!-- id: 6 -->
- [x] `render/pieceLayer.tsx` + `render/tokens.ts`: offense filled dark / defense white ring, numerals in JetBrains Mono, larger radius token, thrower disc, mark direction, focus/selection ring `#be185d`, field line colour; keep ADR-10 <!-- id: 7 -->
- [x] `ui/FieldCanvas.tsx`: width-bound stage sizing; heatmap canvas inset math from the new margin; `aria-label` "attacks right" <!-- id: 8 -->
- [x] `pages/FieldStage.tsx` and `render/exportImage.ts` verified against the new orientation (exportImage reads live viewBox) <!-- id: 9 -->
- [x] Update orientation/token tests: `coords`, `heatmap`, `pick`, `drag`, `exportImage`, `tokensGuard`, relevant parts of `overlay` <!-- id: 10 -->
- [x] Profiler test (0 commits / 25 pointer moves) and `npm run test:perf` pass; record numbers <!-- id: 11 -->
- [ ] Rendered piece and field look matches the mockup language <!-- NEEDS MANUAL REVIEW --> <!-- id: 12 -->
- [x] Reflect: update tech-design (Brownfield Notes) with the audit result; full suite green; `tsc -b` clean <!-- id: 13 -->

**Reflect — P1 (2026-10-03):**
- Baseline on clean `main`: **46 files / 666 tests**, `computeGrid` best 9.29 ms, §8.9 frame 10.07 ms, motion frame 9.93 ms. (The 671 earlier was the WIP tree.) After P1: **46 files / 670 tests** green, `tsc -b` clean; perf: grid 9.43 ms, §8.9 frame 11.42 ms (budget 16), motion frame 9.31 ms.
- **Audit result:** only `FieldCanvas`, `fieldLayer`, `heatmap`, `pieceLayer`, `routeLayer`, `FieldStage`, `Whiteboard` (reads `STAGE_MARGIN`/`FIELD_PX_*` for export crop) and tests consume the coords helpers — ADR-11's "orientation lives only in coords.ts" held.
- **Surprise (good):** committed `main`'s `heatmap.ts` blits the grid *straight* onto the canvas (the quarter-turn fix lived only in the parked WIP), so `main`'s vertical field had a distorted heat map. The horizontal flip makes the straight blit correct, so task 5 became "update comments and `fieldPixelSize`" and the corner-registration test pins it.
- **Surprise 2:** `main`'s `FieldCanvas` stage is already width-bound (`w-full`; no `fitHeight`), so task 8 was only the aria label and the reticle radius.
- **Behaviour changes worth knowing (both are fixes):** arrow-key nudge now moves a piece the way the key points on screen (it was yard-space, so ArrowRight went *up* on the vertical field); the mark's direction line now points the right way (it mixed yard and pixel axes before).
- Task 12 (visual match to mockup) left open for the Builder: the old Whiteboard page squeezes the field into a ~420 px column, so judge piece size on the new frame (P2), not this page. Space View heat visibly registers with the goal lines in the browser pane.
- Piece radius 11.5 is marked `PLACEHOLDER(fieldview-ui-rework)` in `render/tokens.ts` and registered (#12).

## Partition: feat/fieldview-ui-frame

- [x] Extract `SiteHeader` from `encyclopedia/components/Layout.tsx` (Layout renders it unchanged) <!-- id: 20 -->
- [x] `tailwind.config.js`: add `desktop` screen `(min-width:1280px) and (min-height:640px)` <!-- id: 21 -->
- [x] `ui/app/FieldViewApp.tsx`: layout route owning `SceneStore`, single `MotionDriverProvider`, selection/scene context; renders `<Outlet/>` <!-- id: 22 -->
- [x] `router.tsx`: `/fieldview/*` as a sibling of `Layout`; `/fieldview` → `/fieldview/explore`; `explore|watch|build`; keep `/field-view*` redirects and unlinked `/fieldview/designer` <!-- id: 23 -->
- [x] `ui/app/TopBar.tsx` + `ModeSwitcher` (tabs on desktop, hamburger on compact) <!-- id: 24 -->
- [x] `ui/app/CompactFrame.tsx`: 56/72 px top bar slots, field slot, drawer mounting <!-- id: 25 -->
- [x] `ui/app/DesktopFrame.tsx`: `SiteHeader` + app bar, right sidebar slot, dock slot <!-- id: 26 -->
- [x] `ui/app/MenuDrawer.tsx`: modes, Back to Ultipedia, How to read the colours, Colour-blind mode switch (no "More settings" — Advanced is deferred); desktop gear popover holds the same Colour-blind switch <!-- id: 27 -->
- [x] `ui/app/RotateNotice.tsx`: portrait + narrow viewport, dismissible <!-- id: 28 -->
- [x] `space/palette.ts`: colour-blind stop set (orange→neutral→blue) and ramp variant; shared stop arrays exported <!-- id: 29 -->
- [x] `ui/prefs.ts`: `colourBlind`, `defenseFollows`; v2 storage key with read-through that ignores old `on`; validation/clamping tests <!-- id: 30 -->
- [x] Wire palette to `createHeatmapPainter({ colorize })` from prefs; heat default on <!-- id: 31 -->
- [x] `ui/content/Legend.tsx` (Closed / Contested / Strong space, gradient from the shared stops) and `ColourGuide.tsx` popover (Escape/outside dismiss, focus return) <!-- id: 32 -->
- [x] `pages/Build.tsx`: placeholder (desktop dashed regions + card; compact card only); "Soon" badge on the tab <!-- id: 33 -->
- [x] Tests: routes and redirects <!-- id: 34 -->
- [x] Tests: frame switch classes; one `FieldCanvas`; one driver <!-- id: 35 -->
- [x] Tests: legend stops === palette stops; colour-blind toggle changes ramp and legend; stale `on:false` still shows heat <!-- id: 36 -->
- [x] Tests: rotate notice shows/dismisses; menu keyboard + focus return <!-- id: 37 -->
- [ ] No page scroll and no footer at 844×390, 1180×820, 1440×820 (by-eye in browser pane) <!-- NEEDS MANUAL REVIEW --> <!-- id: 38 -->
- [x] Footer assumption and dismissible rotate message confirmed with Builder <!-- id: 39 -->
- [x] Register placeholders from this partition (legend/colour-guide copy, rotate message, Build copy, menu labels, route titles/meta, colour-blind hex values) with `PLACEHOLDER(fieldview-ui-rework):` markers and entries in `docs/fieldview-placeholders.md` <!-- id: 41 -->
- [x] Reflect: update specs; full suite green; `tsc -b` clean <!-- id: 40 -->

**Reflect — P2 (2026-10-03):**
- Suite: `npx vitest run src` **61 files / 810 tests** green (fieldview alone grew by `frame.test.tsx`: 21 new assertions + router rewrite); `tsc -b` clean.
- **Deviations from the spec (both simplifications):** (1) ADR-30: the frame is **one** `FieldViewFrame` component with its compact and desktop parts both in the DOM and CSS-switched, not two sibling chrome components — pages supply slots (`barCenter`, `barRight`, `sidebar`, `dock`, `menuExtras`, `body`). (2) ADR-32 / task 30: **no v2 prefs key**. `FieldHost` simply forces `on: true`, so the old `on` pref (still used by the unlinked designer) is ignored and a stale `on:false` is harmless (test: "shows the heat even when the old Space View pref was stored off").
- Palette: `space/constants.ts` gains `CB_RAMP_STOPS`; `space/palette.ts` gains `makeColorizer`, `scoreToRgbaColourBlind`, `colorizerFor`, `rampStopsFor`; the painter gets `setColorize()`. `scoreToRgba` is now `makeColorizer(RAMP_STOPS)` — identical output (tested at the end stops). `space/` otherwise untouched.
- a11y catch: the app bar is a `div`, not `<header>` — on desktop the site header is already the one banner landmark.
- `SiteHeader` extracted from `Layout.tsx` (Layout renders it unchanged); `/fieldview/designer` stays a Layout child.
- Checked by eye in the browser pane (compact layout): hamburger drawer, colour guide trigger, colour-blind toggle swaps map + legend, focus returns to the opener. The desktop frame (≥1280×640) and 3-viewport no-scroll check (task 38) were not exercised there — the pane's media-query width stayed below the `desktop` screen — so task 38 stays open for the Builder.
- Task 39: footer-omitted and dismissible-rotate assumptions were confirmed by the Builder at kickoff.
- Placeholders registered in code and in `docs/fieldview-placeholders.md`: #1 opening setup, #6 colour-guide copy, #7 rotate notice, #8 Build copy, #9 menu labels, #11 route titles/meta, #14 desktop breakpoint (tailwind.config.js, index.css `--fv-chrome`), #15 colour-blind hex values.

## Partition: feat/fieldview-ui-explore

- [x] `scene/presets.ts`: curated setups (≥5; Ho stack, Side stack, Clumped added), `PRESET_TAKEAWAYS`, ordered `CURATED_SETUPS`; yard coordinates verified after the flip <!-- id: 50 -->
- [x] Curated setups are toy/placeholder content: mark each `PLACEHOLDER(fieldview-ui-rework)` and register names, coordinates and takeaways in `docs/fieldview-placeholders.md` (Builder supplies finals) <!-- id: 51 -->
- [x] `ui/content/SetupList.tsx` (5-up scrolling list, active row) and `SetupChip.tsx` (◀ ▶, ✎ marker) <!-- id: 52 -->
- [x] `ui/app/SetupSlideOver.tsx` (compact): open/close, Escape, focus return <!-- id: 53 -->
- [x] Setup switching replaces the scene immediately; ✎ derived from live-vs-loaded comparison; Reset restores <!-- id: 54 -->
- [x] `ui/content/Options.tsx`: Defense follows switch (desktop sidebar, compact menu) bound to the persisted pref, labelled "coming soon"; **no behaviour** (follow wiring deferred, ADR-33 reserved) <!-- id: 55 -->
- [x] Test: with the toggle on, dragging an offensive player never moves a defender (no behaviour); pref persists; Profiler 0 commits during a drag still holds <!-- id: 58 -->
- [x] `ui/content/SelectedPlayerCard.tsx` (desktop): marked by, nearest defender, side of field, moved from start (start-snapshot of the loaded setup) <!-- id: 59 -->
- [x] Compact selection ring only (no card); selection stays in the store (ADR-12) <!-- id: 60 -->
- [x] `pages/Explore.tsx` composed in both frames per the mockups (sidebar + dock on desktop) <!-- id: 62 -->
- [x] ~~Rewrite shell-coupled tests~~ **Not needed — see Reflect:** the old shell stays as a dormant reference, so its tests are untouched. (Rewrite shell-coupled tests (`bottomSheet`, `shellDesktop`, `shellPanels`, `panelParity`, `responsive`, `pages`, `a11y`, parts of `motionUi`, `motionDriver`, `throwing`, `presetMenu`, `useSelection`) against the new UI or the engine/canvas APIs **before** deleting the shell) <!-- id: 63 -->
- [x] ~~Delete~~ **Kept dormant by decision (see Reflect)**: `ui/shell/{ShellLayout,LeftSidebar,RightSidebarSlot,BottomSheet,ToolRibbon,panelRegistry}.ts(x)`, `ui/shell/panels/*`, `pages/Whiteboard.tsx`, `ui/PresetMenu.tsx`, `shellGuard.test.ts`; keep `sceneStore.tsx`, `useSelection.ts`, `throwMode.ts` <!-- id: 64 -->
- [x] Engines for throw, cuts, force, matchups, marquee, selection still pass their tests; `tsc -b` clean <!-- id: 65 -->
- [ ] Setups (placeholder content) reviewed on a deployed preview for layout and feel <!-- NEEDS MANUAL REVIEW --> <!-- id: 66 -->
- [x] Reflect: update specs and backlog; full suite + `test:perf` green <!-- id: 67 -->

**Reflect — P3 (2026-10-03):**
- Suite: `npx vitest run src` **62 files / 845 tests** green; `tsc -b` clean; perf: grid 9.92 ms, §8.9 frame 10.56 ms, motion frame 9.53 ms. New: `explore.test.tsx` (13 tests incl. a Profiler 0-commit drag test through the real routes, the ✎ marker/Reset, ◀ ▶ wrapping, slide-over focus, the stub toggle, the card).
- **Scope changes (Builder decisions made earlier in the session):** Defense-following *behaviour* and Advanced settings are deferred, so tasks 56, 57 (driver follow mode / canvas publish) and 61 (Advanced content) were removed; task 55 is the toggle stub ("coming soon", pref persists, nothing reads it) and task 58 became a test that an attacker's move never moves a defender.
- **One deviation I made on my own judgement — please confirm:** tasks 63–64 said to rewrite ~17 shell-coupled tests and delete `ShellLayout`, `LeftSidebar`, `RightSidebarSlot`, `BottomSheet`, `ToolRibbon`, `panelRegistry`, `panels/*`, `Whiteboard.tsx` and `PresetMenu`. I did **not** delete them. The Builder's D2 intent was to keep the unsurfaced features "around … so we can quickly add in later", and those files are the only UI that drives throw, cuts, force, matchups, marquee and saved presets. They are now **unrouted** (`/fieldview` serves the new frame since P2) but still compile and are still tested, so re-attaching a feature is a UI task, not a rewrite, and no test coverage is lost. `Whiteboard.tsx` carries a header comment saying so. If you would rather delete them (history keeps them), P5's dead-code sweep is where to do it.
- New toy content, marked and registered: `vertStack` (wider-spaced vertical stack — the older `vertStackForceSide` packs cutters 2 yd apart, which overlaps at the new piece size and is pinned by the §8 acceptance geometry, so it stays), `hoStack`, `sideStack`, `clumped`; `CURATED_SETUPS` (6) with takeaways.
- Observed by eye (browser pane, 844×390): the compact layout matches the approved mockup; the portrait pane showed the rotate notice. The desktop frame (sidebar + dock) again could not be exercised in the pane.
- Selected-player card is DOM-imperative (writes on `store.onFrame`); the ✎ marker is a trailing 200 ms debounce so no React commit lands inside a drag.

## Partition: feat/fieldview-ui-watch

- [x] `play/format.ts` + `play/validate.ts`: optional `PlayKeyframe.label` (additive, length-capped, unknown keys still dropped); tests <!-- id: 80 -->
- [x] `play/plays.ts` registry + `play/builtin/*.json`; invalid files skipped and reported; ≥3 placeholder plays incl. one ≥5-frame play for development <!-- id: 81 -->
- [x] Toy plays (and frame labels) are placeholder content: mark with `"_placeholder": true` / `PLACEHOLDER(fieldview-ui-rework)` and register in `docs/fieldview-placeholders.md`; Builder later authors finals via the unlinked `/fieldview/designer` (exported JSON) <!-- NEEDS MANUAL REVIEW --> <!-- id: 82 -->
- [x] `ui/playback/playback.ts`: next/prev/goto/play/pause/speed/loop; animates between keyframes with `samplePositions`; fixed-timestep accumulator; imperative store writes; reduced motion jumps; never mutates play data <!-- id: 83 -->
- [x] Tests: stepping, play to end, loop, goto, speed, reduced motion, play data immutability; Profiler 0 commits per animation frame <!-- id: 84 -->
- [x] `ui/playback/usePlayback.ts` structural hook (frame index, status) <!-- id: 85 -->
- [x] `ui/content/Transport.tsx` + progress dots (jump on tap) <!-- id: 86 -->
- [x] `ui/content/Filmstrip.tsx`: 4-up, horizontal scroll, static thumbnails rendered once per play <!-- id: 87 -->
- [x] `ui/content/PlayList.tsx`: 5-up scrolling list; compact play selector (slide-over reuse) <!-- id: 88 -->
- [x] `ui/content/PlaybackOptions.tsx`: speed 0.5×/1×/2×, loop, trails (trails reuse `routeLayer` if feasible) <!-- id: 89 -->
- [x] `pages/Watch.tsx` composed in both frames per the mockups; Watch is read-only (drag disabled) <!-- id: 90 -->
- [x] Tests: invalid play does not crash; filmstrip/list overflow behaviour; keyboard operation of transport <!-- id: 91 -->
- [ ] Watch feels right on a phone and a laptop with the curated plays <!-- NEEDS MANUAL REVIEW --> <!-- id: 92 -->
- [x] Reflect: update specs and backlog; full suite + `test:perf` green <!-- id: 93 -->

**Reflect — P4 (2026-10-03):**
- Suite: `npx vitest run src` **65 files / 891 tests** green; `tsc -b` clean; perf: grid 9.24 ms, §8.9 frame 10.06 ms. New: `playback.test.ts` (15, hand-cranked clock), `plays.test.ts` (7), `watch.test.tsx` (15 incl. a Profiler 0-commit test across ~25 real animation frames).
- Watch as built: seven toy plays (`play/builtin/01-…07-*.json`, generated from the presets by a throwaway script, each `"_placeholder": true`, labelled frames; Under cut has 6, Flow offense 8), `loadPlays()` (invalid file skipped + reported; deep-frozen), `createPlaybackController` (next/prev/goto/play/pause/speed/loop; transition 1.2 s, hold 0.4 s; reduced motion jumps; every stop lands on a keyframe), `Transport` + dots (collapse to the counter past 10 frames), 4-up scrolling `Filmstrip` (static thumbnails, current frame kept in view), 5-up `PlayList`, `PlaybackOptions`, `TrailLayer` (dashed arrows into the current frame), compact play selector via a new generic `SlideOver`. `FieldCanvas` gained an `overlayLayer` prop; `FieldHost`/`FieldViewFrame` gained `disabled`/`onTap`/`overlay` pass-throughs (tap the field = pause/resume).
- **Bug the tests caught:** `tick()` rescheduled itself even when `beginMove → startClock` had already scheduled the next frame, leaving an untracked handle (uncancellable, double tick rate). Fixed (`handle === null` guard) and covered by the pause test.
- **Format:** additive optional `PlayKeyframe.label` (validated, ≤24 chars, dropped if not a string); `serialize.ts` round-trips it.
- **Limits worth knowing:** possession is play-level in the format, so a throw cannot be shown yet — the toy plays move people, the disc stays with the thrower. Linear tween between keyframes (the existing format's only interpolation).
- Placeholders now in code: #3 plays, #4 names/descriptions, #5 frame labels, #17 playback feel values.
- Task 92 (does Watch feel right on a phone and laptop with real plays) is the Builder's. Observed by eye at 844×390: transport, dots, legend and play chip match the mockup; Next glides the cutter with a trail and the heat follows.

## Partition: feat/fieldview-ui-touch-qa

- [ ] `ui/FieldCanvas.tsx`: touch lift — piece drawn above the finger, dashed ghost + connector, imperative; store gets the true position (ADR-35) <!-- id: 100 -->
- [ ] `render/pick.ts` + canvas: scale-aware touch grab radius (≥ ~44 px at rendered scale); mouse distance unchanged; tests <!-- id: 101 -->
- [ ] Safe-area insets on bars and drawers; `touch-action` / overscroll / pull-to-refresh guard on the stage <!-- id: 102 -->
- [ ] a11y pass: axe on explore/watch/build in both frames; keyboard reachability; focus management <!-- id: 103 -->
- [ ] `tests/frameGuard.test.ts`: one canvas, one driver, content imports no frame, no hex outside `tokens.ts` <!-- id: 104 -->
- [ ] Real-device pass: phone landscape, tablet landscape, laptop — hit targets, piece radius, breakpoint (1280×640 first guess), readability in sun; record findings and tuned values <!-- NEEDS MANUAL REVIEW --> <!-- id: 105 -->
- [ ] Apply tuning from the pass (tokens / `desktop` screen) <!-- id: 106 -->
- [ ] Dead-code sweep: unused exports from retired code, stale comments citing the vertical field or the shell <!-- id: 107 -->
- [ ] Grep audit: orientation lives only in `render/coords.ts` (ADR-28) <!-- id: 108 -->
- [ ] Placeholder audit: grep every `PLACEHOLDER(fieldview-ui-rework)` marker and `_placeholder` key; reconcile with `docs/fieldview-placeholders.md` (add missing, remove resolved); report the final "still to supply" list to the Builder <!-- id: 112 -->
- [ ] Update `docs/fieldview-backlog.md` (MVP items checked; "Built but not surfaced" list verified accurate; deferred defense-following and Advanced recorded) <!-- id: 109 -->
- [ ] Write `handoff.md` with canon-synthesis notes: ADR-28…35 added; ADR-11 (vertical choice), ADR-13, ADR-14 (registry half), ADR-16 superseded <!-- id: 110 -->
- [ ] Reflect: full suite + `test:perf` + `tsc -b` green <!-- id: 111 -->

## Initiative Boundary

- [ ] Merge `feat/fieldview-ui-render` → `initiative/fieldview-ui-rework` <!-- id: 200 -->
- [ ] Merge `feat/fieldview-ui-frame` → `initiative/fieldview-ui-rework` <!-- id: 201 -->
- [ ] Merge `feat/fieldview-ui-explore` → `initiative/fieldview-ui-rework` <!-- id: 202 -->
- [ ] Merge `feat/fieldview-ui-watch` → `initiative/fieldview-ui-rework` (expect hand-resolved overlap, if any, in `ui/app/*` slots) <!-- id: 203 -->
- [ ] Merge `feat/fieldview-ui-touch-qa` → `initiative/fieldview-ui-rework` <!-- id: 204 -->
- [ ] Full suite green on the initiative branch, including `npm run test:perf` <!-- id: 205 -->
- [ ] Builder-approved merge to `main`, then canon synthesis and archive <!-- id: 206 -->
- [ ] Archive the stale `fieldview-motion` active specs if still present (separate housekeeping; see handoff) <!-- id: 207 -->
