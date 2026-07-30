
---
summary: "Light 'Film Room' visual system (white/neutral base, pink primary accent, green secondary accent, mono-labeled tags, Druk-family display headings) applied across a header-persistent search + collapsible filter drawer browse experience and a shared entry-detail template (sticky media focus + scrollable info) with expandable Coaching Points/Common Mistakes/Variations blocks. Mobile-first, WCAG AA."
phase: "ux"
when_to_load:
  - "When designing or reviewing journeys, flows, states, copy, and interaction constraints."
  - "When implementation questions depend on experience details rather than product goals alone."
depends_on:
  - "prd.md"
modules:
  - "Landing + section browse pages"
  - "Entry detail page template"
  - "Search + filter UI"
  - "Global header/nav"
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
next_section: "n/a — finalized"
---

# UX Design: Encyclopedia (Encyclopedia + Search, Filtering & Discovery)

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

**Primary goal:** A coach with zero familiarity with the site should feel oriented within seconds and *capable* — like they're looking at game film with a coach standing next to them, not filling out a form or navigating a generic SaaS dashboard. The emotional target is confident and athletic, not sterile or corporate.

**Design constraints:**
- Public, no-login web app — every screen in this initiative must be reachable and fully usable with zero authentication.
- Mobile-first: coaches primarily use this on a phone at the field, so mobile layouts are the primary design target, not an afterthought scaled down from desktop.
- Design system: **new** — establishing the "Light Film Room" visual system now (see Visual Design Direction below), based on `design/landing-and-encyclopedia-mockup.html`, `design/full-drill-tab-mockup.html`, and `design/modal-popup-design-mockup.html`.
- Technical constraint: pages are SSG/ISR-rendered (per PRD NFRs) — interactive filter/search state must work client-side without requiring a full page reload per action.

**Skip condition:** Not applicable — this initiative is entirely screen-based, public-facing UI.

---

## User Journeys & Touchpoints

### New Team Coach — "I don't know where to start"

**Entry point:** Google search ("ultimate frisbee zone defense drills") landing directly on a section or entry page, or the homepage via a shared link.
**First touchpoint:** The global header (persistent search bar + Drills/Strategies/Formations/Plays/Skills nav) and, if landing on the homepage, the hero + "Popular Resources" grid.
**Key moment:** Clicking a Focus category tag and seeing a filtered card grid that's *already* narrowed to what they need — the site "gets" them without an onboarding flow.
**Exit state:** They open an entry, read Coaching Points/Common Mistakes, and follow a Similar Entries card into a second, related entry.
**Pain points to design around:** Must never feel like they need an account to proceed. First page (whatever it is) must legibly communicate "this is a drill/strategy library" within one glance — no ambiguous hero copy.

---

### Time-Crunched Captain — "I have 30 minutes at the field"

**Entry point:** Direct navigation to the Search/Browse page, often mid-conversation with teammates, on a phone.
**First touchpoint:** The mobile filter drawer (collapsed by default, one tap to expand) and the results grid beneath it.
**Key moment:** Applying Duration + Skill Level filters together and watching the result count actually shrink to something usable, with active filters visible as chips so they know what's applied without reopening the drawer.
**Exit state:** Opens an entry, taps the collapsed Coaching Points accordion directly (skipping the setup instructions they already half-know), and leaves the tab open to reference at the field.
**Pain points to design around:** Filter drawer must not eat the whole viewport in a way that hides results entirely; the empty state (over-filtered) must offer a next action, not a dead end. Touch targets must be thumb-friendly — this persona is often standing, one-handed.

---

### Browsing Coach — "Let me see what's here"

**Entry point:** Homepage, with no specific search intent.
**First touchpoint:** The "Popular Resources" featured grid and section-browse nav.
**Key moment:** Clicking a tag pill on one entry and landing on a pre-filtered section page — realizing the whole site is cross-linked, not a flat list.
**Exit state:** Several entries deep via tag-hopping and Similar Entries carousels, with breadcrumbs making it easy to backtrack without losing their place.
**Pain points to design around:** Breadcrumbs and clear section labeling are essential here — this persona has no fixed destination and needs to always know "where am I" to keep wandering confidently instead of feeling lost.

---

## Information Architecture

### Site/App Map

```
Home (/)
├── Drills (/drills)
│   └── Entry Detail (/drills/[slug])
├── Strategies (/strategies)
│   └── Entry Detail (/strategies/[slug])
├── Formations (/formations)
│   └── Entry Detail (/formations/[slug])
├── Plays (/plays)
│   └── Entry Detail (/plays/[slug])
├── Skills (/skills)
│   └── Entry Detail (/skills/[slug])
└── Search & Filter (/search)
    └── (results route to any Entry Detail above)
```

