---
summary: "Motion is a three-beat interaction that reuses the shell's existing seams: select an offensive player, click destinations on the field (route markers appear with leg numbers), press Run. The offense panel gains a Route section (Set Destination / Add Waypoint / Clear / Run / Reset); Advanced Settings gains a Movement group of sliders beside the existing space sliders. While running, the field is read-only — dragging is suppressed and pieces animate. Disc flight animates on a throw, with possession changing on arrival. Reduced-motion users get the end state instantly and an announcement instead of an animation. No new panel kinds, no new ribbon buttons; both shells (desktop sidebar and mobile sheet) get it for free via the existing registry."
phase: "ux"
when_to_load:
  - "When implementing or reviewing motion interaction, route markers, panel controls, or copy."
  - "When checking accessibility and reduced-motion behaviour for the simulation."
depends_on:
  - "prd.md"
  - ".cicadas/canon/modules/fieldview.md"
modules:
  - "frontend/src/fieldview/ui/shell/panels"
  - "frontend/src/fieldview/ui/FieldCanvas.tsx"
  - "frontend/src/fieldview/render"
index:
  design_goals: "## Design Goals & Constraints"
  journeys: "## User Journeys & Touchpoints"
  ia: "## Information Architecture"
  flows: "## Key User Flows"
  ui_states: "## UI States"
  copy: "## Copy & Tone"
  visual: "## Visual Design Direction"
  consistency: "## UX Consistency Patterns"
  responsive_a11y: "## Responsive & Accessibility"
next_section: "Design Goals & Constraints"
---

# UX Design: fieldview-motion

## Progress

- [x] Design Goals & Constraints
- [x] User Journeys & Touchpoints
- [x] Information Architecture
- [x] Key User Flows
- [x] UI States
- [x] Copy & Tone
- [x] Visual Design Direction
- [x] UX Consistency Patterns
- [x] Responsive & Accessibility

## Design Goals & Constraints

**Goals**

1. **The interaction should disappear behind the thing being shown.** A coach is demonstrating a
   cut to a player standing next to them. Three beats — select, click where, press run — is the
   budget. Anything more and they will drag the pieces by hand instead.
2. **The route must be legible before it runs.** A destination the coach cannot see is a destination
   they cannot correct, and re-running a cut three times with small changes is the actual workflow
   (PRD Journey 2).
3. **Running should look obviously different from editing.** Motion is the one moment the field is
   not directly manipulable; that has to be visible, not discovered by a drag that does nothing.

**Constraints**

- **No new ribbon button.** The ribbon is a fixed 2×2 (canon: Marquee, Throw, Advanced Stats, Space
  View) shared verbatim by the desktop sidebar and the mobile sheet. Motion is a property of a
  *selected offensive player*, so it belongs in that player's panel — which is exactly the panel
  `fieldview-play-model` left deliberately read-only ("routes and cuts belong to a later one").
- **No new selection kind.** `SelectionState` is a closed union with a complete panel registry
  (canon ADR-13); adding a kind means a compile error everywhere. Motion adds controls to the
  existing `offense` panel instead.
- **Both shells for free.** Anything added to a registered panel appears in the desktop sidebar and
  the mobile bottom sheet with no second code path (canon ADR-14). Nothing here may break that.
- **The canvas is not React's.** Route markers and animating pieces are drawn on the existing
  SVG/canvas path, not as React elements updated per frame (canon ADR-2).
- **Advanced Settings already exists** and already holds sliders. Motion tunables join that panel
  rather than inventing a second settings surface.

## User Journeys & Touchpoints

### Coach demonstrating a single cut

Selects a cutter (canvas click) → **Route** section appears in the panel → **Set Destination** →
clicks the field → marker `1` drops, **Run** becomes available → **Run** → pieces animate, panel
shows *Running…* with a **Stop** → motion settles → **Reset** returns the field to where it started.

Touchpoints: canvas selection, offense panel, canvas destination click, route markers, animating
pieces, live-region announcements.

### Coach teaching cut setup

Same entry, but clicks twice — markers `1` and `2` with a connecting line — runs it, watches the
defender get beaten by the turn, presses **Reset**, drags marker `1` shallower, and runs again.

Touchpoints: multi-waypoint markers, marker repositioning, Reset, repeat runs.

### Coach calibrating the defense

Bottom menu → **Advanced Settings** → **Movement** group → drags *Reaction* and *Cushion* → back →
**Run** again.

Touchpoints: Advanced Settings panel, Movement slider group, reset-to-defaults.

