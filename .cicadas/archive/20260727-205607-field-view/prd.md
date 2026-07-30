---
summary: "Field View is Ultipedia's play-design toolset: one shared scene model (regulation field, 7v7 players, disc) exposed through three modes — a freeform coaching whiteboard, a keyframed play designer/animator, and a strong/weak space heatmap visualizer that repaints live while dragging. The space model is pre-validated (three prototype iterations with the client) and must be implemented exactly as specified; the differentiator is that a static diagram cannot show that strong space moves, and a live-repainting map is the lesson. v1 is local-state + file export, desktop/tablet, no auth, no AI generation."
phase: "clarify"
when_to_load:
  - "When defining or reviewing field-view goals, users, scope, success criteria, and risks."
  - "When checking whether an implementation choice still serves the coaching/teaching purpose."
depends_on: []
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

# PRD: Field View

> **Source of record:** `Ultimate Play Tools Handoff.md` (client brief). Sections 4 (space
> model) and 8 (acceptance checks) of that brief are *validated requirements* — this PRD
> restates their intent but the brief is authoritative on the math. Do not relitigate them.

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

Field View is a play-design toolset for Ultipedia: **one scene model, three modes**. Coaches
drag players and a disc around a regulation field (whiteboard), keyframe those scenes into an
animated play (designer), and toggle a heatmap that paints every point of the field from
closed (red) through open-but-low-value (yellow) to strong space (green) — recomputed live,
during the drag. It exists to teach the single hardest concept to convey from a static
diagram: **strong space moves.**

### What Makes This Special

- **The live repaint is the product** — drag the mark from a side force to flat and watch one
  side of the field die; swing the disc and watch strong space flip. No competitor
  (TacticalPad, Sportplan, planet.training, Flik, RiseUP) goes past static or hand-animated
  diagrams.
- **A validated domain model, not a guess** — the scoring pipeline was calibrated by feel over
  three prototype iterations with an experienced college captain / club player, and each
  iteration's failure mode is recorded as a regression not to repeat.
- **The force is where the mark stands** — no separate "force" control. The defensive shape
  *is* the input, which is how coaches already think.
- **One format, three consumers** — the play JSON doubles as storage for the encyclopedia's
  drill visualizer and as the target format for the planned AI-animation pipeline.

## Project Classification

**Technical Type:** Consumer web app — interactive visualization tool, client-side only
**Domain:** Sports coaching / education
**Complexity:** High — the space model is non-trivial math with a hard per-frame performance
budget (~17,600 cells × 14 players inside a 16 ms frame) and validated-by-feel acceptance
criteria that cannot be verified by unit tests alone.
**Project Context:** Brownfield — adds a third surface to the existing Vite/React SPA
alongside the encyclopedia (`/`) and intake (`/contribute/*`). No backend changes in v1.

---

## Success Criteria

### User Success

A coach achieves success when they can:

1. **Land and diagram in seconds** — open the tool with zero onboarding, drag pieces onto a
   recognisable field, and talk through a concept. Verified by: whiteboard is usable with no
   modal, no login, no empty-state setup step.
2. **See the space move** — toggle the heatmap and drag the mark or thrower, and watch strong
   space relocate live. Verified by acceptance checks 5 and 9 of the brief (§8).
3. **Trust the map** — hover any cell and get a plain-language explanation of why it is that
   colour (distance, flight time, defender arrival vs. cutter arrival, verbal label).
4. **Start from a real setup** — load vert stack / horizontal stack / flat mark / deep help in
   one click rather than placing 14 pieces by hand.
5. **Build and replay a play** — keyframe a sequence, scrub it, play it back tweened, and
   export it as a file or image.

### Technical Success

1. All nine acceptance checks in §8 of the brief pass on default constants.
2. The space model is a **pure function of scene state** with no receiver-reachability gate
   anywhere in the score, implemented as a headless, unit-testable module with no rendering or
   React dependency.
3. The heatmap recomputes and repaints within a frame budget on ordinary hardware while
   dragging (perceptually 60 fps).
4. The play JSON format is stable, versioned, and storage-agnostic — swapping local state for
   account persistence is a storage swap, not a rewrite.

