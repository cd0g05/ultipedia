---
summary: "Vertical field orientation is added as a rotation in render/coords.ts only (scene/ stays in yards, untouched); pick.ts/heatmap.ts/exportImage.ts consume the same transform, no independent orientation math. Selection state is added to the existing mutable SceneStore (ADR-2 preserved) as a new `selection` field with its own subscriber set, read via a `useSyncExternalStore` hook — never React state. The left sidebar's middle section is a typed panel registry (selection-state union -> renderer) that Initiatives B/C/D extend by registering new entries, not editing shell files. Shell layout is a new `ShellLayout` component tree replacing page-level composition in Whiteboard.tsx; OverlayRail/AdvancedPanel/PresetMenu content is redistributed into ribbon/middle-section/bottom-menu panels rather than deleted. Mobile drops SmallScreenNotice for a CSS-only (no resize listener) bottom-sheet component sharing the same panel registry data as desktop. Accent color conflict (#EF4B8A vs #be185d) is resolved: #be185d becomes the sole shell-chrome accent; existing piece/field #EF4B8A tokens are left alone since they identify game entities, not UI chrome, and PRD scope is chrome only."
phase: "tech"
when_to_load:
  - "When implementing or reviewing the orientation transform, selection model, panel registry, shell layout, or mobile bottom sheet."
  - "When checking whether changes still conform to ADR-1/ADR-2 (pure scene/space model, no React in the drag path)."
depends_on:
  - "prd.md"
  - "ux.md"
modules:
  - "frontend/src/fieldview/render/coords.ts"
  - "frontend/src/fieldview/scene/store.ts"
  - "frontend/src/fieldview/ui"
  - "frontend/src/fieldview/pages"
  - "frontend/src/fieldview/render/tokens.ts"
index:
  overview: "## Overview & Context"
  stack: "## Tech Stack & Dependencies"
  structure: "## Project / Module Structure"
  adrs: "## Architecture Decisions (ADRs)"
  data_models: "## Data Models"
  interfaces: "## API & Interface Design"
  conventions: "## Implementation Patterns & Conventions"
  security_performance: "## Security & Performance"
  implementation_sequence: "## Implementation Sequence"
next_section: "Overview & Context"
---

# Tech Design: fieldview-shell

## Progress

- [x] Overview & Context
- [x] Tech Stack & Dependencies
- [x] Project / Module Structure
- [x] Architecture Decisions (ADRs)
- [x] Data Models
- [x] API & Interface Design
- [x] Implementation Patterns & Conventions
- [x] Security & Performance
- [x] Implementation Sequence

---

## Overview & Context

**Summary:** This initiative is a chrome-and-orientation rewrite around an unchanged scene/space
core. Three technical moves: (1) a coordinate-space rotation confined to `render/coords.ts`, (2) a
selection field added to the existing mutable `SceneStore` so selection is readable outside React's
render cycle exactly like scene mutations already are, and (3) a new shell component tree
(`ShellLayout`) that replaces the current ad-hoc composition in `Whiteboard.tsx`/`Designer.tsx` with
a three-pane desktop grid / bottom-sheet mobile layout, both driven by one panel-registry data
source. No new dependencies, no backend, no change to `scene/`, `space/`, or `play/` file formats.

### Cross-Cutting Concerns

1. **ADR-2 invariant (no React in the drag path)** — selection state changes on every click/drag
   interaction. It must go through the store's mutate/subscribe path, never `useState`, or the
   existing Profiler test (0 React commits across 25 pointer moves) will start failing the moment a
   drag also touches selection (e.g., dragging a piece that's currently selected).
2. **Orientation must not leak into `scene/`** — every existing test, the space model, and `play/`
   assume `+x = attacking` in yards. That does not change. Only the yard→pixel step in `coords.ts`
   rotates.
3. **Panel registry must be extensible without touching shell files** — B/C/D each register a real
   panel for a selection state this initiative currently renders as a placeholder. If registering a
   panel requires editing `ShellLayout.tsx` or `LeftSidebar.tsx`, the registry has failed its job.
4. **One data source, two shells** — mobile bottom sheet and desktop left sidebar must render the
   same panel-registry lookup; UX explicitly calls out the risk of the mobile sheet reimplementing
   panel content and drifting from desktop.

### Brownfield Notes

- `Whiteboard.tsx` currently composes `FieldCanvas` + `OverlayRail` (+ `AdvancedPanel` nested inside
  it) + `SmallScreenNotice` directly. This initiative replaces that composition with `ShellLayout`
  wrapping `FieldCanvas` — `FieldCanvas` itself is untouched (still owns the frame loop, still no
  React in the drag path).
- `Designer.tsx` is out of scope for this initiative beyond being linked from the Play Designer
  placeholder; Initiative D replaces it later.
- `PresetMenu.tsx` content moves into the left sidebar's bottom-menu area (grouped near Advanced
  Settings) since the roadmap does not call it out as ribbon or middle-section content.
