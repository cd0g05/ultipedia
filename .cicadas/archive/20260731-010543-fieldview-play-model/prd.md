---
summary: "fieldview-play-model makes possession, matchups, and force into real scene state. The disc becomes first-class (retiring the derived-disc invariant) so a throw is a state change rather than a redraw; a throw-to-player tool moves possession in one click and reassigns the mark; every defender carries a matchup (auto-assigned by default, reassignment does a 1-to-1 swap, or free-roam for manual setup); and the mark gains flat/flick/backhand × inside/around/default force buttons that reposition the mark piece — force stays geometrically derived, with free dragging still allowed and reported as Custom. Play format gains these additively. No motion physics (Initiative C) and no frame designer (D)."
phase: "clarify"
when_to_load:
  - "When defining or reviewing fieldview-play-model goals, scope, success criteria, and risks."
  - "When checking whether the disc/matchup/force model still matches its intent."
depends_on:
  - ".cicadas/canon/modules/fieldview.md"
  - ".cicadas/drafts/fieldview-roadmap.md"
modules:
  - "frontend/src/fieldview/scene"
  - "frontend/src/fieldview/ui/shell/panels"
  - "frontend/src/fieldview/play"
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

# PRD: fieldview-play-model

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

Field View can draw a formation but cannot represent a *play*. The disc is a decoration derived
from whoever holds the `thrower` role, defenders have no idea who they are guarding, and the mark's
force exists only as wherever the coach happened to drag that piece. This initiative turns all
three into real, inspectable state — so "throw it to the under cut and the mark switches to flick"
becomes something the tool can express in one click instead of four manual drags.

It ships second in the Field View roadmap because both the motion AI (Initiative C) and the
frame-based designer (D) record their actions *against this model*. Building either first would
mean inventing possession and matchups twice.

### What Makes This Special

- **A throw is one click, not a reconstruction** — click a receiver and possession, roles, and the
  mark all move together, correctly, every time.
- **Matchups make the defense legible** — the tool knows which defender belongs to which cutter, so
  Initiative C's auto-tracking has something to track and the coach can see the assignment.
- **Force is still the picture, not a label beside it** — force buttons *move the mark*; the drawn
  scene and the stated force can never disagree.

## Project Classification

**Technical Type:** Client-side domain model + UI (React SPA module)
**Domain:** Sports coaching tool — possession/assignment state modelling
**Complexity:** Medium-High — small in code volume but it reverses a documented invariant, changes
a closed role union, and touches the persisted play format, so backward compatibility and internal
consistency carry the risk rather than algorithmic difficulty.
**Project Context:** Brownfield — builds directly on the `fieldview-shell` chrome (2026-07-30),
filling three panels that currently render `PENDING` placeholders.

---

## Success Criteria

### User Success

A user achieves success when they can:

1. **Advance the disc down the field by clicking receivers** — each throw updates possession, the
   thrower role, and the mark without any manual drag.
2. **See and change who guards whom** — every defender shows its assignment; reassigning one swaps
   cleanly rather than leaving two defenders on one cutter.
3. **Set a force in one click** — flick/backhand/flat and inside/around move the mark to the right
   place, and dragging the mark by hand still works and is reported honestly as `Custom`.

### Technical Success

1. Possession is stored exactly once (`Scene.possession`), and the disc is rendered from it — there
   is no second place a "who has the disc" answer can come from.
2. Force remains **derived** from mark geometry; the space model (`markKernel`, `θ_shadow`) is not
   modified, and no stored force value can contradict the drawn mark.
3. The play format carries possession, matchups, and force **additively** — every existing v1 play
   file and user preset still loads unchanged.
4. ADR-2 holds: the Profiler test still records 0 React commits during a drag.

### Measurable Outcomes

- All existing 327 fieldview tests pass, plus new coverage for possession transitions, swap logic,
  and force snapping.
- 100% of the three placeholder panels (offense, defense, mark) replaced with working controls.
- Zero changes to `space/` — verified by the existing `spaceGuard.test.ts`.

---

## User Journeys

### Journey 1: Walking Through a Play

