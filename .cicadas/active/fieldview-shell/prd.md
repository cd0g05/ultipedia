---
summary: "fieldview-shell rebuilds the Field View chrome around a three-pane 'Light Film Room' shell (persistent left sidebar, vertical central canvas, collapsible right sidebar), introduces a selection model in the store, and replaces the sub-768 blocking notice with a mobile bottom-sheet layout. It ships first because Initiatives B (play model), C (motion), and D (designer v2) all register their panels into this shell rather than building UI twice. No new features beyond navigation/selection chrome — throws, matchups, motion, and the frame designer are out of scope here."
phase: "clarify"
when_to_load:
  - "When defining or reviewing fieldview-shell goals, scope, success criteria, and risks."
  - "When validating that shell implementation still aligns with being a registry other initiatives plug into."
depends_on:
  - ".cicadas/canon/modules/fieldview.md"
  - ".cicadas/drafts/fieldview-roadmap.md"
modules:
  - "frontend/src/fieldview"
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

# PRD: fieldview-shell

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

Field View's coaching whiteboard and play designer currently run inside a horizontal-field, ad-hoc
layout (`OverlayRail`, `AdvancedPanel`, `PresetMenu`) that blocks mobile entirely below 768px.
fieldview-shell replaces that chrome with a vertical-field, three-pane "Light Film Room" shell — a
persistent contextual left sidebar, a central canvas, and a collapsible right sidebar slot — plus a
mobile bottom-sheet layout, so coaches can pull the tool up at practice on a phone. This is
infrastructure: it introduces the selection model and panel-registry contract that Initiatives B
(play model), C (motion), and D (designer v2) build their features against.

### What Makes This Special

- **Register, don't hardcode** — the left sidebar is a context registry that later initiatives
  plug panels into by selection state, so B/C/D never touch shell layout code.
- **Vertical-first** — offense attacks upward on all viewports, which is both the client's
  explicit final answer for mobile and a deliberate departure from the existing horizontal field.
- **Mobile is a primary use case, not an afterthought** — retires the `SmallScreenNotice` that
  currently blocks phones by design; a coach standing on a field with a phone is the target user,
  not an edge case.

## Project Classification

**Technical Type:** Client-side web UI shell (React SPA module)
**Domain:** Sports coaching tool (frontend layout, design system, mobile responsiveness)
**Complexity:** Medium — no new data model or physics, but it touches every existing UI surface in
`fieldview/ui/` and `pages/`, changes field orientation (a coordinate transform consumed by
`pick.ts`, `heatmap.ts`, `exportImage.ts`), and must not regress the ADR-2 no-React-in-drag-path
invariant.
**Project Context:** Brownfield — `frontend/src/fieldview` already ships `Whiteboard.tsx` and
`Designer.tsx`; this initiative overhauls their surrounding chrome, not their core scene model.

---

## Success Criteria

### User Success

A user achieves success when they can:

1. **Use Field View on a phone at practice** — field fills the viewport vertically, controls are
   reachable via a bottom sheet, no landscape prompt or blocking notice appears below 768px.
2. **Find the right controls by what's selected** — selecting nothing, an offensive player, a
   defensive player, or the mark shows a different, relevant middle-sidebar panel without hunting
   through menus.
3. **Recognize the tool as a coherent product** — every surface (whiteboard, designer entry point,
   advanced settings) shares the same zero-radius, high-contrast, monospace-accented visual
   language.

### Technical Success

The system is successful when:

1. Field orientation is a single transform in `render/coords.ts`; `scene/` stays orientation-agnostic
   (yards, not pixels) and no consumer of `coords.ts` (`pick.ts`, `heatmap.ts`, `exportImage.ts`)
   needs its own orientation logic.
2. Selection state lives in the store (mutable subscribe-store, per ADR-2) and the left sidebar
   subscribes to it — no selection state is lifted into React state that would reintroduce
   per-frame React commits.
3. The left sidebar exposes a panel-registration contract that Initiatives B/C/D can call into
   without modifying shell files.

### Measurable Outcomes

- 0 blocked viewports: the `<768px` `SmallScreenNotice` gate is removed; Field View is usable start
  to finish on a phone-width viewport.
