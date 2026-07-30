---
summary: "Field View presents one field canvas with a mode switch (Whiteboard / Designer) and an overlay rail. The field fills the viewport; controls live in a right rail (presets, lens, layers, collapsed sliders) and a bottom timeline strip that only exists in Designer mode. The defining interaction is drag-with-live-repaint: pieces are grabbed directly on the field, the heatmap repaints continuously during the drag, and hovering any cell surfaces the per-cell math in plain language. Visual language follows the Light Film Room system (hard corners, JetBrains Mono UI, Druk headings) with a domain-conventional red→amber→green heatmap ramp."
phase: "ux"
when_to_load:
  - "When designing or reviewing the field canvas, control rail, timeline, hover readout, or piece visual language."
  - "When an implementation question is about interaction feel rather than product goals or math."
depends_on:
  - "prd.md"
modules:
  - "frontend/src/fieldview"
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

# UX Design: Field View

## Progress

- [x] Design Goals & Constraints
- [x] User Journeys & Touchpoints
- [x] Information Architecture
- [x] Key User Flows
- [x] UI States
- [x] Copy & Tone
- [x] Visual Design Direction
- [x] HTML/CSS Mock-Ups — artifact scheduled as the first task of the whiteboard partition;
      non-blocking per the client's review decision (see that section)
- [x] UX Consistency Patterns
- [x] Responsive & Accessibility

---

## Design Goals & Constraints

**Primary goal:** A coach lands on the whiteboard and is dragging players within three seconds,
with no onboarding, no modal, and no empty canvas to populate. The emotional target is *"oh —
it moves"*: the moment the heatmap repaints under a dragging finger is the one the entire
layout must protect. Everything else — rails, panels, timeline — is subordinate chrome that
must never steal space or attention from the field.

Inherits the site principle: **intuitive and easy to use above all else.**

**Design constraints:**
- Desktop/tablet primary (≥ 1024 px designed, ≥ 768 px usable). Phone is explicitly out of
  scope for v1 but the layout must not architecturally preclude it.
- Follows the existing **Light Film Room** design system (`style-guide/design.md`): hard corners
  (no border-radius), white/`#f4f4f5` panel surfaces, `#d4d4d8` borders, Druk display headings,
  JetBrains Mono for UI/labels/pills, Helvetica Neue for prose, accent pink `#be185d` primary /
  accent green `#047857` secondary.
- Mounted inside the existing single Vite/React SPA under the encyclopedia's react-router tree.
  It may use its own full-bleed layout rather than the encyclopedia `Layout` shell (see IA).
- No account, no server round-trip: every interaction is local and instant. There is no loading
  state for the field itself.
- The heatmap ramp is domain-conventional red→green and is **not** subject to the site palette;
  it is data, not brand. Chrome around it is site palette.
- Pointer-driven: mouse and touch (tablet) drag must both work. Keyboard is a secondary,
  best-effort path for piece movement (see Accessibility).

**Skip condition:** N/A — this is a primarily visual, interaction-led initiative.

---

## User Journeys & Touchpoints

### Priya (captain, teaching live) — chalk talk in fifteen minutes

**Entry point:** Top-nav link from anywhere on Ultipedia, or a direct URL she saved.
**First touchpoint:** The whiteboard, already populated with the *vert stack, force side*
preset — never an empty field. The overlay is **off** by default so the first impression is a
clean, readable diagram.
**Key moment:** She toggles **Space** on, grabs the mark, and drags it from a sideline force to
flat — the green lane swings across the field under her hand while the room watches.
**Exit state:** Two frames exported as PNGs for the team chat; nothing saved, nothing lost.
**Pain points to design around:** She is talking while dragging and cannot look at chrome — the
overlay toggle and presets must be reachable without hunting, and the drag must never require
precision (generous hit targets). A colour ramp with no legend would read as decoration; the
legend is therefore always visible while the overlay is on.

---

### Marcus (coach, authoring) — building a set play to publish

