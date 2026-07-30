
---
summary: "Encyclopedia + Search/Filtering/Discovery added to the existing single Vite React SPA (new frontend/src/encyclopedia/ section, react-router-dom introduced, encyclopedia owns '/' while intake moves to /contribute) and the existing FastAPI backend (new read-only entries/tags/media schema + EncyclopediaService facade + /api/entries, /api/entries/{type}/{slug}, /api/search endpoints), preserving the established 'browser only calls the API, never Supabase directly' convention. SEO is client-rendered-only for MVP (react-helmet-async + build-time sitemap), an explicit accepted trade-off flagged for Post-MVP prerendering if needed. Implementation is required to apply the design patterns from encyclopedia-draft.md §16 that fall in this initiative's scope (Factory Method, Flyweight, Adapter, Template Method, Decorator, Strategy, Chain of Responsibility, Facade, Iterator) — see 'Design Patterns (Required)'."
phase: "tech"
when_to_load:
  - "When implementing or reviewing architecture, interfaces, data models, conventions, and sequencing."
  - "When checking whether changes still conform to the agreed technical approach."
depends_on:
  - "prd.md"
  - "ux.md"
modules:
  - "backend/app/api"
  - "backend/app/services"
  - "backend/app/db/migrations"
  - "frontend/src/encyclopedia"
  - "frontend/src/intake (route relocation only)"
index:
  overview: "## Overview & Context"
  stack: "## Tech Stack & Dependencies"
  structure: "## Project / Module Structure"
  adrs: "## Architecture Decisions (ADRs)"
  data_models: "## Data Models"
  interfaces: "## API & Interface Design"
  conventions: "## Implementation Patterns & Conventions"
  design_patterns: "### Design Patterns (Required)"
  security_performance: "## Security & Performance"
  implementation_sequence: "## Implementation Sequence"
next_section: "n/a — finalized"
---

# Tech Design: Encyclopedia (Encyclopedia + Search, Filtering & Discovery)

## Progress

- [x] Overview & Context
- [x] Tech Stack & Dependencies
- [x] Project / Module Structure
- [x] Architecture Decisions (ADRs)
- [x] Data Models
- [x] API & Interface Design
- [x] Implementation Patterns & Conventions
- [x] Security & Performance
- [x] Implementation Sequence

---

## Overview & Context

**Summary:** This initiative adds a public, read-only encyclopedia (browse + entry pages + search/filter) to the existing `ulti-pedia` monorepo. It extends the existing FastAPI backend with a new read-only service layer and Supabase schema for `entries`/`tags`/`entry_tags`/`media`, and extends the existing Vite React SPA with a new `frontend/src/encyclopedia/` section using client-side routing (`react-router-dom`, newly introduced). The encyclopedia becomes the site's home (`/`); the existing intake form relocates to `/contribute` with no functional changes. Search/filter uses Postgres full-text search behind an `EncyclopediaService` facade, consistent with the source design doc's "search index as a query, not a service" guidance.

### Cross-Cutting Concerns

