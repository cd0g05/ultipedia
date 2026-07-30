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
next_section: "## Initiative Boundary"
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

- [x] Build `ShellLayout.tsx` desktop three-pane grid (280px / fluid / 320px) <!-- id: 40 -->
- [x] Build `ToolRibbon.tsx`: row of 4 side-by-side buttons, Marquee + Space View active, Throw to Player + Advanced Stats disabled with tooltip "Ships in a future update." <!-- id: 41 -->
- [x] Build `LeftSidebar.tsx` wiring `useSelection()` → `panelRegistry` for the middle section <!-- id: 42 -->
- [x] Wire Advanced Settings slide-up override (full sidebar replacement + "← Back") <!-- id: 43 -->
- [x] Build `RightSidebarSlot.tsx`: open/close toggle, Play Designer placeholder copy + link to `/fieldview/designer` <!-- id: 44 -->
- [x] Keyboard navigation: Tab/Enter/Space reach every ribbon/toggle/menu button <!-- id: 45 -->
- [x] `aria-disabled` on disabled ribbon buttons; confirm tooltip is reachable via keyboard focus, not hover-only <!-- id: 46 -->
- [x] `aria-live="polite"` on middle-section panel swap <!-- id: 47 -->
- [x] Test suite: selection change swaps the correct panel; ribbon disabled-state renders; right slot open/close <!-- id: 48 -->

**Note (deviation from plan):** ux.md describes the right-slot open and Advanced
Settings override as animated slide transitions (with `prefers-reduced-motion`
falling back to instant). None of tasks 40-48 call out building that animation
explicitly, so this partition implemented instant show/hide only (a CSS
transition pass, if wanted, is a low-risk follow-up — no state model changes
required). Also: `ToolRibbon`'s Space-view toggle and `LeftSidebar`'s single
`useOverlayState()` call are threaded down as props rather than each shell
component calling the hook independently, to avoid adding a third redundant
`fieldview.overlayPrefs` reader beyond the two the Panels partition already
flagged (`Whiteboard.tsx` and the panels themselves) — consolidating those
two is still Integration's call, not resolved here.

## Partition: feat/fieldview-shell-mobile

- [x] Build collapsed handle bar (ribbon icons only) <!-- id: 50 -->
- [x] Build expanded sheet (~46% viewport height) with TOOLS / SELECTION / SETTINGS tabs <!-- id: 51 -->
- [x] Wire SELECTION tab to `useSelection()` + `panelRegistry`; empty state shows "Select a player on the field to see options here." <!-- id: 52 -->
- [x] Selecting a player while sheet is collapsed does not auto-expand it; add indicator on SELECTION tab position <!-- id: 53 -->
- [x] Build Play Designer full-screen overlay variant (not a 320px slot) with the same placeholder copy <!-- id: 54 -->
- [x] Respect `prefers-reduced-motion`: instant show/hide instead of animated expand/collapse <!-- id: 55 -->
- [x] Remove `SmallScreenNotice.tsx` and its call site entirely <!-- id: 56 -->
- [x] Test suite: collapsed/expanded states, tab switching, empty-selection copy, reduced-motion behavior <!-- id: 57 -->

## Partition: feat/fieldview-shell-integration

- [x] Wire `ShellLayout` into `Whiteboard.tsx`, replacing direct `OverlayRail`/`SmallScreenNotice` composition <!-- id: 60 -->
- [x] Delete `OverlayRail.tsx` and `AdvancedPanel.tsx` (superseded by shell panels) <!-- id: 61 -->
- [x] Relocate `PresetMenu.tsx` into the shell's bottom-menu area; confirm localStorage keys unchanged <!-- id: 62 -->
- [x] Verify `render/heatmap.ts` paints correctly aligned to the rotated field (patch only if a real bug surfaces; expected to need no logic change) <!-- id: 63 -->
- [x] Verify `render/exportImage.ts` produces a correctly-oriented PNG under rotation <!-- id: 64 -->
- [x] Verify `render/pick.ts` needs no change (pure yard-space, orientation-agnostic by construction) <!-- id: 65 -->
- [x] Check `pages/FieldStage.tsx` for orientation-dependent chrome not yet inventoried; patch if found <!-- id: 66 -->
- [x] Extend the Profiler-based drag test to include a selection change mid-drag; confirm 0 React commits still holds <!-- id: 67 -->
- [x] Run the full fieldview suite (229 existing + all new tests from Partitions 1–5); fix any regressions <!-- id: 68 -->
- [ ] Request a deployed preview; review against desktop/mobile mockups <!-- id: 69 --> <!-- NEEDS MANUAL REVIEW: Builder + client sign-off per PRD Quality Gates -->