- The existing Profiler test (0 React commits across 25 pointer moves during a drag) still passes
  after selection-model and shell changes land.
- All existing 229 fieldview tests still pass, plus new tests for orientation transform, selection
  model, and responsive shell states.

---

## User Journeys

### Journey 1: Coach at Practice — Mobile First Use

A coach is standing on the sideline with a phone, wanting to quickly rough out a play mid-practice
without pulling out a laptop. They open Field View on their phone. The field fills nearly the whole
screen, oriented vertically with their offense attacking up-field the way they'd sketch it on a
whiteboard. They drag a player, and a bottom sheet slides up with the same context-aware options a
desktop user would see in the left sidebar. They never see a "rotate your device" prompt or a
"screen too small" wall — the tool just works.

**Requirements Revealed:** vertical field orientation on all viewports; mobile bottom-sheet layout
replacing `SmallScreenNotice`; the sidebar's contextual content must be viewport-portable (same
panel-registry data, different chrome).

---

### Journey 2: Coach at a Desk — Selection-Driven Sidebar

A coach is prepping a scouting report at a desk. With nothing selected, the left sidebar shows
offense/defense visibility toggles. They click a defensive player — the middle section swaps to
show that player's context (today: a placeholder pending Initiative B's matchup UI, since B has not
landed yet). They click empty canvas to deselect, and the sidebar reverts. They open Advanced
Settings from the bottom menu, and it slides up to fully replace the left sidebar until they close
it.

**Requirements Revealed:** selection model in the store (none / single / multi); the left sidebar's
middle section swaps content by selection state; bottom system menus (Advanced Settings, Play
Designer button) override the full sidebar when opened; the sidebar is a registry so later
initiatives can add their own panels for the same selection states without this initiative needing
to anticipate every future panel's contents.

---

### Journey Requirements Summary

| User Type | Key Requirements |
|-----------|-----------------|
| **Mobile coach (in-practice)** | vertical field on all viewports, bottom-sheet controls, no `<768px` block, touch-sized targets |
| **Desk coach (prep/review)** | three-pane shell, selection-driven middle sidebar, top tool ribbon, bottom system menus, Light Film Room visual system |

---

## Scope

### MVP — Minimum Viable Product (v1)

**Core Deliverables:**
- Vertical field orientation (offense attacks upward) via a single `coords.ts` transform, propagated
  through `pick.ts`, `heatmap.ts`, `exportImage.ts`.
- "Light Film Room" design system applied across all fieldview UI: zero border-radius, white/zinc
  grounds with 1px zinc borders, dark pink (`#be185d`) accent, monospace UI/data text, bold
  geometric sans headers (Archivo Black — already shipped in the tweak; see roadmap risk log).
- Three-pane shell: persistent left sidebar, central canvas, collapsible right sidebar slot (empty
  in this initiative — Initiative D fills it).
- Selection model in the store: none, single offensive player, single defensive player, the mark,
  multi-select — exposed for the left sidebar and future initiatives to read.
- Left sidebar: fixed top row of 4 side-by-side tool buttons (marquee select, throw-to-player, advanced-stats toggle,
  space-view toggle — **as UI affordances only**; throw-to-player and advanced-stats data wiring are
  Initiative B/C scope, this initiative provides the button and the panel-swap contract, not the
  feature logic) — the ribbon buttons for not-yet-built features are present but visibly inert
  (disabled state with a "coming soon" affordance) rather than fully wired, since B/C/D have not
  shipped; a middle section swapping between default (offense/defense visibility toggles),
  offensive-player, defensive-player, and mark contexts (placeholder content where B has not landed
  matchup/mark logic yet); bottom system menus (Advanced Settings slide-up, Play Designer button).
- Left sidebar exposes a **panel-registration contract** (a typed registry keyed by selection state)
  so B/C/D can add real panel content later without editing shell files.
- Mobile layout: vertical field fills the viewport, controls live in a bottom sheet/drawer; retires
  `SmallScreenNotice`.
- Migration of existing `OverlayRail` / `AdvancedPanel` / `PresetMenu` content into the new shell
  panels.

