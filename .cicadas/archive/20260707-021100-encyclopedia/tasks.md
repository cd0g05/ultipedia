
---
summary: "Execution checklist across 5 partitions matching approach.md: Foundation (backend schema/service/API), Routing (react-router-dom + intake relocation), Browse (PRD Feature 1), Search (PRD Feature 2), and SEO & Polish (convergence). No PR tasks injected — lifecycle.json has no-pr-features and no-pr-initiatives."
phase: "tasks"
when_to_load:
  - "When selecting the next implementation task or reviewing completion state."
  - "When checking partition progress, PR boundaries, or execution sequencing."
depends_on:
  - "prd.md"
  - "ux.md"
  - "tech-design.md"
  - "approach.md"
modules:
  - "backend/app/api, backend/app/services, backend/app/db/migrations"
  - "frontend/src/encyclopedia, frontend/src/router.tsx, frontend/src/intake"
index:
  partition_foundation: "## Partition: feat/encyclopedia-foundation"
  partition_routing: "## Partition: feat/frontend-routing"
  partition_browse: "## Partition: feat/encyclopedia-browse"
  partition_search: "## Partition: feat/encyclopedia-search"
  partition_polish: "## Partition: feat/encyclopedia-seo-polish"
next_section: "## Partition: feat/encyclopedia-foundation"
---

# Tasks: Encyclopedia (Encyclopedia + Search, Filtering & Discovery)

<!-- No PR tasks injected: lifecycle.json sets pr_boundaries.features=false and pr_boundaries.initiatives=false. -->

## Partition: feat/encyclopedia-foundation

- [x] Write migration `006_encyclopedia.sql`: `entry_type` and `entry_status` enums, `entries` table (with generated `search_vector` column), `tags`, `entry_tags`, `media` tables <!-- id: 1 -->
- [x] Add indexes: GIN on `entries.search_vector`, btree on `entries.status`, `entries.type`, `entry_tags.tag_id` <!-- id: 2 -->
- [x] Run migration via existing `backend/app/db/migrations/migrate.py` runner against a local/dev Supabase instance and confirm it applies cleanly alongside `001`–`005` <!-- id: 3 --> <!-- Applied 2026-07-06 to live Supabase (11 statements; entries/tags/entry_tags/media verified via to_regclass). Notes: direct db.<ref>.supabase.co host is IPv6-only/unreachable — .env DATABASE_URL now points at the aws-1-us-west-2 session pooler. 006 applied standalone via the runner's split_statements: the full runner re-applies all files and 003 is not re-runnable (duplicate constraint submissions_resolved_entity_fk — pre-existing runner/003 idempotency bug, flagged for Builder). -->
- [x] Implement `entry_from_row()` factory function (Factory Method) in `backend/app/services/encyclopedia.py` mapping a raw `entries` row + `attributes` JSONB to a typed `Entry`/`EntryDetail` object <!-- id: 4 -->
- [x] Implement tag interning/caching (Flyweight) for `(name, category)` lookups within `EncyclopediaService` <!-- id: 5 -->
- [x] Implement the filter pipeline as a Chain of Responsibility (skill level → team size → duration → difficulty → focus → drill type → equipment, each an independent narrowing handler) <!-- id: 6 -->
- [x] Implement `SortStrategy` implementations for Relevance, Difficulty (asc/desc), and Newest <!-- id: 7 -->
- [x] Implement `EncyclopediaService.search_entries(query, filters, sort, page, page_size)`, enforcing `status = 'published'` inside the method itself <!-- id: 8 -->
- [x] Implement `EncyclopediaService.get_entry(entry_type, slug)`, returning `None` for missing/draft entries <!-- id: 9 -->
- [x] Implement `TagOverlapStrategy` and `EncyclopediaService.get_similar(entry_id, limit=3)` <!-- id: 10 -->
- [x] Implement `backend/app/api/encyclopedia.py`: `GET /api/entries`, `GET /api/entries/{type}/{slug}`, `GET /api/search` as thin handlers delegating to `EncyclopediaService` <!-- id: 11 -->
- [x] Wire input validation (400 on invalid `type`/`sort`/filter values) via FastAPI typed params + Pydantic models <!-- id: 12 -->
- [x] Write `backend/tests/services/test_encyclopedia.py` covering: draft exclusion, AND-across-categories, OR-within-category, each sort option, and tag-overlap similarity ordering <!-- id: 13 -->
- [x] Write `backend/tests/api/test_encyclopedia.py` covering all three endpoints' happy paths, 400s, and 404s <!-- id: 14 -->
- [x] Run full existing backend test suite (`pytest`) and confirm zero regressions on `/api/submissions`, `/api/events`, `/api/interview/*` <!-- id: 15 --> <!-- 92 passed (42 pre-existing + 50 new), zero regressions -->
- [x] Reflect: update this partition's task checkboxes and `approach.md`/`tech-design.md` front matter if implementation diverged from the design <!-- id: 16 -->