- Existing `prefs.ts` (localStorage overlay prefs) pattern is reused for any new persisted UI
  preference this initiative introduces (e.g., which bottom-sheet tab was last open) — validated
  and clamped on read, per existing convention.

---

## Tech Stack & Dependencies

| Category | Selection | Rationale |
|----------|-----------|-----------|
| **Language/Runtime** | TypeScript, existing React SPA | No change — this is UI restructuring inside the existing frontend. |
| **Framework** | React (existing), Tailwind (existing) | Design system is executed as a Tailwind theme pass per PRD FR-2.3. |
| **State** | Existing mutable `SceneStore` + `useSyncExternalStore` | Selection state must be read outside React's commit cycle exactly like scene state already is (ADR-2). `useSyncExternalStore` is the standard React primitive for exactly this external-store pattern and needs no new dependency (React 18+, already in use per `FieldCanvas.tsx`'s subscribe-store usage). |
| **Testing** | Vitest + Testing Library (existing), existing Profiler-based perf test | No new test framework. |
| **Key Libraries** | None new | Zero new dependencies — matches module canon ("no new dependencies"). |

**New dependencies introduced:** None.

**Dependencies explicitly rejected:**
- A dedicated bottom-sheet library (e.g., `react-modal-sheet`) — rejected to keep the module's
  zero-dependency posture; the mobile sheet is a CSS-transform-driven component matching the
  existing "responsive is CSS-only" convention (`responsive.test.tsx`).
- A state-management library (Redux/Zustand) for selection — rejected; the existing `SceneStore`
  pattern already solves this exact problem (mutable store + subscribe) and introducing a second
  state mechanism would fragment the one the module has proven out.

---

## Project / Module Structure

```
frontend/src/fieldview/
├── scene/
│   ├── store.ts                    # [MODIFIED] add `selection` field + selection subscriber set
│   ├── selection.ts                # NEW — SelectionState union type + pure selection-transition helpers
│   └── types.ts                    # unchanged
├── render/
│   ├── coords.ts                   # [MODIFIED] add orientation transform (rotation), applied in yardToPixel/pixelToYard
│   ├── tokens.ts                   # [MODIFIED] add SHELL_TOKENS (chrome colors/spacing); PIECE_TOKENS/FIELD_TOKENS untouched
│   ├── pick.ts                     # unchanged (already pure yard-space; consumes rotated coords transparently)
│   ├── heatmap.ts                  # [MODIFIED] verify canvas paint respects rotated viewBox (likely no logic change, just confirms no independent orientation assumption)
│   └── exportImage.ts              # [MODIFIED] same verification as heatmap.ts
├── ui/
│   ├── shell/                      # NEW — shell layout module
│   │   ├── ShellLayout.tsx         # Top-level: chooses desktop three-pane grid vs. mobile bottom sheet by breakpoint
│   │   ├── LeftSidebar.tsx         # Desktop persistent sidebar: ribbon + middle section + bottom menus
│   │   ├── RightSidebarSlot.tsx    # Collapsible slot; renders Play Designer placeholder
│   │   ├── BottomSheet.tsx         # Mobile: collapsed handle bar / expanded tabbed sheet
│   │   ├── ToolRibbon.tsx          # Shared row-of-4 ribbon (desktop and mobile both single-row), reads disabled state from a static feature-flag map
│   │   ├── panelRegistry.ts        # NEW — typed registry: SelectionState -> panel renderer; B/C/D extend this
│   │   ├── panels/
│   │   │   ├── DefaultVisibilityPanel.tsx   # migrated OverlayRail visibility toggles
│   │   │   ├── OffensePlayerPanel.tsx       # placeholder (FR-5.2)
│   │   │   ├── DefensePlayerPanel.tsx       # placeholder (FR-5.2)
│   │   │   ├── MarkPanel.tsx                # placeholder (FR-5.2)
│   │   │   └── AdvancedSettingsPanel.tsx    # migrated AdvancedPanel content
│   │   └── useSelection.ts         # NEW — useSyncExternalStore wrapper over store's selection subscriber
│   ├── OverlayRail.tsx              # [REMOVED] content redistributed into shell/panels
│   ├── AdvancedPanel.tsx            # [REMOVED] content becomes AdvancedSettingsPanel
│   ├── PresetMenu.tsx               # [MODIFIED] relocated into shell bottom-menu area, logic unchanged
│   └── SmallScreenNotice.tsx        # [REMOVED] — mobile is now a first-class layout, not a block
├── pages/
│   ├── Whiteboard.tsx               # [MODIFIED] composes ShellLayout instead of OverlayRail/SmallScreenNotice directly
│   └── FieldStage.tsx               # [MODIFIED] if it renders orientation-dependent chrome (verify during implementation)
```