### Navigation Model

**Primary nav:** Persistent top header bar — site wordmark, five section links (Drills · Strategies · Formations · Plays · Skills), a persistent search field/icon, visible on every page including entry detail pages.
**Secondary nav:** Breadcrumbs (`Home / {Section} / {Entry Title}`) on every section and entry page. On mobile, the filter panel becomes a collapsible drawer/bottom sheet rather than a nav element.
**Key entry points:** Homepage hero + Popular Resources grid; direct search-engine landing on any entry or section page; tag pills on any entry page routing into a pre-filtered section/search view.

---

## Key User Flows

### Flow 1: Search → Filter → Entry (Happy Path)

1. User types a query into the persistent header search bar (from any page).
2. System navigates to `/search?q=...` and returns ranked results (Relevance sort by default), still respecting `status = 'published'` only.
3. User opens the filter panel (sidebar on desktop, drawer on mobile) and selects Skill Level = Beginner and Focus = Zone Defense.
4. System narrows results client-side/query-side using AND-across-categories logic; active filters appear as removable chips above the results grid.
5. User clicks an entry card → lands on the Entry Detail page.

**Alternate path A:** If the filter combination returns zero results, the system shows a "no exact matches" empty state suggesting removal of the most restrictive active filter, plus 2–3 close matches instead of a blank page.
**Alternate path B:** If the user arrives with no search query (browsing a section page directly), the same filter panel is available scoped to that section's entries, without requiring a search term first.

---

### Flow 2: Section Browse → Tag-Hop → Entry (Discovery Path)

1. User clicks a top-level nav item (e.g. "Strategies") from any page.
2. System renders the Strategies section page: card grid of published Strategy entries (title, short description, difficulty badge, 2–3 tags).
3. User opens a Strategy entry detail page and clicks a tag pill (e.g. "Zone Defense").
4. System routes to `/search?focus=zone-defense` (or equivalent pre-filtered view) showing all entries across types tagged with that Focus category.
5. User opens a Drill entry from those results, then scrolls to Similar Entries and continues into another entry.

**Alternate path:** From any entry detail page, clicking a Similar Entries card is a direct shortcut into Flow 2's step 5 without visiting a section or search page at all.

---

### Flow 3: Entry Detail Deep-Read (Coach Prepping at the Field)

1. User lands directly on an Entry Detail page (from search, a shared link, or Flow 1/2).
2. Above-the-fold: title, skill-level/difficulty badges, duration, team size, primary media.
3. User scrolls to numbered instructions body, then to the collapsible Coaching Points / Common Mistakes / Variations blocks — expanding only the ones relevant to them.
4. If a section (e.g. Variations) has no data for this entry, it does not render at all — no empty accordion shells.
5. User reaches the Similar Entries row at the bottom and either exits or continues into a related entry (rejoining Flow 2).

---

## UI States

### Section/Search Results Grid

| State | Trigger | What the User Sees |
|-------|---------|-------------------|
| **Empty (no content yet)** | Section genuinely has zero published entries | "No entries published in this section yet" message, no filter suggestion (not a filter problem) |
| **Empty (over-filtered)** | Search/filter combination matches nothing | Headline naming the most restrictive active filter, a one-tap "remove this filter" action, and 2–3 closest-match cards below |
| **Loading** | Query in flight (client-side filter change) | Skeleton card placeholders in the grid (same card dimensions, no layout shift) |
| **Populated** | Results present | Standard card grid: title, short description, difficulty badge, 2–3 tags |
| **Error** | Query/data fetch fails | Inline message ("Something went wrong loading results") + a retry action; never a blank white screen |

### Entry Detail Page

| State | Trigger | What the User Sees |
|-------|---------|-------------------|
| **Loading** | Page data fetching (rare with SSG/ISR, but covers revalidation edge cases) | Skeleton layout matching the final template (media block + text blocks) |
| **Populated** | Entry data present | Full template: header/badges, media, instructions, present-only optional sections, similar entries |
| **Missing optional section** | e.g. no Variations recorded | Section is omitted entirely — never rendered empty |
| **Not Found** | Slug doesn't resolve to a published entry (or entry is draft) | Standard 404 page with links back to the relevant section and global search |
| **No Similar Entries** | Zero tag overlap with any other published entry | Similar Entries block is omitted rather than shown empty |

### Filter Panel

