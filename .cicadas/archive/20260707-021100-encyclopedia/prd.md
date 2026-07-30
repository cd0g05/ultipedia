
---
summary: "Public, publicly-browsable ultimate frisbee encyclopedia (Drills/Strategies/Formations/Plays/Skills) with full-text search and attribute filtering, built on Next.js + Supabase Postgres. A single polymorphic entry model and Postgres FTS-based search that must not require schema rework once Practice Planner, Accounts, Community Contributions, and Drill Visualizer are built in later initiatives."
phase: "clarify"
when_to_load:
  - "When defining or reviewing initiative goals, users, scope, success criteria, and risks."
  - "When validating that implementation still aligns with the intended problem and outcomes."
depends_on: []
modules:
  - "Encyclopedia data model (entries/tags/entry_tags/media)"
  - "Entry pages (Drill/Strategy/Formation/Play/Skill)"
  - "Search & filtering"
  - "Next.js frontend, Supabase Postgres backend"
index:
  executive_summary: "## Executive Summary"
  project_classification: "## Project Classification"
  success_criteria: "## Success Criteria"
  user_journeys: "## User Journeys"
  scope: "## Scope"
  functional_requirements: "## Functional Requirements"
  non_functional_requirements: "## Non-Functional Requirements"
  open_questions: "## Open Questions"
  risk_mitigation: "## Risk Mitigation"
next_section: "Executive Summary"
---

# PRD: Encyclopedia (Encyclopedia + Search, Filtering & Discovery)

## Progress

- [x] Executive Summary
- [x] Project Classification
- [x] Success Criteria
- [x] User Journeys
- [x] Scope & Phasing
- [x] Functional Requirements
- [x] Non-Functional Requirements
- [x] Open Questions
- [x] Risk Mitigation

## Executive Summary

Ultipedia's Encyclopedia is a public, no-login-required knowledge base of ultimate frisbee drills, strategies, formations, plays, and skills, browsable in ≤2 clicks from the homepage and discoverable via full-text search and faceted filtering. This initiative delivers the first two of Ultipedia's core features — **The Encyclopedia** and **Search, Filtering & Discovery** — as a standalone, SEO-indexable site at `ultipedia.cartercripe.com`, built on a data model designed so later initiatives (Practice Planner, Accounts, Community Contributions, Drill Visualizer) slot in without a schema rewrite.

### What Makes This Special

- **Polymorphic single-table entry model** — one `entries` table with a `type` discriminator and JSONB `attributes` column serves all five entry types through one query/search path, instead of five separate tables that would each need their own search and filter logic.
- **Built for what's coming, not just what's shipping** — `related_entry_ids`, `diagram_ref`, and the tag taxonomy are already shaped for the Practice Planner and Drill Visualizer initiatives that follow, so this phase doesn't become a rework blocker.
- **Coach-first scannability** — expandable, card-based entry pages (coaching points / common mistakes / variations as distinct blocks) designed for a coach glancing at a phone mid-practice, not a wall of text.

## Project Classification

**Technical Type:** Consumer content site (public reference/library product)
**Domain:** Sports/Recreation — ultimate frisbee coaching resources
**Complexity:** Medium — the polymorphic data model, tagging taxonomy, and combined search+filter query logic carry real design weight even though there's no auth or write-path complexity yet.
**Project Context:** Greenfield — new Next.js app and new Supabase schema, deployed as an independent project/subdomain from the existing `ulti-pedia-form` intake app in this same repo. No shared runtime dependency on the intake app; the two may eventually share the Supabase project/org but not schema or deploy target.

---

## Success Criteria

### User Success

A user achieves success when they can:

1. **Find any entry in ≤2 clicks from the homepage** — verified by clicking through nav → section → entry for a sample of entries across all five types.
2. **Get a complete, authoritative-feeling entry page** — every published entry has instructions, ≥2 coaching points, ≥1 common mistake, and its full tag set visible without dead/empty sections.
3. **Narrow results using search and filters that behave predictably** — AND across categories, OR within a category, filter chips reflect active state, and results update without a full page reload feeling required.

### Technical Success

The system is successful when:

1. **One entry query path serves all five types** — no per-type branching duplicated across browse, search, and detail-page code.
2. **Search/filter queries stay fast at current content volume** (low hundreds of entries) using Postgres FTS + indexed tag joins, with no dedicated search service.
3. **Published/draft gating is airtight** — no draft entry is ever reachable through a public URL, search result, or filtered listing.

