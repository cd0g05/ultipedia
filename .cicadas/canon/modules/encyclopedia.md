# Module: encyclopedia

Public, no-login browse + search over a polymorphic `entries` schema, spanning
`backend/app/{services,api,schemas}/encyclopedia.py` and `frontend/src/encyclopedia/`.
Shipped by the `encyclopedia` initiative (2026-07); see `tech-overview.md`
"Encyclopedia Architecture Decisions" for the ADRs behind these choices.

## Backend layout
- `services/encyclopedia.py` — `EncyclopediaService` facade (the only entry point):
  `search_entries()` / `get_entry()` / `get_similar()`. `_published_rows()` is the single
  `status='published'` gate every public method reads through (ADR-Enc-2) — never bypass it.
  Design patterns: `entry_from_row()` Factory Method (only place `type` is interpreted),
  `TagRegistry` Flyweight (interns `(name, category)` tags), a `FilterHandler` Chain of
  Responsibility (skill level → team size → duration → difficulty → focus → drill type →
  equipment; OR within a handler, AND across the chain), `SortStrategy` Strategy (relevance/
  difficulty asc+desc/newest), `SimilarityStrategy` Strategy (`TagOverlapStrategy` ships;
  seam exists for a future embedding-based strategy).
- `EncyclopediaStore` protocol — `InMemoryEncyclopediaStore` (tests/no-config) or
  `SupabaseEncyclopediaStore` (pre-filters `published` as an optimization only; not trusted
  for correctness). `build_encyclopedia_store()` picks based on `Settings.supabase_configured`.
- `api/encyclopedia.py` — thin handlers: `GET /api/entries` (requires `type`), `GET
  /api/entries/{type}/{slug}`, `GET /api/search`. 400 on invalid type/sort/filter values
  (not FastAPI's default 422 — parsed against enums explicitly).
- `schemas/encyclopedia.py` — `EntrySummary`/`EntryDetail`/`SearchResult` read models
  (snake_case wire format), per-type `attributes` Pydantic models (`DrillAttributes`,
  `StrategyAttributes` shared by strategy/formation, `PlayAttributes`, `SkillAttributes`).
- `db/migrations/006_encyclopedia.sql` — `entry_type`/`entry_status` enums (idempotent via
  `DO`-string blocks — `CREATE TYPE` has no `IF NOT EXISTS`), `entries` (with a generated
  `search_vector` tsvector + GIN index, currently unused — ADR-Enc-4), `tags`, `entry_tags`,
  `media`. Purely additive; live in Supabase, currently empty (no seeding path yet).

## Frontend layout
- `components/Layout.tsx` — shared shell: sticky header (wordmark, 5-section nav, desktop
  `SearchBar`, "Submit a Drill" CTA), footer, `<Outlet />`. "Light Film Room" visual system
  (`film.*` Tailwind tokens).
- `pages/Home.tsx`, `pages/Section.tsx` (one component, param'd by the `SECTIONS` table —
  Template Method — for all 5 section paths), `pages/EntryDetail.tsx`, `pages/Search.tsx`,
  `pages/NotFound.tsx`.
- `components/EntrySections/{CoachingPoints,CommonMistakes,Variations}.tsx` — each renders
  `null` when its data is absent (Decorator); rendered as native disclosures
  (`aria-expanded`/`aria-controls`, keyboard Enter/Space), default expanded for crawlability.
- `components/{EntryCard,Breadcrumbs,TagPill,SimilarEntries,FilterPanel,FilterChips,SearchBar,
  Skeletons}.tsx`.
- `api/client.ts` (entries/detail) and `api/search.ts` (search) — both map the backend's
  snake_case wire format to camelCase; types live in `types.ts` (consolidated post-merge —
  `api/search.ts` no longer duplicates entry shapes).
- `seo/Seo.tsx` — react-helmet-async wrapper (`HelmetProvider` lives in `Layout.tsx`);
  `howToJsonLd()` builds schema.org `HowTo` for drill entries from the same parsed
  instruction steps the page renders; returns `null` for non-drills or step-less entries.
- `types.ts` — domain types, `SECTIONS` table (URL segment ↔ API type ↔ label), `entryUrl()`.

## Search & filtering
- URL search params are the single source of truth (`?q=&{category}=...&sort=&page=`) — every
  filtered view is shareable, back/forward-safe, and TagPill links (`/search?{category}=
  {value}`) land pre-filtered.
- Empty state is measured, not generic: `buildEmptyState()` re-queries with each active filter
  removed to find the one whose removal frees the most results, surfaces it as the "most
  restrictive filter" with one-tap removal, and reuses that relaxed query's top 3 as close
  matches (falls further back to query-only, then newest, so it's never a dead end).

## Build-time
- `frontend/scripts/generate-sitemap.mjs` (npm `postbuild` + `npm run sitemap`) — calls
  `GET /api/entries?type=...` per section; fails soft (static URLs only + a warning) if the
  API is unreachable, since a missing backend must never break a build. `SITE_URL` env var
  sets the `<loc>` origin (defaults to `https://ultipedia.app` — set the real origin at deploy).

## Testing
- 85 tests across `frontend/src/encyclopedia/tests/` (section/entry-detail/entry-sections/
  trace/Search/seo/contrast) + `backend/tests/{services,api}/test_encyclopedia.py` (50 tests,
  draft-exclusion covered on every read path). `contrast.test.ts` checks WCAG AA math directly
  (jsdom can't paint); an axe-core pass runs against mocked-data renders of Home/Section/
  EntryDetail/Search.

## Known gaps (flagged for a future initiative, not bugs)
- No content-seeding path: `entries` is live but empty; nothing promotes a curated intake
  `submissions` row into a published `entries` row yet.
- No `/api/tags` endpoint — filter vocabulary is a curated constant in `FilterPanel.tsx`.
- `variations` stores raw entry ids with no id→title resolution; UI renders ids as-is.
- `/api/entries` caps browse results at 100 rows per type.
