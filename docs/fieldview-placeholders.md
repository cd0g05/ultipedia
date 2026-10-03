# Field View — Placeholder Register

Everything in the UI rework that is **toy, first-guess or stand-in** and that the Builder will
eventually have to **supply, confirm or tune**. Kept current as work proceeds.

**Convention.** In code, mark every placeholder with a comment `// PLACEHOLDER(fieldview-ui-rework): <what is needed>`
(or `"_placeholder": true` in JSON content). Add a row here at the same time. The P5 audit task
greps the markers and reconciles them against this file, so nothing ships unrecorded. When a
placeholder is resolved, set Status to `done` (don't delete the row until the initiative's canon is synthesized).

Status: `open` = Builder must supply/confirm · `toy` = a development stand-in exists in code ·
`tune` = real value needs device/by-eye tuning · `done`.

*Last updated: 2026-10-03 (P1 render merged-ready: row 12 is now in code; all other rows are still planned).*

## Content the Builder must supply

| # | Area | What's placeholder | Planned location | Builder must supply | Partition | Status |
|---|---|---|---|---|---|---|
| 1 | Curated **setups** | Names, player coordinates (first-pass yards), order | `scene/presets.ts` (`CURATED_SETUPS`) | Final set of setups and their positions (≥5; mockup placeholders: Vertical stack, Horizontal stack, Ho stack, Side stack, Clumped) | P3 | open (toy planned) |
| 2 | Setup **takeaways** | One-line "what to notice" per setup | `scene/presets.ts` (`PRESET_TAKEAWAYS`) | Final one-sentence copy per setup | P3 | open (toy planned) |
| 3 | Curated **plays** | Entire play content (toy plays, ≥3, one ≥5 frames) | `play/builtin/*.json` (`"_placeholder": true`) | Real plays, authored with the unlinked `/fieldview/designer` and exported | P4 | open (toy planned) |
| 4 | Play **names / descriptions** | Play list titles and one-liners | `play/builtin/*.json` | Final names and descriptions | P4 | open (toy planned) |
| 5 | Frame **labels** | Optional per-keyframe labels shown in the filmstrip ("Cut under", "Clear"…) | `play/builtin/*.json` (`label`) | Final labels (or decide to omit) | P4 | open (toy planned) |

## Copy

| # | Area | What's placeholder | Planned location | Builder must supply | Partition | Status |
|---|---|---|---|---|---|---|
| 6 | **Colour guide** text | Explanation of Closed / Contested / Strong space | `ui/content/ColourGuide.tsx` | Plain-language wording (derived from `space/constants.ts`/`explain.ts`; terms are decided, wording is not) | P2 | open (toy planned) |
| 7 | **Rotate message** | "Rotate your phone to landscape for the best view." + dismiss label | `ui/app/RotateNotice.tsx` | Final copy | P2 | open (toy planned) |
| 8 | **Build placeholder** | Card copy ("Play designer — coming in the next update…") | `pages/Build.tsx` | Final copy | P2 | open (toy planned) |
| 9 | **Menu & settings labels** | "Back to Ultipedia", "How to read the colours", "Colour-blind mode", "Defense follows — coming soon" | `ui/app/MenuDrawer.tsx`, `ui/content/Options.tsx` | Confirm wording | P2/P3 | open (toy planned) |
| 10 | **Selected-player card** | Row labels and the definition of "Side of field" / "Moved from start" | `ui/content/SelectedPlayerCard.tsx` | Confirm labels and definitions | P3 | open (toy planned) |
| 11 | **Route titles / SEO meta** | `<title>`/description for explore, watch, build | page `Seo` usage | Final titles and descriptions | P2 | open (toy planned) |

## Values to tune (need a real device or an eye)

| # | Area | First-guess value | Where | Needs | Partition | Status |
|---|---|---|---|---|---|---|
| 12 | **Piece radius** | 11.5 SVG units (≈21 px on a phone) — **in code**, marked `PLACEHOLDER` in `render/tokens.ts` (`PIECE_TOKENS`) | `render/tokens.ts` | Real-phone check in a huddle-distance context | P1/P5 | tune (in code) |
| 13 | **Touch grab radius** | ≥ ~44 px effective | `render/pick.ts` | Real-device check | P5 | tune |
| 14 | **`desktop` breakpoint** | ≥1280 × ≥640 px | `tailwind.config.js` | Real tablet/laptop check (canon already says the old 1024 px was never validated) | P2/P5 | tune |
| 15 | **Colour-blind palette** | orange `#e8731a` → neutral `#f3efe3` → blue `#2f7fd6` | `space/palette.ts` | Confirm the colours (ideally check with a colour-blind player) | P2 | tune |
| 16 | **Heat opacity / field look** | Existing `HEATMAP_ALPHA` 0.78 | `render/heatmap.ts` | By-eye on sun/glare | P5 | tune |
| 17 | **Playback speeds** | 0.5× / 1× / 2×; frame transition duration | `ui/playback/playback.ts` | Feel check | P4 | tune |

## Deferred features that leave a visible stub

| # | Area | Stub in the MVP | Real work later | Status |
|---|---|---|---|---|
| 18 | **Defense follows** | Toggle + persisted pref, labelled "coming soon", no behaviour | Wire pursuit to dragging; design deliberately (ADR-33 reserved) | deferred (backlog) |
| 19 | **Advanced settings** | Not shown at all | Space-model sliders etc.; intended home is the open space under the Explore field | deferred (backlog) |

## Where the mockups differ from what will be built

The HTML mockups in `design/` are visual references only. Their names, takeaways, play titles,
heat values and the "Tight / Open" legend wording are illustrative — the legend uses the model's
terms (**Closed / Contested / Strong space**), and the mockups' Advanced row and live
Defense-follows are not built in this initiative.
