---
summary: "Desktop is a fixed three-pane grid (280px left sidebar / fluid canvas / 320px right slot) built to a 1024px breakpoint; below it the field goes full-viewport and all sidebar content collapses into a tabbed bottom sheet (TOOLS / SELECTION / SETTINGS) reachable via a persistent handle bar. Visual system: zero-radius, white/zinc grounds, 1px zinc borders, dark pink #be185d accent, JetBrains Mono for UI/data, Archivo Black (single-weight, no font-bold) for headers. Play Designer button opens the right slot to a labeled placeholder; not-yet-shipped ribbon buttons (Throw to Player, Advanced Stats) render visibly disabled with a tooltip."
phase: "ux"
when_to_load:
  - "When designing or reviewing the shell layout, sidebar panel states, mobile bottom sheet, or visual tokens."
  - "When implementation questions depend on exact breakpoint, panel content, or copy rather than product goals alone."
depends_on:
  - "prd.md"
modules:
  - "frontend/src/fieldview/ui"
  - "frontend/src/fieldview/render/tokens.ts"
  - "frontend/src/fieldview/pages"
index:
  design_goals: "## Design Goals & Constraints"
  journeys: "## User Journeys & Touchpoints"
  information_architecture: "## Information Architecture"
  key_flows: "## Key User Flows"
  ui_states: "## UI States"
  copy_tone: "## Copy & Tone"
  visual_design: "## Visual Design Direction"
  mockups: "## HTML/CSS Mock-Ups"
  consistency: "## UX Consistency Patterns"
  accessibility: "## Responsive & Accessibility"
next_section: "Design Goals & Constraints"
---

# UX Design: fieldview-shell

## Progress

- [x] Design Goals & Constraints
- [x] User Journeys & Touchpoints
- [x] Information Architecture
- [x] Key User Flows
- [x] UI States
- [x] Copy & Tone
- [x] Visual Design Direction
- [x] HTML/CSS Mock-Ups
- [x] UX Consistency Patterns
- [x] Responsive & Accessibility

---

## Design Goals & Constraints

**Primary goal:** A coach glances at the tool and immediately reads it as a precision instrument —
"light film room," not a toy whiteboard. On mobile, the same coach should feel like nothing was
compromised to fit the phone: the field dominates, controls are one thumb-reach away.

**Design constraints:**
- Platform targets: desktop (mouse/trackpad, wide viewport) and mobile web (touch, phone-width
  viewport, primary in-practice use case). Tablet is not a distinct target — it falls on whichever
  side of the breakpoint its width lands on.
- Design system: brand-new for this initiative — "Light Film Room" (see Visual Design Direction).
  No prior fieldview design system to preserve; current `OverlayRail`/`AdvancedPanel`/`PresetMenu`
  visuals are being replaced, not extended.
- Technical constraint: the left sidebar's middle-section content is store-driven (selection state
  lives in the mutable subscribe-store per ADR-2), so panel swaps must be implementable as a
  subscription, not a React-state-driven conditional that could tempt lifting drag state into React.
- `Field View UI Ideas - Gemini.html` (repo root) used only as loose layout/proportion inspiration
  (grid column widths, data-table styling for inspector-style panels) — its font (Oswald) and
  horizontal field are superseded by this initiative's closed decisions and not carried forward.

---

## User Journeys & Touchpoints

### Coach at Practice — Mobile First Use

**Entry point:** Opens `/fieldview` on a phone browser at practice, likely from a bookmarked link.
**First touchpoint:** Field fills nearly the whole screen, vertical, offense attacking up. A thin
handle bar sits at the bottom with tool icons.
**Key moment:** They drag a player with a thumb, tap the handle bar, and a bottom sheet slides up
with the same tools a desktop user has — no rotate-device prompt, no "screen too small" wall.
**Exit state:** They've roughed out a look and can dismiss the sheet to see the full field again.
**Pain points to design around:** Thumb obscuring the drag target near the bottom of the sheet;
accidental sheet-dismiss while trying to drag near the bottom edge of the field.

### Coach at a Desk — Selection-Driven Sidebar

**Entry point:** Opens `/fieldview` on a laptop to prep a scouting report.
**First touchpoint:** Three-pane shell: left sidebar with a row of 4 tool buttons and default visibility
toggles, empty canvas center, no right sidebar open.
**Key moment:** Clicking a defensive player swaps the sidebar's middle section to that player's
context — even though its real content (matchup assignment) is a placeholder until Initiative B.
**Exit state:** They open Advanced Settings, review tuning options, close it, and the sidebar
returns to selection-driven mode.
**Pain points to design around:** A placeholder panel reading as broken rather than "not yet built";
losing track of what's selected after opening/closing Advanced Settings.

---

## Information Architecture

### Site/App Map