A coach sets a vert stack, clicks **Throw to Player**, then clicks the cutter who broke under. The
disc jumps to that cutter, who becomes the thrower; the old thrower becomes an ordinary offensive
player; and that cutter's assigned defender becomes the new mark, standing on the correct force.
The coach repeats it twice more to walk the disc up the break side — four clicks for what used to
be a dozen drags.

**Requirements Revealed:** first-class possession; a throwing interaction mode; automatic role
reassignment on catch; matchup lookup to decide the new mark.

### Journey 2: Setting Up a Defensive Look

A coach selects a defender and sees it is guarding cutter #3. They change it to #5 — the defender
that *was* on #5 automatically takes #3, so the assignment stays one-to-one and nobody is
double-covered. For a zone look, they switch several defenders to **No assignment** and place them
by hand.

**Requirements Revealed:** per-defender matchup state; auto-assignment default; 1-to-1 swap on
reassignment; free-roam escape hatch.

### Journey 3: Changing the Force

With the mark selected, the coach clicks **Flick**, and the mark piece slides to the flick-force
position beside the thrower; the space heatmap repaints to match. They then nudge the mark a little
wider by hand, and the panel switches from `Flick` to `Custom` — the tool does not pretend the
force is still a named one.

**Requirements Revealed:** force presets that reposition the mark; live derivation from geometry;
honest `Custom` reporting when the mark is off-preset.

### Journey Requirements Summary

| User Type | Key Requirements |
|-----------|-----------------|
| **Coach walking a play** | throw-to-player, possession state, role handoff, mark follows matchup |
| **Coach setting a look** | matchup assignment, 1-to-1 swap, free roam, force presets + custom |

---

## Scope

### MVP (v1)

**Core Deliverables:**
- `Scene.possession` as first-class state; disc rendered from it, not from role inference.
- Throw-to-player tool wired to the existing (currently disabled) ribbon button.
- Matchup model: `defenderId → offensiveId | null`, auto-assigned on scene load, 1-to-1 swap on
  reassign, free-roam via `null`.
- Mark force controls: 3 sides × 3 angles as buttons that **move the mark**; `Custom` when dragged
  off-preset.
- Offense, defense, and mark panels replacing the shell's `PENDING` placeholders.
- Play format additive extension (possession, matchups) with v1 files still loading.

**Quality Gates:**
- All 327 existing tests green; `spaceGuard` confirms `space/` untouched; Profiler test still 0
  commits.
- Old play files and saved presets load without error or visual change.

### Growth (Post-MVP)

- **Disc flight animation** (explicitly deferred this initiative) — needs an owner-less in-flight
  disc state, which is better designed alongside Initiative C's motion timing.
- Best-positioned defender selection for the new mark, rather than assigned-or-nearest (C).
- Turnovers / possession changing teams.

### Vision

Possession and matchups become the substrate that Initiative D's frames record as discrete actions
("disc thrown to #5", "cutter #4 a→b").

---

## Functional Requirements

### 1. Possession & the Disc

**FR-1.1:** `Scene` carries explicit possession identifying which player holds the disc (or that it
is loose/unassigned). The disc's drawn position is computed from this, never from role inference.

**FR-1.2:** The `thrower` role and possession stay consistent by construction — one of the two is
derived from the other, so they cannot disagree (tech-design chooses which).

**FR-1.3:** Existing behaviour is preserved: the disc still docks beside its holder and is carried
when that player is dragged.

### 2. Throw to Player

**FR-2.1:** The ribbon's **Throw to Player** button enters a throwing mode; the cursor/field
indicates that a receiver is expected.

**FR-2.2:** Clicking an offensive player completes the throw: possession moves to them, they become
the `thrower`, and the previous thrower becomes an ordinary offensive player.

**FR-2.3:** On completion, the receiver's **assigned** defender becomes the `mark`; if the receiver
has no assignment, the **nearest** defender becomes the mark. The outgoing mark reverts to
`defender`.

**FR-2.4:** Clicking anything other than an offensive player (empty grass, a defender) cancels
throwing mode without changing possession. `Escape` also cancels.

