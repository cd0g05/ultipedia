# Field View — UI Rework Implementation Plan

Status: **approved by Builder 2026-10-03 — decisions D1–D9 resolved (§5); Cicadas drafts in `.cicadas/drafts/fieldview-ui-rework/`** · written 2026-10-03 · supersedes the Designer-v2-next ordering in
`.cicadas/drafts/fieldview-roadmap.md` (that file is the older plan; this one is the current direction).

Source of truth for *what it should look like*:

- `design/fieldview-watch-explore-mockup.html` — phone/tablet (landscape), approved layout + styling
- `design/fieldview-desktop-mockup.html` — desktop Explore / Watch / Build placeholder, approved
- `style-guide/design.md` — "Light Film Room" system the styling follows
- `docs/fieldview-backlog.md` — MVP / stretch / decisions log

Source of truth for *what exists*: `frontend/src/fieldview/` and `.cicadas/canon/modules/fieldview.md`
(ADR-1…27).

## 1. Goal and scope

Replace the current Field View **presentation layer** (three-pane shell, bottom sheet, tool ribbon,
two pages) with the approved Watch / Explore / Build layouts, on phone, tablet and desktop. The
space model, motion model, scene model and play format stay as they are.

**In scope (MVP):** Explore and Watch, fully working on phone / tablet / desktop; Build as a
placeholder tab; colour-blind mode; curated presets and plays; restyle to the Light Film Room system.

**Out of scope:** the Build/designer itself, share-by-link, accounts, offline/PWA, coach-authored
presets, captions, any change to the space or motion algorithms (see §4 for the two small places the
UI needs a thin new *wiring* of existing algorithm code).

Baseline measured today: `npx vitest run src/fieldview` → **46 files, 671 tests, all green** — with
the uncommitted work in the tree (see Phase 0).

## 2. What exists today (inventory and verdict)

Verdicts: **KEEP** untouched · **MODIFY** reuse with edits · **REPLACE** new implementation ·
**RETIRE** delete once replaced.

### 2.1 Model layers — KEEP (this is the "algorithm stuff")

| Area | Files | Verdict | Notes |
|---|---|---|---|
| Space model | `space/*` (score, layers, explain, palette, constants, math, types) | **KEEP** | Pure, ADR-1. Only `palette.ts` gains a second ramp (colour-blind). |
| Motion model | `motion/*` (step, pursuit, kinematics, route, simulate, disc, constants) | **KEEP** | Pure, ADR-22. Used for Defense-follows (§4.2). |
| Scene model | `scene/*` (store, scene, selection, possession, matchups, force, field, presets, presetRegistry/Format) | **KEEP** | `presets.ts` gains new curated presets + takeaway text (§4.5). `selection.ts` is reused by the selected-player card. |
| Play format | `play/*` (format, validate, backfill, serialize, tween, modeHandoff) | **KEEP** | Watch consumes `PlayFile` keyframes through `tween.ts`. |
| Motion driver | `ui/motion/*` (driver, driverContext, motionMode, useMotionRun) | **KEEP** | One driver per store, mounted once (ADR-26). |
| Prefs store | `ui/prefs.ts` | **MODIFY** | Add `colorBlind`; change default of `on` (heatmap) to true; keep validation/clamping. |

### 2.2 Rendering — the one real structural change