### Measurable Outcomes

- 100% of published entries pass the Content Checklist (title, short description, full instructions, ≥2 coaching points, ≥1 common mistake, all required tags, ≥1 media reference) before going live.
- Entry and section pages render via SSG/ISR with near-instant (sub-second perceived) load on a typical mobile connection.
- Search/filter result pages return in well under 1s at current expected scale (low hundreds of entries).

---

## User Journeys

### Journey 1: The New Team Coach — "I don't know where to start"

A first-time coach with a young or inexperienced roster searches "ultimate frisbee zone defense drills" and lands on an Ultipedia entry or section page. They don't know the site's structure yet, so the top-level nav (Drills · Strategies · Formations · Plays · Skills) and a persistent search bar need to orient them immediately — no onboarding, no login wall. They click into a Focus category filter for "Zone Defense," skim a grid of scannable cards (title, one-line description, difficulty badge, key tags), and open one that fits their team's skill level. On the entry page they read the setup, coaching points, and common mistakes, then notice 2–3 "similar drills" at the bottom and follow one of those too. Success feels like: they leave with a concrete drill they trust enough to run at tonight's practice, without ever creating an account.

**Requirements Revealed:** persistent search, section browsing, focus-category filtering, scannable card grid, entry page completeness (coaching points/mistakes), similar-entries recommendation, no-auth public access.

---

### Journey 2: The Time-Crunched Captain — "I have 30 minutes at the field"

A team captain (not an official coach) is standing at the field with a phone, needing to fill a practice gap right now. They open the search/filter page, apply a Duration filter alongside a Skill Level filter, and expect the AND-across-categories logic to actually narrow results rather than requiring them to mentally re-filter results themselves. On a phone, the filter UI needs to be a collapsible drawer, not a sidebar that eats the screen. If their filter combination is too narrow, they need the empty state to suggest loosening the most restrictive filter rather than a dead-end "no results" message. They pick a drill from the results, glance at its collapsible Coaching Points section without re-reading the full setup instructions, and go run it. Success feels like: a fast, mobile-first path from "I need something" to "I have something," without frustration at filter combinations returning nothing.

**Requirements Revealed:** mobile filter drawer/bottom sheet, duration + skill-level filtering, AND/OR filter semantics, non-dead-end empty states, collapsible entry-page sections, mobile-first responsive design.

---

### Journey 3: The Browsing Coach — "Let me see what's here"

An experienced coach with some downtime just wants to explore what Ultipedia has, without a specific need. They start at the homepage, scan featured/section content, and click into the Strategies or Formations section out of curiosity. They expect clickable tags on an entry page to route them to a pre-filtered section (the same pattern as GitHub topic tags), letting them wander from one related concept to another — a Formation entry leading to its component Plays, or a Strategy leading to drills tagged with the same Focus category. Success feels like: the site rewards undirected exploration the same way a well-organized reference site or wiki does, reinforcing that the content is deep and well-connected rather than sparse.

**Requirements Revealed:** clickable tag-to-filtered-section navigation, cross-linking between entry types (Formation ↔ Play, Strategy ↔ Drill via shared tags), breadcrumb navigation, section-page browsing independent of search.

---

### Journey Requirements Summary

| User Type | Key Requirements |
|-----------|-----------------|
| **New Team Coach** | search, section browse, focus-category filter, card grid, entry completeness, similar-entries, no-auth |
| **Time-Crunched Captain** | mobile filter drawer, duration/skill filters, AND/OR logic, smart empty state, collapsible sections, mobile-first |
| **Browsing Coach** | clickable tag navigation, cross-entry-type linking, breadcrumbs, section browsing |

---

## Scope

### MVP — Minimum Viable Product (v1)

**Core Deliverables:**
- `entries` / `tags` / `entry_tags` / `media` schema in Supabase Postgres, with `type` discriminator + JSONB `attributes`, and `status` (draft/published) gating all public queries.
- Five section pages (Drills, Strategies, Formations, Plays, Skills) rendering scannable card grids (title, short description, difficulty badge, 2–3 tags).
- Entry detail pages for all five types sharing one page template: title/badges/duration/team-size row, primary media, numbered instructions body, collapsible Coaching Points / Common Mistakes / Variations blocks, clickable tag pills, and a Similar Entries block computed via shared-tag overlap scoring.
- Persistent header search bar + dedicated search/filter results page.
- Filtering by skill level, team size, duration, difficulty, focus category, drill type, and equipment, with AND-across-categories / OR-within-category semantics, removable filter chips, and a non-dead-end empty state.
- Sort by Relevance (default when searching), Difficulty, Newest.
- Breadcrumb navigation (`Home / {Section} / {Entry}`) and human-readable URL structure (`/drills/[slug]`, etc.).
- Mobile-first responsive layout: card grids, collapsible filter drawer on mobile, collapsible entry-page sections, AA contrast, 16px+ body text, difficulty shown via label+icon (not color alone).
- Basic SEO: per-page meta title/description from entry data, sitemap.xml, JSON-LD `HowTo` structured data for drills.
- A minimal internal authoring path sufficient to seed and publish entries (Supabase table editor is acceptable for MVP; no custom CMS UI required).