**Entry point:** Whiteboard → switches to **Designer** mode, or lands directly on the designer
route.
**First touchpoint:** The same field, plus a timeline strip along the bottom with a single
keyframe at `0.0s` representing the current scene.
**Key moment:** He moves three cutters and the disc, hits **+ Keyframe**, scrubs back and forth,
and sees the tween — the play exists as motion, not as arrows on a still image.
**Exit state:** Named play exported as JSON, plus a PNG of the final frame.
**Pain points to design around:** Losing work — the timeline is where accidental destruction
lives. Delete must be undoable or confirmed; edits to a keyframe must be unambiguous about
*which* keyframe is being edited (the selected keyframe is loudly indicated, and editing the
field while scrubbed *between* keyframes must be handled explicitly, not silently).

---

### Dana (new player, learning) — decoding "break side"

**Entry point:** A contextual link from an encyclopedia strategy entry (phase-2 integration;
in v1, the nav link).
**First touchpoint:** Whiteboard with overlay on and the legend visible.
**Key moment:** She flips the lens from **Offense** to **Defense only** and sees the defensive
shape by itself, then hovers a red cell behind the mark and reads *"Closed — the mark's shadow
covers this angle."*
**Exit state:** She can name where strong space is on a given setup.
**Pain points to design around:** Misreading red as "empty." The legend copy and the hover
readout both have to actively correct this: red is **closed**, not **vacant**.

---

## Information Architecture

### Site/App Map

```
Ultipedia
├── /                          (encyclopedia — existing)
├── /contribute/*              (intake — existing)
└── /field-view                (NEW — Whiteboard, default mode)   ← nav placement: OPEN QUESTION
    └── /field-view/designer   (NEW — Play designer / animator)
```

Both routes render the same field canvas from the same scene model; the mode determines whether
the timeline strip is mounted. Switching modes preserves the current scene — the whiteboard
scene becomes keyframe 0 of a new play, and this continuity is the point of "one product, three
modes."

The space visualizer is deliberately **not a route**. It is an overlay toggle present in both
modes, because it is a pure function of scene state.

> **Open question (client):** where this sits in the site's primary navigation, and whether
> `/field-view` is the right slug. Alternatives: `/playbook`, `/whiteboard`, `/tools`.

### Navigation Model

**Primary nav:** A site-level entry point into `/field-view` (placement pending client input).
**Mode switch:** A two-item segmented control in the tool's own header — `WHITEBOARD` /
`DESIGNER`. It drives the route, so browser back works and both modes are linkable.
**Secondary nav:** None inside the tool. Everything is one screen; there are no sub-pages,
no wizard, no tabs beyond the mode switch.
**Key entry points:** Site nav link, direct URL, and (phase 2) contextual links from
encyclopedia entries.

---

## Key User Flows

### Flow 1: Teach with the live map (Happy Path)

1. Coach opens `/field-view`. Field renders immediately, populated with the *vert stack, force
   side* preset. Overlay off.
2. Coach clicks **Space** in the overlay rail. The heatmap fades in over the field (≤ 150 ms);
   the legend appears beneath it.
3. Coach presses on the mark and drags. The heatmap repaints **continuously during the drag** —
   not on release.
4. Coach releases. The map holds its final state.
5. Coach hovers a green cell. The readout panel updates with distance, flight time, defender vs.
   cutter arrival, score, and the label *Strong*.
6. Coach clicks **Export frame**. A PNG of the field (with overlay as currently shown) downloads.

**Alternate path A — different setup:** Coach opens the **Presets** list and picks *Deep help*;
the whole scene replaces in one step, and if a scene was modified an inline confirm appears
first ("Replace current setup?").
**Alternate path D — save a setup as a preset:** Coach arranges a formation, opens the presets
list, and clicks **Save current as preset**; it is named inline and appears in a *Your presets*
group beneath the built-ins, available on every later visit. Built-ins and user presets look and
load identically — only user presets carry rename/delete/export affordances.
**Alternate path B — isolate a layer:** Coach turns off *Field value* and *Throwing lanes*,
leaving raw coverage, to explain pitch control before adding value back.
**Alternate path C — flip the lens:** Coach switches from **Offense** to **Defense only**; the
cutters stay on the field but stop contesting coverage, and the rail label states which question
is being answered.