1. **Browser never talks to Supabase directly** — the existing system's core convention (`tech-overview.md`: "the browser only ever calls the API, never Supabase directly") extends to encyclopedia reads. All entry/tag/media/search access goes through new FastAPI endpoints, even though this data is public and read-only.
2. **`status = 'published'` gating is enforced at the query layer, not the API layer** — every service method that returns entries filters by `status = 'published'` inside the SQL/query builder itself, so no new endpoint can accidentally leak a draft entry by omission.
3. **Routing coexistence** — introducing `react-router-dom` is a new pattern for this frontend (the intake app currently has no client-side router; it's a single-page state machine). This affects `main.tsx` and requires the intake app to be mounted under `/contribute/*` without breaking its existing internal state/section flow.
4. **SEO is a known, explicit trade-off** — this frontend remains a client-rendered SPA for MVP (see ADR-3). This is a conscious scope decision, not an oversight.

### Brownfield Notes

- **Existing system this touches:** `frontend/` (adds a sibling section + introduces routing + changes `main.tsx` mount point), `backend/app/api` and `backend/app/services` (adds new modules, does not modify existing submission/interview code), `backend/app/db/migrations` (adds migration `006`, does not alter `001`–`005`).
- **Must NOT change:** the submission envelope schema, existing `/api/submissions`, `/api/events`, `/api/interview/*` endpoints, or the "backend is sole Supabase writer" convention for those write paths. The intake form's internal behavior must be unaffected by its route relocation.
- **Existing patterns this design follows:** thin API handlers delegating to `services/`, environment-based `Settings` in `backend/app/config.py`, Supabase-only-from-backend, snake_case Python / PascalCase React / kebab-case TS file naming, pytest + Vitest/RTL testing split.

---

## Tech Stack & Dependencies

| Category | Selection | Rationale |
|----------|-----------|-----------|
| **Language/Runtime** | Python 3.11+ (existing), TypeScript (existing) | Matches established backend/frontend runtimes — no new runtime introduced. |
| **Framework** | FastAPI (existing, extended) + React 18 + Vite (existing, extended) | Reuses the established stack per the brownfield-first rule, rather than introducing Next.js (see ADR-1). |
| **Database** | Supabase Postgres (existing instance, new tables) | Same Supabase project as the intake app; new tables are additive, no shared-table coupling. |
| **ORM / Query** | Raw SQL via existing Supabase client wrapper (matches `storage.py`/`persistence.py` pattern) | Consistent with existing backend; no ORM currently in use, no reason to introduce one for read-only queries. |
| **Routing (new)** | `react-router-dom` v6 | Needed for real, shareable, SEO-relevant URLs (`/drills/[slug]`, etc.) — the intake app never needed this since it's a single linear flow. |
| **Head/meta management (new)** | `react-helmet-async` | Lightweight, well-established way to set per-page `<title>`/`<meta>`/JSON-LD in a client-rendered React app without introducing SSR. |
| **Auth** | None (existing: none yet) | No auth surface in this initiative; public read-only site. |
| **Testing** | pytest (backend, existing), Vitest + RTL (frontend, existing) | Same split as intake; no new test framework. |
| **Key Libraries** | Tailwind CSS (existing) | Mockups are built in Tailwind; reused directly rather than introducing shadcn/ui or a component library not already present in this repo. |

**New dependencies introduced:**
- `react-router-dom` (^6.x) — client-side routing for section/entry/search URLs; industry-standard, minimal API surface for this use case.
- `react-helmet-async` (^2.x) — per-page document head management; chosen over `react-helmet` (unmaintained) and over introducing a meta-framework purely for this.

**Dependencies explicitly rejected:**
- **Next.js** — would give SSR/SSG "for free" but contradicts the in-progress `frontend/src/intake/` restructure (implying one app, many sections) and introduces a second frontend stack/deploy target in the repo. See ADR-1.
- **shadcn/ui** — the source design doc recommended it, but the mockups are already hand-built in Tailwind directly; adding a component library mid-initiative is unnecessary churn against working mockups.
- **Meilisearch / Algolia** — explicitly deferred per PRD NFRs; Postgres FTS is sufficient at current scale (low hundreds of entries).
- **SQLAlchemy / an ORM** — the existing backend has no ORM; introducing one for a handful of read-only queries would be inconsistent with the established pattern and add a dependency for no functional gain.

---

## Project / Module Structure

```
ulti-pedia/
├── backend/app/
│   ├── api/
│   │   └── encyclopedia.py          # NEW — GET /api/entries, /api/entries/{type}/{slug}, /api/search
│   ├── services/
│   │   └── encyclopedia.py          # NEW — EncyclopediaService: search_entries(), get_entry(), get_similar()
│   └── db/migrations/
│       └── 006_encyclopedia.sql     # NEW — entries, tags, entry_tags, media tables + indexes
├── frontend/src/
│   ├── main.tsx                     # [MODIFIED] mounts <RouterRoot> instead of <App> directly
│   ├── router.tsx                   # NEW — top-level react-router-dom route tree
│   ├── intake/
│   │   └── App.tsx                  # [UNCHANGED internally] now mounted at /contribute/*
│   └── encyclopedia/
│       ├── App.tsx                  # NEW — encyclopedia route shell (header/nav/search bar)
│       ├── api/
│       │   └── client.ts            # NEW — typed fetch wrappers for /api/entries, /api/search
│       ├── pages/
│       │   ├── Home.tsx             # NEW — landing page (hero + popular resources)
│       │   ├── Section.tsx          # NEW — one component for all 5 section browse pages (type from route param)
│       │   ├── EntryDetail.tsx      # NEW — one shared template for all 5 entry types
│       │   └── Search.tsx           # NEW — search + filter results page
│       ├── components/
│       │   ├── EntryCard.tsx        # NEW — section/search grid card
│       │   ├── FilterPanel.tsx      # NEW — sidebar (desktop) / drawer (mobile)
│       │   ├── FilterChips.tsx      # NEW — active-filter chip row
│       │   ├── TagPill.tsx          # NEW — clickable tag, routes to pre-filtered search
│       │   ├── Breadcrumbs.tsx      # NEW
│       │   ├── SimilarEntries.tsx   # NEW — shared-tag-overlap row
│       │   └── EntrySections/       # NEW — CoachingPoints.tsx, CommonMistakes.tsx, Variations.tsx (each renders nothing if data absent)
│       ├── types.ts                 # NEW — Entry, Tag, EntryType TS types mirroring backend schema
│       └── seo/
│           └── Seo.tsx              # NEW — react-helmet-async wrapper component
└── frontend/scripts/
    └── generate-sitemap.mjs         # NEW — build-time script hitting /api/entries to emit sitemap.xml
```

**Key structural decisions:**
- Business logic (query building, filter/sort semantics, similarity scoring) lives entirely in `backend/app/services/encyclopedia.py` — `api/encyclopedia.py` handlers stay thin, matching the existing submissions/interview pattern.
- One `Section.tsx` and one `EntryDetail.tsx` component serve all five entry types (Template Method pattern per the source design doc), parameterized by a `type` route param and the `attributes` JSONB payload — not five near-duplicate page components.
- `EntrySections/` components are individually optional and self-omitting (render `null` when their data is absent) rather than the page template branching on presence/absence — keeps `EntryDetail.tsx` simple (Decorator-style composition, per the source design doc's pattern notes).
- `frontend/src/intake/App.tsx`'s internals are untouched; only its mount point moves from root to `/contribute/*` via `router.tsx`.

---

## Architecture Decisions (ADRs)

### ADR-1: Encyclopedia frontend extends the existing Vite SPA rather than introducing Next.js

**Decision:** Build the encyclopedia as `frontend/src/encyclopedia/`, a new section within the existing single Vite + React SPA, using `react-router-dom` for client-side routing. Do not introduce a separate Next.js app.

**Rationale:** The repo already has an in-progress restructure (`frontend/src/App.tsx` → `frontend/src/intake/App.tsx`) that signals an intended "one app, many sections" architecture. Introducing Next.js would mean a second frontend stack, a second deploy target, and abandoning that in-progress plan for one feature. Builder confirmed this trade-off explicitly, accepting weaker out-of-the-box SEO (see ADR-3) in exchange for one unified app and deploy pipeline.

**Affects:** `frontend/src/encyclopedia/*`, `frontend/src/main.tsx`, `frontend/vite.config.ts` (no server-rendering config needed), deployment (single static host/build for the whole frontend, per existing `frontend/dist` convention).

---

### ADR-2: Encyclopedia owns the site root; intake form relocates to `/contribute`

**Decision:** `react-router-dom`'s root path (`/`) renders the encyclopedia landing page. The existing intake form mounts at `/contribute/*` with all of its existing internal routing/state-machine behavior unchanged.

**Rationale:** The design mockups (`landing-and-encyclopedia-mockup.html`) treat the encyclopedia as the site's front door, and the PRD frames the encyclopedia as the first of the app's "core features." The intake form remains fully functional as a secondary, discoverable path rather than the primary landing experience. Builder confirmed this explicitly.

**Affects:** `frontend/src/router.tsx`, `frontend/src/main.tsx`, any hardcoded root-relative links inside `frontend/src/intake/` that assumed `/` as their base (must be audited during implementation — flagged as an implementation-sequence risk below).

---

### ADR-3: MVP ships client-rendered; SEO relies on `react-helmet-async` + a build-time sitemap, not SSR/SSG

**Decision:** Given ADR-1, entry and section pages are rendered client-side. SEO requirements (PRD FR-5.x) are met via: per-page `<title>`/`<meta>`/JSON-LD injected client-side through `react-helmet-async`, and a build-time Node script (`frontend/scripts/generate-sitemap.mjs`) that calls `/api/entries` and writes `sitemap.xml` into the built `frontend/dist` output before deploy.

**Rationale:** Modern search crawlers (notably Googlebot) execute JavaScript and can index client-rendered content and client-injected meta tags in most cases, so this is a reasonable MVP posture — but it is weaker than true SSR/SSG (slower time-to-indexable-content, and non-Google crawlers or social-share unfurlers that don't execute JS will not see per-page meta tags or JSON-LD). This is an explicit, accepted trade-off of ADR-1, not an oversight.

**Consequences / future cost:** If organic search performance underperforms post-launch, the mitigation path is a build-time prerendering step (e.g., a Playwright-based static-render pass over each published entry URL, or a partial migration of just the encyclopedia section to a meta-framework) — not a full Next.js rewrite. Flagged as a Post-MVP open question, not solved now.

**Affects:** `frontend/src/encyclopedia/seo/Seo.tsx`, `frontend/scripts/generate-sitemap.mjs`, deployment pipeline (sitemap generation must run as a build step).

---

### ADR-4: Encyclopedia data access goes through new FastAPI endpoints, never directly from the browser to Supabase

**Decision:** All encyclopedia reads (browse, entry detail, search, similar-entries) go through new `backend/app/api/encyclopedia.py` endpoints backed by `backend/app/services/encyclopedia.py`. The frontend never instantiates a Supabase client or holds a Supabase key.

**Rationale:** Even though this data is public and read-only, `tech-overview.md` establishes "the browser only ever calls the API, never Supabase directly" as a load-bearing convention for this codebase. Introducing a second, browser-direct data-access pattern (e.g., anon-key + RLS reads) would fracture that convention for no material benefit, since a thin FastAPI passthrough costs little and keeps one consistent data-access story across the whole app.

**Affects:** `backend/app/api/encyclopedia.py`, `backend/app/services/encyclopedia.py`, `frontend/src/encyclopedia/api/client.ts`.

---

### ADR-5: Single `entries` table with `type` discriminator + JSONB `attributes`, exactly as specified in the source design doc

**Decision:** Adopt the design doc's data model verbatim: one `entries` table (`id`, `slug`, `type`, `title`, `short_description`, `body`, `status`, `created_at`, `updated_at`, `attributes JSONB`), a `tags` table, an `entry_tags` many-to-many join, and a `media` table.

**Rationale:** This was already a carefully reasoned decision in `encyclopedia-draft.md` §3/§4/§16 (polymorphic/single-table-inheritance pattern, avoids join-heavy per-type tables, keeps one search/filter query path). No new information from PRD/UX contradicts it; re-litigating it here would be wasted motion. "Plays" is confirmed as a full separate `type` value per the PRD's resolved open question.

**Affects:** `backend/app/db/migrations/006_encyclopedia.sql`, `backend/app/services/encyclopedia.py`, `frontend/src/encyclopedia/types.ts`.

---

### ADR-6: `EncyclopediaService` facade isolates the Postgres FTS → future search-service swap

**Decision:** All entry/search/filter/similarity access goes through one `EncyclopediaService` class (`search_entries()`, `get_entry()`, `get_similar()`) inside `backend/app/services/encyclopedia.py`. API handlers and any future consumer call only this facade, never raw SQL directly.

**Rationale:** Directly implements the source design doc's own recommendation (§16, Facade pattern) so that a future Postgres FTS → Meilisearch/Algolia swap touches one file, not every call site. Matches the existing codebase's convention of thin handlers + logic-bearing services (`services/storage.py`, `services/validation.py`, etc.).

**Affects:** `backend/app/services/encyclopedia.py`, `backend/app/api/encyclopedia.py`.

---

## Data Models

### New Models

```sql
-- 006_encyclopedia.sql

CREATE TYPE entry_type AS ENUM ('drill', 'strategy', 'formation', 'play', 'skill');
CREATE TYPE entry_status AS ENUM ('draft', 'published');

CREATE TABLE entries (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug               text NOT NULL UNIQUE,
    type               entry_type NOT NULL,
    title              text NOT NULL,
    short_description  text NOT NULL,
    skill_level        text,                    -- 'beginner' | 'intermediate' | 'advanced'
    body               text NOT NULL,           -- markdown/rich text instructions
    coaching_points    jsonb DEFAULT '[]',       -- list[str]
    common_mistakes    jsonb DEFAULT '[]',       -- list[str]
    variations         jsonb DEFAULT '[]',       -- list[uuid] self-referencing entry ids
    related_entry_ids  jsonb DEFAULT '[]',       -- list[uuid], manual curation
    attributes         jsonb DEFAULT '{}',       -- type-specific fields (see below)
    status             entry_status NOT NULL DEFAULT 'draft',
    search_vector      tsvector GENERATED ALWAYS AS (
                           to_tsvector('english', title || ' ' || short_description || ' ' || body)
                       ) STORED,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_entries_search_vector ON entries USING GIN (search_vector);
CREATE INDEX idx_entries_status ON entries (status);
CREATE INDEX idx_entries_type ON entries (type);

CREATE TABLE tags (
    id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name     text NOT NULL,
    category text NOT NULL,   -- 'skill_level' | 'team_size' | 'duration' | 'difficulty' | 'focus' | 'drill_type' | 'equipment'
    UNIQUE (name, category)
);

CREATE TABLE entry_tags (
    entry_id uuid NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    tag_id   uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (entry_id, tag_id)
);

CREATE INDEX idx_entry_tags_tag_id ON entry_tags (tag_id);

CREATE TABLE media (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id    uuid NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    url         text NOT NULL,
    type        text NOT NULL,   -- 'image' | 'youtube' | 'vimeo'
    caption     text,
    sort_order  int NOT NULL DEFAULT 0
);

CREATE INDEX idx_media_entry_id ON media (entry_id);
```

**Key field decisions:**
- `attributes jsonb` — Drill: `{player_count_min, player_count_max}`; Strategy/Formation: `{offense_or_defense, diagram_ref}`; Play: `{parent_entry_id}`; Skill: `{difficulty_progression, prerequisite_skill_ids}`. Untyped at the DB layer by design (ADR-5); validated at the API/service boundary via Pydantic models per type.
- `search_vector` as a generated/stored column — keeps FTS indexing automatic on insert/update, avoids an application-level sync step.
- `variations` / `related_entry_ids` as `jsonb` arrays of UUIDs rather than a join table — matches the source doc's "manual curation to start" framing; can migrate to a join table later without touching calling code if it outgrows manual curation.

### Modified Models

None. This migration is purely additive — no existing table (`submissions`, `form_events`, `entities`, `entity_coverage`, `kb_chunks`, `interview_sessions`) is touched.

### Schema / Migration Notes

- Migration file: `006_encyclopedia.sql`, run via the existing `backend/app/db/migrations/migrate.py` runner — no change to that runner needed.
- No rollback complexity: net-new tables/types, so rollback is `DROP TABLE`/`DROP TYPE` if ever needed pre-launch.
- Seeding (populating actual entry content from the 95+ curated sources) is explicitly out of scope for this initiative per the PRD — this migration defines the schema only.

---

## API & Interface Design

### New Endpoints

```
GET /api/entries?type={drill|strategy|formation|play|skill}
Request:  query params: type (required), plus optional filter params (see below)
Response: 200 [{ id, slug, type, title, short_description, skill_level, attributes, tags: [{name, category}] }, ...]
Errors:   400 if `type` is missing/invalid

GET /api/entries/{type}/{slug}
Request:  path params: type, slug
Response: 200 { ...full entry fields..., media: [...], similar: [{id, slug, title, short_description}] }
Errors:   404 if not found or not published

GET /api/search
Request:  query params:
  - q: string (optional full-text query)
  - skill_level, team_size, duration, difficulty, focus, drill_type, equipment: repeatable params (OR within each)
  - sort: "relevance" | "difficulty_asc" | "difficulty_desc" | "newest" (default "relevance" if q present, else "newest")
  - page, page_size: pagination (Iterator pattern per source design doc; page_size default 24)
Response: 200 { results: [...entry summaries...], total: int, page: int, page_size: int }
Errors:   400 on invalid filter/sort values
```

### Interface Contracts

```python
# backend/app/services/encyclopedia.py

class EncyclopediaService:
    def search_entries(
        self,
        query: str | None = None,
        filters: EntryFilters | None = None,
        sort: SortOption = SortOption.RELEVANCE,
        page: int = 1,
        page_size: int = 24,
    ) -> SearchResult:
        """Single entry point for browse + search + filter. Always scopes to status='published'."""
        ...

    def get_entry(self, entry_type: EntryType, slug: str) -> EntryDetail | None:
        """Returns None (→ 404) if missing or not published."""
        ...

    def get_similar(self, entry_id: UUID, limit: int = 3) -> list[EntrySummary]:
        """Shared-tag overlap scoring (TagOverlapStrategy) — swappable later per source doc's Strategy pattern note."""
        ...
```

```typescript
// frontend/src/encyclopedia/types.ts

export type EntryType = "drill" | "strategy" | "formation" | "play" | "skill";

export interface EntrySummary {
  id: string;
  slug: string;
  type: EntryType;
  title: string;
  shortDescription: string;
  skillLevel: string | null;
  tags: { name: string; category: string }[];
}

export interface EntryDetail extends EntrySummary {
  body: string;
  coachingPoints: string[];
  commonMistakes: string[];
  variations: string[];       // entry ids
  attributes: Record<string, unknown>;
  media: { url: string; type: "image" | "youtube" | "vimeo"; caption: string | null }[];
  similar: EntrySummary[];
}
```

### Backward Compatibility

No existing consumer is affected — this is a wholly new, additive API surface. `/api/submissions`, `/api/events`, and `/api/interview/*` are untouched.

---

## Implementation Patterns & Conventions

### Naming Conventions

| Construct | Convention | Example |
|-----------|-----------|---------|
| Python functions | snake_case | `search_entries()` |
| Python classes | PascalCase | `EncyclopediaService` |
| React components | PascalCase | `EntryDetail`, `FilterPanel` |
| TS/TSX files | kebab-case for non-component files, PascalCase for components (matches existing `frontend/src/intake` convention) | `api/client.ts`, `EntryCard.tsx` |
| SQL tables/columns | snake_case | `entry_tags`, `short_description` |

### Error Handling Pattern

```python
# backend/app/api/encyclopedia.py — mirrors existing submissions.py pattern
@router.get("/api/entries/{entry_type}/{slug}")
def get_entry(entry_type: EntryType, slug: str, service: EncyclopediaService = Depends(get_encyclopedia_service)):
    entry = service.get_entry(entry_type, slug)
    if entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry
```

**Rules:**
- Handlers stay thin: validate path/query params via FastAPI's typed params, delegate to `EncyclopediaService`, translate `None`/service exceptions into HTTP status codes.
- No draft entry is ever returned by any code path — `EncyclopediaService` methods filter `status = 'published'` internally; handlers never need to remember to check this themselves.
- Frontend: failed fetches surface an inline error + retry action in the affected UI region (per UX §UI States), never a silent failure or blank screen.

### Testing Pattern

```python
# backend/tests/services/test_encyclopedia.py
def test_search_entries_excludes_drafts(db_session):
    ...  # seed one draft, one published entry with the same tag; assert only published returned

def test_get_similar_scores_by_tag_overlap(db_session):
    ...  # seed entries with varying tag overlap; assert descending order
```

**Coverage expectations:** 70%+ on `EncyclopediaService` logic (filter/sort/similarity), 100% on the `status = 'published'` gating path specifically — this is the one bug class (draft leakage) that must never regress silently.
**Mocking strategy:** Mock at the Supabase client boundary in backend tests (matches existing `storage.py` test pattern); mock `encyclopedia/api/client.ts` fetches in frontend component tests (matches existing `intake/tests` pattern).

### Design Patterns (Required)

Builder has explicitly requested that implementation lean on the design patterns identified in `encyclopedia-draft.md` §16 wherever they apply to this initiative's scope — not as optional inspiration, but as the intended shape of the code. Approach and Tasks should treat each row below as a concrete deliverable, not a stylistic suggestion. Patterns from §16 that belong to out-of-scope features (Practice Planner, Drill Visualizer, Community Submissions) are excluded here; they remain that future initiative's concern.

| Area | Pattern(s) | Concrete application in this codebase |
|------|-----------|----------------------------------------|
| **Entry hydration** | Factory Method | `EncyclopediaService` (or a dedicated `entry_factory.py`) has one `entry_from_row(row) -> Entry` function that turns a raw `entries` row + `attributes` JSONB into a typed object. No other layer branches on `type` to interpret a row. |
| **Tagging & taxonomy** | Flyweight | Tag lookups (`tags` table, ~20–30 fixed values) are interned/cached by `(name, category)` in `EncyclopediaService` rather than re-fetched or re-instantiated per entry — matters once `get_similar()` is comparing tag sets across the whole result set. |
| **Media embedding** | Adapter, Proxy (virtual) | A `MediaEmbed` interface with `YouTubeAdapter`/`VimeoAdapter`/image-variant implementations normalizes "give me an embeddable element" in `frontend/src/encyclopedia/components/` so `EntryDetail.tsx` never branches on provider. Video iframes are not constructed until scrolled into view (lazy-load), per the source doc's Proxy note. |
| **Entry page rendering** | Template Method, Decorator | `EntryDetail.tsx` is the one template (header/badges → media → body → sections → similar) with type-specific pockets, per the Project/Module Structure section above. `EntrySections/CoachingPoints.tsx`/`CommonMistakes.tsx`/`Variations.tsx` are decorators — each renders `null` and contributes nothing when its data is absent, rather than the template branching on presence/absence itself. |
| **Search & filtering** | Strategy, Chain of Responsibility, Facade, Iterator | Sort options (`SortOption.RELEVANCE`/`DIFFICULTY`/`NEWEST`) are interchangeable `SortStrategy` implementations. The filter pipeline (skill level → team size → focus category → …) is a sequence of independent narrowing handlers, not one large predicate. `EncyclopediaService` is the Facade wrapping all `entries`/`tags`/`entry_tags`/`media` access (already required by ADR-6). Paginated `SearchResult` responses are iterated page-by-page rather than materializing the full result set. |
| **Similar-entries recommendation** | Strategy | `get_similar()` calls a `SimilarityStrategy` interface; `TagOverlapStrategy` is the only implementation shipped in this initiative, but the seam exists now specifically so a future `EmbeddingStrategy` swaps in without touching any caller (matches ADR-6's swap-isolation goal). |

**Explicitly not adopted in this initiative** (per the source doc's own "Not worth a pattern" guidance, reaffirmed here): Interpreter (no query language yet — `focus:zone AND difficulty:<3` syntax isn't in scope), Bridge (no second rendering target beyond web), Abstract Factory for entry-type UI families (only worth it once card/detail-page/submission-form visibly drift out of sync in practice — submission forms don't exist yet in this initiative's scope).

---

## Security & Performance

### Security

| Concern | Mitigation |
|---------|-----------|
| Draft entry leakage | `status = 'published'` filter enforced inside `EncyclopediaService` query methods, not at the API/UI layer, so every access path (browse, search, direct slug lookup, similar-entries) is covered by one guarantee. |
| Input validation | FastAPI typed path/query params + Pydantic models for `EntryFilters`/`SortOption`; invalid `type`/`sort`/filter values return 400. |
| SQL injection | Parameterized queries throughout `encyclopedia.py` service (matches existing `storage.py` convention) — no string-concatenated SQL. |
| Secrets | No new secrets introduced; reuses existing Supabase server-side credentials in `backend/app/config.py`. |

### Performance

| Concern | Target | Approach |
|---------|--------|---------|
| Search/filter latency | p99 < 300ms at low-hundreds entry scale | GIN index on `search_vector`, btree index on `entry_tags.tag_id` and `entries.status`/`entries.type`. |
| Page load (client-rendered) | Perceived interactive < 2s on typical mobile connection | Vite code-splitting per route (`EntryDetail`, `Search` lazy-loaded); `EntrySections/*` components render nothing (no wasted DOM) when data is absent. |
| Pagination | Results capped at `page_size` (default 24) | `SearchResult` always paginated server-side (Iterator pattern per source doc) — no unbounded result sets returned to the client. |

### Observability

- **Logs:** `EncyclopediaService` logs query parameters + result count at `info` level for search/filter calls (useful for later "what are coaches actually searching for" analysis); logs a `warning` if a slug lookup 404s, to catch broken internal links.
- **Metrics:** None new for this initiative — existing analytics loader (Plausible/Umami) can be pointed at the encyclopedia's page views in a later initiative; not required for MVP.
- **Traces:** Not applicable at this scale — no distributed tracing exists in the current backend.

---

## Implementation Sequence

1. **Foundation** *(blocking)* — `006_encyclopedia.sql` migration (entries/tags/entry_tags/media, indexes), `EncyclopediaService` with `search_entries()`/`get_entry()`/`get_similar()`, and the three new API endpoints. Nothing else can be built without this.
2. **Routing scaffold** *(depends on nothing structurally, but should land alongside Foundation)* — introduce `react-router-dom`, `frontend/src/router.tsx`, relocate intake mount to `/contribute/*`, audit `frontend/src/intake/*` for any hardcoded root-relative (`/`) links or assumptions that break once it's no longer mounted at the root.
3. **Core browse & entry pages** *(depends on 1, 2)* — `Section.tsx`, `EntryDetail.tsx`, `EntrySections/*`, `EntryCard.tsx`, `Breadcrumbs.tsx`, `SimilarEntries.tsx`, `TagPill.tsx`.
4. **Search & filtering** *(depends on 1, 2)* — `Search.tsx`, `FilterPanel.tsx`, `FilterChips.tsx`; can be built in parallel with step 3 once Foundation and routing exist.
5. **SEO layer** *(depends on 3)* — `Seo.tsx` (react-helmet-async), JSON-LD `HowTo` emission on drill entries, `generate-sitemap.mjs` build script.
6. **Testing** *(parallel with 3–5)* — backend `EncyclopediaService` unit tests (especially the draft-gating and similarity-scoring paths), frontend component tests for `EntryDetail`/`Search`/`FilterPanel` mirroring the existing `intake/tests` structure.
7. **Polish** *(depends on 3–5)* — empty/loading/error states per UX spec, responsive filter drawer behavior, accessibility pass (keyboard nav, `aria-expanded` on collapsible sections, contrast check on badge palette).

**Parallel work opportunities:** Steps 3 and 4 can proceed in parallel once step 1 (Foundation) and step 2 (routing scaffold) land. Backend and frontend work within each step can also proceed in parallel once the API contract (this document's "API & Interface Design" section) is fixed.

**Known implementation risks:**
- **Intake route-relocation regressions** — moving the intake app from `/` to `/contribute/*` could break internal links, analytics event paths, or assumptions baked into `frontend/src/intake/state/draft.ts` (e.g. localStorage keys keyed to path, or absolute-path navigation). Flag as a spike/audit task before this ships, not something to discover mid-implementation.
- **`react-helmet-async` + client-rendering SEO ceiling** — accepted per ADR-3; re-verify post-launch via Google Search Console indexing status rather than assuming success.
- **JSONB `attributes` validation drift** — since `attributes` is untyped at the DB layer, per-type Pydantic validation at the service boundary must be kept in sync manually as fields evolve; worth a single shared `EntryAttributes` discriminated union in the service layer rather than ad hoc dict access, to catch drift at review time rather than in production.
