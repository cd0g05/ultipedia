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

- [ ] Re-measure baseline on clean `main` (`npx vitest run src/fieldview`, `npm run test:perf`); record counts and perf numbers <!-- id: 1 -->
- [ ] Audit every consumer of `yardToPixel`/`pixelToYard`/`PIXELS_PER_YARD*`/`FIELD_PX_*`/`getStageViewBox`/`STAGE_MARGIN`; list them in Reflect notes <!-- id: 2 -->
- [ ] `render/coords.ts`: horizontal `yardToPixel`/`pixelToYard`; re-derive `STAGE_MARGIN` and `getStageViewBox`; update comments (ADR-28) <!-- id: 3 -->
- [ ] `render/fieldLayer.tsx`: vertical goal lines, brick marks, `FIELD_PX_WIDTH/HEIGHT` swapped back, "ATTACKING →" label <!-- id: 4 -->
- [ ] `render/heatmap.ts`: delete the quarter-turn blit; `fieldPixelSize` swapped back; paint stays allocation-free <!-- id: 5 -->
- [ ] Corner-registration test: heat canvas, goal lines and a piece at yard corners land at the same pixel corners <!-- id: 6 -->
- [ ] `render/pieceLayer.tsx` + `render/tokens.ts`: offense filled dark / defense white ring, numerals in JetBrains Mono, larger radius token, thrower disc, mark direction, focus/selection ring `#be185d`, field line colour; keep ADR-10 <!-- id: 7 -->
- [ ] `ui/FieldCanvas.tsx`: width-bound stage sizing; heatmap canvas inset math from the new margin; `aria-label` "attacks right" <!-- id: 8 -->
- [ ] `pages/FieldStage.tsx` and `render/exportImage.ts` verified against the new orientation (exportImage reads live viewBox) <!-- id: 9 -->
- [ ] Update orientation/token tests: `coords`, `heatmap`, `pick`, `drag`, `exportImage`, `tokensGuard`, relevant parts of `overlay` <!-- id: 10 -->
- [ ] Profiler test (0 commits / 25 pointer moves) and `npm run test:perf` pass; record numbers <!-- id: 11 -->
- [ ] Rendered piece and field look matches the mockup language <!-- NEEDS MANUAL REVIEW --> <!-- id: 12 -->
- [ ] Reflect: update tech-design (Brownfield Notes) with the audit result; full suite green; `tsc -b` clean <!-- id: 13 -->

## Partition: feat/fieldview-ui-frame

- [ ] Extract `SiteHeader` from `encyclopedia/components/Layout.tsx` (Layout renders it unchanged) <!-- id: 20 -->
- [ ] `tailwind.config.js`: add `desktop` screen `(min-width:1280px) and (min-height:640px)` <!-- id: 21 -->
- [ ] `ui/app/FieldViewApp.tsx`: layout route owning `SceneStore`, single `MotionDriverProvider`, selection/scene context; renders `<Outlet/>` <!-- id: 22 -->
- [ ] `router.tsx`: `/fieldview/*` as a sibling of `Layout`; `/fieldview` → `/fieldview/explore`; `explore|watch|build`; keep `/field-view*` redirects and unlinked `/fieldview/designer` <!-- id: 23 -->
- [ ] `ui/app/TopBar.tsx` + `ModeSwitcher` (tabs on desktop, hamburger on compact) <!-- id: 24 -->
- [ ] `ui/app/CompactFrame.tsx`: 56/72 px top bar slots, field slot, drawer mounting <!-- id: 25 -->
- [ ] `ui/app/DesktopFrame.tsx`: `SiteHeader` + app bar, right sidebar slot, dock slot <!-- id: 26 -->
- [ ] `ui/app/MenuDrawer.tsx`: modes, Back to Ultipedia, How to read the colours, Colour-blind mode switch (no "More settings" — Advanced is deferred); desktop gear popover holds the same Colour-blind switch <!-- id: 27 -->
- [ ] `ui/app/RotateNotice.tsx`: portrait + narrow viewport, dismissible <!-- id: 28 -->
- [ ] `space/palette.ts`: colour-blind stop set (orange→neutral→blue) and ramp variant; shared stop arrays exported <!-- id: 29 -->
- [ ] `ui/prefs.ts`: `colourBlind`, `defenseFollows`; v2 storage key with read-through that ignores old `on`; validation/clamping tests <!-- id: 30 -->
- [ ] Wire palette to `createHeatmapPainter({ colorize })` from prefs; heat default on <!-- id: 31 -->
- [ ] `ui/content/Legend.tsx` (Closed / Contested / Strong space, gradient from the shared stops) and `ColourGuide.tsx` popover (Escape/outside dismiss, focus return) <!-- id: 32 -->
- [ ] `pages/Build.tsx`: placeholder (desktop dashed regions + card; compact card only); "Soon" badge on the tab <!-- id: 33 -->
- [ ] Tests: routes and redirects <!-- id: 34 -->
- [ ] Tests: frame switch classes; one `FieldCanvas`; one driver <!-- id: 35 -->
- [ ] Tests: legend stops === palette stops; colour-blind toggle changes ramp and legend; stale `on:false` still shows heat <!-- id: 36 -->
- [ ] Tests: rotate notice shows/dismisses; menu keyboard + focus return <!-- id: 37 -->
- [ ] No page scroll and no footer at 844×390, 1180×820, 1440×820 (by-eye in browser pane) <!-- NEEDS MANUAL REVIEW --> <!-- id: 38 -->
- [ ] Footer assumption and dismissible rotate message confirmed with Builder <!-- NEEDS MANUAL REVIEW --> <!-- id: 39 -->
- [ ] Register placeholders from this partition (legend/colour-guide copy, rotate message, Build copy, menu labels, route titles/meta, colour-blind hex values) with `PLACEHOLDER(fieldview-ui-rework):` markers and entries in `docs/fieldview-placeholders.md` <!-- id: 41 -->
- [ ] Reflect: update specs; full suite green; `tsc -b` clean <!-- id: 40 -->

