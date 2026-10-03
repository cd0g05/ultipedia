---
summary: "Five partitions. P1 render (horizontal field, tokens, piece language, heat registration) has no dependencies and ships alone because the orientation flip is the riskiest change. P2 frame (routes, FieldViewApp, compact + desktop frames, menu, legend + colour-blind, rotate notice, Build placeholder) depends on P1 and lands every shared chrome piece so P3 and P4 can run in parallel on disjoint files. P3 explore (setups, selected-player card, a stub Defense-follows toggle, and retirement of the old shell) and P4 watch (curated plays, playback controller, transport, filmstrip, play list) both depend on P2. P5 touch/QA/cleanup (lifted-piece touch drag, scale-aware grab radius, safe areas, real-device pass, frame guard, dead-code sweep) depends on P3 and P4. No PRs at any boundary; direct merges."
phase: "approach"
when_to_load:
  - "When starting a registered feature branch for fieldview-ui-rework or checking partition scope."
depends_on:
  - "prd.md"
  - "ux.md"
  - "tech-design.md"
modules:
  - "frontend/src/fieldview"
  - "frontend/src/router.tsx"
  - "frontend/src/encyclopedia/components/Layout.tsx"
  - "frontend/tailwind.config.js"
index:
  strategy: "## Strategy"
  partitions: "## Partitions (Feature Branches)"
  sequencing: "## Sequencing"
  migrations_compat: "## Migrations & Compat"
  risks: "## Risks & Mitigations"
  alternatives: "## Alternatives Considered"
next_section: "Strategy"
---

# Approach: fieldview-ui-rework

## Strategy

Split along risk and file-disjointness. **Orientation first and alone** (P1): it touches every render
path and is the change most likely to leave a quiet inversion bug, so it ships behind the existing
tests with a new corner-registration test before any new UI exists. **Frame second** (P2): every
piece of shared chrome — routes, `FieldViewApp`, both frames, the menu, the legend and the
colour-blind palette — lands once, so the two mode partitions never edit the same files.
**Explore ∥ Watch** (P3, P4) are independent: Explore owns setups, the selected-player card, the
Defense-follows toggle stub and the retirement of the old shell; Watch owns plays, playback and the filmstrip.
**Touch / QA / cleanup last** (P5): touch ergonomics and the real-device pass need the finished UI to
mean anything, and "merged ahead of review" has happened three times in this module — so the review
is inside the initiative.

Interim state on the initiative branch is allowed to be visually rough (e.g. the old Whiteboard page
between P1 and P3); nothing merges to `main` until P5 passes.