**Quality Gates:**
- Every published entry passes the Content Checklist (§11 of the source draft) before it's queryable publicly.
- No draft-status entry is ever reachable via a public route, search result, or filtered listing (verified with a test asserting draft exclusion at the query layer).
- All five entry types render through the same page template with no per-type page duplication.

### Growth Features (Post-MVP)

**v2: Automatic Practice Planner** (separate future initiative)
- Practice plan generation, PDF export, swap/regenerate, save-to-account.

**v3: Accounts & Personalization** (separate future initiative)
- Sign-in, favorites, plan history, team profiles.

### Vision (Future)

- Community Contributions (submission flow, moderation queue, coach commentary, contributor attribution).
- Drill Visualizer (manual drag-drop editor, AI-generated animations).
- Smart/learned practice planning and semantic ("goal-based") search (e.g. "teach zone defense").
- Search engine swap to Meilisearch/Algolia if entry count or query complexity outgrows Postgres FTS.

**Explicitly out of scope for this initiative:** authentication/accounts, user-generated content, native mobile app, self-hosted video (embed YouTube/Vimeo only), drill visualizer, practice planner, community submissions/moderation.

---

## Functional Requirements

### 1. Content Model & Data

**FR-1.1:** The system stores all entry types (Drill, Strategy, Formation, Play, Skill) in a single `entries` table with a `type` discriminator column.
- Shared fields: `id`, `slug`, `title`, `short_description`, `skill_level`, `body`, `coaching_points` (list), `common_mistakes` (list), `variations` (list, may self-reference other entries), `media` (array of refs), `tags`, `related_entry_ids`, `status` (draft/published), `created_at`/`updated_at`.
- Type-specific fields live in a JSONB `attributes` column: Drill (`player_count_min/max`), Strategy/Formation (`offense_or_defense`, `diagram_ref` placeholder), Play (parent Strategy/Formation link), Skill (difficulty progression, prerequisite skill self-references).

**FR-1.2:** Tags are stored via a many-to-many `entries ↔ tags` join table (`entry_tags`), never as a comma-separated string.
- Tag taxonomy categories: Skill level, Team size, Duration, Difficulty (1–5), Focus category, Drill type, Equipment.

**FR-1.3:** Every entry has a `status` field (`draft` | `published`). All public-facing queries (browse, search, filter, detail page) filter to `status = 'published'` only.

**FR-1.4:** Media references (images/video) are stored in a `media` table linked to `entry_id`, with `url`, `type`, `caption`, `sort_order`. Video is embedded via YouTube/Vimeo iframe reference, never self-hosted.

---

### 2. Encyclopedia Browsing & Entry Pages

**FR-2.1:** Five top-level section pages (Drills, Strategies, Formations, Plays, Skills) each render a grid of cards for published entries of that type, showing title, short description, difficulty badge, and 2–3 key tags.

**FR-2.2:** Entry detail pages are served at `/{type-plural}/[slug]` (e.g. `/drills/give-and-go-warmup`) and share one page template across all five types:
- Above the fold: title, skill-level/difficulty badges, duration, team size.
- Primary image or diagram placeholder immediately visible.
- Numbered/step-formatted instructions body.
- Collapsible/distinct-block sections for Coaching Points, Common Mistakes, and Variations — each present only if that data exists (no empty sections rendered).
- Tag pills that route to a pre-filtered section/search page when clicked.
- A Similar Entries block (3-card row) computed via shared-tag overlap scoring (count matching tags, sort descending).

**FR-2.3:** Breadcrumb navigation (`Home / {Section} / {Entry Title}`) appears on every section and entry page.

**FR-2.4:** Every published entry is reachable in ≤2 clicks from the homepage (homepage → section → entry, or homepage → search result → entry).

---

### 3. Search

