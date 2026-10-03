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

- [ ] Site header on top, Field View bar below, tabs Watch / Explore / Build (Soon)
- [ ] Explore: setup list (5 rows, scrolls), Defense follows ("Coming soon"), Reset, selected-player card
- [ ] Watch: plays list (5 rows, scrolls), speed/loop/trails, transport, 4-up filmstrip that scrolls
- [ ] Build: placeholder card over dashed regions, no sidebar
- [ ] Is `desktop` = 1280×640 the right switch? (`tailwind.config.js` and `index.css` `--fv-chrome`)
- [ ] Keyboard: Tab reaches the tabs, setup rows, transport, filmstrip; Escape closes dialogs

## Content you will eventually replace (see the placeholder register)

- [ ] Setup names, coordinates, takeaways · [ ] the seven toy plays and their frame labels
- [ ] Colour-guide wording · [ ] rotate / Build / menu copy · [ ] colour-blind palette hex values