**Key structural decisions:**
- All new shell code lives under `ui/shell/`, isolated from `FieldCanvas.tsx` and the scene/space/
  play layers — this initiative should produce zero diffs in `scene/scene.ts`, `space/`, or `play/`.
- `panelRegistry.ts` is the single seam Initiatives B/C/D touch; everything else in `ui/shell/` is
  this initiative's own concern.

---

## Architecture Decisions (ADRs)

### ADR-1: Selection state lives in the SceneStore, not React state

**Decision:** Add a `selection: SelectionState` field (and its own `Set<() => void>` subscriber
list, mirroring the existing `subscribers`/`frameSubscribers` split) to `createSceneStore`. Reads
happen via a `useSelection()` hook built on `useSyncExternalStore`, matching how the store already
exposes `getScene()`/`subscribe()`.

**Rationale:** ADR-2 (existing module canon) is proven by a Profiler test asserting 0 React commits
during a drag. Selection changes are triggered by the same pointer handlers that already mutate the
store imperatively in `FieldCanvas.tsx` — routing selection through `setState` would reintroduce
exactly the coupling ADR-2 forbids, on a component that already gets this right for scene mutations.

**Affects:** `scene/store.ts`, `scene/selection.ts` (new), `ui/shell/useSelection.ts` (new),
`FieldCanvas.tsx` (selection writes added alongside existing piece-move/marquee logic).

---

### ADR-2: Orientation is a single rotation in `coords.ts`, nowhere else

**Decision:** `yardToPixel`/`pixelToYard` gain a rotation step (offense-attacks-up instead of
offense-attacks-right). `getStageViewBox` swaps width/height accordingly. No other file computes or
assumes an orientation.

**Rationale:** `scene/` is explicitly orientation-agnostic today (`+x = attacking` is a model fact,
not a screen fact) — PRD FR-1.1 and existing module canon both require this stays true.
`pick.ts` already operates purely in yard space and needs no change; `heatmap.ts` and
`exportImage.ts` need verification, not rewrites, since they already read dimensions from
`coords.ts`'s returned buffers rather than recomputing them (existing ADR-4 convention).

**Affects:** `render/coords.ts`, verification passes on `render/heatmap.ts`, `render/exportImage.ts`,
`render/pick.ts` (verify-only, no expected change).

---

### ADR-3: Panel content is a typed registry keyed by selection state

**Decision:** `panelRegistry.ts` exports a `Record<SelectionStateKind, PanelComponent>` (or
equivalent discriminated mapping) that `LeftSidebar.tsx` and `BottomSheet.tsx` both read from. A
downstream initiative registering a panel for a `SelectionStateKind` the union doesn't yet have
fails to compile until the union and registry are both updated — satisfying PRD's Maintainability
NFR ("fails at compile time, not silently at runtime").