---

### Flow 2: Build a play

1. Coach switches to **DESIGNER**. The current scene becomes keyframe **1** at `0.0s`; the
   timeline strip mounts along the bottom.
2. Coach drags pieces to the next position.
3. Coach clicks **+ Keyframe**. A new keyframe is appended with a default `+1.5s` offset and
   becomes selected.
4. Repeat 2–3.
5. Coach drags the scrubber. Positions tween between keyframes; pieces are read-only while
   scrubbing between keyframes (see UI States).
6. Coach clicks **Play**. The play animates start → end at real time; **Pause** stops it in
   place.
7. Coach names the play in the metadata field and clicks **Export play**. A versioned JSON file
   downloads.

**Alternate path A — reorder:** Coach drags a keyframe chip left/right in the strip; timestamps
re-sort and the tween re-derives.
**Alternate path B — retime:** Coach edits a keyframe's timestamp inline; the strip re-lays out
proportionally.
**Alternate path C — edit an existing keyframe:** Coach selects keyframe 2 (playhead snaps to
it), moves a piece, and the keyframe updates in place — indicated by the chip showing a modified
marker.
**Alternate path D — edit while scrubbed between keyframes:** Blocked, with an inline hint —
*"Select a keyframe to edit, or add one here."* The second half is a one-click action that
inserts a keyframe at the playhead capturing the interpolated scene.
**Alternate path E — delete:** Coach deletes a keyframe; a toast offers **Undo** for 5 s.

---

### Flow 3: Tune the model

1. Coach expands **Tuning** (collapsed by default) in the rail.
2. Six sliders appear with current values shown numerically: `vmax`, `react`, `head`, `hang`,
   `markStr`, `markW`.
3. Coach drags `markStr` down. The heatmap repaints live during the slider drag, same as a piece
   drag.
4. Coach clicks **Reset to defaults** to return to the calibrated values.

---

## UI States

### Field canvas

| State | Trigger | What the User Sees |
|-------|---------|-------------------|
| **Default** | Route load | Field with preset scene, pieces at rest, overlay off |
| **Overlay on** | Space toggle | Heatmap painted under the pieces; legend visible |
| **Dragging** | Pointer down on a piece | Piece follows pointer with a subtle lift (shadow/scale); overlay repaints continuously; cursor `grabbing` |
| **Hover (cell)** | Pointer over the field, overlay on | Readout panel populated for that cell; a 1-cell reticle marks the sampled point |
| **Hover (piece)** | Pointer over a piece | Piece label shown; cursor `grab` |
| **Playing** | Play pressed (Designer) | Pieces animate; drag disabled; Play button becomes Pause |
| **Scrubbed between keyframes** | Playhead not on a keyframe | Pieces render at interpolated positions, drag disabled, inline hint offers "Add keyframe here" |
| **Out of bounds** | Piece dragged past the sideline | Piece clamps at the boundary; it does not disappear or invalidate the scene |

There is no **loading** or **error** state for the field: it is local, synchronous, and always
renderable. There is no **empty** state — a preset is always loaded.

### Overlay rail

| State | Trigger | What the User Sees |
|-------|---------|-------------------|
| **Overlay off** | Default | Only the Space toggle is enabled; lens, layers, tuning, and legend are hidden (not greyed) — nothing to explain until the map is on |
| **Overlay on** | Space toggled | Lens switch, four layer toggles, collapsed Tuning, and the legend all appear |
| **Layer off** | Layer toggle | That factor drops out of the score; the toggle reads as off and the map repaints immediately |
| **Tuning expanded** | Tuning clicked | Six sliders with numeric values and a Reset link |
| **Non-default tuning** | Any slider moved off default | The Tuning header carries a "modified" marker so a surprising map is traceable to a slider |

### Timeline strip (Designer only)