### Measurable Outcomes

- 220 × 80 grid (0.5 yd) × 14 players recomputed + repainted in < 16 ms p95 during drag.
- 9/9 acceptance checks from brief §8 pass and are captured as an executable or scripted
  checklist where possible.
- Every one of the 6 sliders and 4 layer toggles produces a visible change on default presets
  (check 8), asserted in tests as a non-zero score delta.

---

## User Journeys

### Journey 1: Priya — Captain of a coachless college B-team, chalk-talk before practice

Priya runs practice for a team with no coach and a roster where half the players learned to
throw last semester. She has fifteen minutes on a whiteboard before drills and keeps losing
people when she says "cut into the strong side" — they nod, then cut into the poach. She finds
Field View from Ultipedia's nav, clicks the *vert stack, force side* preset, and turns on the
heatmap. She drags the mark from a force-flick to flat and the green lane visibly swings across
the field; the room gets it in one motion. She drags a cutter deep into the poach and the deep
third pries open. She screenshots two frames for the team chat.

**Requirements Revealed:** Zero-onboarding entry, one-click presets, heatmap toggle,
drag-to-teach live repaint, frame export as image, discoverable placement in site nav.

---

### Journey 2: Marcus — Experienced coach designing a set play to publish

Marcus has a horizontal-stack iso play he runs and wants it in Ultipedia's drill library. He
starts from the *horizontal stack* preset, adjusts three cutters, and adds a keyframe. He moves
the disc and two cutters, adds another. He scrubs the timeline and watches the tween; the
timing looks wrong, so he reorders a keyframe and adjusts its timestamp. He names the play,
exports the JSON, and (in a later phase) attaches it to a drill entry. He never creates an
account — v1 keeps everything local and exportable.

**Requirements Revealed:** Keyframe add/delete/reorder, timestamp editing, scrub and
play/pause, tweened playback, per-play metadata, JSON export in the shared format, local
persistence without auth.

---

### Journey 3: Dana — New player trying to understand "break side"

Dana is a first-year who has been told to "clear to the break side" and doesn't know what that
means spatially. She opens the whiteboard from an encyclopedia strategy entry, turns offense
*off*, and sees the pure defensive shape — where this defense is structurally weak regardless
of where her team stands. She hovers a red cell behind the mark and reads that the mark's
shadow is killing it, and a yellow cell behind the thrower and reads "open, low value." The
three-swatch legend tells her red ≠ "nobody there," red = closed.

**Requirements Revealed:** Offense on/off lens toggle, layer isolation toggles, hover readout
with plain-language math, always-visible legend, entry from encyclopedia context.

---

### Journey Requirements Summary

| User Type | Key Requirements |
|-----------|-----------------|
| **Captain (teaching live)** | Presets, heatmap toggle, live-repaint drag, image export, zero onboarding |
| **Coach (authoring)** | Keyframe timeline, scrub/playback, play metadata, JSON export, local save |
| **Player (learning)** | Offense on/off lens, layer toggles, hover readout, legend, deep-link entry |

---

## Scope

### MVP — Minimum Viable Product (v1)

**Core Deliverables:**
- Shared scene model: regulation 110 × 40 yd field, 7 offense (thrower + 6 cutters), 7 defense
  (mark + 6 defenders), disc attached to the thrower.
- **Mode 1 — Whiteboard**: everything draggable, live repaint during drag, thrower drag carries
  the mark (relative offset preserved), mark independently draggable, no separate force control.
- **Mode 2 — Play designer**: keyframe timeline with add/delete/reorder, scrub, play/pause,
  tweened playback, per-play name + description, image export of any frame, JSON export.
- **Mode 3 — Space visualizer**: heatmap overlay per brief §4, available as a toggle in both
  other modes; offense on/off lens; four layer toggles (mark force, defender coverage, throwing
  lanes, field value); six tunable sliders collapsed by default; hover readout; legend.
- An open-ended **preset system**: four shipped built-ins (vert stack force side, horizontal
  stack, flat mark, deep help) defined as data, plus save-current-setup-as-preset with local
  persistence and preset export/import (FR-2.6).
- Versioned play JSON format designed as a site-wide contract.