**FR-3.1:** A persistent search bar appears in the site header on every page (not just a dedicated search page).

**FR-3.2:** Full-text search runs against entry `title`, `short_description`, and `body` via Postgres full-text search (`tsvector` column with a GIN index), returning only `status = 'published'` entries.

**FR-3.3:** Search results default to Relevance sort, with Difficulty (asc/desc) and Newest as alternate sort options.

---

### 4. Filtering & Discovery

**FR-4.1:** Results (search or section browse) can be filtered by any combination of: skill level, team size, duration, difficulty, focus category, drill type, equipment.
- **AND across categories** (e.g., Skill Level AND Team Size both narrow the result set).
- **OR within a category** (e.g., Focus: Throwing OR Cutting both included).

**FR-4.2:** Active filters render as removable chips at the top of the results view; removing a chip updates results immediately.

**FR-4.3:** Filter UI is a left sidebar on desktop and a collapsible drawer/bottom sheet on mobile.

**FR-4.4:** When a filter combination returns no results, the empty state suggests removing the most restrictive filter or shows 2–3 close matches — never a bare "no results" message.

---

### 5. SEO & Discoverability

**FR-5.1:** Every published entry and section page generates a per-page `<meta>` title and description derived from entry data.

**FR-5.2:** An auto-generated `sitemap.xml` includes all published entry and section URLs.

**FR-5.3:** Drill entry pages emit JSON-LD structured data using the schema.org `HowTo` type.

---

## Non-Functional Requirements

- **Performance:** Search and filter queries return in well under 1 second at current expected scale (low hundreds of entries), using Postgres FTS + indexed `entry_tags.tag_id` joins — no dedicated search service required at this stage. Entry and section pages render via SSG/ISR for near-instant perceived load.
- **Reliability:** The `status = 'published'` gate is enforced at the data-access layer (not just the UI) so no draft entry can leak through any query path, including search and filters.
- **Security:** No authentication surface in this initiative (public read-only site); Supabase credentials and any media-provider API keys are stored as environment variables, never committed to the repo. Content authoring (writes) happens through Supabase's table editor or an internal-only tool, not a public-facing write path.
- **Maintainability:** All entry/tag/media access is wrapped behind one service layer (e.g. `searchEntries()`, `getEntry()`, `getSimilar()`) so a future search-backend swap (Postgres FTS → Meilisearch/Algolia) changes one implementation, not every call site. All five entry types render through one page template with type-specific pockets, avoiding per-type page duplication.

---

## Open Questions

Reviewed with Builder — none are blocking; resolved as follows for this initiative:

- **Final taxonomy values** — proceed with the draft taxonomy as-is; not re-validated against the 95+ source catalog before Tech Design, since it's non-blocking and the JSONB `attributes` column absorbs drift without migration if a gap surfaces later.
- **Does "Plays" need to be a separate entry type?** — proceed treating Plays as a full separate entry type per the original data model (§3 of the source draft), consistent with FR-1.1.
- **Exact visual identity** — the `design/` mockups (pink/green accent, Druk-family display font, light "film room" aesthetic) are treated as final direction for this initiative's UX/Tech Design phases.
- **Admin authoring approach for MVP** — Supabase's built-in table editor is sufficient for MVP; no custom internal authoring UI is in scope for this initiative.

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Taxonomy is incomplete or wrong, forcing schema/tag rework mid-build | Med | Med | Sanity-check taxonomy against the 95+ source catalog before Tech Design locks the schema; JSONB `attributes` column absorbs some type-specific drift without migration. |
| Scope creep — Practice Planner / Accounts / Community features bleed into this initiative | Med | High | This PRD explicitly scopes only Encyclopedia + Search/Filtering/Discovery; Approach doc partitions should not include planner/accounts/community/visualizer work. |
| Data model doesn't actually stay stable once Practice Planner / Drill Visualizer are built | Low | High | `related_entry_ids`, `diagram_ref`, and `variations` self-reference are already reserved in the schema specifically so those initiatives extend rather than migrate. |
| Search/filter performance degrades as content grows past "low hundreds" | Low | Low | Explicitly flagged as a non-goal to solve now; `EncyclopediaService` facade isolates the future Postgres FTS → dedicated search-service swap to one place. |
| Empty entries ship (missing coaching points/mistakes) undermining "authoritative" feel | Med | Med | Content Checklist enforced before any entry's `status` flips to `published`; UI never renders an empty Coaching Points/Mistakes/Variations block. |