| State | Trigger | What the User Sees |
|-------|---------|-------------------|
| **Single keyframe** | Mode entered | One chip at `0.0s`, selected; Play disabled with the hint "Add a second keyframe to play" |
| **Multi keyframe** | ≥ 2 keyframes | Chips laid out proportionally by timestamp, playhead draggable, Play enabled |
| **Selected keyframe** | Chip clicked | Chip is loudly active; the field is editable and edits write to that keyframe |
| **Reordering** | Chip dragged | Insertion indicator between chips; other chips shift |
| **Playing** | Play pressed | Playhead sweeps; chips dim; field edits disabled |
| **Deleted** | Delete pressed | Chip removed, toast with **Undo** (5 s) |

### Hover readout

| State | Trigger | What the User Sees |
|-------|---------|-------------------|
| **Idle** | Pointer off the field | Placeholder: "Hover the field to see why a spot is open or closed." |
| **Populated (offense on)** | Hover with overlay on | Distance, flight time, nearest defender arrival, best cutter effective arrival, score + verbal label |
| **Populated (defense only)** | Hover, lens = defense only | Same minus the cutter line, so the missing row is explained by the lens, not by a bug |

### Preset menu

| State | Trigger | What the User Sees |
|-------|---------|-------------------|
| **Built-ins only** | First visit | Four built-in presets, plus `Save current as preset`, plus the empty hint `Arrange a setup and save it here.` under *Your presets* |
| **With user presets** | ≥ 1 saved | Two groups — `Built-in` and `Your presets` — rendered identically; only user presets expose `Rename` / `Delete` / `Export` |
| **Naming** | Save clicked | Inline name field with the current scene as the implied subject; Enter saves, ESC cancels |
| **Duplicate name** | Name already used | Inline hint offering `Replace` or a suggested `{name} 2` — never a silent overwrite |
| **Deleted** | Delete on a user preset | Removed from the list, 5 s `Undo` toast. Built-ins have no delete affordance and cannot be destroyed |

### Import (play JSON)

| State | Trigger | What the User Sees |
|-------|---------|-------------------|
| **Success** | Valid file | Play loads, toast "Loaded {name}" |
| **Invalid** | Schema/version mismatch | Nothing loads; inline error names the reason ("This file isn't a Field View play" / "Made with a newer version") — the current scene is never destroyed by a bad import |

---

## Copy & Tone

**Voice:** Coach-to-coach. Direct, spatial, domain-fluent — it says *break side*, *poach*,
*reset*, *strong space* without apologising, because the audience uses those words and the tool
exists to teach them. Never chatty, never instructional-video. Labels are terse; explanations
are one sentence.

**Key principles:**
- **Name the concept, not the mechanism.** The lens is "Offense on / Defense only", not
  "offense_enabled". The readout says "the mark's shadow covers this angle", not "mark = 0.31".
- **Red never means empty.** Every place red is explained, it is explained as *closed*.
- **Numbers earn trust, words carry meaning.** The readout shows both: the figures and a verbal
  label.
- **No blame, no dead ends.** Blocked actions always offer the unblocking action inline.

**Critical copy samples:**

| Context | Copy |
|---------|------|
| Overlay toggle | `SPACE` |
| Lens switch | `Offense` / `Defense only` |
| Lens helper (offense) | `Where can we attack right now?` |
| Lens helper (defense only) | `Where is this defense structurally weak?` |
| Layer toggles | `Mark force` · `Defender coverage` · `Throwing lanes` · `Field value` |
| Legend swatches | `Closed` · `Open, low value` · `Strong space` |
| Readout labels | `Strong` / `Contested` / `Closed` |
| Readout idle | `Hover the field to see why a spot is open or closed.` |
| Tuning header | `TUNING` (collapsed) · `Reset to defaults` |
| Presets | `Vert stack, force side` · `Horizontal stack` · `Flat mark` · `Deep help` |
| Preset groups | `Built-in` · `Your presets` |
| Preset overwrite confirm | `Replace the current setup?` / `Replace` / `Cancel` |
| Save preset | `Save current as preset` · name field placeholder `Name this setup` |
| Preset saved | `Saved "{name}" to your presets.` |
| Preset actions | `Rename` · `Delete` · `Export` (user presets only) |
| Preset deleted toast | `Preset deleted.` / `Undo` |
| Empty user presets | `Arrange a setup and save it here.` |
| Add keyframe | `+ Keyframe` |
| Play disabled hint | `Add a second keyframe to play.` |
| Between-keyframes hint | `Select a keyframe to edit, or add one here.` |
| Delete keyframe toast | `Keyframe deleted.` / `Undo` |
| Export buttons | `Export frame` (PNG) · `Export play` (JSON) |
| Import success | `Loaded "{name}".` |
| Import invalid | `This file isn't a Field View play.` |
| Import version | `This play was made with a newer version of Field View.` |

