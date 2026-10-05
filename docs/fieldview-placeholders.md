# Field View — Placeholder Register

Everything in the UI rework that is **toy, first-guess or stand-in** and that the Builder will
eventually have to **supply, confirm or tune**. Kept current as work proceeds.

**Convention.** In code, mark every placeholder with a comment `// PLACEHOLDER(fieldview-ui-rework): <what is needed>`
(or `"_placeholder": true` in JSON content). Add a row here at the same time. The P5 audit task
greps the markers and reconciles them against this file, so nothing ships unrecorded. When a
placeholder is resolved, set Status to `done` (don't delete the row until the initiative's canon is synthesized).

Status: `open` = Builder must supply/confirm · `toy` = a development stand-in exists in code ·
`tune` = real value needs device/by-eye tuning · `done`.

*Last updated: 2026-10-05 (fieldview-build added rows 20–23 and retired #8; rows 1–5 now point at the v3 JSON content). Earlier: 2026-10-03 (P1–P5 in code; the audit test `tests/placeholderAudit.test.ts` now enforces markers ⇄ rows. P5 added rows 13 (lift) and 16; P1–P4: P4 added rows 3, 4, 5, 17; P3 added rows 1, 2, 10 and the Defense-follows stub; P1 and P2: rows 1 (opening setup only), 6, 7, 8, 9 (menu half), 11, 12, 14, 15 have `PLACEHOLDER` markers; the rest are still planned).*

## Content the Builder must supply

| # | Area | What's placeholder | Planned location | Builder must supply | Partition | Status |
|---|---|---|---|---|---|---|
| 1 | Curated **setups** | Names, player coordinates (first-pass yards), order — six toy one-frame plays, **unnamed players** (titles are the Builder's to set). Stacks need ≥3 yd spacing at the piece sizes in #22. | `play/builtin/setups/*.json` (`"_placeholder": true`), generated from `scene/presets.ts` | Final set of setups and their positions (≥5), authored in Build and exported | P3 | open (toy in code) |
| 2 | Setup **takeaways** | One-line "what to notice" per setup (the play's `description`) | `play/builtin/setups/*.json` | Final one-sentence copy per setup | P3 | open (toy in code) |
| 3 | Curated **plays** | Entire play content — seven toy plays (`play/builtin/01…07-*.json`), generated from the old presets (the disc stays with the first holder in all seven) | `play/builtin/*.json` (`"_placeholder": true`) | Real plays, authored in the new Build page once it ships and exported | P4 | open (toy in code) |
| 4 | Play **names / descriptions** | Play list titles and one-liners | `play/builtin/*.json` | Final names and descriptions | P4 | open (toy in code) |
| 5 | Frame **labels** | Optional per-keyframe labels shown in the filmstrip ("Cut under", "Clear"…) | `play/builtin/*.json` (`label`) | Final labels (or decide to omit) | P4 | open (toy in code) |

## Copy

| # | Area | What's placeholder | Planned location | Builder must supply | Partition | Status |
|---|---|---|---|---|---|---|
| 6 | **Colour guide** text | Explanation of Closed / Contested / Strong space | `ui/content/ColourGuide.tsx` | Plain-language wording (derived from `space/constants.ts`/`explain.ts`; terms are decided, wording is not) | P2 | open (toy in code) |
| 7 | **Rotate message** | "Rotate your phone to landscape for the best view." + dismiss label | `ui/app/RotateNotice.tsx` | Final copy | P2 | open (toy in code) |
| 8 | **Build placeholder** | Card copy ("Play designer — coming in the next update…") | `pages/Build.tsx` | Final copy | P2 | done — replaced by the real Build page (fieldview-build P3) |
| 9 | **Menu & settings labels** | "Back to Ultipedia", "How to read the colours", "Colour-blind mode", "Defense follows — coming soon" | `ui/app/MenuDrawer.tsx`, `ui/content/Options.tsx` | Confirm wording | P2/P3 | open (toy in code; Options half in P3) |
| 10 | **Selected-player card** | Row labels and the definition of "Side of field" / "Moved from start" | `ui/content/SelectedPlayerCard.tsx`, `ui/content/playerStats.ts` | Confirm labels and definitions | P3 | open (toy in code) |
| 11 | **Route titles / SEO meta** | `<title>`/description for explore, watch, build | page `Seo` usage | Final titles and descriptions | P2 | open (toy in code) |

## Values to tune (need a real device or an eye)

| # | Area | First-guess value | Where | Needs | Partition | Status |
|---|---|---|---|---|---|---|
| 12 | **Piece radius** | 11.5 SVG units (≈21 px on a phone) — **in code**, marked `PLACEHOLDER` in `render/tokens.ts` (`PIECE_TOKENS`) | `render/tokens.ts` | Real-phone check in a huddle-distance context | P1/P5 | tune (in code) |
| 13 | **Touch grab radius and lift distance** | target 44 px (`TOUCH_TARGET_PX`) and lift 30 units (`TOUCH_TOKENS.liftPx`) — **in code** | `render/pick.ts`, `render/tokens.ts` | Real-device check (`docs/fieldview-device-qa.md`) | P5 | tune (in code) |
| 14 | **`desktop` breakpoint** | ≥1280 × ≥640 px — **in code** (also `--fv-chrome` in `index.css`) | `tailwind.config.js` | Real tablet/laptop check (canon already says the old 1024 px was never validated) | P2/P5 | tune |
| 15 | **Colour-blind palette** | orange `#e8731a` → neutral `#f3efe3` → blue `#2f7fd6` — **in code** | `space/constants.ts` (`CB_RAMP_STOPS`) | Confirm the colours (ideally check with a colour-blind player) | P2 | tune |
| 16 | **Heat opacity / field look** | Existing `HEATMAP_ALPHA` 0.78 — marked in code | `render/heatmap.ts` | By-eye on sun/glare | P5 | tune (in code) |
| 17 | **Playback feel** | speeds 0.5× / 1× / 2×; transition 1.2 s; hold 0.4 s — **in code** | `ui/playback/playback.ts` | Feel check | P4 | tune (in code) |

## Deferred features that leave a visible stub

| # | Area | Stub in the MVP | Real work later | Status |
|---|---|---|---|---|
| 18 | **Defense follows** | Toggle + persisted pref, labelled "coming soon", no behaviour — **in code** (`pages/Explore.tsx`, `ui/prefs.ts`) | Wire pursuit to dragging; design deliberately (ADR-33 reserved) | deferred (backlog) |
| 19 | **Advanced settings** | Not shown at all | Space-model sliders etc.; intended home is the open space under the Explore field | deferred (backlog) |

## Added by fieldview-build

| # | Area | What's placeholder | Where | Builder must supply | Partition | Status |
|---|---|---|---|---|---|---|
| 20 | **New-play defaults** | A new play is named "Untitled play" and starts as the vertical-stack setup with unnamed players | `play/model.ts` `newPlay()` (`PLACEHOLDER(fieldview-build)`) | Final default name and starting formation | fieldview-build P1 | open (toy in code) |
| 21 | **Disc-holder ring colour** | Emerald ring (`#047857`) around the player holding the disc | `render/tokens.ts` `PIECE_TOKENS.holder` (`PLACEHOLDER(fieldview-build)`) | Final colour (confirm it reads on the heatmap and for colour-blind users) | fieldview-build P2 | tune |
| 22 | **Piece sizes per device** | Phone 85%, tablet 70% (from 1000 px wide), desktop 50%; titles never below 65% | `index.css` `--fv-piece-scale` (`PLACEHOLDER(fieldview-build)`) | Sizes confirmed on real devices | fieldview-build P2 | tune |
| 23 | **Build copy** | Save-state wording, "No changes — same as the previous frame.", "Select a player to name them…", the empty-state lines | `ui/build/controls.tsx`, `ui/build/cards.tsx` (`PLACEHOLDER(fieldview-build)`) | Final copy | fieldview-build P3 | open (toy in code) |

## Where the mockups differ from what will be built

The HTML mockups in `design/` are visual references only. Their names, takeaways, play titles,
heat values and the "Tight / Open" legend wording are illustrative — the legend uses the model's
terms (**Closed / Contested / Strong space**), and the mockups' Advanced row and live
Defense-follows are not built in this initiative.