**Quality Gates:**
- All nine §8 acceptance checks pass on default constants.
- No receiver-reachability gate in the score (the v2 regression) — asserted by test.
- 60 fps perceptual repaint while dragging.
- Follows the Light Film Room design system; the piece visual language is centralised in one
  tokens module so the client's end-of-initiative review can be applied cheaply.

### Growth Features (Post-MVP)

**v2: Model fidelity**
- Velocity-aware influence regions (draggable velocity arrow per player) — highest-value model
  upgrade per brief §6.
- Asymmetric mark shadow (split angular bump into inside/around half-widths).

**v3: Time and integration**
- Heatmap through time — overlay repainting frame-by-frame during play animation.
- Encyclopedia integration: link plays/setups to drill entries; feed the AI-animation pipeline.
- Colorblind-safe alternate palette.
- Account persistence of saved plays (storage swap behind the same format).
- **In-app site-wide preset publishing** — promote a locally authored preset to a built-in for
  all users without editing the data file. Needs server persistence and auth, so it follows the
  account work; v1 ships the data-file path instead (FR-2.6).

### Vision (Future)

- AI drafts a play file from a drill's written description; a coach reviews and tweaks it in
  this same editor before publishing.
- Mobile-first sideline layout.

---

## Functional Requirements

### 1. Scene Model

**FR-1.1:** The scene is a single shared model consumed by all three modes — a field, a set of
players each with team (offense/defense) and role (thrower, mark, cutter, defender), and the
disc.
- The disc sits with the thrower.
- Rosters are 7 v 7: 1 thrower + 6 cutters, 1 mark + 6 defenders.

**FR-1.2:** The field is regulation: 110 × 40 yards — a 70-yard central field plus two 20-yard
endzones. Attacking direction is +x. Brick marks sit 20 yards from each goal line.

**FR-1.3:** Scene state is serializable and is the sole input to the space model; the space
model must be a pure function of it.

### 2. Whiteboard (Mode 1)

**FR-2.1:** Every piece on the field is draggable, and any active overlay repaints live during
the drag (not on drop). **This is non-negotiable — the repaint-while-dragging moment is the
product.**

**FR-2.2:** Dragging the thrower carries the mark along, preserving the relative offset. The
mark is also independently draggable.

**FR-2.3:** There is **no separate force control**. The force is derived from the mark's bearing
off the thrower — where the mark stands *is* the force. (Validated UX decision.)

**FR-2.4:** The whiteboard is useful with no save and no timeline. It requires no onboarding
step, account, or setup wizard.

**FR-2.5:** Four presets load a complete 14-piece setup in one click. **The preset *system*
matters more than these four setups' exact coordinates** (client decision) — the shipped
coordinates are engineering's first pass, explicitly expected to be replaced later with
conventionally correct ultimate setups. Ship them as data, not as code:
1. *Vert stack, force side* — thrower off-center, mark forcing one sideline, dump behind,
   five-person stack up the middle, defenders matched and shading open/under.
2. *Horizontal stack* — three handlers back with the thrower central; open-side reset 45°
   behind the thrower; break-side reset slightly upfield on the break side; four downfield
   cutters spread across the width ~18 yards out; defense matched, shading open side downfield.
3. *Flat mark* — centered disc, mark directly upfield, symmetric defense.
4. *Deep help* — the vert setup with one defender pulled off assignment into deep poach.

**FR-2.6 — Preset authoring (client decision, added after review):** A coach must be able to
arrange a formation on the whiteboard and **save it as a preset**, and the preset list must be
open-ended rather than a fixed four.
- *Save current setup as preset* names the current scene and adds it to the preset list.
- User presets persist locally (`localStorage`) alongside the shipped built-ins, are
  individually renamable and deletable, and built-ins cannot be destroyed.
- A preset is exportable and importable as a small JSON file, reusing the play format's entity
  representation so a preset is just a one-keyframe play.
- **Promotion to site-wide** — a preset the client authors and wants shipped for all users
  becomes a built-in by dropping its exported JSON into the presets data file. That is the v1
  path: no backend, no auth, no publish flow. A real in-app "publish site-wide" action requires
  server persistence and is **phase 2** (see Growth Features), noted here so the format and the
  preset registry are designed for it now.