---

## Visual Design Direction

**Style:** Technical-editorial, per Light Film Room — hard corners, thin rules, monospace
labels, generous whitespace around a dense central object. The field is the one saturated
element on the page; every control is quiet.

**Color palette:**
- Chrome: Base `#ffffff`, Panel `#f4f4f5`, Border `#d4d4d8`, Text `#18181b`, Muted `#a1a1aa`.
- Primary action / active toggle: Accent Pink `#be185d` (hover `#9d174d`).
- Secondary action: Accent Green `#047857`.
- **Heatmap ramp (fixed by the model, brief §4.3):** `#D64B4A` @ 0 → `#EF9F27` @ 0.42 →
  `#97C459` @ 0.68 → `#4F941D` @ 1, with `score^0.7` gamma. Not themeable in v1; a
  colorblind-safe alternate is phase 2.
- Overlay opacity is tuned so pieces stay legible on top of any ramp colour.

**Piece visual language** *(establishes the site-wide diagram standard — client sign-off
required before it propagates):*

| Piece | Treatment |
|-------|-----------|
| Offense cutter | Filled disc, light fill, dark border, mono numeral label |
| Thrower | Offense treatment + heavier ring; the disc glyph is attached to it |
| Disc | Small solid glyph docked to the thrower, always visible |
| Defense defender | Hollow/outlined marker in a clearly distinct hue, mono numeral |
| Mark | Defense treatment + a directional indicator showing its bearing off the thrower — the mark is the force, so it must read as directional |
| Attack direction | A persistent arrow/legend along the field edge, never ambiguous |
| Field | White surface, `#d4d4d8` rules for sidelines/goal lines, brick marks as small crosses at 20 yd |

**Typography:** Druk for the tool title and mode switch; JetBrains Mono for every control label,
slider value, timestamp, and readout figure (fixed width keeps a live-updating readout from
jittering); Helvetica Neue for the one-line explanatory sentences.

**Spacing & density:** Comfortable in the rail, maximal for the field — the field takes all
remaining space at every breakpoint.

**Mood reference:** A spec sheet with one live instrument on it. Quiet chrome, loud data.

---

## HTML/CSS Mock-Ups

### Mock-Up 1: Whiteboard with overlay on — **NOT YET PRODUCED**

**Artifact path (planned):** `.cicadas/drafts/field-view/mockups/whiteboard-overlay.html`
**Viewport target:** 1440 × 900 desktop; 1024 × 768 tablet check.
**Purpose:** Fixes the field-plus-rail layout, the piece visual language, the legend, and the
hover readout — i.e. exactly the two things the client asked to review before they propagate
(brief §10: *visual language for pieces before it propagates site-wide*).
**Notes:** The existing encyclopedia mock-ups in `design/` are the reference for Light Film Room
execution. A static mock-up with a hand-painted representative heatmap is sufficient; it does
not need to run the model.

> **Client review decision:** the mock-up is produced as the first task of the whiteboard
> partition and shared for early signal, but it **does not block the branch**. The client
> reviews all visuals, presets, and UI once the tool is complete and adjusts from there
> (acceptance-and-polish partition). The compensating requirement is FR-5.3: piece colours,
> shapes, sizes, and labels live in a single tokens module so that late review is cheap to act
> on.

---

## UX Consistency Patterns

### Button Hierarchy
- **Primary action:** Filled accent pink, hard corners, mono uppercase label. One per region
  (`Export play` in Designer; `Export frame` in Whiteboard).