| File | Verdict | What changes |
|---|---|---|
| `render/coords.ts` | **MODIFY (core)** | Today the field is **vertical, attacking up** (ADR-11). New design is **horizontal, attacking right**. `yardToPixel`/`pixelToYard` become near-identity; `LATERAL_STRETCH` (exists only on the checkpoint branch; `main` has none) is not carried forward — a 110×40 field is already wide; `STAGE_MARGIN` and `getStageViewBox` get re-derived. ADR-11 promised orientation lives *only* here, so the blast radius should be small — verify with the grep in Phase 1. |
| `render/fieldLayer.tsx` | **MODIFY** | Goal lines become vertical, brick marks reposition, `FIELD_PX_WIDTH/HEIGHT` swap back. Add "ATTACKING →" label in the new style (the arrow/label was removed in the uncommitted work). |
| `render/heatmap.ts` | **MODIFY** | Delete the quarter-turn rotation in `paint()` (the grid is already horizontal in yard space); `fieldPixelSize` swaps back. Painter already takes a `colorize` option → colour-blind palette is a parameter, as the code comment anticipates. |
| `render/pieceLayer.tsx`, `render/tokens.ts` | **MODIFY** | New piece language: offense = filled dark, defense = white with ring (not hue); larger radii (see below); selection ring `#be185d`; `FIELD_TOKENS` line colour/label per style guide. `tokensGuard.test.ts` pins the "all visuals in tokens.ts" rule — keep that rule, update the values. ADR-16 ("shell and canvas keep separate accents") is **resolved** by unifying on `#be185d`. |
| `render/pick.ts`, `render/exportImage.ts`, `render/routeLayer.tsx` | **KEEP / light touch** | `pick.ts` is pure yard-space (grab distance is deliberately independent of visuals). It needs a touch-aware grab radius (§4.6). |

**Piece size is a real number problem.** Pieces are SVG user units; the stage scales to fit. On an
844-px-wide phone the 904-unit-wide stage scales ≈0.93, so today's 7.5-unit radius draws a ~14 px
dot. The approved mockup uses ~22 px. Plan: radius ≈ 11–12 units, then judge on a real phone.

### 2.3 Canvas and interaction — KEEP, with additions

`ui/FieldCanvas.tsx` (925 lines) owns pointer handling, the frame loop, heatmap painting, marquee,
waypoint drag, throw-click, and keyboard nudge — all under ADR-2 (React never in the pointer path).
**KEEP the engine; MODIFY at the edges:**

- `fitHeight` / stage sizing: becomes width-bound landscape sizing (the field is 2.75:1; it is width-
  limited on every target device).
- Touch drag gets the approved "lifted piece + ghost at origin" treatment (§4.6). Must be written
  imperatively like `drawMarquee`.
- `aria-label` text ("Offense attacks up the field") → "attacks right".
- Marquee, throw-click and waypoint drag stay in the engine but have **no UI entry point** in the
  approved layouts (see Decision D2).

### 2.4 Shell and pages — REPLACE / RETIRE

| File | Verdict | Replacement |
|---|---|---|
| `pages/Whiteboard.tsx` (318 lines) | **REPLACE** | `pages/Explore.tsx`. Reuse its preset load/replace-confirm logic only if user presets stay (D3); otherwise it collapses to "pick a curated setup". |
| `pages/Designer.tsx`, `ui/Timeline.tsx`, `ui/PlayMeta.tsx`, `ui/OverlayRail.tsx`, `ui/AdvancedPanel.tsx` (the old rail) | **KEEP, unlinked** | Becomes the internal **authoring tool** for curated Watch plays (§4.3) until Build exists. Not in the nav. `AdvancedPanel.tsx` is also reused for the new Advanced section. |
| `pages/FieldStage.tsx` | **MODIFY** | Static stage used by the old Designer; follows the coords change automatically. |
| `ui/shell/ShellLayout.tsx`, `LeftSidebar.tsx`, `RightSidebarSlot.tsx`, `BottomSheet.tsx`, `ToolRibbon.tsx`, `throwMode.ts`* | **RETIRE** | Replaced by the new frame (§3). *`throwMode.ts` is shared with the driver/canvas — keep the module, drop the ribbon. |
| `ui/shell/panelRegistry.ts` + `panels/*` (Offense, Defense, Mark, DefaultVisibility, panelChrome) | **RETIRE chrome, harvest content** | Selected-player card replaces Offense/Defense panels. `AdvancedSettingsPanel` content is reused. Mark/Force panel markup is harvested if D2 surfaces force controls. ADR-13/14 are superseded (nothing left to register). |
| `ui/shell/useSelection.ts`, `sceneStore.tsx` | **KEEP** | Selection stays in the store (ADR-12); panels reach the store via context. |
| `ui/PresetMenu.tsx` | **RETIRE (for now)** | Save/rename/delete/import/export UI is out of MVP (D3, curated presets only). Registry code stays dormant. |
| `ui/CellReadout.tsx`, `ui/useFullscreen.ts` | **KEEP** | Readout stays screen-reader-only (colour is never the sole carrier of meaning). Fullscreen/Present is dropped from the MVP UI (D6); the hook stays as a catalogued, unsurfaced feature. |
| `encyclopedia/components/Layout.tsx` | **MODIFY** | See §3.1 — the site header/footer wrap `/fieldview` today. |
| `router.tsx` | **MODIFY** | New mode routes + redirects (§3.1). |
| `index.css` | **MODIFY** | `.fv-stage:fullscreen`, piece focus rules stay; drop shell-only rules. |