### 3. Space Visualizer (Mode 3)

**FR-3.1:** The heatmap paints every field cell from red (closed) through yellow (open, low
value) to green (strong space), computed as a pure function of the current scene per the
pipeline in brief §4.3. **Implement the model exactly as specified before proposing changes.**

**FR-3.2:** There must be **no receiver-reachability gate anywhere in the score**. Openness
never requires a receiver. Red means *closed off*, never "no cutter nearby yet." (This is the
v2 prototype regression; it must not return.)

**FR-3.3:** Near-thrower open-side space must render as the strongest space on a normal setup.

**FR-3.4:** The overlay is a toggle available in both the whiteboard and the play designer,
because it is a pure function of scene state.

**FR-3.5:** An **offense on/off** lens toggle switches between two coaching questions —
*on*: "given this offensive setup, where can we attack right now?"; *off*: "where is this
defense structurally weak, regardless of our spacing?" (pure defender coverage). Both are
labelled as views, not as a settings checkbox.

**FR-3.6:** Four independent layer toggles — mark force, defender coverage, throwing lanes,
field value — each individually isolatable. Layer isolation is itself a teaching feature.

**FR-3.7:** Six tunable sliders (`vmax`, `react`, `head`, `hang`, `markStr`, `W`) with the
ranges and defaults in brief §4.4, collapsed by default, shipping calibrated.

**FR-3.8:** A hover readout shows per-cell math in plain terms: distance out, flight time,
closest defender's arrival vs. (offense on) best cutter's effective arrival, and the score with
a verbal label — *strong* / *contested* / *closed*.

**FR-3.9:** A three-swatch legend (closed / open, low value / strong) is always visible when the
overlay is on.

### 4. Play Designer (Mode 2)

**FR-4.1:** A play is an ordered list of keyframed scenes with timestamps; playback tweens
player and disc positions between keyframes.

**FR-4.2:** Keyframe operations: add, delete, reorder, and edit timestamps.

**FR-4.3:** Transport controls: scrub, play, pause.

**FR-4.4:** Per-play metadata: name and description.

**FR-4.5:** Export any frame as an image.

**FR-4.6:** Export a play in the shared, versioned JSON format (entities + keyframes +
interpolation). The format is a site-wide contract — it is also the drill visualizer's storage
format and the AI-animation pipeline's target format.

**FR-4.7:** v1 persistence is local state + file export. The format must be designed so account
persistence is a storage swap, not a rewrite. PDF/printable export rides on the site's existing
practice-plan export work rather than being bespoke.

### 5. Field Rendering & Visual Language

**FR-5.1:** Regulation proportions, goal lines, brick marks, and an unambiguous
attacking-direction indicator.

**FR-5.2:** A consistent visual language for pieces: offense vs. defense clearly distinct;
thrower and mark individually identifiable; disc shown with the thrower.

**FR-5.3:** The visual language established here becomes the site-wide standard for all
drill/play diagrams. Per the client's review decision, it is reviewed **once the tool is
complete** (with a mock-up shared earlier for early signal), not gated before implementation —
so it must be built to be cheaply adjustable: piece colours, shapes, sizes, and labels live in
one tokens module, never scattered across components.

---

## Non-Functional Requirements

- **Performance:** Perceptually 60 fps repaint while dragging on ordinary hardware. Budget:
  0.5-yard grid (220 × 80 ≈ 17,600 cells × 14 players) recomputed and rendered within a frame.
  Closed-form per-cell evaluation only — no timestep simulation; polynomial (smoothstep-family)
  falloffs, no transcendental-heavy math in the inner loop.
- **Reliability:** Model correctness is defined by brief §8's acceptance checks, not by unit
  tests alone; both are required. Scene state must never enter an invalid configuration through
  dragging (pieces clamp to field bounds).
- **Security:** No new backend surface, no auth, no user data leaves the browser in v1. Imported
  play JSON is untrusted input and must be schema-validated before it touches the scene.
- **Maintainability:** The space model ships as a headless module with no React or canvas
  dependency, so it is unit-testable and reusable by the future drill visualizer. Layers are
  independently toggleable functions, not branches inside one blob. Follows the repo's existing
  frontend conventions (TS, kebab-case files, Vitest + RTL, axe-core).
