# Ultipedia Encyclopedia — Mockup Documentation

*Companion doc for the HTML prototypes in this folder. These mockups establish the visual language and interaction model that should inspire the real encyclopedia UI (see `encyclopedia-draft.md` for the underlying feature spec).*

Concept name: **"Light Film Room."** Think a film-study / tactical-whiteboard tool rendered in a clean, high-contrast light theme — closer to a coach's tablet app than a marketing site.

## Files in this folder

| File | Covers |
|---|---|
| `landing-and-encyclopedia-mockup.html` | Landing page + encyclopedia browse/directory page (toggle between the two with the mockup controls bar at the top) |
| `modal-popup-design-mockup.html` | Two competing interaction models for "clicking a drill" — **Design B (Focus Modal)** is the adopted direction; Design A (Inspector Panel / side slide-out) was explored and rejected |
| `full-drill-tab-mockup.html` | A drill entry promoted to its own full page/tab — same content as the modal, restructured for a dedicated URL |

All three share one Tailwind config (inline `<script>` block) and one component vocabulary — copy that config as the starting point for the real build rather than re-deriving it.

---

## Interaction model (the core idea)

Modeled on **Arc browser's "Little Arc" / peek behavior**:

1. User browses the encyclopedia (list/grid of drill, strategy, formation, play, skill cards).
2. Clicking a card opens it as a **centered modal overlay** (`modal-popup-design-mockup.html`, Design B) — a quick, low-commitment "peek" that keeps the browsing context alive behind a dimmed backdrop. Good for comparing several drills quickly without losing your place.
3. If the user wants to keep/return to that entry, an action promotes the modal into a **full standalone page** (`full-drill-tab-mockup.html`) — its own URL, no backdrop, sticky in-page navigation (breadcrumbs, "back to directory"). This is the "turn it into a full tab" gesture.

Implication for the real build: the modal and the full-page view should render from the **same content component** (same instruction/coaching/variations blocks), just wrapped differently — modal wrapper vs. page-shell wrapper. Don't build two separate content templates.

The rejected Design A (inspector panel) is worth noting only as a ruled-out option: a right-hand slide-out panel, narrower, felt too utility/dev-tool and lost the "focus" feeling the modal has. Do not resurrect it without deliberate reconsideration.

---

## Visual style

**Global rule: hard corners everywhere.** The mockups force `border-radius: 0 !important` globally — no rounded corners on cards, buttons, badges, inputs, or the modal itself. This is a deliberate "tactical whiteboard / spec sheet" feel, not an oversight.

**Color palette** (Tailwind config, `film.*` namespace):
| Token | Hex | Use |
|---|---|---|
| `film.base` | `#ffffff` | Page/card background |
| `film.panel` | `#f4f4f5` (zinc-100) | Secondary surfaces — sidebars, footer, page body behind cards |
| `film.border` | `#d4d4d8` (zinc-300) | All hairline borders/dividers |
| `film.accentPink` | `#be185d` (pink-700) | Primary accent — CTAs, active states, section underline, hover borders |
| `film.accentGreen` | `#047857` (emerald-700) | Secondary accent — tag/badge text, coaching-point callouts |

Text is zinc-900 (`#18181b`) on white; muted text is zinc-500/600. This is a stronger, darker pink/green pairing than the earlier style-guide draft (which used a lighter pink `#E23E7A` / green `#2E7D5B` on an off-white `#FAF8F7`) — **this newer palette supersedes that one**.

**Typography:**
- **Headings** (`font-heading`): `druk` → `druk Fallback` → `Oswald` → `Arial Narrow` → sans-serif. Always rendered `uppercase` with wide tracking. Used for page titles, card titles, section headers.
- **Data/UI/labels** (`font-mono`): JetBrains Mono. Used pervasively — nav links, tag pills, buttons, breadcrumbs, section numbering, timestamps, "utility bar" text. This mono voice is what gives the whole thing its "film room / spec sheet" character; it's not just for code-like content.
- **Body copy** (`font-sans`): Helvetica Neue/Arial fallback stack. Used only for actual prose — descriptions, instructions, coaching-point text.

**Recurring component patterns:**
- **Type badge**: small solid `zinc-900` background, white uppercase mono text, top-left corner of every card/media block (`Drill` / `Strategy` / `Formation`).
- **Tag pills**: bordered, `zinc-50` background, uppercase mono text in `accentGreen`, tight tracking — used for skill level, duration, player count, focus tags.
- **Numbered section headers**: `01 // Instructions`, `02 // Coaching Focus`, `03 // Variations` — a small solid-pink numbered chip + mono uppercase label + bottom border. This numbering pattern is used identically in both the modal and the full-tab view; keep it as the standard way entry-page sections are labeled.
- **Bracketed button/label text**: `[ VIEW PAGE 1 ]`, `[ CLOSE ]`, `[ INTERACTIVE DIAGRAM ]` — square-bracket wrapping shows up on mockup-utility controls and placeholder content. Judgment call for the real build: this reads as a nice "spec/debug" flavor for placeholders and secondary controls, but may be too cute for primary user-facing CTAs — primary buttons in the mockups (e.g. "Add to Current Practice Plan") do *not* use brackets, only borders + hover-invert (white→zinc-900 fill).
- **Grid-pattern placeholder backgrounds**: diagram/video placeholder areas use a faint CSS grid-line background (`linear-gradient` graph paper look) to suggest "tactical board" — a real diagram/video would replace this, but the graph-paper background is worth keeping as the loading/empty state for that media slot.
- **Hover-invert buttons**: bordered outline buttons that fill solid with their accent color and flip text to white on hover — used for both pink (Sign In) and near-black (Add to Plan) actions.