### 2.5 Tests

46 files / 671 tests. Roughly:

- **Untouched (≈30 files):** `space-model`, `spaceBench/Guard`, `kinematics`, `pursuit`, `route`,
  `simulate`, `step`-related, `motionBench/Guard`, `disc`, `force`, `matchups`, `possession`, `scene`,
  `store`, `selection`, `play`, `playFormatV2`, `presetFormat/Registry`, `vec`, `modelGuard`.
- **Updated for orientation/tokens (≈6):** `coords`, `heatmap`, `pick`, `drag`, `exportImage`,
  `tokensGuard`, parts of `overlay`.
- **Rewritten or deleted with the shell (≈17 touch it):** `bottomSheet`, `shellDesktop`,
  `shellPanels`, `shellGuard`, `panelParity`, `responsive`, `router`, `pages`, `a11y`, `designer`
  (only if the old designer is touched), `useSelection`, parts of `motionUi`, `motionDriver`,
  `throwing`, `presetMenu`.
- **Preserve on purpose:** the Profiler "0 React commits during drag" test and the frame-budget
  benches (`test:perf`). They are the guardrails for the thing most likely to regress.

## 3. Target architecture

### 3.1 Routes and the site chrome

- The encyclopedia `Layout` wraps `/fieldview` today: a 64 px sticky header (plus a second nav row
  below `lg`) and a footer. **Decision D8:** the site header stays on **desktop** and goes away on
  **compact** (phone/tablet) screens, where a 390-px-tall landscape phone cannot spare it; there the
  "back to Ultipedia" link lives in the hamburger menu. Mechanically: Field View gets its own
  full-viewport shell (`h-dvh`, no footer) that renders the site header only in the desktop frame
  (CSS-only, same switch as §3.3), so no second `Layout` instance and no JS media query. The Field
  View bar sits under the site header on desktop (two bars; merging them is a possible later polish).
