---
summary: "Three shell panels stop being placeholders: the defender panel gets a matchup selector (with visible swap feedback), the mark panel gets a 3x3 force grid that repositions the mark and reads Custom when dragged off-preset, and the offense panel shows who is guarding this player. One new interaction mode: Throw to Player arms from the ribbon, highlights eligible receivers, completes on click, and cancels on Escape / any non-receiver click. No new layout — everything lands inside the existing Light Film Room shell."
phase: "ux"
when_to_load:
  - "When designing or reviewing the throw interaction, matchup selector, or force controls."
  - "When implementation needs exact copy, panel states, or cancel/error behaviour."
depends_on:
  - "prd.md"
modules:
  - "frontend/src/fieldview/ui/shell/panels"
  - "frontend/src/fieldview/ui/shell/ToolRibbon.tsx"
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

# UX Design: fieldview-play-model

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

**Primary goal:** The coach stops *arranging pieces* and starts *describing a play*. Clicking a
receiver should feel like the tool understood the throw, not like it moved a dot.

**Design constraints:**
- No new layout. Everything lands in the existing shell: the ribbon's Throw button, and the three
  `PENDING` panels (offense / defense / mark) registered through `panelRegistry`.
- The field is vertical, offense attacking up. Force positions must read correctly in that
  orientation.
- Desktop sidebar and mobile bottom sheet render the *same* panels (canon ADR-14) — no
  mobile-specific matchup or force UI.
- The heatmap must keep repainting live. Force changes move the mark, so this happens for free —
  but nothing in these panels may take a per-frame path.

---

## User Journeys & Touchpoints

### Coach walking a play

**Entry point:** Ribbon → **Throw**.
**First touchpoint:** Eligible receivers become visually prominent; everything else recedes.
**Key moment:** One click and the disc, the thrower role, and the mark all move correctly together.
**Exit state:** Throwing mode has exited; the new thrower is selected so the sidebar shows the new
situation immediately.
**Pain points to design around:** Not knowing the tool is armed; clicking the wrong thing and
fearing something broke; losing the current selection.

### Coach setting a defensive look

**Entry point:** Clicks a defender on the field.
**First touchpoint:** Defender panel showing the current matchup.
**Key moment:** Reassigning and *seeing* that the displaced defender took the other cutter, rather
than wondering whether coverage is now broken.
**Exit state:** A legal one-to-one look, or a deliberate free-roam zone.
**Pain points to design around:** Silent swaps; not being able to tell assigned from unassigned.

---

## Information Architecture

```
Left sidebar / bottom sheet (unchanged shell)
├── Ribbon: Marquee · THROW (now live) · Advanced Stats (still disabled) · Space View
└── Middle section (panelRegistry, by selection)
    ├── none / multi  → visibility toggles (unchanged)
    ├── offense       → NEW: possession status + "Guarded by" readout
    ├── defense       → NEW: matchup selector + free-roam option
    └── mark          → NEW: force side (3) × force angle (3) + current-force readout
```

Nothing moves in the shell chrome; only the middle section gains real content.

---

## Key User Flows

### Flow 1: Throw to a receiver (happy path)

1. Coach clicks **THROW** in the ribbon. Button shows an armed/pressed state.
2. Field enters throwing mode: offensive players other than the current holder are highlighted as
   eligible; the field shows it is waiting for a receiver.
3. Coach clicks an eligible receiver.
4. Possession moves; receiver becomes thrower; previous thrower becomes an ordinary cutter; the
   receiver's assigned defender (or nearest, if unassigned) becomes the mark and the old mark
   reverts to defender.
5. Throwing mode exits; the new thrower becomes the selection, so the sidebar updates to it.

**Alternate A — cancel:** `Escape`, clicking empty grass, clicking a defender, or clicking **THROW**
again all exit throwing mode with no state change.
**Alternate B — throw to self:** clicking the current holder exits throwing mode, changing nothing.
**Alternate C — dragging while armed:** starting a drag cancels throwing mode and performs the drag
normally; the coach never gets stuck in a mode.

### Flow 2: Reassign a matchup

1. Coach selects a defender → panel shows `Guarding: #3`.
2. Coach picks `#5` from the selector.
3. The defender now guards #5; the defender that held #5 now guards #3 (1-to-1 swap).
4. The panel confirms the swap in a short line so the change is not silent.

**Alternate A — free roam:** choosing **No assignment** unassigns only this defender; no swap
cascades, and other assignments are untouched.
**Alternate B — assigning from unassigned:** a free-roam defender taking #5 displaces #5's previous
defender to *unassigned* (there is nothing to swap it with).

### Flow 3: Set the force

1. Coach selects the mark → panel shows the current force, e.g. `Flick · Default`.
2. Coach clicks **Backhand**. The mark piece moves to the backhand-force position beside the
   thrower; the heatmap repaints.
3. Coach clicks **Around**. The mark shifts to the around-angle variant of that side.
4. Coach later drags the mark by hand; the readout becomes `Custom` and no side/angle button is
   shown as active.

