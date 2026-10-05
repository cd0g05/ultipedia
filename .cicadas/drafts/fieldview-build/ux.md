---
summary: "The Build experience is already designed and approved as design/fieldview-build-mockup.html: desktop Build is Explore's layout plus three cards under the field (Frame, Selected player, Preview) and a four-across frame strip, a sidebar with the play library, play name/description and share, and a top bar with undo/redo, Saved state and Share; tablet/phone Build keeps the compact top bar (frame chip, undo/redo, legend, Share) with the frame strip, frame actions and a selected-player bar under the field. Indicators: ghost + arrow + pink corner mark for pieces placed in the current frame, green ring for the disc holder, heavy ring for the mark, pink ring for selection, 2-character titles inside pieces. Pieces are 85/70/50% of today's size on phone/tablet/desktop. Share is a dialog with link, QR and file. Explore gains the Selected-player card (title + Give disc)."
phase: "ux"
when_to_load:
  - "When implementing or reviewing Build, the selected-player panel, share dialog, indicators, copy or responsive behaviour."
depends_on:
  - "prd.md"
  - "design/fieldview-build-mockup.html"
  - "docs/fieldview-build-functional-spec.md"
  - "style-guide/design.md"
modules:
  - "frontend/src/fieldview/ui"
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

# UX Design: fieldview-build

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

**Primary goal:** building a five-frame play feels like rearranging the field and pressing "add frame" — no new tool to learn.

**Constraints:** laptop-first (tablet usable, phone secondary); Explore's engine for dragging; the approved mockup is the visual spec; light theme; no JS media queries; everything undoable.

---

## User Journeys & Touchpoints

### Coach (laptop)
**Entry:** Build tab → My plays → New play. **Key moment:** the first time an earlier frame is edited and the later frames follow. **Exit state:** a link/QR in hand. **Pain points to design around:** "which frames did I change?" (indicators), "I broke it" (undo, Reset).

### Coach / player (tablet or phone)
**Entry:** a shared link → Watch (or Build on a tablet). **Key moment:** the disc leaving the thrower and landing as the receiver arrives.

---

## Information Architecture

| Area | Desktop | Compact (tablet/phone) |
|---|---|---|
| Top bar | brand · tabs · undo / redo · "Saved to this device" · Share · legend · gear | ☰ + BUILD · frame chip ◀ n / N · label ▶ · undo / redo · legend · Share |
| Sidebar | My plays (list, New play) · Play (name, description) · Share (link, export) | (in the ☰ menu: My plays, Play name) |
| Under the field | cards: **Frame** (label, duplicate, reset frame, delete) · **Selected player** (title, Give disc, Reset player, status) · **Preview** (play all, from this frame); frame strip (4 across, scrolls, + Add frame) | frame strip (4 across, scrolls) · actions row (Add, Duplicate, Delete, Reset frame, Preview) · selected-player bar |
| Dialogs | Share (link + copy, QR, download / open file, snapshot note) | same |

Explore (desktop) gains one card: **Selected player** with title and Give disc (no frame controls).

---

## Key User Flows

### Flow 1 — Build a play
1. Build → My plays → **New play** (14 players on a default setup, one frame).
2. Drag players into a starting formation; select a player → type a title (H, C…); select a handler → **Give disc**.
3. **+ Add frame**: a new frame identical to the last. Drag a cutter: a ghost + arrow show the move; the piece gets a pink corner mark; the thumbnail shows "1 placed".
4. Add a frame, select the cutter, **Give disc**: the thumbnail shows "disc".
5. Repeat. **Preview** plays it. **Share** opens the dialog.

### Flow 2 — Edit an earlier frame
Select frame 1, drag a player who was never moved later: every later frame moves them too (they inherit). A player placed in frame 3 keeps their frame-3 position; the transition into frame 3 changes length.

### Flow 3 — Undo / reset
Undo/redo step through completed gestures. **Reset player** removes that player's placement in this frame; **Reset frame** removes all placements and the disc change; **Delete** removes the frame and its changes.

### Flow 4 — Share
Share → dialog: copy link, scan QR, download file. A link is a snapshot. Opening a link: Watch plays it; **Save to my plays**.

### Flow 5 — Titles and the disc in Explore
Select a player → title field and Give disc in the card; the mark updates as defenders move within 10 ft.

---

## UI States

- **Build:** empty library · play open, frame selected · piece selected · dragging (lifted piece on touch) · preview running (editing disabled) · saving ("Saved") · unsaved/error ("Couldn't save — storage full") · share dialog open.
- **Frame:** first frame (no ghosts; everything is placed) · later frame with no changes ("No changes — same as frame n−1") · with changes (n placed).
- **Piece:** unnamed · titled · holder · mark · selected · placed-in-this-frame.
- **Link open:** valid · invalid/too large ("This link isn't a Field View play").

---

## Copy & Tone

Mono, uppercase micro-labels, plain sentences. Placeholders until reviewed (register rows added at build time):

- Empty library: "No plays yet. Start with New play."
- Frame card with no changes: "No changes — same as the previous frame."
- Share dialog: "Anyone with this link can watch the play on their phone. It is a snapshot: changes you make later won't update a link you already sent."
- Invalid link: "This link isn't a Field View play."
- Default play/frame names: "Untitled play", "Frame 2".

---

## Visual Design Direction

Light Film Room, exactly as approved in the mockup: hard corners, zinc neutrals, pink interactive/selection, green on-state **and disc-holder ring**, Archivo Black headings, JetBrains Mono UI. Pieces: filled dark = offense, white + ring = defense, title centred inside. Strokes scale with the piece so small pieces do not look heavy-bordered.

---

## HTML/CSS Mock-Ups

Approved, in repo: `design/fieldview-build-mockup.html` — key to the indicators; Build desktop (editing frame 4 of 5, "Go deep"); Build tablet; Share dialog; Explore with the selected-player card; piece sizes with a Current/Proposed switch. The Builder signed off on layout and on the sizing (85 / 70 / 50%), including the thinner outlines and centred titles.

---

## UX Consistency Patterns

- Same slots as Explore/Watch so nothing is relearned; same lists/cards/switches/buttons from the shared content set.
- Active = pink; on-state = green; destructive actions (Delete) are undoable rather than confirmed.
- Frame strip: four across, scrolls sideways, current frame auto-scrolled into view.
- A frame's changes are always visible: ghost + arrow on the field, corner mark on the piece, badge on the thumbnail.

---

## Responsive & Accessibility

- Desktop layout at the `desktop` screen (≥ 1280 × 640); compact otherwise; CSS-only switch.
- Touch: lifted piece + ghost already built; targets ≥ 44 px; the selected-player bar (not a slide-over) so the edited piece is never covered.
- Keyboard: frame strip arrow keys; Delete/Backspace on a focused frame; ⌘/Ctrl-Z / Shift-Ctrl-Z for undo/redo; Escape closes dialogs.
- Titles are not accessible names: pieces announce "Offense 3" (+ "has the disc" / "is the mark").
- Reduced motion: preview jumps between frames.
