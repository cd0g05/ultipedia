---
summary: "fieldview-ui-rework replaces Field View's presentation layer with the approved Watch / Explore / Build layouts for phone, tablet and desktop. The field flips from vertical to horizontal; the three-pane shell, bottom sheet and tool ribbon are retired in favour of one top bar plus (on desktop) a sidebar and dock; the heatmap is always on with a colour-blind mode; Watch plays curated multi-frame plays; Build is a placeholder. The space, motion, scene and play models are unchanged — the only new model-adjacent wiring is a Watch playback layer over the existing keyframe format. 'Defense follows' ships as a persisted toggle only — the following behaviour itself is deferred until the rest is complete — and Advanced settings are deferred entirely. Throw, marquee, force, matchup, cut/route UI, saved presets, defense-following behaviour and Advanced settings are deliberately left out of the MVP UI but retained in code and catalogued in the backlog."
phase: "clarify"
when_to_load:
  - "When defining or reviewing fieldview-ui-rework goals, scope, success criteria, and risks."
  - "When checking whether the new UI still matches the approved mockups and decisions D1–D9."
depends_on:
  - "docs/fieldview-ui-rework-plan.md"
  - "docs/fieldview-backlog.md"
  - "design/fieldview-watch-explore-mockup.html"
  - "design/fieldview-desktop-mockup.html"
  - ".cicadas/canon/modules/fieldview.md"
modules:
  - "frontend/src/fieldview"
  - "frontend/src/encyclopedia/components/Layout.tsx"
  - "frontend/src/router.tsx"
  - "frontend/tailwind.config.js"
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

# PRD: fieldview-ui-rework

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

Field View's algorithms (space heatmap, motion, matchups, play format) work, but its presentation was
built for a vertical field and a desktop-first three-pane shell. This initiative replaces that
presentation with the approved **Watch / Explore / Build** layouts — a coach demonstrates spacing on
a phone or tablet in a huddle; a teammate drags players around on their own device; a coach designs
on a laptop (designer itself is a later initiative).

### What Makes This Special

- **The field is the product.** One top bar, no bottom bar, field fills the rest. Everything else
  folds into a menu (phone/tablet) or an always-open sidebar (desktop).
- **Built for a huddle.** Landscape, light theme, large pieces, a red→amber→green heat that is also
  available in a colour-blind palette.
- **Same model, new face.** The heatmap, pursuit and play format are reused as-is; this is a UI
  initiative, not an algorithm one.

## Project Classification

**Technical Type:** Client-side single-page web app UI (React, Tailwind, SVG + canvas)
**Domain:** Sports coaching / ultimate frisbee education
**Complexity:** High — orientation flip touches every render path; ~17 shell-coupled test files are rewritten; touch ergonomics cannot be verified in jsdom
**Project Context:** Brownfield. `frontend/src/fieldview/` already ships a vertical-field three-pane shell (canon ADR-11…16). `main` holds the committed vertical layout; an uncommitted vertical-tuning experiment is parked on `checkpoint/fieldview-vertical-tuning` (`d2e4836`) and is **not** a dependency.

---

## Success Criteria

### User Success

1. **A coach demonstrates spacing at practice on a phone or tablet.** Landscape, field visible to a huddle, presets one tap away. *Verified on a real device (NEEDS MANUAL REVIEW).*
2. **A teammate opens the site and learns by dragging.** Drag a player and the heat repaints live. *Verified by the acceptance checks in tasks.md plus by-eye review.*
3. **A coach can show a multi-frame play** in Watch and step through it frame by frame.

### Technical Success

- `/fieldview` opens **Explore**; Watch and Build tabs work (Build = placeholder).
- Layout matches the approved mockups on phone landscape (844×390), tablet landscape (1180×820), desktop (1440×820).
- Model tests are untouched; the Profiler "0 React commits during drag" test and `test:perf` budgets still pass.
- Retired shell code is deleted; nothing in the new UI forks content between frames.

### Business / Product Success

- The MVP in `docs/fieldview-backlog.md` is complete; every built-but-unsurfaced feature is catalogued with file pointers.

---

## User Journeys

### New player (audience A) — learn spacing by touching it
Opens the site on a phone, rotates to landscape, sees Explore with a heat-shaded field. Drags a cutter; the heat shifts. Taps the legend to learn what Closed / Contested / Strong mean. Flips setups with ◀ ▶.

### Coach presenting (audience B) — demonstrate at practice
Props a tablet in front of the huddle. Picks a setup and drags a player to show the lane opening. Switches to Watch, steps a six-frame play with Next. (Authoring plays is later — Build.)

### Experienced player (audience C) — explore the model
Drags players and studies how the heat reacts; switches to colour-blind mode if needed. (Advanced model sliders are a later addition.)