- Routes: `/fieldview` → redirect to `/fieldview/explore` (MVP default; **recommendation**: Explore
  first since it is the MVP's hero — see D5); `/fieldview/watch`; `/fieldview/explore`;
  `/fieldview/build` (placeholder). Mode-as-route keeps share-by-link possible later
  (`/fieldview/watch?play=…`) and makes the tabs real links.
- Preserve redirects: `/field-view*` → `/fieldview*`. `/fieldview/designer` stays reachable but
  unlinked (internal authoring tool).
- `sitemap`/helmet: add `Seo` for the new routes if the site's convention requires it.

### 3.2 Component tree (one content set, two chromes)

The lesson of ADR-14 stands: **never fork the content between phone and desktop**. Shared content
components, two presentational frames:

```
FieldViewApp (mounted once; owns store, motion driver, prefs)
├─ Stage            FieldCanvas (rendered exactly once — ADR-15)
├─ shared content   SetupList · PlayList · Legend(+ColourGuide popover) · SelectedPlayerCard
│                   OptionsList (Defense follows) · PlaybackOptions · AdvancedSettings
│                   TransportControls · Filmstrip · ModeSwitcher
├─ CompactFrame     (phone + tablet) top bar · hamburger drawer · setup slide-over
└─ DesktopFrame     (laptop+) top bar with tabs · right sidebar · dock under field
```

Both frames are in the DOM and **CSS picks one** (ADR-15 continues). Hard rule carried over:
`FieldCanvas` is a single instance, never inside a `display:none` branch.

### 3.3 Breakpoints

Today: one switch at `lg` (1024). New rule, still CSS-only:

- **Compact frame** (phone + tablet, per the approved decision that tablet reuses the phone layout).
- **Desktop frame** when width ≥ ~1280 **and** height ≥ ~640 — add a named Tailwind screen
  (`desktop`) so the rule is one token. 1024–1279-wide devices (iPad landscape) get Compact.
- Portrait phone: show a "rotate your phone to landscape" message (CSS `orientation: portrait` +
  narrow width); **no vertical-field mode** (D4).
- All numbers are first guesses — Outstanding in canon already says the 1024 breakpoint was never
  validated on a real tablet; this plan must not repeat that. Phase 6 includes a real-device pass.

### 3.4 State

Unchanged principles (ADR-2/12/25/26): scene, selection and motion state live in external stores;
React state carries only structural UI (which drawer is open, current mode). New small state:

- current play + frame index (Watch) — structural, React/URL state is fine; per-frame positions are
  written to the store imperatively.
- `colorBlind` in `prefs.ts` (persisted, validated on read like the rest).

## 4. Gaps: what the mockups imply that does not exist yet

These are the places "the algorithm is already in place" needs a footnote. None is a model change,
but each is real work.

### 4.1 Orientation flip (vertical → horizontal)
Covered in §2.2. Highest-risk item: touches coords, field layer, heatmap blit, piece layer,
`pick`/drag tests, export. De-risk first (Phase 1) behind the existing tests.

### 4.2 "Defense follows" toggle has no live meaning today
Today a defender moves only when a *route is run* (click a destination → Run). Nothing moves a
defender while you **drag** an offensive player. The toggle in the mockups implies: drag an
attacker, the assigned defender trails. Two options:

1. **(Recommended)** While dragging with the toggle on, run the existing `pursuit` stepper for the
   marked defender toward the cushion point of the dragged player (headless `step()` per frame via
   the driver, writing through the store — no new physics, honours ADR-22/26).
2. Reinterpret the toggle as "run routes automatically" — doesn't match the mockup's intent.

Needs a small design note on feel (reaction delay while dragging at arbitrary speed) — flagged for
the client review the canon already calls out.

### 4.3 Watch has no content and no player
- **No built-in plays exist** (only 4 presets). Watch needs a registry of curated `PlayFile`s
  (JSON in `scene/` or `play/`, validated at load by `validate.ts`).
- Frames = keyframes. Prev/next = animate between consecutive keyframes via `tween.ts`/
  `samplePositions`; play/pause runs through them; "scroll for frames 5+" is UI only. Needs a small
  `usePlayback` hook + a clock (reuse the driver's fixed-timestep accumulator or a simpler rAF — decide
  in Phase 4; per-frame store writes stay imperative).
- **Authoring path for the curated plays:** use the existing, unlinked `/fieldview/designer`
  (continuous timeline) to export `PlayFile` JSON; commit the files. Keyframe spacing becomes the
  frame boundaries. Zero new tooling.
- Per-play frame labels ("Cut under", "Clear") aren't in the format. Either omit for MVP (just
  "Frame 3") or add optional `PlayKeyframe.label` — format is additive-safe (ADR-7).

### 4.4 Colour guide, legend and colour-blind palette
- The mockup legend says **Tight … Open**; the real model's old legend said **Closed / Contested /
  Strong space**, and the ramp encodes *strong space for the offense*, not distance to a defender.
  **Legend wording must match the model's semantics** — decided (D7): use the existing terms
  **Closed / Contested / Strong space**, sourced from `space/constants.ts`/`explain.ts`, not from the
  mockup's "Tight / Open".
