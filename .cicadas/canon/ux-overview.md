# UX Overview

> Canon document. Updated by the Synthesis agent at the close of each initiative.

## Experience Goals

Two experiences, two goals, one app. **Intake** (`/contribute`) is warm, effortless, and
respectful of the contributor's time — a great first use feels "easy and kind of pleasant —
I'll do another"; the contributor is never quizzed, blocked, dismissed, or at risk of losing
work. **The encyclopedia** (`/`) is fast, scannable, and never a dead end — a coach mid-practice
should reach any published entry in ≤2 clicks and never see a bare "no results." **Mobile-first
is a hard requirement for both** — everything works one-handed on a phone; desktop is an
enhancement, not the base case.

## Information Architecture

```
/                         Encyclopedia Home (hero + Popular Resources grid)
/drills, /strategies,
/formations, /plays,
/skills                   Section browse grids (one Section.tsx, param'd by URL segment)
/{section}/{slug}         Entry detail (coaching points/mistakes/variations — self-omitting; similar entries)
/search                   Full-text + faceted search (URL-driven state; shareable/pre-filterable)
/fieldview                Coaching whiteboard + space heatmap overlay (desktop/tablet only)
/fieldview/designer       Keyframed play designer (same stage, plus a timeline)
  (/field-view and /field-view/designer redirect here — the shipped URLs)
/contribute               Intake flow (relocated from root; internals unchanged)
  Tutorial ──(Begin)──▶ Path select ──▶ Form section ──▶ Contributor+consent ──▶ Confirm ──▶ Thank-you ──▶ (Add another)
          └(Learn more)▶ About page                └(Try the interview)▶ Interview chat ──▶ (submit) ──▶ Thank-you
```

- Encyclopedia pages share one `Layout` shell: sticky header (wordmark, 5-section nav, desktop
  search bar, "Submit a Drill" CTA → `/contribute`), footer with the same CTA.