---

## Layout: Landing Page

(`landing-and-encyclopedia-mockup.html`, `#page1`)

- **Header** (shared/sticky across all pages): logo left + inline nav (Drills · Strategies · Formations · Plays · Skills separated by middot) + persistent expanding search input + pink-outline "Sign In" button, right-aligned.
- **Hero**: two-column — large uppercase headline + subhead + two CTAs ("Browse the Encyclopedia" solid pink, "Generate a Practice Plan" bordered) on the left; a graph-paper "tactical timeline" visual placeholder on the right.
- **Value props + featured content split section**: left third is a `film.panel` sidebar-style column with 3 stacked value props (icon + heading + short copy: Searchable Encyclopedia / Automatic Practice Plans / Built by the Community); right two-thirds is a "Popular Resources" 3-card grid mixing entry types (one Drill, one Strategy, one Formation card) — establishes that the homepage cross-promotes across entry types, not just drills.
- **Practice planner teaser**: copy + CTA on the left, a schematic "export module" visual (mock PDF/data lines with a "[ GENERATED PLAN VISUAL ]" overlay label) on the right — sets up the planner as the flagship feature without building it yet.
- **Community callout band**: full-width `film.panel` strip, "Have a drill worth sharing?" + green "Submit a Drill" CTA (this is the only green primary button in the mockups — reserved for the contribution/community action specifically).
- **Footer** (shared): logo, About/Contact/Submit a Drill/Privacy links, copyright.

## Layout: Encyclopedia Browse Page

(`landing-and-encyclopedia-mockup.html`, `#page2`)

- **Header band**: centered, `film.panel` background — small pink mono eyebrow ("The Encyclopedia"), large heading-font description line, then a big centered search input (search-icon prefixed) — a "command palette" framing rather than a plain page title.
- **Body layout**: left sidebar + right content, matching the sidebar-filter direction from the earlier style-guide draft:
  - **Left sidebar** ("Filter Inspector"): collapsible filter groups (Skill Level, Team Size, Duration, Focus) — mono uppercase labels with a chevron, `film.base` background against the page's `film.panel` body.
  - **Right content**: instead of one combined grid, entries are grouped into **per-type sections** (Drills, Strategies, Formations, …), each with a heading (pink underline accent) + "View all →" link + a 3-card row. This is a meaningful IA decision worth carrying forward: the browse page is organized by entry type first, filtered within, rather than one undifferentiated result grid.
- Cards in this denser context drop the description to 2 lines and show 3-4 tag pills instead of 2-3.

## Layout: Entry Detail — Modal ("Focus Modal", Design B)

(`modal-popup-design-mockup.html`, `#designB`)

- Full-screen dimmed backdrop (`zinc-900/60` + blur), centered modal capped at `max-w-6xl` / `80vh`.
- **Modal header bar**: type badge + "Entry ID: ####" mono label on the left, `[ CLOSE ]` with an X icon on the right — no browser chrome mimicry beyond this.
- **Split body, 50/50**:
  - **Left**: `film.panel` media pane, graph-paper background, a bordered "diagram frame" placeholder (mimics a small app-within-the-app window, its own mini titlebar) — this pane does not scroll independently in the mock but is visually distinct from the right side.
  - **Right**: scrollable content — large heading, tag pills, one-line description with a left border accent, then numbered sections (`01 Setup & Instructions`, `02 Coaching Focus` as a 2-column card grid), ending in a full-width primary CTA ("+ Add to Current Practice Plan").
- This is deliberately content-lean compared to the full tab — no Variations section, no breadcrumbs, no footer — reinforcing that the modal is the "quick peek," not the exhaustive reference view.

## Layout: Entry Detail — Full Tab

(`full-drill-tab-mockup.html`)

- Uses the shared sticky header (same as landing/browse pages) — this view lives at a real URL, not layered over other content.
- **Two-column page body** inside a bordered `max-w-[1400px]` frame:
  - **Left column (5/12, sticky)**: a persistent media pane that stays pinned while the right column scrolls — utility bar with "← Back to Directory" + entry ID up top, the same graph-paper diagram frame as the modal, and a media transport bar below it (play button, scrub bar, timestamp) that the modal version doesn't have.
  - **Right column (7/12)**: breadcrumbs (Home / Drills / Warmups) + type badge, large title, tag pills (now with small leading icons per tag), pull-quote-style description, then three numbered sections — Setup & Instructions, Coaching Focus, **and Variations** (the section the modal omits) — ending in the same full-width "Add to Current Practice Plan" CTA.
- Shared footer returns at the bottom (absent in the modal, since the modal doesn't own the page).

**Modal → full-tab differences to preserve in the real build:**
- Full tab adds breadcrumbs, a back-to-directory link, media transport controls, and the Variations section — the modal is intentionally a trimmed subset.
- Full tab's media pane is sticky-scrolling within the page; the modal's is static within its fixed-height container.
- Both must render identical Setup/Coaching content blocks so promoting a modal to a tab feels like continuity, not a different page.

---

## Open questions / things not yet resolved by these mockups

- Exact transition/animation for "promote modal → full tab" (the mockups are static toggles via JS buttons, not a real transform).
- Whether the graph-paper diagram placeholder is where the Drill Visualizer (manual editor + AI-generated animation, per `encyclopedia-draft.md`) actually renders, or whether that's a separate mode within this pane.
- Mobile behavior for the modal's 50/50 split and the full tab's sticky sidebar — mockups are desktop-width only.
- Whether `druk` (a licensed/paid font) is actually acquired, or whether the Oswald fallback becomes the real production heading font — worth deciding before locking Tailwind config in the real app.
