---
summary: "UX for the rework is already designed and approved as two HTML mockups (design/fieldview-watch-explore-mockup.html for phone/tablet, design/fieldview-desktop-mockup.html for desktop) styled to the Light Film Room system. Phone and tablet share one compact layout: a single 56/72 px top bar (hamburger + mode, setup chip or transport, legend, reset) over a full-width landscape field, with a slide-over drawer and a setup slide-over. Desktop adds tabs, an always-open right sidebar (setups or plays, options, advanced) and a dock under the field (selected-player card in Explore; transport and a 4-up scrolling filmstrip in Watch). Advanced settings and defense-following behaviour are deferred; the 'Defense follows' toggle is shown but marked coming soon. Build is a placeholder. These mockups, not prose, are the visual spec; this document records the flows, states, copy and rules around them."
phase: "ux"
when_to_load:
  - "When implementing or reviewing layout, states, copy, or responsive behaviour for fieldview-ui-rework."
depends_on:
  - "prd.md"
  - "design/fieldview-watch-explore-mockup.html"
  - "design/fieldview-desktop-mockup.html"
  - "style-guide/design.md"
modules:
  - "frontend/src/fieldview/ui"
  - "frontend/src/fieldview/render"
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

# UX Design: fieldview-ui-rework

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

**Primary goal:** a huddle of people around one phone can see the field, the pieces and the shading, and the coach can change the setup with one thumb.

**Constraints:**
- Landscape only (portrait shows a rotate message).
- Phone/tablet: the field is width-bound (110×40 yd = 2.75:1), so chrome lives in a single top bar, never a bottom bar.
- Style: Light Film Room (`style-guide/design.md`); light theme default (sun glare).
- No JS media queries; CSS-only frame switch (canon ADR-15, continued).
- Tablet reuses the phone layout (approved) — no expanded tablet variant.

---

## User Journeys & Touchpoints

### New player
**Entry:** link from a coach / the site's "Field View" nav. **First touchpoint:** Explore, heat visible, a preset loaded. **Key moment:** dragging a player and watching the heat shift. **Exit state:** can say why a lane is open. **Pain points:** unknown colour meaning → tappable legend; fat-finger dragging → lifted piece.

### Coach (presenting)
**Entry:** bookmark on a tablet. **First touchpoint:** Explore or Watch. **Key moment:** stepping a play frame by frame. **Pain points:** no signal at practice (offline is a later initiative); screen glare (light theme).

### Experienced player
**Key moment:** dragging players and reading the heat; colour-blind mode if needed. **Pain point:** no model sliders yet (deferred; the space under the Explore field is the planned home).

---

## Information Architecture