### Coach designing (later) — laptop
Opens Build, sees the placeholder and what is coming. (No designer in this initiative.)

---

## Scope

### In Scope (MVP)
- Horizontal field and the new piece language (render layer).
- App frame: own full-viewport shell outside the site `Layout`; mode routes; compact and desktop frames; hamburger drawer; desktop site header; rotate-to-landscape message.
- Explore: curated setups with takeaways, ◀ ▶ chip, reset, a "Defense follows" **toggle (persisted, behaviour deferred)**, selected-player card (desktop) / ring (compact).
- Heat always on; legend (Closed / Contested / Strong space) with colour-guide popover; colour-blind mode in Settings.
- Watch: curated plays, transport, progress dots, filmstrip (desktop), play list, speed / loop / trails.
- Build: placeholder tab.
- Touch ergonomics: lifted piece + ghost, scale-aware grab radius, safe-area insets.
- Retire the old shell, page and tests; update canon and backlog.

### Out of Scope (deferred — tracked in `docs/fieldview-backlog.md`)
- The Build designer; share-by-link; accounts; offline/PWA; captions.
- **User-saved presets** (save/rename/delete/import/export) — decision D3.
- **Built-but-unsurfaced features** (decision D2): throw to player, cuts/routes, force controls, matchup reassign, marquee select, keyboard nudge UI affordances, PNG export, hover readout, team-visibility toggles, lens/layer toggles. Engines and tests stay; only UI entry points are absent.
- **Present / fullscreen button** — decision D6.
- A vertical-field / portrait mode — decision D4.
- **Defense-following behaviour** — the toggle and its pref ship, the pursuit-on-drag wiring is on hold until the rest of the initiative is complete, then done deliberately as its own piece of work.
- **Advanced settings** (space-model sliders, motion tunables, lens/layers) — do later; the empty space under the Explore field is the intended eventual home.
- Any change to `space/`, `motion/`, `scene/` (except additive presets) or the play-format semantics.

### Phasing
Five partitions (see approach.md): render → frame → {explore ∥ watch} → touch/QA/cleanup.

---

## Functional Requirements

### FR-1 App frame and routing
- **FR-1.1** `/fieldview` redirects to `/fieldview/explore` (D5).
- **FR-1.2** Routes: `/fieldview/explore`, `/fieldview/watch`, `/fieldview/build`. Legacy `/field-view*` redirects continue to work. `/fieldview/designer` stays reachable but is **unlinked** (internal play-authoring tool).
- **FR-1.3** Field View renders in its own full-viewport shell: no page scroll, no site footer.
- **FR-1.4** Desktop frame shows the Ultipedia site header above the Field View bar; compact frames (phone/tablet) show **no** site header, and the hamburger menu contains a link back to Ultipedia (D8).
- **FR-1.5** Portrait phone shows a "rotate to landscape" message (D4). It is dismissible so no viewport is hard-blocked (preserves the canon rule from the shell PRD).
- **FR-1.6** The frame choice is CSS-only (no resize listener); `FieldCanvas` mounts exactly once.

### FR-2 Field rendering
- **FR-2.1** The field renders **horizontally, attacking right**; orientation lives only in `render/coords.ts`.
- **FR-2.2** Heat canvas, field markings and pieces register with each other at all four corners.
- **FR-2.3** Offense = filled dark pieces; defense = white with ring (never rely on hue). Pieces are sized for a huddle (~22 px on a phone).
- **FR-2.4** An "ATTACKING →" label is shown.

### FR-3 Colour, legend and settings
- **FR-3.1** The heat is always on in Explore and Watch (default ramp red→amber→green).
- **FR-3.2** **Colour-blind mode** (Settings) switches to orange→neutral→blue; persisted; legend follows.
- **FR-3.3** The legend uses the model's terms: **Closed / Contested / Strong space** (D7). Tapping/clicking it opens a plain-language colour guide.
- **FR-3.4** Legend gradient and painter ramp derive from the same stops.

### FR-4 Explore
- **FR-4.1** A list of curated setups, each with a one-line takeaway (≥5, authored by the Builder; first-pass coordinates).
- **FR-4.2** Compact: a setup chip with ◀ ▶ and a slide-over list. Desktop: always-open sidebar list.
- **FR-4.3** Setup switches replace the scene immediately; a ✎ marker shows when the scene differs from the loaded setup; Reset restores it.
- **FR-4.4** **Defense follows** toggle (in the menu on compact, in the sidebar on desktop), persisted as a pref. **Behaviour is deferred**: in this initiative the toggle changes the stored pref only and is labelled "coming soon" so it never implies a working feature. The pursuit-on-drag wiring is a follow-up (backlog).
- **FR-4.5** Desktop selected-player card: marked by, nearest defender, side of field, moved from start. Compact: selection ring only.
- **FR-4.6** *(Deferred)* Advanced settings are **not** in the MVP UI: no Advanced row in the desktop sidebar, no "More settings" in the compact menu. The old `AdvancedPanel` is retained for the unlinked designer.