- **Accessibility:** WCAG AA for all chrome (panels, controls, readout, legend). The red–green
  heatmap itself is the domain convention and is the v1 default; a colorblind-safe alternate
  palette is explicitly deferred to phase 2 (~8% of male users affected — a known, accepted v1
  gap, not an oversight).
- **Target platform:** Desktop/tablet. Mobile-first sideline layout is out of scope for v1 but
  the layout should not actively preclude it.

---

## Open Questions

All five pre-kickoff questions (brief §10) were answered by the client at spec review. They are
recorded here as **resolved decisions**, not open items.

1. **Naming and navigation — RESOLVED.** The feature is called **Field View**. Routes are
   `/field-view` (whiteboard) and `/field-view/designer`, with a top-nav entry. The initiative,
   the module directory (`frontend/src/fieldview`), and all specs use this name.
2. **Play JSON schema — REVIEW GATE, still open.** The drafted schema (tech design §Data
   Models) becomes a site-wide contract, so it is surfaced for client review once written, as a
   hard stop inside the play-designer partition. This is the one remaining pre-merge gate.
3. **Piece visual language — RESOLVED, review moved to the end.** The client reviews all
   visuals, presets, and UI **once the tool is complete** and adjusts from there, rather than
   gating implementation. A mock-up is still produced first ("ideally there's a prior mockup")
   and shared, but it does not block the branch. The binding review happens in the
   acceptance-and-polish partition.
4. **Presets — RESOLVED, and it changed scope.** The four setups' exact coordinates "don't
   matter too much"; what matters is that presets are an *open-ended system*. The client intends
   to author conventionally correct ultimate setups personally, later, and wants to design a
   formation on the whiteboard and set it as a site-wide preset. Captured as **FR-2.6**: shipped
   presets are data, users can save/rename/delete/export/import their own, and site-wide
   promotion is a data-file drop in v1 with in-app publishing deferred to phase 2. Engineering
   invests in the mechanism, not in calibrating the four built-ins.
5. **Sequencing deviation — RESOLVED: confirmed.** The headless space model is built in parallel
   with the whiteboard; the heatmap *UI* still lands after the keyframe work, per the brief's
   mandated build order.

Decided by engineering per brief §10, not asked: framework, rendering tech, state management,
testing approach, file structure, and everything covered by brief §9.

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Model is re-derived or "improved" during implementation and regresses a validated behaviour | Med | High | Brief §4 is copied verbatim into the tech design; §8 checks become an explicit test/verification checklist; changes require a demonstrated acceptance-check failure |
| The v2 receiver-gate regression creeps back in (openness accidentally requires a cutter) | Med | High | An explicit test: remove all cutters, assert far open-side space still scores as open; FR-3.2 called out in code review |
| 60 fps budget missed at 0.5 yd grid | Med | High | Prototype-proven approach (brief §9): offscreen canvas at grid resolution, upscaled with image smoothing; polynomial falloffs only; grid resolution adjustable as a pressure valve; perf test in the branch |
| Acceptance checks are subjective ("does it feel right") and can't be fully automated | High | Med | Automate what is falsifiable (relative-ordering assertions, non-zero deltas); the rest become a scripted manual checklist run with the client before initiative merge |
| Play JSON format churns after other consumers adopt it | Med | Med | Version field from day one; schema validation on import; client review of the schema before it is used by anything else |
| End-of-initiative visual review lands large rework late (client reviews visuals only once complete) | Med | Med | Piece visual language is centralised in one tokens module (FR-5.3) so a restyle is a token edit, not a component sweep; a mock-up is shared early for signal; the encyclopedia does not adopt the language until after that review |
| Preset system built to the four built-ins rather than to arbitrary user presets | Med | Med | FR-2.6 makes save/rename/delete/export/import first-class; built-ins load through the same registry as user presets, so there is no privileged path to special-case |
| Scope creep from phase-2 items (velocity arrows, heatmap-through-time) | Med | Med | Brief §6/§7 boundaries restated in PRD scope; phase-2 hooks are designed for but not built |