```
/fieldview (Whiteboard, shell-wrapped)
├── Left Sidebar (persistent, desktop) / Bottom Sheet (mobile)
│   ├── Top Ribbon: Marquee · Throw to Player (disabled) · Advanced Stats (disabled) · Space View
│   ├── Middle Section (selection-driven)
│   │   ├── Default: Offense/Defense visibility toggles
│   │   ├── Offensive player selected: placeholder panel
│   │   ├── Defensive player selected: placeholder panel
│   │   └── Mark selected: placeholder panel
│   └── Bottom Menus: Advanced Settings (slide-up override) · Play Designer (toggles right slot)
├── Center Canvas: vertical field, offense attacking up
└── Right Sidebar Slot (collapsible, closed by default)
    └── Play Designer placeholder ("coming in a future update")

/fieldview/designer (existing Designer.tsx, unchanged, still directly reachable)
```

### Navigation Model

**Primary nav:** None beyond the existing app-level nav (Field View is a single page area within
the broader encyclopedia SPA). Within Field View, the shell itself is the "navigation" — panels
swap in place rather than routing.
**Secondary nav:** Tabs inside the mobile bottom sheet (TOOLS / SELECTION / SETTINGS) stand in for
the desktop's always-visible ribbon + middle section + bottom menus.
**Key entry points:** Direct link to `/fieldview` (redirected from legacy `/field-view` per the
already-shipped tweak); the encyclopedia layout's nav link.

---

## Key User Flows

### Flow 1: Select a Player, See Contextual Panel (Desktop, Happy Path)

1. Coach clicks a defensive player on the canvas.
2. Store selection state updates to `{ type: "defense", id }`.
3. Left sidebar's middle section subscribes to the change and swaps from the default
   visibility-toggle view to the defensive-player placeholder panel.
4. Coach clicks empty canvas.
5. Selection resets to `none`; sidebar reverts to the default view.

**Alternate path A:** Coach marquee-drags over multiple players → selection state is `multi`;
sidebar shows the same default view as `none` (per FR-4.1/FR-5.2 — multi and none share a view in
this initiative; per-player-in-multi-set actions are out of scope until B/C add them).
**Alternate path B:** Coach clicks the Advanced Settings menu while a player is selected → the
settings panel fully overrides the middle section; closing it restores whatever the current
selection state's panel is (selection state itself is untouched while Advanced Settings is open).

### Flow 2: Mobile Bottom Sheet Open/Close

1. Coach taps the collapsed handle bar at the bottom of the screen.
2. Sheet expands to ~46% of viewport height, defaulting to the TOOLS tab.
3. Coach taps SELECTION tab (only meaningfully populated once something is selected — see UI
   States) or SETTINGS tab.
4. Coach drags the sheet's grabber down, or taps the handle bar again, to collapse it back to the
   thin handle.

**Alternate path A:** Coach selects a player while the sheet is collapsed → sheet does not
auto-expand (avoids yanking the field out from under a drag); a small indicator dot appears on the
SELECTION tab position in the handle bar to signal there's now contextual content waiting.

### Flow 3: Open Play Designer Slot (Desktop)

1. Coach clicks "PLAY DESIGNER" in the left sidebar's bottom menu.
2. Right sidebar slot slides in from the right, 320px wide, showing the placeholder.
3. Coach clicks the "✕" in the slot's header, or the Play Designer button again, to close it.

**Alternate path A (mobile):** Play Designer button opens the placeholder as a full-screen
overlay rather than a 320px slot (there is no room for a persistent third pane on a phone
viewport) — see UI States.

---

## UI States

### Left Sidebar — Middle Section (Desktop)

| State | Trigger | What the User Sees |
|-------|---------|--------------------|
| **Default** | No selection, or multi-select | Offense/Defense visibility toggle row |
| **Offensive player selected** | Click an offense piece | Placeholder panel, tagged "PENDING FIELDVIEW-PLAY-MODEL" |
| **Defensive player selected** | Click a defense piece | Placeholder panel, tagged "PENDING FIELDVIEW-PLAY-MODEL" |
| **Mark selected** | Click the mark piece | Placeholder panel, tagged "PENDING FIELDVIEW-PLAY-MODEL" |
| **Advanced Settings open** | Click bottom-menu "Advanced Settings" | Settings panel slides up, fully replacing ribbon+middle+bottom-menu content; a "← Back" affordance returns to the prior view |

### Right Sidebar Slot

| State | Trigger | What the User Sees |
|-------|---------|--------------------|
| **Closed** | Default; or "✕" clicked | No slot rendered; canvas area fills the freed width |
| **Open — placeholder** | "Play Designer" clicked | 320px slot, header "Play Designer" + close button, body: "Play Designer — coming in a future update." + link to `/fieldview/designer` |

### Mobile Bottom Sheet