### Reflect notes (feat/encyclopedia-foundation)

- **Query execution divergence (deliberate)**: the filter chain, sort strategies, and full-text matching run in Python inside `EncyclopediaService` over rows from a thin `EncyclopediaStore` port (`InMemoryEncyclopediaStore` | `SupabaseEncyclopediaStore`), rather than as SQL/tsquery. The `006` schema still ships `search_vector` + GIN, so Postgres FTS can swap in behind the Facade (ADR-6) with no caller changes. Chosen because the required patterns (Chain of Responsibility, Strategy, Flyweight) and the mandated "mock at the Supabase client boundary" test strategy live naturally in Python, and scale is low-hundreds of entries. Draft gating is defense-in-depth: the Supabase store also pre-filters `status=published`, but the authoritative, fully-tested gate is `EncyclopediaService._published_rows()`.
- **Wire format**: snake_case (`short_description`), matching the existing API and tech-design's endpoint spec; the camelCase TS interfaces in tech-design must be produced by `frontend/src/encyclopedia/api/client.ts` mapping (Partition 3 heads-up).
- **Contract extensions**: `search_entries()` gained an optional `entry_type` param (backs `GET /api/entries?type=...`); Pydantic read models live in `backend/app/schemas/encyclopedia.py` per existing schema-package convention; `GET /api/entries` returns a plain array per contract, internally capped at 100 rows.
- **Migration mechanics**: enum creation in `006` uses `DO`-string blocks (single-quoted body) because `CREATE TYPE` has no `IF NOT EXISTS` and `migrate.py`'s splitter only respects single-quoted literals.
- **Flag for Builder**: `backend/app/db/schema.sql` was NOT regenerated (outside this partition's modules) — it is now stale relative to migrations `001`–`006`.

## Partition: feat/frontend-routing

- [x] Add `react-router-dom` to `frontend/package.json` <!-- id: 20 -->
- [x] Create `frontend/src/router.tsx` defining `/` (placeholder encyclopedia shell) and `/contribute/*` (intake app) routes <!-- id: 21 -->
- [x] Update `frontend/src/main.tsx` to render the router instead of mounting the intake `App` directly <!-- id: 22 -->
- [x] Audit `frontend/src/intake/state/draft.ts` for any root-path-dependent localStorage keys or path assumptions; fix if found <!-- id: 23 -->
- [x] Audit `frontend/src/intake/sections/*` and `frontend/src/intake/interview/*` for hardcoded absolute (`/`-prefixed) links or navigation; fix if found <!-- id: 24 -->
- [x] Confirm the intake flow at `/contribute` still successfully calls `/api/submissions` end-to-end (manual or scripted smoke check) <!-- id: 25 -->
- [x] Run existing `frontend/src/intake/tests/*` suite unmodified and confirm zero regressions <!-- id: 26 -->
- [x] Add a regression test asserting `/contribute` renders the intake flow's first screen <!-- id: 27 -->
- [x] Add a placeholder root route component (temporary, replaced by Partition 3's `Home.tsx`) so `/` returns 200 rather than a blank page in the interim <!-- id: 28 -->
- [x] Reflect: update this partition's task checkboxes; explicitly note any deeper root-path coupling found during the audit as a flag for the Builder <!-- id: 29 -->

### Reflect notes (feat/frontend-routing)

- **Divergence from spec**: the specs assumed the intake app mounted directly at `/`. In reality `frontend/src/App.tsx` was a `useState` toggle between a root placeholder (`frontend/src/Home.tsx`) and `frontend/src/intake/App.tsx`. The router replaces that toggle: `App.tsx` was deleted, `Home.tsx` was adapted (its `onStart` callback prop replaced with a react-router `<Link to="/contribute">`) and now serves as the temporary root route (to be replaced by Partition 3's encyclopedia `Home.tsx`). `router.tsx` exports the `routes` array (consumed by `createBrowserRouter` in prod and by `MemoryRouter`/`useRoutes` in tests).
- **Root-path audit findings — no coupling found, no intake fixes required**: `draft.ts` localStorage keys (`ulti.draft.v1`, `ulti.contributor.v1`, plus the offline queue key in `api/client.ts`) are constant, origin-scoped strings — path-independent. All API calls are absolute `/api/...` URLs (`/api/submissions`, `/api/events`, `/api/interview/*`) unaffected by the route move. `sections/*` and `interview/*` contain zero anchors, `window.location` usage, or path-based navigation — the intake flow is a pure in-memory state machine. `analytics.ts` loads Plausible by domain, no path assumptions. Intake internals untouched.
- **Smoke check (task 25)**: scripted end-to-end — backend up via uvicorn, Vite dev server up; `GET /` → 200, `GET /contribute` → 200, `POST /api/submissions` through the dev proxy → 201 with a submission id.
- **Tests**: existing 18 Vitest tests pass unmodified; 4 new routing regression tests added (`frontend/src/intake/tests/routing.test.tsx`), 22/22 total. New tests use `MemoryRouter` + `useRoutes` because react-router v6 data routers construct `Request` objects during navigation, which collides with jsdom's `AbortSignal` under Vitest.
- **Flag for Builder (repo hygiene, not this partition's scope)**: the repo's `.gitignore` files (root and `frontend/`) exist in the main checkout but are NOT committed to git, so fresh worktrees see `node_modules/`, `dist/`, and `tsconfig.tsbuildinfo` as untracked. Files were staged explicitly to avoid committing artifacts; committing the `.gitignore`s would prevent accidents in later partitions.

## Partition: feat/encyclopedia-browse

- [x] Implement `frontend/src/encyclopedia/types.ts` (`EntryType`, `EntrySummary`, `EntryDetail`) matching the backend contract <!-- id: 30 -->
- [x] Implement `frontend/src/encyclopedia/api/client.ts` typed fetch wrappers for `/api/entries` and `/api/entries/{type}/{slug}` <!-- id: 31 -->
- [x] Build `EntryCard.tsx` (title, short description, difficulty badge, 2–3 tags) <!-- id: 32 -->
- [x] Build `Breadcrumbs.tsx` (`Home / {Section} / {Entry Title}`) <!-- id: 33 -->
- [x] Build `TagPill.tsx` (clickable, routes to a pre-filtered view) <!-- id: 34 -->
- [x] Build `Section.tsx` as one component parameterized by a `type` route param (Template Method); wire into `router.tsx` for all five section paths, replacing any leftover placeholder <!-- id: 35 -->
- [x] Build `EntrySections/CoachingPoints.tsx`, `CommonMistakes.tsx`, `Variations.tsx` — each renders `null` when its data is absent (Decorator) <!-- id: 36 -->
- [x] Build `SimilarEntries.tsx`, consuming `EncyclopediaService.get_similar()` via the API client <!-- id: 37 -->
- [x] Build `EntryDetail.tsx`: title/badges/duration/team-size row, primary media, numbered instructions body, the `EntrySections/*` blocks, tag pills, `SimilarEntries` <!-- id: 38 -->
- [x] Build `Home.tsx` (hero + Popular Resources grid) and replace Partition 2's placeholder root route <!-- id: 39 -->
- [x] Implement a 404 page for unresolved/draft slugs, linking back to the relevant section and search <!-- id: 40 -->
- [x] Write component tests for `Section.tsx`, `EntryDetail.tsx`, and `EntrySections/*` (including the "renders nothing when absent" cases), mocking `api/client.ts` <!-- id: 41 -->
- [x] Manually trace one example entry of each type from `/` in ≤2 clicks and confirm it resolves correctly <!-- id: 42 --> <!-- Verified via router-level tests with a mocked api/client (trace.test.tsx: MemoryRouter, "/" → header nav → card → EntryDetail for all five types, + 1-click featured-card path). Live manual trace pending real data — no entry content exists yet (seeding out of initiative scope; DB migration blocked on credentials). -->
- [x] Reflect: update this partition's task checkboxes and flag any shared-shell/header conflicts with Partition 4 before merging <!-- id: 43 -->

### Reflect notes (feat/encyclopedia-browse)

- **Shared shell (Partition 4 heads-up)**: `frontend/src/encyclopedia/components/Layout.tsx` is the shared header/footer shell, mounted as a react-router layout route wrapping `/`, all section pages, entry detail, and the 404 catch-all (`/contribute/*` stays outside it). The search bar mount point is a clearly marked `SEARCH SLOT` comment in the header's right-side flex group (next to the "Submit a Drill" CTA) — Partition 4 mounts `<SearchBar />` there. No search UI was built in this partition; tag pills link to `/search?{category}={name}` per the fixed URL contract.
- **Routing shape**: instead of five literal section routes, `router.tsx` registers `/:section` and `/:section/:slug` dynamic segments under the Layout route; `Section.tsx`/`EntryDetail.tsx` resolve the segment via the `SECTIONS` table in `types.ts` (plural URL path ↔ singular API type) and render the 404 page for unknown segments. React-router ranks static routes above dynamic ones, so Partition 4's `/search` route will win automatically — the expected `router.tsx` merge conflict is confined to the routes array.
- **Forced edits outside the module list (flag for Builder)**: task 39 ("replace Partition 2's placeholder root route") forced (a) deleting `frontend/src/Home.tsx` (the placeholder, documented as temporary in Partition 2's notes) and (b) updating two assertions in `frontend/src/intake/tests/routing.test.tsx` that asserted placeholder-specific copy. Intake internals untouched otherwise.
- **Visual system divergence (deliberate)**: `tailwind.config.js` and `index.css` are outside this partition's modules, so the ux.md-mandated `film-*` theme tokens and Druk/Oswald heading font were NOT formalized; pages use built-in Tailwind classes with the mockups' exact hex values (zinc-100/zinc-300/pink-700/emerald-700) and default sans with uppercase/bold headings. Formalizing tokens + fonts is deferred to the SEO & Polish partition (or Builder decision).
- **`variations` ambiguity (flag for Builder)**: the wire contract says `variations` items are entry ids, but there is no lookup endpoint to resolve ids → titles. `EntrySections/Variations.tsx` renders the strings as-is (correct if seeding stores descriptive text; unhelpful raw UUIDs if it stores ids). Needs a seeding-time decision.
- **Extras within scope**: `MediaEmbed.tsx` implements the tech-design Adapter pattern (image/YouTube/Vimeo → embeddable element, lazy-loaded iframes) so `EntryDetail.tsx` never branches on provider. "Popular Resources" has no popularity signal yet, so Home interleaves the first entries of each type (every type ≤1 click from `/`).
- **Tests**: 36 new Vitest tests (`frontend/src/encyclopedia/tests/`: section 11, entry-detail 10, entry-sections 8, trace 7); full suite 58/58, `npm run build` (tsc + vite) clean. Loading skeletons / error-retry / aria-expanded collapsibles intentionally left minimal (text placeholders, inline messages) — they are Partition 5 tasks (ids 64–66).

## Partition: feat/encyclopedia-search

- [x] Add the persistent search bar to the shared encyclopedia header/shell (coordinate with Partition 3's shell if already merged; flag conflicts in Reflect) <!-- id: 50 --> <!-- COMPLETE (2026-07-06, merge-resolution commit 2392c76): SearchBar.tsx (form → /search?q=..., preserves active filters when refining on /search) mounted in the shared Layout header's agreed SEARCH SLOT, desktop-only (hidden md:flex); the /search page keeps its own full-width bar. Mobile header search treatment handed to Partition 5. -->
- [x] Build `FilterPanel.tsx` with desktop-sidebar and mobile-drawer variants for all seven filter categories <!-- id: 51 -->
- [x] Build `FilterChips.tsx` (removable active-filter chip row) <!-- id: 52 -->
- [x] Build `Search.tsx`, wiring query/filter/sort state to `GET /api/search` via `api/client.ts` <!-- id: 53 --> <!-- via api/search.ts, not api/client.ts — client.ts is Partition 3's file (see Reflect notes) -->
- [x] Implement AND-across-categories / OR-within-category filter state logic <!-- id: 54 -->
- [x] Implement the over-filtered empty state (restrictive-filter callout + 2–3 close-match cards) <!-- id: 55 -->
- [x] Wire sort control (Relevance/Difficulty/Newest) to the `sort` query param <!-- id: 56 -->
- [x] Write component tests for AND/OR filter combinations, chip removal, sort switching, and the empty state <!-- id: 57 -->
- [x] Verify all filter/search interactions are operable via keyboard alone <!-- id: 58 --> <!-- all interactions use native inputs/buttons/selects/links; keyboard paths (Enter submit, Space checkbox toggle, Enter disclosure toggle, chip buttons) covered by tests -->
- [x] Reflect: update this partition's task checkboxes; confirm no unresolved conflict with Partition 3's shared shell component <!-- id: 59 -->

### Reflect notes (feat/encyclopedia-search)

- **Type duplication (deliberate, Partition 5 must consolidate)**: `frontend/src/encyclopedia/api/search.ts` defines its own minimal camelCase `EntryType`/`Tag`/`EntrySummary` plus the search-only shapes (`SearchResponse`, `SortOption`, `FilterCategory`, `ActiveFilters`, URL/param helpers). Partition 3 is building `types.ts`/`api/client.ts` in parallel with overlapping summary types — per the de-confliction contract this brief duplication is accepted; Partition 5 should merge the entry shapes into `types.ts` and keep the search-specific helpers in `api/search.ts`.
- **Header mounting deferred (task 50 partial)**: `SearchBar.tsx` is self-contained and page-mounted on `Search.tsx`. Once Partition 3's shared Layout/header merges, mount `<SearchBar />` there (it needs no props; it reads/preserves `/search` params itself). No shell component was invented on this branch, so the only expected merge conflict is the two added lines in `router.tsx` (`/search` route + import) — trivial to resolve at merge.
- **URL is the single source of truth**: `/search` state (q, seven repeatable filter params using wire names `skill_level`/`team_size`/`duration`/`difficulty`/`focus`/`drill_type`/`equipment`, `sort`) lives entirely in the URL search params, so views are shareable and Partition 3's TagPill links (`/search?<category>=<name>`) pre-filter correctly; unknown values arriving via URL are merged into the panel's checkbox options so they remain visible/removable. An invalid `sort` param is ignored client-side (never forwarded → no 400).
- **Filter vocabulary is a frontend constant**: there is no `/api/tags` endpoint, so `FILTER_OPTIONS` in `FilterPanel.tsx` ships a curated starter taxonomy (aligned with the backend's `_DIFFICULTY_RANK` vocabulary: beginner/intermediate/advanced, easy/medium/hard). When entries are seeded, either add a tags endpoint or reconcile this list with the real tag values (flag for Builder / content-seeding initiative).
- **"Most restrictive filter" heuristic**: on zero results the page re-queries once per active (category, value) pair with that pair removed and names the pair whose removal frees the most results; that relaxed query's top 3 double as the close-match cards. If no single removal helps, it relaxes harder (all filters dropped, then query dropped, sort=newest) so the empty state is never a dead end. O(active filters) extra requests — fine at this scale.
- **Mobile drawer = CSS disclosure, one DOM instance**: the panel renders one set of checkbox groups; `lg:` classes show it as a persistent sidebar on desktop, and below `lg` it collapses behind a `Filters (n)` button with `aria-expanded`/`aria-controls`. Drawer slide-in animation (and `prefers-reduced-motion` handling) intentionally left to Partition 5's polish pass.
- **Result cards link to `/{plural-type}/{slug}`** (`/drills/...`, `/strategies/...`, etc.) per the sitemap — those routes are Partition 3's; links are inert until browse merges.
- **Tests**: 15 new Vitest tests in `frontend/src/encyclopedia/tests/Search.test.tsx` mocking `searchEntries` at the module boundary (AND/OR params, chip removal, clear-all, sort switching, over-filtered empty state incl. one-tap recovery, query-only empty state, drawer disclosure, error+retry, keyboard paths). Full suite 37/37 (22 pre-existing + 15 new), `npm run build` (tsc + vite) clean.

## Partition: feat/encyclopedia-seo-polish

- [x] Build `Seo.tsx` (react-helmet-async wrapper: per-page `<title>`/`<meta name="description">`) <!-- id: 60 -->
- [x] Add JSON-LD `HowTo` structured data emission to drill entry pages via `Seo.tsx` <!-- id: 61 --> <!-- howToJsonLd(): steps from the same instructionSteps() parse the visible numbered list uses; totalTime from the duration tag (best-effort ISO-8601); supply from equipment tags; null for non-drills and step-less drills (invalid HowTo is worse than none) -->
- [x] Wire `Seo.tsx` into `EntryDetail.tsx`, `Section.tsx`, `Home.tsx`, and `Search.tsx` <!-- id: 62 --> <!-- + NotFound left un-wired deliberately (no index value in a 404 title; browser default suffices). HelmetProvider mounts in Layout.tsx (not main.tsx) so tests driving the exported route tree get context for free. Verified by tests/seo.test.tsx (7 tests) -->
- [x] Build `frontend/scripts/generate-sitemap.mjs`, calling `/api/entries` per type and emitting `sitemap.xml` into `frontend/dist` at build time <!-- id: 63 --> <!-- runs as npm postbuild + standalone `npm run sitemap`; SITE_URL/SITEMAP_API_BASE env-configurable; verified live: empty backend → 7 static URLs (home, /search, 5 sections); API down → same output + warnings, exit 0 (fail-soft) -->
- [x] Add loading skeleton placeholders (matching final card dimensions) to section/search results grids and the entry detail page <!-- id: 64 --> <!-- components/Skeletons.tsx: SkeletonCard mirrors EntryCard's frame; SkeletonGrid takes the real grid's layout classes; EntryDetailSkeleton mirrors the detail template; Home's grid also converted. sr-only role=status announcement; pulse is motion-reduce:animate-none -->
- [x] Add inline error + retry UI for failed `/api/search` and `/api/entries/*` fetches <!-- id: 65 --> <!-- shared InlineError (role=alert + Retry button) on Section, EntryDetail, Search (retryToken re-fetch). Home intentionally has no error state: each per-type fetch degrades to [] so the grid can't hard-fail and the section tiles remain the recovery path -->
- [x] Add `aria-expanded`/`aria-controls` and keyboard (Enter/Space) support to all collapsible entry-page sections <!-- id: 66 --> <!-- SectionBlock is now a disclosure: native <button> in the h2 (Enter/Space free), aria-expanded/aria-controls, `hidden` region when collapsed. DEFAULT EXPANDED (divergence from the "collapsed accordion" persona note in ux.md journeys): with client-rendered SEO (ADR-3) collapsing content by default would hide it from non-JS-executing crawlers and from scanning coaches; collapse is opt-out. 3 new keyboard tests -->
- [x] Verify difficulty/skill-level badges display a text label or icon alongside color, never color alone <!-- id: 67 --> <!-- verified: EntryCard/EntryDetail/Search badges always render the text label inside the colored chip; FilterPanel count badge has text + aria-label; CommonMistakes ✕ marker is aria-hidden decoration next to full text -->
- [x] Run an automated accessibility audit (axe-core or Lighthouse) against representative pages (home, section, entry detail, search) and address findings <!-- id: 68 --> <!-- tests/a11y.test.tsx: axe-core in Vitest/jsdom against mocked-data renders of all four pages (DB is empty; per handoff). Findings fixed: (1) heading-order — EntryCard h3 skipped a level under section-page h1 → h2; (2) landmark-unique — duplicate "Encyclopedia sections" navs (desktop+mobile+404) and two unnamed role=search forms on /search → unique aria-labels. color-contrast rule disabled in jsdom (cannot compute without paint) — covered by id 69 instead -->
- [x] Verify all accent/badge/text-on-background color combinations meet WCAG AA contrast <!-- id: 69 --> <!-- tests/contrast.test.ts: WCAG 2.1 relative-luminance math over all 19 fg/bg pairs in use, ALL held to the 4.5:1 normal-text bar (mono micro-copy is 10–14px). Fixes required: breadcrumbs zinc-400→zinc-600, footer © zinc-400→zinc-600, header nav zinc-500→zinc-600, figcaption zinc-500→zinc-600, placeholder gray-400→zinc-500. Badge palette (emerald/yellow/red 800-on-50) passes as-is -->
- [x] Verify transitions (accordion, drawer) respect `prefers-reduced-motion` <!-- id: 70 --> <!-- accordion chevron rotate: motion-reduce:transition-none; skeleton pulse: motion-reduce:animate-none; drawer is a display toggle (no animation to suppress); remaining transitions are transition-colors only (no motion, exempt) -->
- [x] End-to-end walkthrough confirming PRD Success Criteria: ≤2-clicks reachability, no draft entry ever reachable via any public route/search/filter, Content Checklist enforcement documented for future seeding <!-- id: 71 --> <!-- see Reflect notes below -->
- [x] Reflect: update this partition's task checkboxes and `tech-design.md`/`approach.md` front matter to reflect final state <!-- id: 72 --> <!-- spec front matter unchanged (matches P1–P4 convention); divergences captured inline + in Reflect notes: helmet v3 not ^2, provider in Layout, expanded-by-default disclosures, postbuild sitemap hook -->
- [x] Consolidation: restyle search UI (`Search.tsx`, `FilterPanel.tsx`, `FilterChips.tsx`, `SearchBar.tsx`) from the intake palette to the Light Film Room system <!-- id: 73 --> <!-- square corners, white/zinc base, film-accentPink/film-accentGreen accents, mono uppercase micro-copy; ResultCard now mirrors EntryCard's frame (type strip → title → desc → badges) with the title as the card's single link; zero cream/clay/amber/gray-* left in frontend/src/encyclopedia -->
- [x] Consolidation: fold `api/search.ts`'s duplicated `EntryType`/`Tag`/`EntrySummary` into imports from `types.ts`; keep search-specific helpers in `search.ts` <!-- id: 74 --> <!-- search.ts imports + re-exports the domain types (one import site preserved for consumers); wire mapping now carries `attributes` per the shared EntrySummary; SearchResponse/SortOption/filter helpers stay in search.ts -->
- [x] Consolidation: formalize `film-*` theme tokens in `frontend/tailwind.config.js` and migrate encyclopedia components' raw zinc/pink/emerald usages to them <!-- id: 75 --> <!-- tokens per ux.md + mockup inline config: film.base/panel/border/accentPink/accentGreen + accentPinkDark (hover). Migrated across all encyclopedia components; intake palette untouched; EntryCard's badge palette (emerald/yellow/red 50/700/800) intentionally stays raw — it is the separate green/yellow/red badge family, not the accent system -->
- [x] Consolidation: give mobile a usable header search path <!-- id: 76 --> <!-- 44×44px magnifier icon link → /search, visible below md (where the header bar is hidden); /search mounts its own full-width bar. Accessible name "Search the encyclopedia" -->

### Reflect notes (feat/encyclopedia-seo-polish)

- **SEO layer (ADR-3) shipped as designed, two mechanical divergences**: (1) `react-helmet-async` resolved to v3.0.0 (tech-design said ^2.x — v3 is the maintained continuation, same `Helmet`/`HelmetProvider` API, peer-compatible with React 18). (2) `HelmetProvider` lives in `Layout.tsx` rather than `main.tsx` so every consumer of the exported `routes` array (prod router AND MemoryRouter-driven tests) gets head context without per-test wiring; every `<Seo />` consumer sits under Layout. Sitemap generation is wired as an npm `postbuild` hook (build step per ADR-3) and fails soft by design — CI without a backend still emits the 7 static URLs.
- **Collapsible sections default EXPANDED (deliberate divergence)**: ux.md's Time-Crunched Captain journey mentions a "collapsed Coaching Points accordion", but collapsing by default would hide entry content from non-JS-tolerant crawlers (the exact weakness ADR-3 accepts) and force an extra tap for the primary reading flow. Blocks are fully collapsible disclosures (aria-expanded/aria-controls, Enter/Space, `hidden` region) that start open. Builder can flip one boolean (`useState(true)`) if the collapsed-default is preferred after seeding.
- **PRD Success Criteria walkthrough (task 71)**:
  - *≤2 clicks from homepage*: verified two ways — `tests/trace.test.tsx` (router-level: "/" → nav → card → detail for all five types, + 1-click featured-card path) and Home's cross-type interleaved featured grid guaranteeing every type ≤1 click from "/". Live-data trace still pending seeding (unchanged from P3's note).
  - *Draft gating airtight*: the authoritative gate is `EncyclopediaService._published_rows()` inside the service (P1), covered by `backend/tests/services/test_encyclopedia.py` (`test_search_entries_excludes_drafts`, `test_search_entries_excludes_drafts_even_when_query_matches`, `test_get_entry_returns_none_for_draft`, `test_get_similar_excludes_drafts`, `test_get_similar_returns_empty_for_draft_source`) plus API-level 404s in `backend/tests/api/test_encyclopedia.py`. All P3–P5 frontend paths consume only these service-backed endpoints; drafts 404 → the NotFound page; the sitemap script enumerates via `/api/entries` (published-only), so draft URLs never leak there either. Re-ran the full backend suite this partition: 92/92, untouched.
  - *Content Checklist enforcement (documented for seeding)*: there is NO code-level enforcement yet — `status` flips to `published` directly in the DB. The seeding initiative MUST validate each entry against the checklist (title, short description, full instructions, ≥2 coaching points, ≥1 common mistake, all required tags, ≥1 media reference — PRD Measurable Outcomes) before setting `published`; recommended shape: a seed-script assertion or a DB CHECK/trigger. Flag for Builder/seeding initiative.
- **a11y audit summary**: axe-core (jsdom, mocked data) on Home/Section/EntryDetail/Search — 2 finding classes, both fixed (heading-order via EntryCard h3→h2; landmark-unique via unique nav/search-form labels). Contrast: 19/19 pairs ≥4.5:1 after darkening five neutral-gray usages (see id 69). Note the jsdom audit can't see responsive visibility (both header navs are in the DOM), so unique labels are also the honest fix for real AT users on /search desktop where two search forms are genuinely visible.
- **Skeleton/error states**: shared `components/Skeletons.tsx` (SkeletonCard/SkeletonGrid/EntryDetailSkeleton/InlineError) replaces P3's text placeholders; Search's bespoke skeleton/error replaced with the same shared components, so loading/error surfaces are visually identical site-wide.
- **Tests**: 34 new (seo 7, a11y 4, contrast 19, collapsible-disclosure 3, + 1 axe fix ripple), full frontend suite 107/107 (73 baseline + 34), `npm run build` (tsc + vite + sitemap postbuild) clean, backend 92/92. Existing-test edits confined to `frontend/src/encyclopedia/tests/` (Search.test.tsx: HelmetProvider wrapper + `attributes: {}` in the local fixture after type consolidation; entry-sections.test.tsx: new disclosure tests). No intake files touched.
- **Flags carried forward for Builder**: filter vocabulary still a curated constant in `FilterPanel.tsx` (no `/api/tags`); `variations` renders raw entry ids pending a seeding-time decision; `backend/app/db/schema.sql` stale vs migrations; migration runner + `003` idempotency bug; Content Checklist enforcement (above); `SITE_URL` for the sitemap defaults to `https://ultipedia.app` — set the real production origin in the deploy pipeline; ux.md's Druk/Oswald heading font was NOT adopted (pages use the default sans with uppercase/bold treatment, matching what P3 shipped) — adding `fontFamily.heading` to the now-formalized tailwind config is a one-liner if the Builder wants the mockup font stack.

## Initiative Boundary

- [ ] Merge `initiative/encyclopedia` directly into `main` (no PR — per lifecycle.json) and synthesize canon <!-- id: 100 -->
