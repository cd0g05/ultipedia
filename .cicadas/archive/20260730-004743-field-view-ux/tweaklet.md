---
summary: "Field View first-review UI fixes — distance-based piece picking, focus ring, sizing, attack-arrow label, fullscreen present mode"
phase: "tweak"
when_to_load: "Working on frontend/src/fieldview render, ui, or pages"
depends_on:
  - "canon/modules/fieldview.md"
modules:
  - "frontend/src/fieldview/render"
  - "frontend/src/fieldview/ui"
  - "frontend/src/fieldview/pages"
---

# Tweaklet: Field View UX — first review

## Intent

This is **task 132** from the closed `field-view` initiative: the follow-up tweak carrying the
client's visual review, which was deliberately deferred past the merge to a deployed preview
(recorded in `archive/20260727-205607-field-view/acceptance-checklist.md` and in
`canon/modules/fieldview.md` § Outstanding).

Six complaints from the review of `https://ultipedia-b42f.vercel.app/field-view`:

1. Player icons are too small and hard to click.
2. Selection is inconsistent — grabbing often picks up a piece further from the cursor.
3. Clicking leaves an ugly black box behind.
4. The field is too small; it should use more of the window width.
5. The attacking arrow is confusing without a label.
6. No way to go fullscreen for showing the diagram to a team in a huddle.

Items 2 and 3 are defects with one shared root cause. The rest are sizing and presentation.

## Diagnosis

**Why 2 and 3 are the same bug.** `render/pieceLayer.tsx` gave every piece an invisible
`<circle r={PIECE_TOKENS.hitArea.radiusPx} />` at `r = 22` SVG units. At `PIXELS_PER_YARD = 8`
that is a **2.75 yd radius / 5.5 yd wide** grab disc, and players in the built-in presets sit
closer together than that, so the discs overlapped heavily.

SVG hit-testing has no notion of distance — the **topmost element in document order wins**.
`players.map(...)` renders in array order, so wherever two discs overlapped, whichever player
happened to be later in the array captured the pointer. Deterministic, not flaky.

The same circle produced the black box: each piece is a focusable `<g role="button">`, and the
browser's focus ring is drawn around the `<g>`'s **bounding box**, which the invisible circle
inflated to ~44×44. `outline: "none"` was set inline but Chrome does not reliably honour it on
SVG container elements. Meanwhile `PIECE_TOKENS.focusRing` was declared and never used.

**Why the field looked small.** `ui/FieldCanvas.tsx` capped the stage at `max-w-4xl` (896 px)
inside a `max-w-7xl` (1280 px) page, so on a 1440 px display the field used ~62% of the
available width — and the pieces shrank with it.

## Proposed Change

- **`render/pick.ts` (new)** — pure `pickNearest(pt, players, radiusYd)`, nearest-within-radius,
  ties broken by array order. `HIT_RADIUS_YD = 3.0`. Framework-free in the ADR-1 spirit.
- **`ui/FieldCanvas.tsx`** — takes ownership of the drag. It already owns the SVG's native
  pointer listeners, `clientToYard`, the stage `viewBox`, and a `draggingRef`; the drag
  controller belongs there rather than as a fourth listener guessing at the other three.
  Grab offset is preserved so an off-centre grab does not snap the piece to the cursor.
- **`render/pieceLayer.tsx`** — hit discs deleted; keeps rendering, the per-frame imperative
  transform writes, keyboard nudge, and ARIA. Renders `focusRing` at `opacity: 0`, revealed on
  `:focus-visible`.
- **`render/tokens.ts`** — piece radii 5 → 9 (2.25 yd across), special 6 → 11, label 5 → 9,
  disc 2.5 → 4, mark indicator 14 → 20. `attackLabel` added; `hitArea` removed — grab
  distance is input ergonomics, not a visual, and now lives as `HIT_RADIUS_YD` in `pick.ts`
  so changing a piece's radius cannot change how the board feels to grab.
- **`render/fieldLayer.tsx` / `render/coords.ts`** — attacking-arrow label; `STAGE_MARGIN.top`
  30 → 36 to make room. `STAGE_MARGIN` feeds both `FIELD_INSET` and the pointer math, so both
  follow from the one constant.