| State | Trigger | What the User Sees |
|-------|---------|--------------------|
| **Collapsed (default)** | Page load, or sheet dismissed | Thin handle bar with ribbon icons only, field fills the rest of the viewport |
| **Expanded** | Tap handle bar, or drag grabber up | Sheet covers ~46% of viewport height; three tabs (TOOLS / SELECTION / SETTINGS) |
| **Selection tab, empty** | SELECTION tab tapped, nothing selected | "Select a player on the field to see options here." message, not a blank panel |
| **Selection tab, populated** | A player is selected while sheet is open (or reopened after a selection) | Same placeholder panel content as desktop's middle section |
| **Play Designer overlay** | "Play Designer" tapped | Full-screen overlay (not a slot — no room on phone width) with the same placeholder copy + close (✕) |

### Small-Viewport Transition (No Longer Blocked)

| State | Trigger | What the User Sees |
|-------|---------|--------------------|
| **Removed: SmallScreenNotice** | N/A | This state no longer exists below any breakpoint — see Responsive & Accessibility for the replacement |

---

## Copy & Tone

**Voice:** Direct, technical, monospace-flavored — like reading a stat sheet, not a marketing page.
No exclamation points, no "Oops!"-style error copy.

**Key principles:**
- Never imply a feature is broken when it's simply not shipped yet — placeholders always name what's
  coming and, where relevant, which initiative it ships with, phrased for a coach (not "Initiative
  B" jargon) as "a future update."
- Tooltips on disabled buttons state what's missing, not just "disabled."
- All-caps is reserved for UI chrome labels (buttons, tab names, section labels) per the monospace
  "data readout" feel — not for body copy or placeholder explanations, which use normal sentence
  case for readability.

**Critical copy samples:**

| Context | Copy |
|---------|------|
| Play Designer placeholder | `Play Designer — coming in a future update. The existing designer is still available at /fieldview/designer.` |
| Throw to Player tooltip (disabled) | `Ships in a future update.` |
| Advanced Stats tooltip (disabled) | `Ships in a future update.` |
| Mobile selection tab, empty | `Select a player on the field to see options here.` |
| Offensive/defensive/mark placeholder panel | `Matchup and mark controls ship in a future update.` |

---

## Visual Design Direction

**Style:** "Light Film Room" — minimal, grid-based, data-dense but not cluttered. Think a
broadcast telestrator crossed with a terminal.
**Color palette:** Grounds `#ffffff` (base) and `#f4f4f5` (panel), separated by 1px `#d4d4d8`
borders. Single accent: dark pink `#be185d` for the active/selected/primary-action state. No
secondary accent color — status is communicated by position and label, not a second hue (existing
module convention: "Colour is never the sole carrier of meaning").
**Typography:** JetBrains Mono for all UI chrome, buttons, labels, and data values. Archivo Black
for headers — single-weight (`font-heading` elements never use `font-bold`, per the roadmap's
closed typography decision from the shipped tweak).
**Spacing & density:** Compact — 8px/16px spacing scale, thin 1px dividers rather than whitespace,
consistent with the "dense data-rich" brief from `field-view-changes.md`.
**Existing design system:** None to preserve — this establishes the system. `render/tokens.ts` and
a Tailwind theme pass are the single choke point (existing module convention ADR-9/ADR-10):
changing the accent color or spacing scale is a token edit, not a component sweep.
**Note — accent color conflict to resolve in tech-design:** current `PIECE_TOKENS`/`FIELD_TOKENS`
use `#EF4B8A` (film-accentPink) as the existing accent; this initiative's accent is `#be185d`
(darker pink). Tech-design must decide whether `#EF4B8A` is retired in favor of `#be185d`
everywhere, or whether piece/field accents and shell-chrome accent are allowed to diverge
intentionally (unlikely, but the discrepancy must be resolved explicitly, not left as an oversight).

**Mood reference:** A coach's tablet-based film review tool — precise, quiet, monochrome-plus-one
accent, not "friendly app."

---

## HTML/CSS Mock-Ups

### Mock-Up 1: Desktop Three-Pane Shell

**Artifact path:** `.cicadas/drafts/fieldview-shell/mockups/desktop-shell.html`
**Viewport target:** ≥1024px desktop (see Responsive & Accessibility for the exact breakpoint
rationale)
**Purpose:** Makes concrete the three-pane grid (280px left / fluid canvas / 320px right),
top ribbon with a disabled-button + tooltip treatment, selection-driven middle section (default
state + one example contextual placeholder), bottom system menus, and the Play Designer
placeholder slot.
**Notes:** Field is drawn vertical with an "ATTACKING ↑" label per FR-1.1. Piece colors reuse the
existing offense-green/defense-red convention from `PIECE_TOKENS` (unaffected by this initiative);
only shell chrome changes color scheme. This is a static mock — real implementation drives ribbon
and panel state from the store, not inline HTML.

### Mock-Up 2: Mobile Bottom Sheet (Expanded)

**Artifact path:** `.cicadas/drafts/fieldview-shell/mockups/mobile-bottom-sheet.html`
**Viewport target:** 390px width reference (iPhone-class phone; representative of the primary
in-practice mobile use case)
**Purpose:** Makes concrete the full-viewport vertical field with the bottom sheet expanded to
~46% height, its three-tab structure (TOOLS / SELECTION / SETTINGS), and the grabber/handle
interaction model.
**Notes:** The mock shows the sheet already expanded for review purposes; the collapsed
handle-bar-only state is described in UI States above and should be built as the default. Sheet
height (~46%) is a starting proposal for tech-design/implementation to validate against real
content once panels are non-placeholder.

---

## UX Consistency Patterns

### Button Hierarchy
- **Primary action:** Solid `#be185d` fill, white text — reserved for exactly one action per
  context (e.g., "PLAY DESIGNER" in the bottom menu).
- **Secondary action:** White fill, 1px zinc border, black text — the ribbon buttons, toggle rows,
  and Advanced Settings entry.
- **Destructive action:** Not present in this initiative's scope (no delete/remove flows in the
  shell itself).