No PRs at any boundary (Builder's standing preference): every partition merges directly into
`initiative/fieldview-ui-rework`, which merges directly to `main` after Builder approval.

## Partitions (Feature Branches)

### Partition 1: Render → `feat/fieldview-ui-render`
**Modules**: `frontend/src/fieldview/render/*`, `pages/FieldStage.tsx`, `ui/FieldCanvas.tsx` (sizing + aria only), `tests/{coords,heatmap,pick,drag,exportImage,tokensGuard,overlay}`
**Scope**: Horizontal `yardToPixel`/`pixelToYard`; `STAGE_MARGIN`/viewBox; `FIELD_PX_*` swap; `fieldLayer` (vertical goal lines, bricks, ATTACKING label); `heatmap.ts` with the rotation removed; new piece language and radius; tokens (pieces, field lines, selection `#be185d`); width-bound stage sizing; corner-registration test.
**Dependencies**: None

#### Artifact Type
library

#### How to Run
- start: N/A — verify via `cd frontend && npx vitest run src/fieldview`
- teardown: N/A

#### Acceptance Criteria
- [ ] `yardToPixel`/`pixelToYard` round-trip and map `(x=0,y=0)` to the field's left-top and `(x=110,y=40)` to right-bottom
- [ ] Heat canvas, goal lines and pieces register at all four corners (test)
- [ ] Profiler test: 0 React commits across 25 pointer moves still passes
- [ ] `npm run test:perf` within the pre-rework budget
- [ ] `tokensGuard` passes with the new values; no stray hex outside `tokens.ts`
- [ ] Piece rendering matches the mockup language on a rendered page <!-- NEEDS MANUAL REVIEW -->

#### Implementation Steps
1. Audit consumers of the coords helpers (grep) and record in Reflect.
2. coords → fieldLayer → heatmap → pieceLayer/tokens → FieldCanvas sizing.
3. Update/replace orientation-pinned tests; add corner-registration test.

### Partition 2: Frame → `feat/fieldview-ui-frame`
**Modules**: `ui/app/*`, `ui/content/{Legend,ColourGuide}`, `ui/prefs.ts`, `space/palette.ts`, `render/heatmap.ts` (palette wiring), `pages/Build.tsx`, `router.tsx`, `encyclopedia/components/Layout.tsx` (extract `SiteHeader`), `tailwind.config.js`, frame tests
**Scope**: `FieldViewApp` layout route (store, driver, prefs, selection context); routes + redirects; `desktop` screen; `CompactFrame`/`DesktopFrame` with `TopBar`, `MenuDrawer`, mode tabs; `SiteHeader` extraction and desktop-only use; `RotateNotice`; `Legend` (Closed/Contested/Strong) + `ColourGuide` popover; colour-blind palette + pref; prefs v2 key; heat default on; Build placeholder page.
**Dependencies**: Requires Partition 1

#### Artifact Type
web-ui

#### How to Run
- start: `cd frontend && npm run dev`
- ready-check: `GET http://localhost:5173/fieldview` redirects to `/fieldview/explore`
- teardown: `Ctrl+C`

#### Acceptance Criteria
- [ ] `/fieldview` → `/fieldview/explore`; `/field-view*` still redirect; `/fieldview/designer` still renders
- [ ] No page scroll at 844×390, 1180×820, 1440×820; no site footer
- [ ] Desktop frame shows the site header; compact frame does not and its menu links back to Ultipedia
- [ ] `FieldCanvas` mounted exactly once; exactly one motion driver (test)
- [ ] Toggling colour-blind mode changes the painted ramp and the legend together (test: legend stops === palette stops)
- [ ] A stored old `fieldview.overlayPrefs` with `on:false` still yields visible heat (test)
- [ ] Portrait narrow viewport shows a dismissible rotate message
- [ ] Frames match mockups' layout <!-- NEEDS MANUAL REVIEW -->

#### Implementation Steps
1. Router + `FieldViewApp` + `desktop` screen + `SiteHeader` extraction.
2. Frames, top bar, drawer, rotate notice, Build placeholder.
3. Palette + prefs + legend + colour guide.

### Partition 3: Explore → `feat/fieldview-ui-explore`
**Modules**: `pages/Explore.tsx`, `ui/content/{SetupList,SetupChip,Options,SelectedPlayerCard}`, `ui/app/SetupSlideOver.tsx`, `scene/presets.ts`, retire `ui/shell/{ShellLayout,LeftSidebar,RightSidebarSlot,BottomSheet,ToolRibbon,panelRegistry,panels/*}`, `pages/Whiteboard.tsx`, `ui/PresetMenu.tsx`, and their tests
**Scope**: Curated setups + takeaways (placeholders, registered); setup chip/list/slide-over; ✎ custom + Reset; Defense-follows **toggle stub** (pref only, "coming soon"); selected-player card (desktop) / ring (compact); Explore page in both frames; deletion of the old shell once replaced. **Deferred out of this partition:** defense-following behaviour, Advanced settings.
**Dependencies**: Requires Partition 2

#### Artifact Type
web-ui

#### How to Run
- start: `cd frontend && npm run dev`
- ready-check: `GET http://localhost:5173/fieldview/explore` renders a field with heat
- teardown: `Ctrl+C`

#### Acceptance Criteria
- [ ] ≥5 curated setups, each with a takeaway; ◀ ▶ cycles; switching replaces the scene; ✎ appears after a drag; Reset restores
- [ ] The Defense-follows toggle persists its pref and is labelled "coming soon"; dragging an offensive player never moves a defender in this initiative (test)
- [ ] Profiler: 0 React commits during a drag still holds
- [ ] Desktop selected-player card shows the four rows for a selected player; compact shows a ring
- [ ] Old shell files and Whiteboard are deleted; `tsc -b` clean; engines for throw/cuts/force/matchups/marquee still pass their tests
- [ ] Setups feel like the labels say <!-- NEEDS MANUAL REVIEW -->

#### Implementation Steps
1. Presets/takeaways; list/chip/slide-over; ✎/Reset.
2. Options toggle stub (pref only).
3. Selected-player card; compose Explore in both frames.
4. Retire the old shell, rewrite shell-coupled tests against the new UI or the engine APIs.

### Partition 4: Watch → `feat/fieldview-ui-watch`
**Modules**: `pages/Watch.tsx`, `ui/content/{PlayList,PlaybackOptions,Transport,Filmstrip}`, `ui/playback/*`, `play/{format,validate,plays}.ts`, `play/builtin/*.json`, `render/routeLayer.tsx` (trails, if reused), tests
**Scope**: Curated plays registry; additive keyframe `label`; playback controller (next/prev/goto/play/pause/speed/loop, reduced motion jump); transport, progress dots, 4-up scrolling filmstrip, 5-up play list; compact top-bar layout; Watch is read-only.
**Dependencies**: Requires Partition 2

#### Artifact Type
web-ui

#### How to Run
- start: `cd frontend && npm run dev`
- ready-check: `GET http://localhost:5173/fieldview/watch` renders the first play at frame 1
- teardown: `Ctrl+C`

#### Acceptance Criteria
- [ ] ≥3 curated plays load and validate; an invalid file is skipped and reported, never crashes
- [ ] A ≥5-frame play: Next/Previous step one keyframe, Play runs to the end (loops if Loop), Jump-to-frame works
- [ ] Filmstrip shows 4 frames and scrolls horizontally for the rest; play list shows 5 and scrolls
- [ ] Reduced motion: stepping jumps without animation
- [ ] Playback never mutates the curated play data (test)
- [ ] Profiler: 0 React commits per animation frame during playback
- [ ] Curated plays read as real plays <!-- NEEDS MANUAL REVIEW -->

#### Implementation Steps
1. Format label + registry + validation + placeholder plays.
2. Playback controller + tests.
3. Transport, dots, filmstrip, play list, options; compose Watch in both frames.

### Partition 5: Touch, QA, cleanup → `feat/fieldview-ui-touch-qa`
**Modules**: `ui/FieldCanvas.tsx` (touch lift), `render/pick.ts`, `ui/app/*` (safe-area), `tests/frameGuard.test.ts`, `docs/fieldview-backlog.md`
**Scope**: Lifted-piece touch drag; scale-aware touch grab radius; safe-area insets, overscroll/pull-to-refresh guard; real-device pass and tuning (piece radius, breakpoint); a11y pass; frame guard test; placeholder audit (code markers vs. `docs/fieldview-placeholders.md`); dead-code and stale-ADR sweep; backlog/canon-prep notes.
**Dependencies**: Requires Partitions 3 and 4

#### Artifact Type
web-ui

#### How to Run
- start: `cd frontend && npm run dev -- --host` (open on a phone/tablet on the same network)
- ready-check: `/fieldview/explore` loads on the device
- teardown: `Ctrl+C`

#### Acceptance Criteria
- [ ] Touch drag shows lifted piece + ghost; the store receives the true position (test)
- [ ] Touch grab radius ≥ 44 px at phone scale; mouse grab distance unchanged (tests)
- [ ] Frame guard passes (one canvas, one driver, content imports no frame, no hex outside tokens)
- [ ] axe clean on explore/watch/build in both frames; keyboard reaches menu/list/transport/legend
- [ ] Real-device pass: phone landscape, tablet landscape, laptop; findings and tuned values recorded <!-- NEEDS MANUAL REVIEW -->
- [ ] Every `PLACEHOLDER(fieldview-ui-rework)` marker in code appears in `docs/fieldview-placeholders.md` and vice versa
- [ ] No unused exports from retired code; `tsc -b` and full suite + `test:perf` green

#### Implementation Steps
1. Touch lift + grab radius + safe-area.
2. a11y pass + frame guard.
3. Real-device pass; tune; record.
4. Sweep dead code; update backlog; write handoff for canon synthesis.

## Sequencing

```
P1 → P2 → ┬─ P3 ─┐
          └─ P4 ─┴→ P5
```

P3 and P4 touch disjoint files (P2 lands all shared chrome). Likely overlap: both import the
`FieldViewApp` hook and `TopBar` slots — read-only for them. If a slot is missing, **signal and fix in
P2's files via a small follow-up commit on the initiative branch**, not inside P3/P4.

## Migrations & Compat

- Prefs: v2 storage key with read-through of the old key (ignore old `on`).
- Play format: `label` additive (v2 files remain valid; ADR-7).
- Routes: all old URLs redirect; `/fieldview/designer` preserved.
- Saved user presets (localStorage via `presetRegistry`) are untouched though the UI is gone.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Orientation flip leaves a stale rotation | P1 alone; corner-registration test; grep audit at P1 start and P5 end |
| Deleting the shell deletes coverage for unsurfaced features | Rewrite tests to the engine/canvas APIs before deleting (P3) |
| Both frames double-mount | Frame guard + single owner in `FieldViewApp` |
| Deferred defense-following is forgotten | Backlog + toggle labelled "coming soon"; ADR-33 reserved |
| Placeholders ship unnoticed | `PLACEHOLDER(...)` markers + `docs/fieldview-placeholders.md`; P5 reconciliation |
| Real-device findings force rework late | Piece radius and breakpoint are tokens/one screen; P5 is where they're tuned |
| Placeholder content ships | Curated setups/plays flagged `NEEDS MANUAL REVIEW`; Builder authors before merge to main |

## Alternatives Considered

- **One mega-branch**: rejected — P1's blast radius should be reviewable alone.
- **Keep the panel registry** and register new panels: rejected — nothing remains to register; the new IA is not selection-keyed (the card is a content component).
- **Wire defense-following in this initiative**: rejected by the Builder for now — finish and review the rest first, then design it deliberately.
- **Vertical field on portrait phones**: rejected (D4); orientation isolation keeps it possible later.
- **Two separate content trees for phone and desktop**: rejected — drift risk (ADR-14's lesson).