---

## UI States

### Ribbon — Throw button

| State | Trigger | What the user sees |
|-------|---------|--------------------|
| **Idle** | Default | Normal enabled button (no longer disabled/tooltipped) |
| **Armed** | Clicked | Pressed/accent state, `aria-pressed="true"` |
| **Unavailable** | Nobody has the disc | Disabled with tooltip `Nobody has the disc.` |

### Field — throwing mode

| State | What the user sees |
|-------|--------------------|
| **Armed** | Eligible receivers emphasised; current holder and defenders de-emphasised |
| **Hover eligible** | Receiver reads as the target under the cursor |
| **Cancelled** | Emphasis clears instantly, nothing else changes |

### Defender panel

| State | What the user sees |
|-------|--------------------|
| **Assigned** | `Guarding` + selector showing the offensive player, plus **No assignment** option |
| **Free roam** | Selector reads `No assignment`; a short note that this defender is not tracked |
| **Just swapped** | A one-line confirmation naming the displaced defender's new mark |

### Mark panel

| State | What the user sees |
|-------|--------------------|
| **Named force** | Side row (Flat/Flick/Backhand) and angle row (Default/Inside/Around) with the active one accented; readout e.g. `Flick · Around` |
| **Custom** | No side/angle accented; readout `Custom`, with a hint that a preset restores a named force |
| **No thrower** | Force is meaningless without a holder — controls disabled with an explanatory line |

### Offensive player panel

| State | What the user sees |
|-------|--------------------|
| **Has disc** | `Has the disc` status; guarded-by readout |
| **Receiver** | Guarded-by readout; nothing else editable in this initiative |
| **Unguarded** | `Guarded by: nobody` |

---

## Copy & Tone

Same voice as the shell: direct, technical, monospace chrome, sentence-case explanatory lines. Never
imply breakage for a deliberate state (free roam and Custom are choices, not errors).

| Context | Copy |
|---------|------|
| Throw armed hint | `Click a receiver.` |
| Throw unavailable tooltip | `Nobody has the disc.` |
| Defender matchup label | `Guarding` |
| Free-roam option | `No assignment` |
| Free-roam note | `Not tracking anyone — place this defender by hand.` |
| Swap confirmation | `Swapped — #7 now guards #3.` |
| Offense guarded-by | `Guarded by` |
| Nobody guarding | `Guarded by: nobody` |
| Mark custom readout | `Custom` |
| Mark custom hint | `Pick a force to snap the mark back to a named position.` |
| Force disabled (no holder) | `Force needs a thrower — give someone the disc first.` |

---

## Visual Design Direction

Unchanged Light Film Room system — `SHELL_TOKENS` for chrome, `#be185d` accent for active
side/angle buttons and the armed Throw button. Force buttons use the shell's existing toggle-row
treatment (1px borders, negative margins, accent on active) so they match the visibility toggles
already in the default panel. Throwing-mode emphasis on the field uses `PIECE_TOKENS` (canvas
system, `#EF4B8A`), **not** shell accent — per canon ADR-16, chrome and canvas keep separate
accents.

---

## HTML/CSS Mock-Ups

`N/A — no new layout.` This initiative adds content inside panels whose chrome, spacing, and
breakpoints were already made concrete by `fieldview-shell`'s mock-ups
(`.cicadas/archive/20260730-234841-fieldview-shell/mockups/`). The panel bodies here are toggle
rows, a `<select>`, and status lines — all existing patterns. A mock-up would restate the shell
rather than resolve anything open.

---

## UX Consistency Patterns

- **Toggle rows** for force side/angle, matching the existing offense/defense visibility toggles.
- **Selector** for matchup: a native `<select>` (keyboard- and screen-reader-native, and the option
  list is 7 cutters + `No assignment`, well within sensible bounds).
- **Status lines** are plain sentence-case text under a monospace uppercase label, matching the
  panels' existing rhythm.
- **Deliberate states are never styled as errors** — `Custom` and `No assignment` use normal text,
  not warning colour.
- **Modes announce themselves** — an armed tool always shows a pressed button *and* a field-level
  hint, so the coach is never in an invisible mode.

---

## Responsive & Accessibility

Inherits the shell's 1024px breakpoint and both presentations; panels are identical in each.

- Throwing mode is fully keyboard-operable: `Escape` cancels; receivers are already focusable
  buttons in the SVG, so `Enter`/`Space` completes a throw on the focused receiver.
- The armed Throw button carries `aria-pressed`; the field hint is in a polite live region so a
  screen-reader user learns the tool is armed and, afterwards, that possession changed.
- The swap confirmation is announced politely — a silent swap is exactly what a non-sighted user
  would otherwise miss.
- Force buttons are a labelled group (`Force side`, `Force angle`) so their options are not read as
  a flat list of unrelated buttons.
- Active force is not signalled by colour alone — the readout states it in words.
- Touch targets keep the shell's 44px minimum on mobile.