### Feedback Patterns
- **Success:** Not applicable at the shell layer (no async operations here — purely client-side
  layout/selection state).
- **Error:** Not applicable — no user input in this initiative can fail (no forms, no network).
- **Warning:** Disabled-button tooltips are the only "this isn't available" signal — treated as
  informational, not a warning-styled callout.
- **Info:** Placeholder panels use a dashed border + small pink "PENDING …" tag, consistent across
  every not-yet-shipped panel.

### Form Patterns
N/A — no forms in this initiative.

### Navigation Patterns
- **Active state:** Selected ribbon buttons and active toggle-row options use the pink accent
  border/fill; inactive/available-but-unselected options stay in the neutral zinc/white scheme.
- **Back navigation:** The Advanced Settings override includes an explicit "← Back" affordance
  rather than relying on browser back (this is in-page panel state, not routing).

### Modal & Overlay Patterns
- **When to use modals:** None in this initiative — the right sidebar slot and mobile Play
  Designer overlay are panel-level, not blocking modals; dismissible without losing field state.
- **Dismissal:** Explicit "✕" click, or re-clicking the button that opened the panel (Play
  Designer button toggles).

---

## Responsive & Accessibility

**Breakpoints:**

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile | `< 1024px` | Full-viewport vertical field; bottom sheet (collapsed by default) hosts all sidebar content via TOOLS/SELECTION/SETTINGS tabs; Play Designer opens as a full-screen overlay |
| Desktop | `≥ 1024px` | Three-pane grid: 280px left sidebar, fluid center canvas, 320px right slot (collapsed by default) |

**Breakpoint rationale (resolving the PRD's open question):** the old `768px` `SmallScreenNotice`
threshold was calibrated to "block phones, allow tablets to squeeze into the old single-rail
layout." The new shell is a genuine three-pane grid (280px + 320px of fixed sidebar width alone),
which does not comfortably fit until roughly 1024px — below that, even most tablets in portrait
would show a cramped, useless left sidebar rather than a working one. `1024px` is proposed as the
single shell breakpoint; there is no intermediate tablet layout — anything under 1024px gets the
full mobile bottom-sheet treatment, which is deliberately viewport-agnostic (it works at both
390px and 820px). This value should be validated against a real tablet during the deployed-preview
review (per PRD Quality Gates) and adjusted if a tablet-width bottom sheet feels wrong.

**Accessibility standards:** WCAG 2.1 AA.

**Key requirements:**
- Keyboard navigation: full — ribbon buttons, toggle rows, and bottom-menu buttons are all
  reachable and operable via keyboard (Tab/Enter/Space); disabled buttons are `aria-disabled` and
  removed from the tab order's activation (but remain focusable enough to expose the tooltip via
  keyboard focus, not just hover).
- Screen reader support: required — panel swaps in the middle section must announce via
  `aria-live="polite"` so a screen-reader user knows the sidebar content changed on selection.
- Color contrast: AA minimum — verified for `#be185d` on `#ffffff`/`#f4f4f5` grounds and for
  `#18181b` body text on both grounds (all pass AA at normal text size; large-text-only pairs, if
  any emerge during implementation, must be flagged).
- Touch targets: 44×44px minimum on mobile — ribbon icons in the collapsed handle bar and sheet
  tabs must meet this even though the desktop mock draws them smaller for density.
- Reduced motion: respect `prefers-reduced-motion` — the right-sidebar slide-in, mobile sheet
  expand/collapse, and Advanced Settings slide-up all become instant show/hide rather than
  animated transitions when the user has this preference set.