**Note (deviations from plan):**
- **id 61 — `OverlayRail.tsx` was NOT deleted, contrary to this task's literal wording.** `pages/Designer.tsx` (explicitly out of scope for this initiative per tech-design.md's Brownfield Notes — "out of scope beyond being linked from the Play Designer placeholder") still composes `OverlayRail` + `AdvancedPanel` directly and is unaffected by this partition. Deleting `OverlayRail.tsx` would have broken Designer's compile and its own tests, forcing an unplanned rewrite of a page this partition's module list (`Whiteboard.tsx`, `FieldStage.tsx`, `heatmap.ts`, `exportImage.ts`) does not include. Only `Whiteboard.tsx`'s usage of `OverlayRail` was removed; the file itself stays, same reasoning as the standing instruction to keep `AdvancedPanel.tsx` for `AdvancedSettingsPanel.tsx`. Approach.md's acceptance criterion "no direct OverlayRail/SmallScreenNotice usage remains anywhere in the codebase" is therefore true of `Whiteboard.tsx` and every shell file, but not of `Designer.tsx` — flagged here rather than silently left inconsistent with that line.
- **Real integration bugs found and fixed, beyond the declared module list** (`Whiteboard.tsx`, `pages/FieldStage.tsx`, `render/heatmap.ts`, `render/exportImage.ts`, `ui/OverlayRail.tsx`, `ui/AdvancedPanel.tsx`, `ui/PresetMenu.tsx`):
  1. **`ui/FieldCanvas.tsx`** — no prior partition had ever wired the pointer handlers (click-drag select, marquee release, preset-reload reset) to `store.setSelection()`. Foundation built the `SceneStore` selection field and Panels/Desktop/Mobile all built real UI against `useSelection(store)`, but nothing ever *produced* a selection change from the field itself — every partition's own tests only exercised selection by calling `store.setSelection(...)` directly. Composing the shell into `Whiteboard.tsx` for the first time exposed this: clicking a player would never have updated the sidebar/bottom-sheet panel. Fixed by calling `store.setSelection(selectPlayer(...) / selectMarquee(...) / clearSelection())` (`scene/selection.ts`, already built by Foundation but never called from here) at the same three points `FieldCanvas`'s own local, ref-based `setSelection` already ran — preserving ADR-2 (still store-mutate based, never React state).
  2. **`ui/prefs.ts`** — `useOverlayState()` was a plain `useState(loadPrefs)` per call site. That was fine when only one instance existed per page (`Whiteboard.tsx`'s own call), but the Panels and Desktop partition notes both already flagged that panels/`LeftSidebar` each call the same hook independently, "redundant-but-consistent... since they share one localStorage key" — true only across separate mounts, not simultaneous ones. Once actually composed, toggling "Space View" in the shell ribbon (a different hook instance than `Whiteboard.tsx`'s) would update its own copy and localStorage but never re-render `Whiteboard.tsx`'s copy — the one actually threaded into `FieldCanvas` — so the heatmap would never have turned on from the shell UI. Fixed by converting `useOverlayState` to a module-level external store read via `useSyncExternalStore`, mirroring `SceneStore`'s own selection-field pattern (ADR-1), with a "re-seed from localStorage when nothing is subscribed" rule that keeps test-to-test isolation (RTL's automatic unmount between tests) working the same as before.
  3. **`ui/shell/ShellLayout.tsx`** — the Desktop partition's own sketch (see its code comment, since replaced) planned to render `children` a second time inside the mobile branch once `BottomSheet` existed. That does not work once `children` is the real `FieldCanvas`: it receives `svgRef`/`canvasRef`/`stageRef` as props from `Whiteboard.tsx`, and mounting the same JSX twice fights over those single shared ref objects (and cannot be tested in jsdom at all, since `getByRole` would find two of everything). Restructured so `children` renders exactly once as a shared flex child; the desktop sidebar/right-slot are each wrapped in their own `hidden lg:flex`, and `BottomSheet`'s own root already carries `lg:hidden` — no duplication, still CSS-only (ADR-5).
  4. **Ribbon dedupe** — `ui/shell/BottomSheet.tsx`'s TOOLS tab now renders the real, shared `ui/shell/ToolRibbon.tsx` instead of its own independently-maintained `RibbonRow`, per the Mobile partition's own note flagging this as unresolved. The collapsed handle bar's icon-only summary stays bespoke (decorative, `aria-hidden`, not the reachable ribbon) since duplicating/hiding a second full `ToolRibbon` just for its glyphs would be worse than a small local icon list.
- **Test suite**: 25 of the existing 327 fieldview tests hardcoded the pre-shell `OverlayRail` composition (`"Space"` button, `/Advanced settings/` regex, the "Closed/Contested/Strong space" legend text, `OverlayRail`'s own tablet/xl rail layout) and needed updating to the shell's real button names/structure now that `Whiteboard.tsx` actually renders through it for the first time — expected per approach.md's own framing ("the first time all five partitions' code actually runs composed together"), not a scope creep. The legend itself has no shell equivalent anywhere in ux.md's IA and was not resurrected — its removal is an upstream scope decision (Whiteboard no longer composes `OverlayRail`), not something to patch around. `responsive.test.tsx`'s old tablet/xl rail-layout assertions were kept for `Designer.tsx` (still valid, unchanged) and replaced for `Whiteboard.tsx` with assertions on the real `lg` shell breakpoint. Final suite: 327 fieldview tests + 1 new (a11y split into two views) = 328, all fieldview (43 files / 434 total) passing; `tsc --noEmit` clean.
- **id 69** is explicitly left unchecked — the deployed-preview review against the desktop/mobile mockups is a Builder/client sign-off step (PRD Quality Gates), not something this partition can complete itself. The code is in a state ready for that review.

## Initiative Boundary

- [ ] Merge `initiative/fieldview-shell` directly into `main` (lifecycle has no PR at this boundary — confirm with Builder before merging, since this is a direct-to-main merge) <!-- id: 100 -->