**Quality Gates:**
- ADR-2 invariant preserved: existing Profiler test (0 React commits during drag) still passes.
- All 229 existing fieldview tests pass; new tests cover orientation transform, selection model
  state machine, and responsive shell states (mobile bottom sheet vs. desktop three-pane).
- Deployed preview reviewed by the client before this initiative is considered complete (per
  roadmap's "Client review cadence" risk).

### Growth Features (Post-MVP)

**v2 (Initiative B): fieldview-play-model**
- Real throw-to-player logic, matchup assignment, mark force-side/angle controls — populate the
  panels this initiative stubs.

**v3 (Initiative C): fieldview-motion**
- Auto-tracking defenders, physics-based movement, tuning sliders in the Advanced Settings panel
  this initiative builds.

**v4 (Initiative D): fieldview-designer-v2**
- Frame-based play designer filling the right sidebar slot this initiative reserves but leaves
  empty (Play Designer button in this initiative may open the *existing* `Designer.tsx` page
  unchanged, or a placeholder, until D ships — see Open Questions).

### Vision (Future)

- Fully live left-sidebar panels for every selection state, populated across B/C/D.
- Right sidebar permanently hosting the frame-based designer (Initiative D).

---

## Functional Requirements

### 1. Field Orientation

**FR-1.1:** The field renders vertically with offense attacking upward, on every viewport size (no
horizontal-field fallback).
- Implemented as a single coordinate transform in `render/coords.ts`; `scene/` remains in yards and
  orientation-agnostic.

**FR-1.2:** `pick.ts`, `heatmap.ts`, and `exportImage.ts` consume the transformed coordinates
correctly — hit-testing, heatmap painting, and PNG export all reflect vertical orientation with no
independent orientation logic of their own.

---

### 2. Design System

**FR-2.1:** All fieldview UI surfaces (shell chrome, sidebars, buttons, panels, canvas frame) use
zero border-radius, white (`#ffffff`) / zinc (`#f4f4f5`) grounds separated by 1px zinc
(`#d4d4d8`) borders, and dark pink (`#be185d`) as the sole accent color.

**FR-2.2:** UI and data labels use a monospace font (JetBrains Mono); headers use the existing
self-hosted Archivo Black (single-weight — no `font-bold` on `font-heading` elements, per the
roadmap's closed typography decision).

**FR-2.3:** The design system is executed as a `render/tokens.ts` + Tailwind theme pass — a token
edit changes visuals everywhere consuming it, not a per-component sweep.

---

### 3. Three-Pane Shell

**FR-3.1:** Desktop layout is three panes: persistent left sidebar, central canvas, right sidebar
slot that is collapsible and empty by default (reserved for Initiative D).

**FR-3.2:** The right sidebar slot can be toggled open/closed via the Play Designer button in the
left sidebar's bottom system menu, even though its content is a placeholder in this initiative.

---

### 4. Selection Model

**FR-4.1:** The store exposes selection state: none, single offensive player, single defensive
player, the mark, or multi-select — as mutable subscribe-store state (not React state), consistent
with ADR-2.

**FR-4.2:** Selection changes (click a player, click empty canvas, marquee-drag) update this state
without causing per-frame React re-renders during drag.

**FR-4.3:** The left sidebar's middle section subscribes to selection state and swaps its displayed
panel accordingly.

---

### 5. Left Sidebar

**FR-5.1:** A fixed top row of 4 side-by-side tool buttons exposes: Marquee Selection, Throw to Player, Toggle Advanced
Stats View, Toggle Space View. Buttons for logic not yet implemented (Throw to Player wiring,
Advanced Stats data) render in a visibly disabled/"coming soon" state rather than silently doing
nothing.

**FR-5.2:** The middle section shows, by selection state: default (offense/defense visibility
toggles) when none or multiple players are selected; an offensive-player panel; a defensive-player
panel; a mark panel. Content for panels whose underlying feature (matchups, mark controls) has not
shipped yet is a labeled placeholder, not blank space.

**FR-5.3:** The middle section is implemented as a **panel registry** — a keyed lookup from
selection-state to a rendered panel — so Initiatives B/C/D can register real panels without editing
sidebar layout code.

**FR-5.4:** Bottom system menus: an Advanced Settings entry that slides a settings panel up to fully
replace the left sidebar's contents until dismissed; a Play Designer button that opens/closes the
right sidebar slot.

**FR-5.5:** Existing `OverlayRail`, `AdvancedPanel`, and `PresetMenu` content is migrated into the
appropriate new shell panel (ribbon, middle-section default state, or bottom Advanced Settings) —
no existing overlay/preset control is dropped.

---

### 6. Mobile Layout

**FR-6.1:** Below the desktop breakpoint, the field fills the viewport and all sidebar content
(ribbon, middle section, bottom menus) surfaces through a bottom sheet / drawer rather than a
persistent sidebar.

**FR-6.2:** The `<768px` `SmallScreenNotice` blocking gate is removed entirely; there is no minimum
viewport width below which Field View refuses to render.

**FR-6.3:** No landscape-orientation prompt is shown; the vertical field layout is the answer for
all orientations and viewport widths.

---

## Non-Functional Requirements

- **Performance:** The existing Profiler-based test (0 React commits across 25 pointer moves during
  a drag) must continue to pass; selection-model reads/writes go through the mutable store, never
  through React state, during any per-frame path.
- **Reliability:** Orientation transform and selection-state changes must not corrupt in-progress
  drags; store subscriptions must not leak across mount/unmount of shell panels.
- **Security:** N/A — no new network calls, no new user input beyond existing client-side
  interactions; this remains entirely client-side per module canon.
- **Maintainability:** Panel registry must be typed such that a downstream initiative registering a
  panel for an unhandled selection state fails at compile time, not silently at runtime. All new
  visual constants route through `render/tokens.ts`, never inlined in components.

---

## Open Questions

All four resolved by Builder decision on 2026-07-30:

- **Play Designer button target** — RESOLVED: opens the right-sidebar slot showing a labeled
  placeholder ("Play Designer — coming in a future update"). The existing `Designer.tsx` page stays
  reachable at its current route unchanged until Initiative D ships.
- **Disabled-ribbon-button treatment** — RESOLVED: Throw to Player and Advanced Stats Toggle render
  in the 4-button ribbon now, in a visibly disabled state with an explanatory tooltip, so the full
  intended shell shape is visible even before B/C ship.
- **`Field View UI Ideas - Gemini.html`** — RESOLVED: used only as loose layout/visual inspiration
  (grid proportions, data-table styling for inspector-style panels) during UX drafting — not a
  source of truth, and it disagrees with closed decisions (it uses Oswald, not Archivo Black; it
  mocks a horizontal field, not vertical). The file itself is left as-is in the repo root pending a
  separate cleanup decision by the Builder (out of scope for this initiative).
- **Breakpoint value** — RESOLVED: UX drafting will propose a value (not necessarily 768px) since
  the three-pane shell is denser than the old rail; see `ux.md` Responsive & Accessibility section.

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Selection model gets implemented as React state under time pressure, silently reintroducing per-frame commits and breaking ADR-2 | Medium | High | Keep the existing Profiler test in the suite and run it as a gate before merging the selection-model partition; store-only selection state is a stated Technical Success criterion |
| Orientation transform leaks into `scene/`, coupling the pure model to a rendering choice | Low | High | FR-1.1 explicitly confines the transform to `coords.ts`; code review checks no orientation logic appears in `scene/` |
| Client re-reviews the deployed preview and rejects icon sizing or layout density again (per the still-open tweak tension) | Medium | Medium | Roadmap's cross-cutting risk already flags this; this initiative's own deployed-preview review (Success Criteria, Quality Gates) is the checkpoint that catches it before Initiative B starts |
| Placeholder panels (matchup, mark controls) look unfinished or confuse the client during review | Medium | Low | FR-5.2 requires labeled placeholders, not blank space, so the client understands what's pending vs. broken |
| Mobile bottom-sheet reimplements rather than reuses the panel-registry data, causing drift between mobile and desktop panel content | Medium | Medium | FR-6.1 requires the same registry data render through different chrome — tech-design should specify one data source, two presentational shells |