- **Width** — `max-w-4xl` dropped from `FieldCanvas` and `FieldStage`; page shells widened to
  `max-w-[1600px]`.
- **Present mode** — a `⛶ Present` button calling `requestFullscreen()` on a stage wrapper,
  with `:fullscreen` CSS sizing the SVG to the viewport and hiding chrome. Chosen over zoom/pan
  (Builder decision) because the SVG already scales from its viewBox, so no coordinate maths
  changes. Feature-guarded — absent in jsdom, prefixed on older Safari.

**ADR-2 is preserved throughout**: no `setState` enters the pointer path.

## Second review (same branch)

Six more items off the deployed preview. Three were defects, three were UI structure.

**The black box was never the focus ring.** The first pass's fix works — Chrome honours
`outline: none` on the piece `<g>` and draws the pink ring on a real click; verified in the
browser rather than assumed. The black box was the **hover reticle**, a 1 yd `<rect>` with
`stroke="#18181b"` tracking the cursor whenever the overlay is on. Replaced with a white ring
(`FIELD_TOKENS.reticle`) that reads over the red→amber→green ramp.

**Thrower/mark sizing.** `PIECE_TOKENS.special.radius` 11 → 9. The outline and the `T`/`M`
labels already identify them; the extra radius read as "more important" rather than "different".

**Legend copy.** The orange swatch said "Open, low value" while `space/explain.ts` and
`CellReadout` both said **contested** for the same band. The legend now uses the model's word.

**Marquee selection** (`ui/FieldCanvas.tsx`). Press on empty grass draws a box; release selects
what it contains; pressing a selected piece drags the whole group. The selection is a
`Set<string>` in a ref, applied to the DOM as `data-selected` and revealed by CSS — **no React in
the pointer path**, and the ADR-2 Profiler test now covers a group drag as well as a single one.
Two mechanics worth keeping: the delta is clamped against the *group's* bounding box so a
formation slides along a sideline rather than compressing, and a mark that is itself selected
takes the delta once rather than also being carried by the thrower.

**Rail reorganisation.** `TuningPanel` → `AdvancedPanel`, now holding the lens, the four layer
flags, and the six sliders behind one disclosure. The lens radios became one checkbox,
"Include offense in space calculations" — the old "Offense / Defense only" labels read as a
filter on who is on the field. Two new **show on diagram** checkboxes sit above the Space button
and are always visible, since they are diagram controls rather than overlay controls.
Visibility is **display-only**: `computeGrid` still sees the whole scene. Hidden pieces are not
rendered, not grabbable, not swept up by the marquee, and absent from the PNG export — and the
disc and force indicator follow their owner off the field.

`prefs.tuningExpanded` → `advancedExpanded`, with the old key still honoured on parse so a
returning coach's disclosure state survives the rename.

## Third pass (same branch): sizing recalibration + route rename

Two items folded in from `field-view-changes.md`, the Builder's wishlist that also seeded
`.cicadas/drafts/fieldview-roadmap.md`. Both are small and independent of the four fieldview
initiatives that roadmap plans, which is why they land here rather than in Initiative A.

**Pieces slightly smaller.** `PIECE_TOKENS` radius 9 → **7.5** (2.25 yd → 1.9 yd across),
`special` with them, `label.fontSize` 9 → 8, `disc.radius` 4 → 3.5. The Builder's note: with all
fourteen pieces at 9 the *field* read as small and condensed — the pieces were winning against the
thing they sit on.

This is only safe because the first pass **decoupled grab distance from piece radius**
(`HIT_RADIUS_YD = 3.0` in `pick.ts`, `hitArea` deleted from tokens). Shrinking the glyph does not
make the board fiddlier to use; the 3 yd grab radius is untouched, so `pick.test.ts` and
`drag.test.tsx` needed no changes. That decoupling was speculative when it was made and has now
paid for itself once.

⚠️ **Unresolved tension, deliberately left open.** This branch exists because the client's first
review said the icons were *too small*. Enlarging them was that fix; this shrinks them ~17% back.
The client has not re-reviewed the enlarged state, so 7.5 is a judgement call, not a verified
answer. Confirm on the preview deploy before treating it as settled.