### FR-5 Watch
- **FR-5.1** A registry of curated plays (≥3, ≥1 with ≥5 frames), validated at load by the existing play validator.
- **FR-5.2** Transport: previous, play/pause, next; progress dots; jump to a frame.
- **FR-5.3** Desktop filmstrip shows 4 frames and scrolls sideways for more; play list shows 5 and scrolls for more.
- **FR-5.4** Speed (0.5×/1×/2×), loop, trails. Watch is read-only (no dragging).
- **FR-5.5** Optional per-frame `label` in the play format (additive, validated, length-capped).

### FR-6 Build placeholder
- **FR-6.1** A "Soon" tab; desktop shows the placeholder card over dashed regions, compact shows the card only.

### FR-7 Touch
- **FR-7.1** Touch drags show the piece lifted above the finger with a dashed ghost at its origin; scene position stays true.
- **FR-7.2** Touch grab targets are ≥ ~44 px at the rendered scale; mouse feel unchanged.
- **FR-7.3** Safe-area insets honoured; no scroll, overscroll or pull-to-refresh interferes with dragging.

### FR-8 Retirement and preservation
- **FR-8.1** The old shell (`ShellLayout`, `LeftSidebar`, `RightSidebarSlot`, `BottomSheet`, `ToolRibbon`, `panelRegistry`, `panels/*`), `Whiteboard.tsx`, and `PresetMenu` UI are deleted once replaced.
- **FR-8.2** Engines for the unsurfaced features remain, with their tests.

---

## Non-Functional Requirements

- **NFR-1 Performance.** ADR-2 holds: 0 React commits across a drag; frame budget (`test:perf`) at least as good as before the rework.
- **NFR-2 Accessibility.** Keyboard reachable menus/drawers/lists; focus management on open/close; colour never the sole meaning-carrier (hover readout stays screen-reader-only); WCAG AA; reduced motion respected (canon ADR-27).
- **NFR-3 Style.** Light Film Room system (`style-guide/design.md`): hard corners, zinc neutrals, pink `#be185d` interactive, green `#047857` on-states, Archivo Black / JetBrains Mono / Helvetica Neue. All visual values in tokens (ADR-10).
- **NFR-4 Test integrity.** Model-layer tests untouched; replaced UI tests are rewritten against the new frames, not deleted without equivalent coverage.
- **NFR-5 Licensing.** Only OFL fonts ship; `fonts/Arena Font/` and `fonts/Druk_Collection/` stay uncommitted.
- **NFR-6 Placeholder tracking.** Every placeholder (content, copy, tuning values) is marked in code with a `PLACEHOLDER(fieldview-ui-rework):` comment and registered in `docs/fieldview-placeholders.md` with what the Builder must supply; the P5 audit reconciles the two so nothing ships unrecorded.

---

## Open Questions

1. **Footer** — assumed omitted on every device inside the full-viewport app (D8 only addressed the header). Confirm at review.
2. **Dismissible rotate message** — assumed (keeps "no viewport blocked"); D4 said "tell them to rotate".
3. **Curated setups and plays** — names, coordinates and takeaway copy are Builder-authored content; implementation proceeds with placeholders flagged `NEEDS MANUAL REVIEW`.
4. **Defense following** is deferred; when it is picked up, its feel while dragging at arbitrary speed needs deliberate design and review.
5. **Breakpoints** (`desktop` = ≥1280 × ≥640 px) and **piece radius** are first guesses until the real-device pass.
6. **Placeholders** — all Builder-supplied content is tracked in `docs/fieldview-placeholders.md`; see NFR-6.

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Orientation flip leaves a stale rotation (misregistered heat, inverted drag) | Do it first, alone (P1); corner-registration test; grep audit at start and end. |
| Piece size / hit area wrong on real phones | Tokens + one grab-radius function; real-device pass inside the initiative (P5), not after merge. |
| Dropping panels silently drops shipped features | Decision D2 + backlog catalogue; engines and tests retained. |
| Defense-follows toggle implies a feature that is not there | Deferred behaviour; toggle labelled "coming soon"; backlog entry. |
| Placeholders ship unnoticed | NFR-6: code markers + register + P5 reconciliation. |
| Both frames in the DOM double-mount stateful things | Single `FieldViewApp` owns store/driver/prefs; guard tests. |
| Legend copy teaches the wrong thing | Terms come from the model; coach review. |
| Large test rewrite hides regressions | Model tests untouched; keep Profiler + perf benches. |
