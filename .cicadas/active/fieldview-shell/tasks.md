---
summary: "34 tasks across 6 partitions (Foundation, Tokens, Panels, Desktop Shell, Mobile Sheet, Integration) plus one initiative-boundary merge task. No PR boundaries anywhere (lifecycle.json: all pr_boundaries false) — every merge is direct. Foundation and Tokens have no task dependencies on each other; Desktop and Mobile both wait on Panels+Tokens; Integration is last."
phase: "tasks"
when_to_load:
  - "When selecting the next implementation task or reviewing partition completion state."
  - "When checking which partition to start next given the approach.md dependency graph."
depends_on:
  - "prd.md"
  - "ux.md"
  - "tech-design.md"
  - "approach.md"
modules:
  - "frontend/src/fieldview"
index:
  partition_foundation: "## Partition: feat/fieldview-shell-foundation"
  partition_tokens: "## Partition: feat/fieldview-shell-tokens"
  partition_panels: "## Partition: feat/fieldview-shell-panels"
  partition_desktop: "## Partition: feat/fieldview-shell-desktop"
  partition_mobile: "## Partition: feat/fieldview-shell-mobile"
  partition_integration: "## Partition: feat/fieldview-shell-integration"
  initiative_boundary: "## Initiative Boundary"
next_section: "## Partition: feat/fieldview-shell-foundation"
---

# Tasks: fieldview-shell

## Partition: feat/fieldview-shell-foundation