- Add a second palette to `space/palette.ts` (orange → neutral → blue) and thread it through
  `createHeatmapPainter({ colorize })`; legend gradient reads the same stops so they cannot drift.
- Tappable legend → colour-guide popover (new component).
- Heatmap becomes **always on** in Explore/Watch (today `prefs.on` defaults to false and is toggled
  from the ribbon). Keep the pref for Advanced ("Show heat") but default true.

### 4.5 Curated presets with takeaways
- Mockups show 5 setups (Vertical stack, Horizontal stack, Ho stack, Side stack, Clumped). Code has
  4 (`vertStackForceSide`, `horizontalStack`, `flatMark`, `deepHelp`) with `PRESET_LABELS` only.
- Needs: more presets authored by Builder (coordinates are a first pass per canon), plus a
  `PRESET_TAKEAWAYS` (one line each) alongside `PRESET_LABELS`. Presets must be reoriented if any
  were authored assuming the vertical field (they are in yards, so they shouldn't — verify).
- "✎ custom" marker needs a definition (backlog open question): proposal — show ✎ when the live
  scene differs from the loaded preset (`scenesEqual` already exists in `Whiteboard.tsx`).

### 4.6 Touch ergonomics
- Lifted piece + dashed ghost + connector, imperative (modelled on `drawMarquee`); only for
  `pointerType === "touch"`.
- `pick.ts` grab radius is in yards; at phone scale (~7.7 px/yd) it must be ≥ ~44 px on touch.
  Make it scale-aware without changing mouse feel (its own header says visual radii must never change
  grab feel — extend that rule to "scale must not shrink touch targets").
- Safe-area insets (`env(safe-area-inset-*)`) on the top bar and drawers.
- Fixed-height, no page scroll: `h-dvh`, `touch-action: none` already on the stage.

### 4.7 Selected-player card
Rows in the mockup: Marked by · Nearest defender · Side of field · Moved from start.
Available from existing code: `guardedBy` (matchups), `nearestDefender` (possession), the space
model's `explain.ts`. New: "Side of field" (derive from lateral y vs midline / force side) and
"Moved from start" (needs a snapshot of the loaded preset positions — `lastLoadedSnapshot` pattern).
Phone has **no** card (ring only), per the approved layout.

## 5. Decisions (resolved 2026-10-03)

| # | Decision | Resolution |
|---|---|---|
| D1 | The uncommitted vertical-field working tree | **Parked.** Committed on branch `checkpoint/fieldview-vertical-tuning` (`d2e4836`, 28 tracked files, suite green at 671 tests) as a restore point, then back to a clean `main`. Not pushed. The new work branches from clean `main`. Untracked files (`Field View UI Ideas - Gemini.html`, `fonts/Arena Font/`, `fonts/Druk_Collection/`) were deliberately **not** committed — the two font folders are not licensed for web distribution. |
| D2 | Features with no home in the approved layouts (throw, marquee, force/mark, matchup reassign, cuts/routes) | **Out of the MVP UI.** Engine, code and tests are retained. Each is catalogued in `docs/fieldview-backlog.md` → "Built but not surfaced" with file pointers, so they can be re-attached quickly later. |
| D3 | User-saved presets (save/rename/delete/import/export) | **Future feature**, not in the first version (still needed eventually). Registry code stays dormant; `PresetMenu` UI is retired for now. |
| D4 | Portrait phone | **Tell the user to rotate to landscape.** No vertical-field mode. |
| D5 | Default route | **Explore.** `/fieldview` redirects to `/fieldview/explore`. |
| D6 | Present / fullscreen button | **Dropped** — the default layout is meant to be enough. Not surfaced in any menu; `useFullscreen.ts` is catalogued as "built but not surfaced". |
| D7 | Legend / colour-guide wording | **Use the model's existing terms: Closed / Contested / Strong space** (not the mockups' "Tight / Open"). |
| D8 | Site header | **Desktop:** the Ultipedia site header stays visible above the Field View bar. **Phone/tablet (compact):** no site header on screen; the link back to the site lives in the hamburger menu. Footer is assumed omitted in the full-viewport app on every device — confirm at review. |
| D9 | Process | **Run as a Cicadas initiative: `fieldview-ui-rework`.** It supersedes ADR-11/13/14/15/16 of the fieldview canon. Preferences: doc-sourced, review-at-end, no PRs. |
| D10 | Defense-following behaviour (added 2026-10-03) | **On hold** until the rest is done; the toggle and persisted pref ship as a "coming soon" stub. Tracked in the backlog; ADR-33 reserved. |
| D11 | Advanced settings (added 2026-10-03) | **Do later**; not in the MVP UI. Eventual home: the open space under the Explore field. |
| D12 | Placeholders (added 2026-10-03) | Toy content allowed; every placeholder marked in code and registered in `docs/fieldview-placeholders.md`; reconciled in the P5 audit. |