**Rationale:** PRD FR-5.3 requires B/C/D can add real panels without editing shell layout files.
A typed lookup keyed by a closed union is the smallest mechanism that satisfies both "no shell file
edits" and "no silent runtime gaps."

**Affects:** `ui/shell/panelRegistry.ts`, `ui/shell/LeftSidebar.tsx`, `ui/shell/BottomSheet.tsx`,
every file under `ui/shell/panels/`.

---

### ADR-4: One panel-registry data source, two presentational shells

**Decision:** `BottomSheet.tsx` (mobile) and `LeftSidebar.tsx` (desktop) both call the same
`panelRegistry` lookup and the same `useSelection()` hook. They differ only in the chrome
(grid-pane vs. tabbed sheet), never in what selection state maps to what content.

**Rationale:** UX explicitly flags the risk of mobile/desktop panel drift; a shared lookup makes
that drift a type error (missing registry entry) rather than a manual sync task.

**Affects:** `ui/shell/BottomSheet.tsx`, `ui/shell/LeftSidebar.tsx`, `ui/shell/panelRegistry.ts`.

---

### ADR-5: Breakpoint switch is CSS-only; `ShellLayout` renders both trees, CSS hides one

**Decision:** Following the existing module convention ("Responsive is CSS-only — no resize
listener, no hydration flash"), `ShellLayout` renders both the desktop grid and the mobile sheet in
the DOM; Tailwind breakpoint classes (`hidden lg:grid` / `lg:hidden`, with `lg` remapped to the
1024px breakpoint UX specifies) control which is visible. No `window.matchMedia` or resize
listener is introduced.

**Rationale:** Matches the existing, already-tested responsive pattern (`responsive.test.tsx`
asserts the class contract) rather than introducing a second responsive mechanism. Keeps
`SmallScreenNotice`'s removal a pure deletion rather than requiring a new JS-driven layout switch.

**Affects:** `ui/shell/ShellLayout.tsx`, Tailwind config (breakpoint value), `responsive.test.tsx`
(extended, not replaced).

---

### ADR-6: Accent color — `#be185d` for shell chrome, existing `#EF4B8A` piece/field tokens untouched

**Decision:** New `SHELL_TOKENS` in `render/tokens.ts` (or a co-located shell-specific token file)
uses `#be185d` as the sole interactive accent for shell chrome (buttons, active states, borders).
`PIECE_TOKENS.disc`/`marquee`/`attackArrowColor` etc. keep their existing `#EF4B8A`.

**Rationale:** UX flagged this discrepancy as requiring an explicit decision, not an oversight.
PRD's Design System requirement (FR-2.1/FR-2.2) scopes "Light Film Room" to shell/chrome visuals;
piece and field-marking colors identify game entities on the canvas and are a separate visual
system the roadmap's "client visual review" already covers as its own outstanding item (per module
canon's "Outstanding" section) — recoloring them is out of scope here and risks conflicting with
that pending review.

**Affects:** `render/tokens.ts` (new `SHELL_TOKENS` export, existing `FIELD_TOKENS`/`PIECE_TOKENS`
untouched), all `ui/shell/` components.

---

## Data Models

### New Models

```typescript
// scene/selection.ts
export type SelectionState =
  | { kind: "none" }
  | { kind: "multi"; ids: string[] }
  | { kind: "offense"; id: string }
  | { kind: "defense"; id: string }
  | { kind: "mark"; id: string };

// Pure transition helpers — no store access, testable like scene.ts's other ops.
export function selectPlayer(current: SelectionState, player: Player): SelectionState { /* ... */ }
export function clearSelection(): SelectionState { return { kind: "none" }; }
export function selectMarquee(ids: string[]): SelectionState { /* ... */ }
```

**Key field decisions:**
- `kind` discriminant rather than a nullable `id` — lets `panelRegistry.ts` switch exhaustively
  (TypeScript narrows on `kind`), which is what makes ADR-3's compile-time guarantee work.
- `mark` is its own `kind` rather than falling under `defense`, because UX's mark panel (force
  side/angle) is a distinct contextual view from a generic defender's — even though today both
  render placeholders, keeping them distinct now avoids a breaking union change when Initiative B
  populates them differently.
