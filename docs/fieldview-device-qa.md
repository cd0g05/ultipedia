# Field View — real-device pass (checklist)

Written 2026-10-03 for `fieldview-ui-rework` (task 105). The automated suite and the browser
pane cannot judge these: they need a real phone, tablet and laptop, in light like a practice
field's. Do this on the deployed preview or `npm run dev -- --host` on the same network, then
tell me the findings (or edit the numbers yourself — each one is a single value, listed with
where it lives). Everything here is also a row in `docs/fieldview-placeholders.md`.

> **Restart your dev server first.** `tailwind.config.js` gained a `desktop` screen; a dev server
> started before that does not pick it up, so the desktop layout (sidebar, dock, site header) will
> not appear until `npm run dev` is restarted. The production build is fine.

## Phone, landscape (e.g. 844×390, and a small one around 640×360)

- [ ] `/fieldview` lands on Explore; no page scroll; field fills the width; nothing under a notch
- [ ] Portrait shows "Rotate your phone…" and **Continue anyway** works
- [ ] **Piece size** — readable from arm's length? numbers inside legible? (`PIECE_TOKENS.*.radius`,
      `render/tokens.ts`, now 11.5; the earlier request was "slightly smaller"; the mockups assumed ~21 px)
- [ ] **Stacks** — do pieces overlap in "Vertical stack" / "Ho stack" / "Clumped"? (toy coordinates, `scene/presets.ts`)
- [ ] Drag a player with a thumb: the piece sits **above** the finger, the dashed ghost marks the start,
      the heat follows. Is the lift distance right? (`TOUCH_TOKENS.liftPx`, 30)
- [ ] Can you grab the piece you meant in a crowd? (`TOUCH_TARGET_PX`, `render/pick.ts`, 44)
- [ ] A **tap** on a piece selects it and does not move it
- [ ] ☰ menu opens/closes; **Back to Ultipedia** works; colour-blind switch changes map and legend
- [ ] Setup chip ◀ ▶ cycles; the label doesn't truncate at 640 px wide; slide-over list opens
- [ ] Watch: ◀ ▶ step, Play runs, dots jump, play selector opens, tap on the field pauses/resumes
- [ ] Heat readable in sun? (`HEATMAP_ALPHA`, `render/heatmap.ts`, 0.78)

## Tablet, landscape (e.g. 1180×820, and 1024×768)

- [ ] Same compact layout as the phone, scaled up; field centred; empty space below is acceptable?
- [ ] Which layout does it get at 1024–1279 wide? (compact, by design.) Does it feel right laid flat?
- [ ] Touch targets comfortable

## Laptop (≥1280×640)

- [ ] Site header on top, Field View bar below, tabs Watch / Explore / Build
- [ ] Explore: setup list (5 rows, scrolls), Defense follows ("Coming soon"), Reset, selected-player card
- [ ] Watch: plays list (5 rows, scrolls), speed/loop/trails, transport, 4-up filmstrip that scrolls
- [ ] Build: see "Build, titles, piece sizes and sharing" below
- [ ] Is `desktop` = 1280×640 the right switch? (`tailwind.config.js` and `index.css` `--fv-chrome`)
- [ ] Keyboard: Tab reaches the tabs, setup rows, transport, filmstrip; Escape closes dialogs

## Content you will eventually replace (see the placeholder register)

- [ ] Setup names, coordinates, takeaways · [ ] the seven toy plays and their frame labels
- [ ] Colour-guide wording · [ ] rotate / Build / menu copy · [ ] colour-blind palette hex values

## Build, titles, piece sizes and sharing (fieldview-build)

Written 2026-10-05 (task 150). The automated suite covers the logic; these need a person and real devices.
Each tuning value is a single number, listed with where it lives; all are rows in `docs/fieldview-placeholders.md`.

### Piece size (rows #21, #22) — the main thing to judge
- [ ] **Phone landscape** — pieces are 85 % of the old size (`--fv-piece-scale`, `src/index.css`). Readable at
      arm's length? Do the 2-character titles inside them read? (title never below 65 %)
- [ ] **Tablet** (from 1000 px wide) — 70 %. Is 1000 px the right place for the step?
- [ ] **Laptop** (the `desktop` screen) — 50 %. Do the vertical stack / ho stack / clumped setups stop crowding?
- [ ] Is the **green holder ring** (`PIECE_TOKENS.holder`, `render/tokens.ts`) visible on the heat in sun, and
      for colour-blind players in CB mode? Does the heavy **mark ring** still read at 50 %?
- [ ] Grabbing a small piece in a crowd still feels as easy as before (the grab radius did not shrink)

### Build — laptop
- [ ] Drag players, add a frame, drag a cutter: ghost + arrow, pink corner mark, thumbnail badge "1 placed"
- [ ] Edit an earlier frame: players who inherit follow; one placed later stays put
- [ ] Select a player: type a title (2 chars), **Give disc**, **Reset player**; undo / redo (buttons and Ctrl/⌘-Z)
- [ ] **Preview**: "Play all" and "From frame n" — the disc flies from the passer's start to the receiver's end and
      lands as they arrive; editing is off while it runs; Stop returns to the frame you were on
- [ ] Is 1.2 s per transition (`TRANSITION_SECONDS`, `ui/playback/playback.ts`) a good first pace?
- [ ] Layout against `design/fieldview-build-mockup.html` (cards under the field, 4-across strip, sidebar)

### Build — tablet and phone
- [ ] Compact bar: ☰ · BUILD · frame chip ◀ n / N ▶ · undo / redo · legend · Share
- [ ] Frame strip, actions row, selected-player bar are reachable without covering the field
- [ ] A thumb drag lifts the piece above the finger; the placement lands where the piece is drawn
- [ ] ☰ menu: play name / description, **My plays**, examples

### Library and sharing (task 133)
- [ ] A new play saves by itself ("Saved to this device"); reload the page: it is still there
- [ ] **Share → link**: send it to your phone (Messages / email / AirDrop); open it: Watch plays it, "Shared with you"
- [ ] **Share → QR**: scan from a phone camera held at the laptop; it opens the same play
- [ ] **Save to my plays** → **Open in Build** on the phone works
- [ ] **Download file** then **Open a file…** round-trips; a random JSON file is refused with a clear message
- [ ] Fill the browser's storage (or use a private window) and edit: the pill says "Couldn't save — storage full"
      and the play on screen is untouched

### Content and copy you will eventually replace (rows #1–5, #20, #23)
- [ ] The toy setups and plays · [ ] the default new-play name / formation · [ ] save-state, empty-state and
      Share wording