Consequences folded into the rest of this plan: §3.1 (header per frame), Phase 5 (no Present item),
§4.4 (legend terms), §2.4 (PresetMenu/useFullscreen verdicts).

## 6. Phased plan

Each phase ends green: `npx vitest run` and `tsc -b`, plus the perf benches where noted.

**Phase 0 — Housekeeping (before any UI code)**
- D1 done: vertical-tuning work parked on `checkpoint/fieldview-vertical-tuning`. Create the initiative branch from clean `main` at kickoff.
- Record baseline: test count (671), `test:perf` numbers.
- Confirm unknowns with greps: every consumer of `yardToPixel`/`pixelToYard`/`PIXELS_PER_YARD*`/
  `FIELD_PX_*`; every test pinning vertical orientation.
- Fonts: confirm `frontend/public/fonts` has Archivo Black + JetBrains Mono only. Do **not** commit
  `fonts/Arena Font/` or `fonts/Druk_Collection/` (licence rule in the style guide).

**Phase 1 — Horizontal field + new piece language (render layer only)**
- `coords.ts` → horizontal; drop `LATERAL_STRETCH`; new `STAGE_MARGIN`/viewBox.
- `fieldLayer.tsx`, `heatmap.ts` (remove rotation), `FieldStage.tsx`.
- `tokens.ts`: piece fill/ring/radius, field lines, selection ring `#be185d`, "ATTACKING →".
- Update the ~6 orientation/token tests. Add a test pinning "heat grid registers with field markings"
  at all four corners (the bug the rotation comment describes).
- *Acceptance:* the existing whiteboard still works, now horizontal; Profiler test still 0 commits;
  `test:perf` within the previous budget.

**Phase 2 — App frame, routes, breakpoints**
- Mount Field View outside `Layout`; mode routes + redirects; `desktop` Tailwind screen.
- `FieldViewApp` (store, driver, prefs, selection context); `CompactFrame` / `DesktopFrame` skeletons
  with the approved top bars (mode switcher, legend, gear/hamburger). Hamburger drawer; rotate hint.
- Retire `ShellLayout`/`LeftSidebar`/`RightSidebarSlot`/`BottomSheet`/`ToolRibbon` and their tests
  as their replacements land (not before).
- *Acceptance:* all three mode URLs render the field in both frames; no site header/footer; no page
  scroll at 844×390, 1180×820, 1440×820; `FieldCanvas` mounted exactly once (test).

**Phase 3 — Explore**
- Shared content: `SetupList` (+ takeaways), setup chip with ◀ ▶, `Legend` + colour-guide popover,
  `OptionsList` (Defense follows), `AdvancedSettings` (harvest `AdvancedPanel`), `SelectedPlayerCard`
  (desktop), reset.