**FR-2.5:** Throwing to the current holder is a no-op that simply exits throwing mode.

### 3. Matchups

**FR-3.1:** Every defender carries a matchup: an offensive player id, or `null` (free roam).

**FR-3.2:** Scenes get a sensible default assignment automatically (nearest-available pairing), so
the model is never empty on load, including for existing presets and imported plays.

**FR-3.3:** Reassigning defender D from cutter X to cutter Y performs a **1-to-1 swap**: whichever
defender previously held Y takes X. Assignments remain a permutation.

**FR-3.4:** Setting a matchup to **No assignment** removes that defender from the permutation
without disturbing others (it does not cascade a swap).

**FR-3.5:** The selected defender's panel shows and edits its matchup; the selected offensive
player's panel shows who is guarding it.

### 4. Mark & Force

**FR-4.1:** The mark panel offers **force sides** (Flat, Flick, Backhand) and **force angles**
(Default, Inside, Around).

**FR-4.2:** Choosing a side/angle **repositions the mark piece** relative to the thrower. Force is
never stored as an authoritative value that the space model reads.

**FR-4.3:** The panel reports the current force by reading mark geometry, showing the matching
preset name or `Custom` when the mark is dragged off-preset beyond a tolerance.

**FR-4.4:** `space/` is unmodified — the heatmap responds because the mark *moved*, exactly as it
does today when dragged by hand.

### 5. Persistence

**FR-5.1:** The play format carries possession and matchups additively; `formatVersion` may rise,
but v1 files must continue to load (`validate.ts` already drops unknown keys).

**FR-5.2:** A loaded file lacking possession/matchups gets them derived on load (thrower-based
possession, auto-assigned matchups), so old plays and presets look and behave the same.

**FR-5.3:** Force is not persisted — it is geometry, so it round-trips for free with mark position.

---

## Non-Functional Requirements

- **Performance:** No per-frame cost added; possession and matchups change only on discrete
  interactions. The Profiler drag test must stay at 0 React commits.
- **Reliability:** Matchups must remain a valid permutation (no duplicates) after any sequence of
  reassignments, swaps, throws, and preset loads.
- **Security:** N/A — client-only, no new inputs beyond the existing validated file import.
- **Maintainability:** Possession/matchup mutations go through pure functions in `scene/`, tested
  as mathematics, mirroring `scene.ts` and `selection.ts`. Panels register through the existing
  `panelRegistry` seam without editing shell layout files (canon ADR-13).

---

## Open Questions

Resolved by Builder before drafting (2026-07-30):

- **Force model** — RESOLVED: hybrid. Buttons snap the mark to named force positions; free dragging
  is still allowed and reported as `Custom`. Force stays derived from geometry.
- **Throw scope** — RESOLVED: instant possession change only. Disc flight animation is deferred.
- **`Designer.tsx`** — RESOLVED: untouched. It keeps its pre-shell layout until Initiative D. New
  UI lands only in the shell panels on `/fieldview`.

Still open for tech-design to settle:

- Whether `possession` or `role: "thrower"` is the source of truth (FR-1.2) — one must derive.
- Whether matchups live on `Scene` as a map or on each defender as a field.
- The `Custom` tolerance in FR-4.3 (how far a dragged mark may sit from a preset before the label
  changes).

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Retiring the derived-disc invariant reintroduces the exact disagreement it prevented | Medium | High | FR-1.2 requires one of possession/role to derive from the other; a guard test asserts they can never diverge |
| Force controls drift into stored state, contradicting the drawn mark | Medium | High | FR-4.2/4.4 forbid it; `spaceGuard.test.ts` plus a review check that `space/` has zero diff |
| Matchups desynchronise into a non-permutation after repeated swaps | Medium | Medium | Pure swap function with property-style tests over sequences of reassignments |
| Old play files or presets break on load | Low | High | FR-5.2 derives missing state on load; regression test loads a v1 fixture and asserts unchanged behaviour |
| Scope creeps into motion (C) via "the mark should move realistically" | Medium | Medium | Force snapping is an instant reposition, explicitly not animated or physics-driven; flight animation deferred in Scope |