- Intake **paths:** Drills · Strategies (Formation / Play / Concept) · Other. A collapsible
  "About this form" info bar appears after Begin. Interview mode is an alternate entry ("Try
  the interview (beta)") over the same shell.
- Tag pills on entry pages link to `/search?{category}={value}` — one shared filtering
  vocabulary between browse and search.

## Key Flows

- **Form:** pick a path → optional per-type fields + a freeform catch-all → Save (draft
  toast) / Continue → contributor + consent → confirm dialog → submit → thank-you → add
  another. Switching type with unsaved input warns before discarding.
- **Interview:** pick a topic → engine asks openers then coverage-routed follow-ups → user
  types answers → entity-confirm ("is this X? / mine's different") → "I'm done — submit", or
  escape-hatch back to the form. Resumable mid-interview.
- **Browse:** `/` → tap a section or a featured card → grid of published entries → tap a card
  → entry detail (title/badges/duration/team-size/media above the fold; coaching points,
  common mistakes, and variations blocks each render nothing if the entry has no data for
  them — never an empty accordion). Similar-entries row appears only when ≥1 entry shares a tag.
- **Search:** type a query or arrive via a tag-pill link → results reflect URL params (query,
  filters, sort) so the view is shareable and back/forward-safe → toggle filters (checkbox
  panel, desktop sidebar / mobile drawer) → OR within a category, AND across categories →
  remove via chip or "clear all" → zero-result state names the single most restrictive active
  filter (measured by re-querying with each filter relaxed), offers one-tap removal, and shows
  2–3 close matches — never a bare "no results."

## Interaction & Resilience

- **Autosave** to localStorage (debounced) + manual Save; restore on return.
- **Offline retry queue** — a failed submit is kept and flushed later; never dropped.
- **Contributor prefill** — entered once, reused on subsequent submissions in the session.
- **Tap-to-open tooltips** (not hover — mobile-critical).

## Copy & Tone

Knowledgeable, concise peer — never chipper-assistant, never interrogating. Deflection is a
**compliment + pivot** ("You clearly know 4 lines — what's a variation most teams miss?"),
never "we already have this." Consent is explicit ("OK to use this in a public ultimate
knowledge base?").

## Visual Design

Three deliberately distinct systems, one per product:

- **Intake** (`/contribute`): warm, vibrant-but-not-bold palette (cream base; clay/amber/coral
  accents) with a slightly different accent per section for clear boundaries. Smooth Framer
  Motion step transitions.
- **Encyclopedia** ("Light Film Room," `/` and below): white/zinc base, pink-700 primary
  accent, emerald-700 secondary accent, mono uppercase micro-copy; formalized as `film.*`
  Tailwind tokens (`film.base/panel/border/accentPink/accentPinkDark/accentGreen`). Badges
  always pair color with a text label or icon — never color alone.
- **Field View**: shares the encyclopedia's Light Film Room shell (mono uppercase micro-copy,
  pink accent) but the field itself is its own visual system, and **every piece and field token
  lives in one module** (`render/tokens.ts`) precisely so it can be re-tuned without a component
  sweep. The heatmap ramp is likewise four stops plus a gamma in `space/constants.ts`, which the
  on-screen legend reads from — legend and paint cannot drift.

All three: `prefers-reduced-motion` respected (encyclopedia: skeleton pulse and accordion-chevron
transitions specifically guarded); WCAG 2.1 AA target — encyclopedia contrast pairs are
verified by an automated test (`contrast.test.ts`); 44×44px touch targets.

## Encyclopedia-Specific Patterns

- **Loading/error/empty are all first-class states**, not afterthoughts: skeleton placeholders
  match final card dimensions (no layout jump); failed fetches show inline error + retry, never
  a blank page; the search empty state is measured, not generic (see Key Flows above).
- **Collapsible entry sections** (Coaching Points/Common Mistakes/Variations) are native
  disclosures — `aria-expanded`/`aria-controls`, keyboard Enter/Space — and **default expanded**
  so content stays crawlable under the client-rendered SEO posture (a deliberate divergence from
  an earlier "collapsed by default" note; flip one boolean in `SectionBlock` to reverse).
  Sections with no data render nothing at all (self-omitting), never an empty accordion.
- **SEO**: every encyclopedia page sets a unique `<title>`/meta description via `Seo.tsx`;
  drill entries additionally emit schema.org `HowTo` JSON-LD built from the same parsed
  instruction steps the page renders (markup can't drift from visible content).

## Field View-Specific Patterns

- **The tool is desktop/tablet only.** Below 768 px a coach gets a "needs a bigger screen"
  message rather than a field squeezed to phone width — a readable refusal is the deliverable
  there. Pure CSS (`md:hidden` / `hidden md:flex`): no resize listener, no hydration flash.
  Tablet puts the controls in a horizontal bar under the field; at `xl` (1280) they move into a
  320 px rail beside it. The field gets the width until there is enough for both.
- **The heatmap repaints live under the pointer**, not on release — this is the product, and the
  architecture (ADR-FV-2) exists to protect it.
- **Colour is never the only carrier of meaning.** The hover readout states the verdict in words
  ("Closed", "Contested", "Strong space") and speaks it through a polite live region, alongside
  the numbers that produced it — distance, flight time, defender arrival, score.
- **Overlay controls are hidden when the overlay is off**, not greyed out. Preferences persist
  to localStorage and are re-validated and clamped on read; the *scene* deliberately does not
  persist.
- **In the designer, reordering keyframes is retiming them** — chips are laid out by timestamp,
  so the timeline cannot show an order the play does not have.

## Deferred

Voice dictation/interview, media uploads, and transcript edit-before-submit are planned
follow-ons (intake side). Mobile header search is a compact icon-link today (full mobile
search-bar treatment deferred).

**Display font (settled 2026-07-29)**: headings use **Archivo Black**, self-hosted from
`frontend/public/fonts/` with its OFL text alongside. Two predecessors were removed because this
repo is public and auto-deploys, so a committed font is a *distributed* font: Druk was self-hosted
from **trial** builds, and Arena is personal-use-only and forbids web distribution. The standing
rule — a display face must be self-hostable under a license permitting web embedding — is recorded
in `style-guide/design.md` § Typography. Archivo Black is single-weight, so `font-bold` was stripped
from every `font-heading` element (synthetic bold smears a display face).

**Field View's visual review has not happened yet** — piece visuals, field markings, the four
built-in preset arrangements, the heatmap ramp, and copy were all deferred to a client pass that
now runs against the deployed site. Built-in preset coordinates were always a first pass, not a
calibration. One open observation from the agent's own browser check: pieces render at roughly
1.5 yd diameter — geometrically honest, but possibly too small to read as a coaching diagram.