- Heat always on; colour-blind pref + second palette + legend sync.
- Defense-follows wiring (§4.2). New curated presets + takeaways (§4.5).
- *Acceptance:* matches `fieldview-desktop-mockup` Explore and the phone Explore/menu/setup frames;
  drag → heat repaints with 0 React commits; toggling colour-blind changes ramp and legend together.

**Phase 4 — Watch**
- Curated plays (author via the old designer, commit JSON, validate at load).
- `usePlayback` + transport (prev/play-pause/next), progress dots, desktop filmstrip (4-up,
  scrolls), play list (5-up, scrolls), speed/loop/trails.
- Frame labels decision (§4.3). Trails reuse `routeLayer` if feasible.
- *Acceptance:* a 6-frame play steps and plays on phone and desktop; scrubbing never mutates the
  curated play data; reduced-motion respected (ADR-27).

**Phase 5 — Build placeholder + settings**
- `/fieldview/build` placeholder per the desktop mockup (card + dashed regions on desktop; simple
  card on compact). "Soon" badge on the tab.
- Settings: colour-blind mode, Advanced entry, About/how-to-read link.

**Phase 6 — Touch, mobile polish, QA**
- Lifted-piece touch drag, scale-aware touch grab radius, safe-area insets.
- **Real-device pass**: phone landscape, tablet landscape, laptop. Tune piece radius, hit targets,
  breakpoint numbers. Capture findings in canon "Outstanding".
- a11y: keyboard reachability of the sidebar/drawer, focus management, axe test (`a11y.test.tsx`).

**Phase 7 — Cleanup and canon**
- Delete retired files/tests; remove dead exports; update `tokensGuard`/`shellGuard` equivalents
  into a new frame guard (e.g. "FieldCanvas rendered once", "no content forks between frames").
- Update `.cicadas/canon/modules/fieldview.md` (supersede ADR-11/13/14/15/16; add new ADRs: frame
  split, Watch playback, Defense-follows wiring), `summary.md`, and `docs/fieldview-backlog.md`.

### Dependency sketch

```
P0 → P1 → P2 → ┬─ P3 (Explore) ─┐
               └─ P4 (Watch)  ──┴→ P5 → P6 → P7
```
P3 and P4 are independent after P2 (shared content components land in P2/P3 first; Watch reuses
`Legend`, `ModeSwitcher`, frames). They can be separate partitions.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Orientation flip leaves a stale rotation somewhere (heat misregistered, drag inverted) | Do it first, alone; corner-registration test; keep ADR-11's "only coords.ts" rule honest by grep in Phase 0 and again in Phase 7. |
| Piece size/hit-area wrong on real phones | Tokens + one grab-radius function; real-device pass in Phase 6, not before merge ("merged ahead of review" has happened three times — this plan puts the review inside the initiative). |
| Dropping panels silently drops shipped features (throw, force, cuts) | D2 makes it explicit; engine + tests retained so it is a UI re-attach later, not a rewrite. |
| Defense-follows feels wrong while dragging | Reuse tuned pursuit; expose tunables (already sliders); flag for review. |
| Both frames in DOM double-mount something stateful | Single `FieldViewApp` owns stores/driver; guard test for one canvas, one driver. |
| Legend copy teaches the wrong thing | Derive copy from model terms (D7); review with a coach. |
| Large test rewrite hides regressions | Keep the model tests untouched; keep Profiler + perf benches; rewrite shell tests against the new frames rather than deleting coverage. |

## 8. Definition of done (MVP)

- `/fieldview` opens Explore; Watch and Build tabs work (Build = placeholder).
- Phone landscape, tablet landscape, laptop all match the approved mockups in layout.
- Drag players on touch and mouse; heat repaints live; Defense follows works; presets switch.
- Watch plays a curated multi-frame play with prev/next/play and a scrolling frame strip.
- Colour-blind mode available; legend explains the colours in the model's own terms.
- Tests green (model tests untouched), Profiler 0-commit drag test and perf budgets intact.
- Canon and backlog updated; retired shell code gone.