**`/field-view` → `/fieldview`.** Route paths only — the branding stays "Field View" everywhere it
is read (headings, nav label, wordmark), per the Builder's instruction. `router.tsx` serves the
whiteboard and designer at `/fieldview` and `/fieldview/designer`, with the two shipped
`/field-view*` paths kept as `<Navigate replace />` redirects: the client has those URLs, and
without the redirect they would fall through to `/:section` and 404. `replace` keeps the old path
out of history so Back does not bounce through it. Internal links updated in `Layout.tsx` (header)
and `Whiteboard.tsx` (→ Designer).

Left alone on purpose: the PNG export filename `field-view.png` (`exportImage.ts`,
`Whiteboard.tsx`) — a download artefact name, not a link, and the Builder scoped this to the link.

## Fourth pass (same branch): display font replaced

The Builder asked to drop Druk "once and for all" and switch to Arena from `fonts/`. Reading
`fonts/Arena Font/misc/License-Important.txt` first changed the answer: Arena is **personal use
only** and explicitly forbids uploading or distributing the file "on any website or platform", plus
commercial use without a paid license. `cd0g05/ultipedia` is a **public** repo that auto-deploys to
Vercel, so committing the `.ttf` would have breached both terms — so it was not committed. The
Builder then chose **Archivo Black** (SIL OFL 1.1: commercial use *and* web embedding permitted),
which can be self-hosted honestly.

**Druk was worse than dormant.** `Druk-*-Trial.otf` were committed in *two* places
(`frontend/public/fonts/` and `style-guide/fonts/`) and served from production. A Commercial Type
trial license covers evaluation, not public distribution — so this was a live licensing violation,
not housekeeping. All six Druk/DrukaatieBurti files are deleted, `style-guide/fonts/` with them
(fonts now live in exactly one place).

- `ArchivoBlack-Regular.ttf` + `ArchivoBlack-OFL.txt` → `frontend/public/fonts/`, self-hosted via
  `@font-face` with `font-display: swap`. The OFL requires its license text to travel with the
  font, hence the second file.
- `tailwind.config.js` heading stack → `"Archivo Black", "Oswald", "Arial Narrow", sans-serif`.
- **`font-bold` stripped from all 13 `font-heading` elements** (10 files). Druk shipped a real 700
  cut; Archivo Black is single-weight, so `font-bold` would have asked the browser to synthesise a
  fake bold — which smears a display face. This is the non-obvious consequence of the swap.
- `fonts/` added to `.gitignore` so licensed/trial source families stay out of git for good.
- Style guide rewritten: `design.md` § Typography + § Loading the Fonts, `README.md`,
  `example.html`. Each records *why* both predecessors were rejected, so the next person does not
  re-adopt a trial or personal-use face.

Canon `ux-overview.md` § Deferred previously said the display font was "not yet adopted"; it now
records Archivo Black as settled plus the standing licensing rule.

## Verification

`npm test` 359 passed / 36 files, `npm run test:perf` 33 passed, `npx tsc --noEmit` clean,
`npm run build` clean. Two new router tests assert both legacy URLs still resolve — a silent 404 on
the client's bookmarked URL is exactly the regression worth pinning down. The production build was
checked to confirm the font actually ships: `dist/fonts/ArchivoBlack-Regular.ttf` is emitted and the
built CSS references it.

**Not verified in a real browser.** The sizing change is visual, and this project's canon records
that jsdom's `toBeVisible()` reads only the `hidden` attribute, so the suite passing is not evidence
the board looks right. The preview deploy is the check — and it is the same check the sizing tension
above needs.

## Tasks
- [x] Implement tweak <!-- id: 10 -->
- [x] Verify functionality <!-- id: 11 -->
- [x] Significance Check: Does this warrant a Canon update? <!-- id: 12 -->

## Out of scope

Zoom/pan, preset coordinate calibration, heatmap ramp/`GAMMA` tuning, and copy — the remainder
of the visual review, worth a second pass once these land.