## Partition: feat/fieldview-ui-explore

- [ ] `scene/presets.ts`: curated setups (≥5; Ho stack, Side stack, Clumped added), `PRESET_TAKEAWAYS`, ordered `CURATED_SETUPS`; yard coordinates verified after the flip <!-- id: 50 -->
- [ ] Curated setups are toy/placeholder content: mark each `PLACEHOLDER(fieldview-ui-rework)` and register names, coordinates and takeaways in `docs/fieldview-placeholders.md` (Builder supplies finals) <!-- NEEDS MANUAL REVIEW --> <!-- id: 51 -->
- [ ] `ui/content/SetupList.tsx` (5-up scrolling list, active row) and `SetupChip.tsx` (◀ ▶, ✎ marker) <!-- id: 52 -->
- [ ] `ui/app/SetupSlideOver.tsx` (compact): open/close, Escape, focus return <!-- id: 53 -->
- [ ] Setup switching replaces the scene immediately; ✎ derived from live-vs-loaded comparison; Reset restores <!-- id: 54 -->
- [ ] `ui/content/Options.tsx`: Defense follows switch (desktop sidebar, compact menu) bound to the persisted pref, labelled "coming soon"; **no behaviour** (follow wiring deferred, ADR-33 reserved) <!-- id: 55 -->
- [ ] Test: with the toggle on, dragging an offensive player never moves a defender (no behaviour); pref persists; Profiler 0 commits during a drag still holds <!-- id: 58 -->
- [ ] `ui/content/SelectedPlayerCard.tsx` (desktop): marked by, nearest defender, side of field, moved from start (start-snapshot of the loaded setup) <!-- id: 59 -->
- [ ] Compact selection ring only (no card); selection stays in the store (ADR-12) <!-- id: 60 -->
- [ ] `pages/Explore.tsx` composed in both frames per the mockups (sidebar + dock on desktop) <!-- id: 62 -->
- [ ] Rewrite shell-coupled tests (`bottomSheet`, `shellDesktop`, `shellPanels`, `panelParity`, `responsive`, `pages`, `a11y`, parts of `motionUi`, `motionDriver`, `throwing`, `presetMenu`, `useSelection`) against the new UI or the engine/canvas APIs **before** deleting the shell <!-- id: 63 -->
- [ ] Delete `ui/shell/{ShellLayout,LeftSidebar,RightSidebarSlot,BottomSheet,ToolRibbon,panelRegistry}.ts(x)`, `ui/shell/panels/*`, `pages/Whiteboard.tsx`, `ui/PresetMenu.tsx`, `shellGuard.test.ts`; keep `sceneStore.tsx`, `useSelection.ts`, `throwMode.ts` <!-- id: 64 -->
- [ ] Engines for throw, cuts, force, matchups, marquee, selection still pass their tests; `tsc -b` clean <!-- id: 65 -->
- [ ] Setups (placeholder content) reviewed on a deployed preview for layout and feel <!-- NEEDS MANUAL REVIEW --> <!-- id: 66 -->
- [ ] Reflect: update specs and backlog; full suite + `test:perf` green <!-- id: 67 -->

## Partition: feat/fieldview-ui-watch

- [ ] `play/format.ts` + `play/validate.ts`: optional `PlayKeyframe.label` (additive, length-capped, unknown keys still dropped); tests <!-- id: 80 -->
- [ ] `play/plays.ts` registry + `play/builtin/*.json`; invalid files skipped and reported; ≥3 placeholder plays incl. one ≥5-frame play for development <!-- id: 81 -->
- [ ] Toy plays (and frame labels) are placeholder content: mark with `"_placeholder": true` / `PLACEHOLDER(fieldview-ui-rework)` and register in `docs/fieldview-placeholders.md`; Builder later authors finals via the unlinked `/fieldview/designer` (exported JSON) <!-- NEEDS MANUAL REVIEW --> <!-- id: 82 -->
- [ ] `ui/playback/playback.ts`: next/prev/goto/play/pause/speed/loop; animates between keyframes with `samplePositions`; fixed-timestep accumulator; imperative store writes; reduced motion jumps; never mutates play data <!-- id: 83 -->
- [ ] Tests: stepping, play to end, loop, goto, speed, reduced motion, play data immutability; Profiler 0 commits per animation frame <!-- id: 84 -->
- [ ] `ui/playback/usePlayback.ts` structural hook (frame index, status) <!-- id: 85 -->
- [ ] `ui/content/Transport.tsx` + progress dots (jump on tap) <!-- id: 86 -->
- [ ] `ui/content/Filmstrip.tsx`: 4-up, horizontal scroll, static thumbnails rendered once per play <!-- id: 87 -->
- [ ] `ui/content/PlayList.tsx`: 5-up scrolling list; compact play selector (slide-over reuse) <!-- id: 88 -->
- [ ] `ui/content/PlaybackOptions.tsx`: speed 0.5×/1×/2×, loop, trails (trails reuse `routeLayer` if feasible) <!-- id: 89 -->
- [ ] `pages/Watch.tsx` composed in both frames per the mockups; Watch is read-only (drag disabled) <!-- id: 90 -->
- [ ] Tests: invalid play does not crash; filmstrip/list overflow behaviour; keyboard operation of transport <!-- id: 91 -->
- [ ] Watch feels right on a phone and a laptop with the curated plays <!-- NEEDS MANUAL REVIEW --> <!-- id: 92 -->
- [ ] Reflect: update specs and backlog; full suite + `test:perf` green <!-- id: 93 -->

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