| State | Trigger | What the User Sees |
|-------|---------|-------------------|
| **Collapsed (mobile default)** | Page load on mobile viewport | A compact "Filters" bar/button with an active-filter-count badge if any are applied |
| **Expanded** | User taps/clicks to open | Full filter categories (Skill Level, Team Size, Duration, Difficulty, Focus, Drill Type, Equipment) as checkbox/chip groups |
| **Active filters applied** | ≥1 filter selected | Removable chip row above the results grid reflecting every active filter, in addition to the panel's own checked state |

---

## Copy & Tone

**Voice:** Direct, confident, coach-to-coach — like a teammate handing over notes, not a corporate product. Terse labels (mono-styled tag/meta text in the mockups reinforces this "film room / playbook" register). Avoid marketing fluff; avoid apologetic or overly cheerful tone in error/empty states.

**Key principles:**
- Never blame the user for zero results — treat over-filtering as the system's cue to help, not the user's mistake.
- Use active, imperative verbs for primary CTAs ("Browse the Encyclopedia," not "Learn More").
- Keep entry-page copy scannable — short declarative sentences and numbered steps over paragraphs, consistent with the coach-glancing-at-a-phone use case.

**Critical copy samples:**

| Context | Copy |
|---------|------|
| Primary CTA (homepage hero) | `Browse the Encyclopedia` |
| Search bar placeholder | `Search drills, strategies, plays...` |
| Empty state headline (over-filtered) | `No exact matches for these filters` |
| Empty state action | `Remove "{filter name}" to see more` |
| Section empty (no content yet) | `Nothing published in {Section} yet — check back soon` |
| Entry not found (404) | `We couldn't find that entry` |
| Similar Entries section header | `Similar Entries` |
| Coaching Points section header | `Coaching Points` |

---

## Visual Design Direction

**Style:** "Light Film Room" — clean, high-contrast, athletic; closer to a broadcast tactics board than a SaaS dashboard. Established directly from `design/landing-and-encyclopedia-mockup.html`.

**Color palette:**
- Base: white / neutral zinc grays (`zinc-50`–`zinc-900`), light mode only for this initiative.
- Primary accent: pink (`#be185d` / pink-700) — primary CTAs, active states, hover borders.
- Secondary accent: green (`#047857` / emerald-700) — icons, tag/meta text, secondary emphasis.
- Difficulty/skill badges: small consistent secondary palette (green/yellow/red family), always paired with a text label or icon — never color alone (WCAG requirement, see Accessibility below).

**Typography:**
- UI/body text: clean geometric sans-serif (Inter or equivalent) — matches the mockups' body text.
- Headings/display: Druk-family font (`fonts/DrukaatieBurti-0.14.1/`) with `Oswald`/`Arial Narrow` fallback, per the original design doc's font stack — used for page titles, section headers, hero copy.
- Meta/tag/label text: monospace, uppercase, letter-spaced — matches the mockups' `font-mono uppercase tracking-wider` treatment for tags, badges, and nav micro-copy.

**Spacing & density:** Comfortable, not compact — generous card padding, clear dividers (`border-film-border`) between sections, consistent with a scannable "expand to see more" density rather than a dense data-table feel.

**Existing design system:** New — this UX phase establishes it, seeded directly from the three mockups below. Tailwind config should formalize `film-accentPink`, `film-accentGreen`, `film-panel`, `film-border` as named theme tokens rather than ad hoc hex values.

**Mood reference:** Linear's clarity and restraint, combined with Strava's confident use of color and imagery — not a sterile productivity tool.

---

## HTML/CSS Mock-Ups

### Mock-Up 1: Landing Page + Section Browse

**Artifact path:** `.cicadas/drafts/encyclopedia/mockups/landing-and-browse.html`
**Viewport target:** Responsive (desktop-primary in this mockup; drawer/mobile behavior to be validated against Responsive & Accessibility breakpoints below during Tech Design/implementation)
**Purpose:** Establishes the global header/nav, homepage hero + Popular Resources grid (Flow 2 entry point), and the section-browse page with left-sidebar filter panel and card grids for Drills/Strategies/Formations (Flow 1 and Flow 2).
**Notes:** Toggle buttons at the top of the file switch between "Page 1: Landing" and "Page 2: Browse" for review convenience — these are mockup-only scaffolding, not part of the shipped UI. Filter sidebar shown here is the desktop treatment; the Filter Panel Collapsed/Expanded mobile states above still need a drawer variant applied on top of this same visual language.

### Mock-Up 2: Entry Detail Page