- **Secondary action:** Outlined, border `#d4d4d8`, text `#18181b` (presets, import, reset).
- **Toggle (on):** Filled accent pink with white label. **Toggle (off):** Panel fill,
  `#d4d4d8` border, text `#18181b`. Toggles are never rendered as checkboxes — they are switches
  the coach flips mid-sentence.
- **Destructive action:** Delete keyframe — text-only, no red chrome; safety comes from the
  5-second **Undo**, not from a confirmation dialog (dialogs break a fast authoring loop).

### Feedback Patterns
- **Success:** Toast, bottom-centre (out of the rail's way), 3 s auto-dismiss.
- **Error:** Inline, adjacent to the control that failed (import, timestamp edit). No modals.
- **Warning:** Inline confirm strip for destructive-by-replacement actions (preset overwrite).
- **Info:** One-line helper text under the control it explains (lens helper, play-disabled hint).

### Form Patterns
- **Sliders:** Live value shown numerically to the right in mono; the map updates continuously
  during the drag, never on release.
- **Validation timing:** Timestamp/metadata fields validate on blur; invalid timestamps revert
  with an inline reason.
- **Required fields:** None. Play name defaults to `Untitled play`.

### Navigation Patterns
- **Active state:** The mode switch's active item is filled accent pink.
- **Back navigation:** Browser back, since modes are routes. Scene state survives the switch.

### Modal & Overlay Patterns
- **When to use modals:** Effectively never. The only blocking interaction permitted is the
  inline preset-overwrite confirm, and it is a strip, not a dialog.
- **Dismissal:** ESC dismisses any transient panel; clicking outside dismisses the presets list.

### Panel Patterns
- **Collapsed by default:** Tuning. Everything a coach needs mid-sentence is one click; the rest
  is one click plus one disclosure.
- **Persistence:** Rail toggle states and saved user presets persist in `localStorage` across
  sessions; the working scene does not (each visit starts from a preset, so the tool is never
  "haunted" by yesterday's drag — a setup worth keeping is saved as a preset deliberately).

---

## Responsive & Accessibility

**Breakpoints:**

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Phone | < 768 px | **Out of scope for v1.** Renders a readable message pointing to desktop/tablet rather than a broken canvas. |
| Tablet | 768–1279 px | Field full-width; rail collapses to a bottom sheet / horizontal control bar; timeline below it. Touch drag fully supported. |
| Desktop | ≥ 1280 px | Field left/centre, fixed control rail right (~320 px), timeline strip full-width along the bottom in Designer mode. |

**Accessibility standards:** WCAG 2.1 AA for all chrome — controls, labels, readout, legend,
timeline. The field canvas itself is an interactive graphic with the caveats below.

**Key requirements:**
- **Keyboard:** Full keyboard access to every rail control, the mode switch, and the timeline
  (chip focus, arrow-key retime, Delete). Piece movement is best-effort: pieces are focusable
  and arrow keys nudge the focused piece by 1 yd (Shift = 5 yd). This is a real path, not a
  substitute for the drag.
- **Screen reader:** Controls are properly labelled and their state announced. The field carries
  an accessible summary (mode, preset, lens, layers on) rather than pretending to expose 17,600
  cells. The hover readout is exposed as a live region so keyboard-driven cell sampling is
  announced.
- **Color contrast:** AA minimum on all chrome, verified by the repo's existing automated
  contrast test. The heatmap ramp is data and exempt; **it is never the sole carrier of
  meaning** — the legend and the verbal readout label (`Strong` / `Contested` / `Closed`) carry
  it redundantly, which is what keeps v1 usable without the deferred colorblind palette.
- **Touch targets:** 44 × 44 px minimum for all controls; pieces get a hit area larger than their
  visual radius so a coach can grab one without aiming.
- **Reduced motion:** `prefers-reduced-motion` suppresses the overlay fade, keyframe-chip
  transitions, and toast animation. It does **not** suppress play-back tweening or the live
  repaint — those are the content, not decoration.