Authoritative tiers (from the mockups' "Where things live" tables):

| Tier | Explore | Watch |
|---|---|---|
| Always visible (compact) | ☰ menu · mode · setup chip (◀ ▶) · legend · reset | ☰ menu · mode · prev / play / next · progress dots · legend · play selector |
| Always visible (desktop) | tabs · legend · gear · right sidebar (setups, options) · selected-player card | tabs · legend · gear · right sidebar (plays, playback, advanced) · transport · filmstrip |
| One tap | setup list · colour guide · player ring | play list · jump to frame · pause |
| In the menu (compact) | modes · Defense follows (toggle, coming soon) · How to read the colours · Colour-blind mode · Back to Ultipedia | same minus Defense follows |
| Do later | Advanced settings (space-model sliders etc.) — intended home: the open space under the Explore field | — |
| Not in MVP UI | throw, cuts/routes, force, matchups, marquee, saved presets, present/fullscreen | — |

---

## Key User Flows

### Flow 1 — Explore: change the setup and drag
1. Land on `/fieldview/explore` (default setup loaded, heat on).
2. Tap the setup chip ◀ ▶ (or open the slide-over list on compact; click a row in the sidebar on desktop).
3. Drag a player. Piece lifts (touch) / follows cursor (mouse); heat repaints live.
4. *(Deferred behaviour)* The **Defense follows** toggle can be switched, but the defender does not yet trail; the toggle is labelled "coming soon".
5. The setup chip shows ✎; Reset restores the loaded setup.

### Flow 2 — Explore: learn the colours
Tap/click the legend → colour-guide popover explaining Closed / Contested / Strong space. Dismiss with ✕, Escape, or outside tap.

### Flow 3 — Watch: step a play
1. Open Watch; pick a play from the play selector (compact) / sidebar list (desktop).
2. Tap Next / Previous, or Play; progress dots and (desktop) filmstrip highlight the current frame.
3. Tap a dot / click a filmstrip frame to jump. Filmstrip scrolls sideways if the play has >4 frames.

### Flow 4 — Switch mode
Compact: ☰ → Watch / Explore / Build. Desktop: tabs. Build shows the placeholder.

### Flow 5 — Colour-blind mode
Compact: ☰ → Colour-blind mode switch. Desktop: gear → settings popover (colour-blind mode is its only MVP entry). Heat ramp and legend both change.

### Flow 6 — Portrait phone
Rotate message appears over the field; dismissible ("Continue anyway").

---

## UI States

- **Explore:** default · customised (✎) · dragging (lifted piece + ghost on touch) · piece selected (ring; desktop card shows stats) · drawer open · setup list open · colour guide open.
- **Watch:** idle at frame N · playing · paused · last frame (Next disabled or wraps if Loop) · play list open.
- **Build:** placeholder only.
- **Global:** portrait message · reduced motion (jump instead of animate) · empty/invalid play (a play that fails validation is skipped and reported, never crashes the page).

---

## Copy & Tone

Mono, uppercase micro-labels; plain-language body. Placeholders until Builder review:

- Legend: **Closed · Contested · Strong space**; colour-guide text derived from `space/constants.ts` / `explain.ts` (not from the mockup's "Tight / Open").
- Rotate message: "Rotate your phone to landscape for the best view." [Continue anyway]
- Build placeholder: "Play designer — coming in the next update. Use Explore to rearrange the field and Watch to run the included plays."
- Setup takeaways: one sentence each, Builder-authored (**placeholders** until supplied — see `docs/fieldview-placeholders.md`).
- Defense follows hint: "Coming soon".

---

## Visual Design Direction

Light Film Room: white/zinc, hard corners, `#be185d` interactive/selection, `#047857` on-states, Archivo Black headings, JetBrains Mono UI, Helvetica Neue body, graph-paper backdrop behind the field. Heat default red→amber→green; colour-blind orange→neutral→blue. Pieces: filled dark = offense, white + ring = defense. All values in `render/tokens.ts` or Tailwind `film.*` tokens.

---

## HTML/CSS Mock-Ups

Approved, in repo:
- `design/fieldview-watch-explore-mockup.html` — phone landscape (Explore, Watch, menu, setup picker, colour-blind mode) and tablet.
- `design/fieldview-desktop-mockup.html` — desktop Explore, Watch, Build placeholder, plus a phone→desktop mapping table.

Known mockup deviations to correct in implementation: legend wording (use Closed/Contested/Strong); mockup heat values are illustrative; mockup play/setup names and takeaways are placeholders.

---

## UX Consistency Patterns

- One content component per concept (SetupList, PlayList, Legend, SelectedPlayerCard, Options, PlaybackOptions, Transport, Filmstrip); two frames arrange them (canon ADR-14, continued).
- Lists show 5 rows and scroll (setups and plays); filmstrip shows 4 and scrolls.
- Active = pink left border + panel fill; on-state = green switch; primary = pink fill.
- Slot positions are identical across modes so nothing moves when switching.

---

## Responsive & Accessibility

- **Compact** (phone + tablet landscape): top bar 56 px (phone) / 72 px (tablet); 40/48 px buttons; drawers from the left (menu) and right (setups).
- **Desktop** (≥ ~1280×640): site header + Field View bar, 320 px right sidebar, dock under field. The mockup's "Advanced settings" row is **not** built (deferred).
- Touch targets ≥ 40 px visually, ≥ 44 px effective on the field.
- Keyboard: all menus, lists, tabs, transport and the legend popover reachable; Escape closes overlays; focus returns to the opener.
- `prefers-reduced-motion`: Watch jumps between frames; Explore follow stays instant (canon ADR-27 exception continues).
- Safe-area insets on bars and drawers.