## Information Architecture

Nothing moves. Three existing surfaces gain content:

```
Left sidebar (desktop) / Bottom sheet (mobile)
├── Tool ribbon (2×2)                      — UNCHANGED
├── Variable middle section
│   ├── none / multi  → visibility toggles — UNCHANGED
│   ├── offense       → Player / Guarded by  (from play-model)
│   │                   + ROUTE            — NEW
│   ├── defense       → matchup selector   — UNCHANGED
│   └── mark          → force controls     — UNCHANGED
└── Bottom menus
    ├── Advanced Settings → space sliders
    │                       + MOVEMENT group — NEW
    └── Play Designer      — placeholder, Initiative D

Canvas
├── field, heatmap, pieces                 — UNCHANGED
├── route markers + legs                   — NEW (selected player's pending route)
└── animating pieces + disc in flight      — NEW
```

The **Route** section sits *below* the read-only Player and Guarded-by lines in the offense panel:
identity first, then what you can do to it — the same order the defender panel uses (identity, then
matchup selector).

## Key User Flows

### Flow 1: Run a single-leg cut (happy path)

1. Coach clicks an offensive player on the field. Panel shows Player, Guarded by, and **Route —
   None set**.
2. Coach clicks **Set Destination**. The button becomes pressed; the field enters
   destination-picking; the hint reads *Click where the cutter should go.*
3. Coach clicks a spot. A numbered marker `1` appears there with a line from the player. The button
   returns to rest and reads **Add Waypoint**. **Run** and **Clear** become enabled.
4. Coach clicks **Run**. Destination-picking exits if still armed. The field becomes read-only;
   pieces animate; the panel shows **Stop** in place of Run and the status line reads *Running…*
5. Every mover arrives. The simulation ends on its own. **Stop** reverts to **Run**, **Reset**
   becomes enabled, and the live region announces *Cut complete.*
6. Coach clicks **Reset**. Pieces snap back to their pre-run positions; the route is still there,
   ready to run again.

### Flow 2: Build a two-part cut

1. From step 3 above, coach clicks **Add Waypoint** and clicks a second spot. Marker `2` appears,
   joined to `1`.