**Artifact path:** `.cicadas/drafts/encyclopedia/mockups/entry-detail-page.html`
**Viewport target:** Desktop-primary (sticky left media column + scrollable right info column)
**Purpose:** Makes Flow 3 concrete — sticky visual/diagram focus on the left, title/badges/instructions/coaching-points blocks scrolling independently on the right. This is the shared template referenced in PRD FR-2.2.
**Notes:** Demonstrates the "expand to see more" collapsible section pattern for Coaching Points/Common Mistakes/Variations described in Design Goals.

### Mock-Up 3: Entry Interaction Variants (Modal/Panel Exploration)

**Artifact path:** `.cicadas/drafts/encyclopedia/mockups/entry-interaction-modal-variants.html`
**Viewport target:** Desktop, overlay context
**Purpose:** Explores two alternative interaction models for viewing an entry without a full page navigation — Design A (slide-out inspector panel) and Design B (split-screen focus modal) — as candidates for a lightweight "quick view" from a card grid before committing to a full page load.
**Notes:** **Not yet selected for MVP.** This mockup is exploratory; Tech Design should confirm whether either variant is worth building for MVP or deferred, since PRD FR-2.2 only requires a full entry detail page, not a quick-view overlay. If adopted, treat it as a progressive enhancement layered on top of Mock-Up 2's underlying data/template, not a replacement for it.

---

## UX Consistency Patterns

### Button Hierarchy
- **Primary action:** Filled pink (`film-accentPink`), one per view — e.g., "Browse the Encyclopedia" on the homepage, "Search" submit.
- **Secondary action:** Outlined/bordered neutral (`film-panel` background, `film-border`) — e.g., "Generate a Practice Plan" teaser CTA (visible now, non-functional/placeholder until the Practice Planner initiative), sort/filter toggles.
- **Destructive action:** Not applicable in this initiative — no delete/destructive actions exist in a read-only public encyclopedia.

### Feedback Patterns
- **Success:** Not heavily used in this read-only initiative; reserved for future write-path initiatives (submissions, accounts).
- **Error:** Inline message directly in the affected region (e.g., results grid) with a retry action — no toast-only errors, since a failed query needs an in-context recovery path.
- **Warning:** Not applicable in this initiative's scope.
- **Info:** Inline hint text (e.g., active-filter chip row explaining current narrowing) directly above results.

### Form Patterns
- **Validation timing:** N/A for this initiative — search input has no validation beyond empty-string handling (empty query returns to unfiltered/section view); filters are selection-based (checkboxes/chips), not free text needing validation.

### Navigation Patterns
- **Active state:** Current section highlighted in the persistent header nav (bold/underline/accent color per mockup convention); breadcrumb trail always shows current position.
- **Back navigation:** Standard browser back; breadcrumbs provide an explicit alternative for multi-hop tag-browsing sessions (Flow 2).

### Modal & Overlay Patterns
- **When to use modals:** None required for MVP scope (no confirmation dialogs or forms in this initiative). Mock-Up 3's inspector/split-modal patterns are exploratory only — see notes above; not committed for MVP.
- **Dismissal (if adopted later):** Click outside, ESC key, and an explicit close control — standard convention to carry forward if a quick-view overlay is built in a future iteration.

---

## Responsive & Accessibility

**Breakpoints:**

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile | < 640px | Single column; filter panel becomes a collapsible drawer/bottom sheet; card grid single-column |
| Tablet | 640–1024px | 2-column card grid; filter panel collapsible or condensed sidebar |
| Desktop | > 1024px | Left sidebar filter panel (persistent) + multi-column card grid; entry detail page uses sticky-left-media / scrollable-right-info split layout |

**Accessibility standards:** WCAG 2.1 AA minimum.

**Key requirements:**
- Keyboard navigation: full — all filters, tag pills, nav links, and card links must be reachable and operable via keyboard alone.
- Screen reader support: required — semantic headings for section titles, accordion sections use proper `aria-expanded`/`aria-controls`, difficulty badges expose a text label (not color/icon alone) to assistive tech.
- Color contrast: AA minimum on all badge/text/background combinations, explicitly including the pink/green accent colors against the light neutral base.
- Touch targets: minimum 44×44px on mobile, especially for filter drawer controls and tag pills (Time-Crunched Captain persona is frequently one-handed).
- Difficulty/skill indicators never rely on color alone — always paired with a text label or icon, per PRD accessibility note.
- Reduced motion: any transitions (accordion expand/collapse, drawer slide-in, hover states) respect `prefers-reduced-motion`.