- [x] Define `SelectionState` union (`none | multi | offense | defense | mark`) in `scene/selection.ts` <!-- id: 1 -->
- [x] Implement `selectPlayer`, `clearSelection`, `selectMarquee` pure transition helpers <!-- id: 2 -->
- [x] Unit test each transition helper in `scene/selection.test.ts` (as `tests/selection.test.ts`, matching this codebase's existing convention of co-locating all fieldview tests under `tests/` rather than beside the source file) <!-- id: 3 -->
- [x] Add `selection` field + dedicated `Set<() => void>` subscriber list to `createSceneStore` <!-- id: 4 -->
- [x] Expose `getSelection()`, `setSelection()`, `subscribeSelection()` on `SceneStore`, additive to existing interface <!-- id: 5 -->
- [x] Unit test that scene subscribers and selection subscribers fire independently of each other <!-- id: 6 -->
- [x] Add orientation rotation to `yardToPixel`/`pixelToYard` in `render/coords.ts` <!-- id: 7 -->
- [x] Update `getStageViewBox` for the rotated (swapped width/height) dimensions <!-- id: 8 -->
- [x] Unit test yard↔pixel round-trips under the new orientation <!-- id: 9 -->
- [x] Run full existing fieldview suite; confirm zero regressions outside touched files <!-- id: 10 -->

**Note (deviation from plan):** Rotating `yardToPixel`/`pixelToYard` alone broke the existing suite
(`drag.test.tsx`, `overlay.test.tsx`, `presetMenu.test.tsx` hardcode horizontal-orientation pixel
math; `fieldLayer.tsx`'s goal-line/brick/attack-arrow drawing and `FIELD_PX_WIDTH`/`FIELD_PX_HEIGHT`
are inherently orientation-specific, not incidental). To satisfy task 10 ("confirm zero regressions
outside touched files") without leaving the app visually broken, this partition additionally touched
`render/fieldLayer.tsx` (swapped `FIELD_PX_WIDTH`/`HEIGHT`, redrew goal lines/brick marks/
attack-direction indicator for vertical orientation), `render/heatmap.ts` (`fieldPixelSize` swap),
`pages/FieldStage.tsx` and `ui/FieldCanvas.tsx` (stale "attacks left to right" aria-label text), and
updated the pixel-literal assertions in `drag.test.tsx`/`overlay.test.tsx`/`presetMenu.test.tsx` to
match the new orientation (using the real `yardToPixel` transform rather than a re-hardcoded formula,
where practical). This pulls forward part of the Integration partition's verification tasks 63/65/66
— `heatmap.ts` and `pick.ts` needed exactly the checks described there, and `pick.ts` indeed needed no
change (pure yard-space). `FieldStage.tsx`'s aria-label was the "orientation-dependent chrome" task 66
anticipated. The Integration partition should re-verify but these should already be resolved.
`render/exportImage.ts` (task 64) was not touched or verified — still open for Integration.

## Partition: feat/fieldview-shell-tokens

- [x] Add `SHELL_TOKENS` (accent `#be185d`, grounds `#ffffff`/`#f4f4f5`, border `#d4d4d8`) to `render/tokens.ts` <!-- id: 20 -->
- [x] Confirm `FIELD_TOKENS`/`PIECE_TOKENS` (`#EF4B8A` etc.) remain untouched (ADR-6) <!-- id: 21 -->
- [x] Extend Tailwind theme with the shell palette and zero-radius default <!-- id: 22 -->
- [x] Confirm `font-heading` maps to Archivo Black with no `font-bold` variant exposed on it <!-- id: 23 -->
- [x] Extend `tokensGuard.test.ts` to assert `SHELL_TOKENS` exists and existing tokens are unmodified <!-- id: 24 -->

## Partition: feat/fieldview-shell-panels

- [x] Build `panelRegistry.ts`: `Record<SelectionStateKind, ComponentType<PanelProps>>` + `registerPanel()` <!-- id: 30 -->
- [x] Build `useSelection()` hook via `useSyncExternalStore` over `store.subscribeSelection`/`getSelection` <!-- id: 31 -->
- [x] Migrate `OverlayRail` visibility-toggle logic into `DefaultVisibilityPanel` (covers `none`/`multi`) <!-- id: 32 -->
- [x] Migrate `AdvancedPanel` into `AdvancedSettingsPanel` <!-- id: 33 -->
- [x] Build `OffensePlayerPanel` placeholder with UX copy ("Matchup and mark controls ship in a future update.") <!-- id: 34 -->
- [x] Build `DefensePlayerPanel` placeholder with the same copy convention <!-- id: 35 -->
- [x] Build `MarkPanel` placeholder with the same copy convention <!-- id: 36 -->
- [x] Write `shellGuard.test.ts`: registry has an entry for every `SelectionStateKind` <!-- id: 37 -->
- [x] Test `DefaultVisibilityPanel` and `AdvancedSettingsPanel` reproduce prior `OverlayRail`/`AdvancedPanel` behavior <!-- id: 38 -->

**Note (design decision):** `PanelProps` is exactly `{ selection }` (tech-design.md ADR-3's
Interface Contracts), so `DefaultVisibilityPanel` and `AdvancedSettingsPanel` — which need
visibility/lens/layers/params state, not just `selection` — call `useOverlayState()`
(`ui/prefs.ts`) internally rather than accepting that state as props. This keeps every panel in
the registry assignable to `ComponentType<PanelProps>` without widening the shared prop type, and
matches the existing precedent (Whiteboard.tsx already calls the same hook once and threads it to
`OverlayRail`/`AdvancedPanel`). `AdvancedSettingsPanel` wraps the existing `AdvancedPanel`
component unchanged, always passing `expanded={true}` — in the shell, opening "Advanced Settings"
from the bottom menu is itself the disclosure, so there's no second collapse toggle. The Desktop
partition (`feat/fieldview-shell-desktop`) should decide whether `Whiteboard.tsx`'s own
`useOverlayState()` call and these panels' internal calls should be consolidated into one call
threaded down (they currently both read/write the same `fieldview.overlayPrefs` localStorage key
independently, which is consistent but redundant) — noted here so it isn't rediscovered as a bug.

## Partition: feat/fieldview-shell-desktop

- [ ] Build `ShellLayout.tsx` desktop three-pane grid (280px / fluid / 320px) <!-- id: 40 -->
- [ ] Build `ToolRibbon.tsx`: row of 4 side-by-side buttons, Marquee + Space View active, Throw to Player + Advanced Stats disabled with tooltip "Ships in a future update." <!-- id: 41 -->
- [ ] Build `LeftSidebar.tsx` wiring `useSelection()` → `panelRegistry` for the middle section <!-- id: 42 -->
- [ ] Wire Advanced Settings slide-up override (full sidebar replacement + "← Back") <!-- id: 43 -->
- [ ] Build `RightSidebarSlot.tsx`: open/close toggle, Play Designer placeholder copy + link to `/fieldview/designer` <!-- id: 44 -->
- [ ] Keyboard navigation: Tab/Enter/Space reach every ribbon/toggle/menu button <!-- id: 45 -->
- [ ] `aria-disabled` on disabled ribbon buttons; confirm tooltip is reachable via keyboard focus, not hover-only <!-- id: 46 -->
- [ ] `aria-live="polite"` on middle-section panel swap <!-- id: 47 -->
- [ ] Test suite: selection change swaps the correct panel; ribbon disabled-state renders; right slot open/close <!-- id: 48 -->

## Partition: feat/fieldview-shell-mobile

- [ ] Build collapsed handle bar (ribbon icons only) <!-- id: 50 -->
- [ ] Build expanded sheet (~46% viewport height) with TOOLS / SELECTION / SETTINGS tabs <!-- id: 51 -->
- [ ] Wire SELECTION tab to `useSelection()` + `panelRegistry`; empty state shows "Select a player on the field to see options here." <!-- id: 52 -->
- [ ] Selecting a player while sheet is collapsed does not auto-expand it; add indicator on SELECTION tab position <!-- id: 53 -->
- [ ] Build Play Designer full-screen overlay variant (not a 320px slot) with the same placeholder copy <!-- id: 54 -->
- [ ] Respect `prefers-reduced-motion`: instant show/hide instead of animated expand/collapse <!-- id: 55 -->
- [ ] Remove `SmallScreenNotice.tsx` and its call site entirely <!-- id: 56 -->
- [ ] Test suite: collapsed/expanded states, tab switching, empty-selection copy, reduced-motion behavior <!-- id: 57 -->

## Partition: feat/fieldview-shell-integration

- [ ] Wire `ShellLayout` into `Whiteboard.tsx`, replacing direct `OverlayRail`/`SmallScreenNotice` composition <!-- id: 60 -->
- [ ] Delete `OverlayRail.tsx` and `AdvancedPanel.tsx` (superseded by shell panels) <!-- id: 61 -->
- [ ] Relocate `PresetMenu.tsx` into the shell's bottom-menu area; confirm localStorage keys unchanged <!-- id: 62 -->
- [ ] Verify `render/heatmap.ts` paints correctly aligned to the rotated field (patch only if a real bug surfaces; expected to need no logic change) <!-- id: 63 -->
- [ ] Verify `render/exportImage.ts` produces a correctly-oriented PNG under rotation <!-- id: 64 -->
- [ ] Verify `render/pick.ts` needs no change (pure yard-space, orientation-agnostic by construction) <!-- id: 65 -->
- [ ] Check `pages/FieldStage.tsx` for orientation-dependent chrome not yet inventoried; patch if found <!-- id: 66 -->
- [ ] Extend the Profiler-based drag test to include a selection change mid-drag; confirm 0 React commits still holds <!-- id: 67 -->
- [ ] Run the full fieldview suite (229 existing + all new tests from Partitions 1–5); fix any regressions <!-- id: 68 -->
- [ ] Request a deployed preview; review against desktop/mobile mockups <!-- id: 69 --> <!-- NEEDS MANUAL REVIEW: Builder + client sign-off per PRD Quality Gates -->

## Initiative Boundary

- [ ] Merge `initiative/fieldview-shell` directly into `main` (lifecycle has no PR at this boundary — confirm with Builder before merging, since this is a direct-to-main merge) <!-- id: 100 -->