- Deliberately excludes any Vec2/position data — selection references a player by stable `id`
  (existing module convention: "Entities are paired by stable id, never array index") and looks up
  current position from the scene, never caches it.

### Modified Models

| Model | Change | Migration Required? |
|-------|--------|--------------------|
| `SceneStore` (`scene/store.ts`) | Add `selection: SelectionState` internal field, `getSelection()`, `setSelection(next)`, and a dedicated `subscribeSelection(cb)` (separate from the existing `subscribe`, so a selection change doesn't force every scene subscriber to re-check) | No — additive; existing `getScene`/`mutate`/`subscribe`/`onFrame` callers are unaffected |
| `PlayFile` (`play/format.ts`) | None | N/A — selection is ephemeral UI state, not part of the persisted play format |

### Schema / Migration Notes

None — no persisted schema changes. Selection state is explicitly not persisted (consistent with
existing module canon: "Scene state is deliberately not persisted").

---

## API & Interface Design

### Interface Contracts

```typescript
// ui/shell/panelRegistry.ts
import type { SelectionState } from "../../scene/selection";
import type { ComponentType } from "react";

export type SelectionStateKind = SelectionState["kind"];

export interface PanelProps {
  selection: SelectionState;
}

// A downstream initiative (B/C/D) registers a real panel by replacing the
// entry for its selection-state kind — e.g. registerPanel("defense", MatchupPanel).
export const panelRegistry: Record<SelectionStateKind, ComponentType<PanelProps>> = {
  none: DefaultVisibilityPanel,
  multi: DefaultVisibilityPanel,
  offense: OffensePlayerPanel,
  defense: DefensePlayerPanel,
  mark: MarkPanel,
};

export function registerPanel(kind: SelectionStateKind, component: ComponentType<PanelProps>): void {
  panelRegistry[kind] = component;
}
```

```typescript
// ui/shell/useSelection.ts
import { useSyncExternalStore } from "react";
import type { SceneStore } from "../../scene/store";

export function useSelection(store: SceneStore) {
  return useSyncExternalStore(store.subscribeSelection, store.getSelection);
}
```

### Backward Compatibility

No external consumers of `fieldview/` exist outside this SPA (module canon: "entirely client-side —
no backend calls"). `panelRegistry`'s `registerPanel` function is additive and exists specifically
so Initiatives B/C/D don't need a breaking change to plug in.

---

## Implementation Patterns & Conventions

### Naming Conventions

| Construct | Convention | Example |
|-----------|-----------|---------|
| Components | PascalCase | `LeftSidebar.tsx`, `BottomSheet.tsx` |
| Hooks | `use` prefix, camelCase | `useSelection.ts` |
| Selection state kinds | lowercase string literals | `"none"`, `"offense"`, `"defense"`, `"mark"`, `"multi"` |
| Shell token constants | UPPER_SNAKE, grouped object | `SHELL_TOKENS.accent`, matching existing `FIELD_TOKENS`/`PIECE_TOKENS` pattern |

### Error Handling Pattern

Not applicable in the traditional sense — no I/O, no async, no user-input validation beyond what
`play/validate.ts` already does for file import (unaffected by this initiative). The one new
"can this fail" surface is `registerPanel` being called with a `kind` outside the closed union,
which TypeScript rejects at compile time (ADR-3) — there is no runtime error path to handle.

### Testing Pattern

```typescript
// scene/selection.test.ts — pure function tests, same style as scene.test.ts
test("selecting a second offensive player replaces, not appends, when not marqueeing", () => {
  const next = selectPlayer({ kind: "offense", id: "p1" }, playerP2);
  expect(next).toEqual({ kind: "offense", id: "p2" });
});
```

```typescript
// ui/shell/shellGuard.test.ts — architectural guard, mirroring spaceGuard.test.ts/tokensGuard.test.ts
test("panelRegistry has an entry for every SelectionStateKind", () => {
  const kinds: SelectionStateKind[] = ["none", "multi", "offense", "defense", "mark"];
  for (const kind of kinds) expect(panelRegistry[kind]).toBeDefined();
});
```

**Coverage expectations:** New pure logic (`selection.ts`, panel registry lookup) at parity with
existing `scene/` test density; shell components covered by Testing Library render + interaction
tests, not exhaustive snapshot tests (matches existing `responsive.test.tsx` style: assert the
contract, not pixel output — jsdom can't verify computed layout anyway).
**Mocking strategy:** No mocks needed — `SceneStore` is already a plain object usable directly in
tests, per existing `drag.test.tsx`/`overlay.test.tsx` patterns.

**Critical regression test to add:** extend the existing Profiler-based test (0 React commits
during 25 pointer moves) to also perform a selection change mid-drag, confirming ADR-1 holds under
the combined scenario, not just each in isolation.

---

## Security & Performance

### Security

| Concern | Mitigation |
|---------|-----------|
| N/A — no new user input surface | Selection is driven by existing pointer events already validated by `pick.ts`'s distance-based lookup; no new parsing, no new network calls |

### Performance

| Concern | Target | Approach |
|---------|--------|---------|
| Drag responsiveness | 0 React commits across 25 pointer moves during drag (existing Profiler test) | Selection writes go through `SceneStore`'s existing imperative mutate path (ADR-1); extend the Profiler test to cover a drag-with-selection-change scenario |
| Frame budget | Existing < 16 ms frame / < 12 ms grid budgets unchanged | Orientation rotation is a fixed-cost transform in `coords.ts`, evaluated per point exactly as today's identity-ish transform is — no new per-frame allocation |
| Mobile sheet animation | 60fps expand/collapse | CSS transform-based (translateY), not layout-triggering properties; respects `prefers-reduced-motion` per UX |

### Observability

No new logging/metrics/tracing — module canon states this is "entirely client-side," and existing
fieldview code has no telemetry layer to extend.

---

## Implementation Sequence

1. **Foundation** *(blocking)* — `scene/selection.ts` (pure types + transition helpers),
   `SceneStore` selection field/subscriber (ADR-1), orientation rotation in `coords.ts` (ADR-2).
   These are independent of each other but both must land before shell UI work starts.
2. **Design tokens** *(depends on 1 only for timing convenience, not a hard dependency)* —
   `SHELL_TOKENS` in `render/tokens.ts`, Tailwind theme pass (ADR-6).
3. **Panel registry + panels** *(depends on 1)* — `panelRegistry.ts`, `useSelection.ts`, and the
   five panel components (`DefaultVisibilityPanel` migrating `OverlayRail` visibility toggles,
   `AdvancedSettingsPanel` migrating `AdvancedPanel`, three placeholder panels).
4. **Shell layout** *(depends on 2, 3)* — `ShellLayout.tsx`, `LeftSidebar.tsx`,
   `RightSidebarSlot.tsx`, `ToolRibbon.tsx`; wires desktop three-pane grid.
5. **Mobile bottom sheet** *(depends on 3, and reads the same registry as 4 — can start once 3 is
   done, does not need to wait for 4 to finish)* — `BottomSheet.tsx`.
6. **Page integration** *(depends on 4, 5)* — `Whiteboard.tsx` composes `ShellLayout` instead of
   its current direct composition; remove `OverlayRail.tsx`, `AdvancedPanel.tsx`,
   `SmallScreenNotice.tsx`; relocate `PresetMenu.tsx`.
7. **Verification pass** *(depends on 2)* — confirm `heatmap.ts`/`exportImage.ts`/`pick.ts` need no
   changes under rotated coordinates; extend Profiler test (ADR-1's regression test).
8. **Polish** *(depends on 6, 7)* — accessibility pass (keyboard nav, `aria-live` on panel swap,
   `aria-disabled` ribbon buttons), deployed-preview readiness.

**Parallel work opportunities:** Orientation (step 1's `coords.ts` half) and selection model (step
1's `SceneStore` half) touch disjoint files and can proceed in parallel. Panel components (step 3)
and Tailwind theme tokens (step 2) can also proceed in parallel once step 1 lands.

**Known implementation risks:**
- `FieldStage.tsx` may contain orientation-dependent chrome not yet inventoried — confirm during
  step 7, not assumed away.
- The 1024px breakpoint (UX's proposal) is unvalidated against a real tablet; Implementation
  Sequence step 8's deployed-preview review is where this gets corrected if wrong, not before.