2. Repeat for further legs. Markers are numbered in order.
3. **Run** executes all legs in sequence for that player.
4. **Clear** removes the whole route at once; there is no per-waypoint delete in this initiative
   (Initiative D's action list is where per-item deletion belongs).

### Flow 3: Cancel destination-picking

Pressing `Escape`, clicking **Set Destination**/**Add Waypoint** again, selecting a different
player, or clicking a piece rather than empty grass all exit destination-picking without adding a
waypoint. Consistent with throwing mode's cancel paths (`fieldview-play-model` Flow 1).

### Flow 4: Throw with flight

1. Coach arms **Throw to Player** and clicks a receiver (unchanged from play-model).
2. The disc leaves the thrower and travels; a huck visibly takes longer than a dump.
3. On arrival, possession, roles, and the mark change — the same state change as today, just later.
4. The live region announces the throw on arrival, not on click, so the announcement matches what is
   on screen.

### Flow 5: Interrupted run

Pressing **Stop** mid-run leaves every piece exactly where it was at that instant — that is a
legitimate coaching moment ("freeze it right there"), not an error. **Reset** is still available and
still returns to the pre-run positions.

## UI States

### Offense panel — Route section

| State | Appearance |
|-------|-----------|
| No route | *None set.* Buttons: **Set Destination** enabled; Clear/Run/Reset disabled |
| Picking | **Set Destination** pressed (`aria-pressed`); hint *Click where the cutter should go.* |
| Route set | Leg count shown (*2 legs*); **Add Waypoint**, **Clear**, **Run** enabled |
| Running | Status *Running…*; **Stop** replaces Run; all other route buttons disabled |
| Settled | **Run** returns; **Reset** enabled; status *Cut complete.* |
| Reduced motion | Run applies the end state immediately; status *Cut complete.* with no animation |

### Field — destination picking

Cursor is a crosshair. Empty grass is the target, so pieces are de-emphasised rather than
highlighted — the inverse of throwing mode, where pieces *are* the target. This deliberate inversion
is what keeps the two armed modes from being confused.

### Field — running

Pieces animate. Drag is suppressed (pointer-down on a piece does nothing). The heatmap keeps
repainting live. A subtle running indicator sits on the canvas so the read-only state is visible
even when the sidebar is collapsed on mobile.

### Route markers

Numbered from `1`, joined by a thin line from the player through each waypoint in order. Markers
belong to the **selected** player; selecting someone else shows theirs instead. Multiple players may
hold routes simultaneously, but only the selected player's markers are drawn — otherwise a full
play's routes overlay into noise, which is Initiative D's problem to solve with frames.

### Advanced Settings — Movement group

A labelled group below the existing space-model sliders, using the same slider chrome, same
value-readout format, and the same shared reset. Grouping matters: a coach tuning "how fast do
people run" should not have to know which model owns which number.

### Disc in flight

The disc travels along a straight line between thrower and receiver. It is not owned by anyone
mid-flight; no player shows possession until it lands.

## Copy & Tone

Terse, lowercase-verb, coach's vocabulary — matching the existing panels.

| Context | Copy |
|---------|------|
| Route section label | `Route` |
| Empty route | `None set.` |
| Route set | `1 leg` / `2 legs` |
| Buttons | `Set Destination`, `Add Waypoint`, `Clear`, `Run`, `Stop`, `Reset` |
| Picking hint | `Click where the cutter should go.` |
| Running status | `Running…` |
| Settled status | `Cut complete.` |
| Stopped early | `Stopped.` |
| Run disabled, no route | `Set a destination first.` |
| Reduced motion note | (none — the announcement is identical; the tool does not explain itself) |
| Movement group heading | `Movement` |
| Slider labels | `Top speed`, `Reaction`, `Acceleration`, `Deceleration`, `Cushion` |

**Deliberately not used:** "simulate", "physics", "animation", "AI". The coach is running a cut, not
a simulation. `Reset` rather than `Undo` — it restores positions, it is not an edit-history
operation, and calling it Undo would imply it is.

## Visual Design Direction

Light Film Room, unchanged: zero border-radius, 1px `#d4d4d8` borders, `SHELL_TOKENS.accent`
(`#be185d`) for interactive chrome, JetBrains Mono for controls and numeric readouts.

Canvas additions live in `render/tokens.ts` like every other visual (canon ADR-10) — route marker
fill/stroke/size, leg line weight and dash, and the running indicator. They use the **canvas**
palette (`PIECE_TOKENS`/`FIELD_TOKENS`, `#EF4B8A` family), not the shell accent, per canon ADR-16:
route markers are game entities, not chrome.

Markers are square, matching the design system's hard-corner rule and distinguishing them at a
glance from the circular pieces.

## UX Consistency Patterns

- **Armed modes look and cancel alike.** Destination-picking borrows throwing mode's whole grammar:
  `aria-pressed` on the arming button, a one-line hint, and cancel via Escape / re-click / clicking
  the wrong kind of thing. A coach who has learned Throw already knows this.
- **Panels state their identity first, then their controls.** Route follows Player and Guarded-by,
  as the matchup selector follows the defender's identity lines.
- **Disabled controls say why.** `Set a destination first.` follows the precedent of
  `Nobody has the disc.` on the Throw button.
- **One registry, two shells.** All of this is panel content, so the mobile sheet gets it with no
  second implementation (canon ADR-14).
- **Colour is never the only carrier.** The running state is announced and labelled, not signalled
  by the indicator alone.

## Responsive & Accessibility

**Responsive.** No layout change; the shell's CSS-only `lg` switch is untouched (canon ADR-15). On
mobile the Route controls appear in the SELECTION tab of the bottom sheet. Destination-picking is a
tap on the field — which is why the canvas running indicator matters, since the sheet may be
collapsed over the field while a run is in progress.

**Reduced motion.** This is the initiative's one sanctioned divergence from the module's
"reduced motion via Tailwind `motion-safe:` variants, no JS `matchMedia`" convention: the animation
here is a JS-driven simulation loop, not a CSS transition, so a CSS variant cannot suppress it. The
driver checks the preference and applies the end state directly. The tech design must record this as
a deliberate exception, not an oversight, so the next reader does not "fix" it back.

**Announcements.** The existing polite live region carries: run started, `Cut complete.`,
`Stopped.`, and the throw completion (now on arrival). Per-frame positions are never announced —
that would flood a screen reader with exactly the information it cannot use.

**Keyboard.** Every route control is a real button in tab order. `Escape` cancels
destination-picking, matching throwing mode. Setting a destination itself is pointer-only in this
initiative — a keyboard user can still position players by the existing means, and a coordinate
entry affordance is noted as a gap rather than silently skipped.

**Motion safety.** Nothing flashes or strobes; movement is continuous translation at real-world
speeds, well under any photosensitivity threshold.
