# Tech Overview

> Canon document. Updated by the Synthesis agent at the close of each initiative.

## What This Is

One React SPA (react-router) talking to one FastAPI backend and one Supabase Postgres
database, serving three products: **intake** (`/contribute/*` — form + AI interview,
validated server-side, written as one versioned envelope row), the **encyclopedia**
(`/`, `/:section`, `/:section/:slug`, `/search` — a read-only, published-only view over a
separate polymorphic `entries` schema), and **Field View** (`/fieldview`, `/fieldview/designer`
— a client-only play-design toolset). The first two share infrastructure but not data model:
intake writes `submissions`; the encyclopedia reads `entries`/`tags`/`entry_tags`/`media`.
No code path yet connects the two (see product-overview "Content pipeline" open question).
Field View touches no backend at all — it is pure client-side state plus localStorage.

---

## Tech Stack

| Category | Selection | Notes |
|----------|-----------|-------|
| **Language/Runtime** | Python 3.11+ (uv) | Backend; `requires-python >=3.11` |
| **Framework** | FastAPI | App factory `create_app()`; thin handlers, logic in services |
| **Database** | Supabase (Postgres) | Migrations in `backend/app/db/migrations/` (001–005) + `schema.sql`; pgvector for v2 |
| **Auth** | None yet | Open form (honeypot + rate limit); per-contact token is an open question |
| **Frontend** | React 18 + Vite + TypeScript + Tailwind + Framer Motion + react-router-dom v6 | Entry `frontend/src/main.tsx` → `router.tsx`; dev proxies `/api`→:8000 |
| **SEO (client-rendered)** | react-helmet-async v3 + build-time `frontend/scripts/generate-sitemap.mjs` | Per-page title/meta + `HowTo` JSON-LD on drills; ADR-3 accepts weaker-than-SSR crawlability as a known MVP trade-off |
| **Testing** | pytest (backend), Vitest + RTL + axe-core (frontend) | 92 backend + 336 frontend tests. Timing assertions are quarantined in `npm run test:perf` (`--no-file-parallelism`) — under a parallel suite the same code measures 2–3× slower. |
| **LLM** | Claude (Anthropic), default `claude-sonnet-4-6` | Behind an `LLM` interface; FakeLLM offline default |
| **Embeddings** | Deterministic `HashingEmbedder` (offline) | Real provider is a lazy swap (open question) |
| **Analytics** | Plausible/Umami loader + custom funnel events | No-op unless `VITE_PLAUSIBLE_DOMAIN` set |
| **Deployment** | Vercel (frontend only, as of 2026-07-27) | GitHub integration auto-deploys `main`; root directory `frontend/`, `frontend/vercel.json` pins the Vite preset and the SPA rewrite. **The backend is not deployed** — only `/fieldview` works on the live site; encyclopedia and intake routes show empty/error states because `/api/*` 404s. Backend = any Python host, still to be chosen. |

**External dependencies:** Supabase (DB/Storage), Anthropic (interview questions when
`ANTHROPIC_API_KEY` set). Both degrade gracefully to offline/in-memory defaults.

---

## Project Structure

```
ulti-pedia/
├── backend/app/
│   ├── main.py                 # FastAPI app factory; wires stores, engine, routers
│   ├── config.py               # env-based Settings (Supabase keys server-side only)
│   ├── schemas/envelope.py     # THE contract: Submission envelope (form+interview+seed)
│   ├── api/                    # submissions, events, interview routers
│   ├── services/              # validation, storage, entities, coverage, embeddings,
│   │                          #   kb, seed_loader, llm, interview_engine, sessions,
│   │                          #   persistence
│   ├── api/encyclopedia.py      # GET /api/entries, /api/entries/{type}/{slug}, /api/search
│   ├── services/encyclopedia.py # EncyclopediaService facade — see Key Architecture Decisions
│   ├── schemas/encyclopedia.py  # EntrySummary/EntryDetail/SearchResult read models (snake_case wire)
│   └── db/migrations/         # 001–006 SQL + schema.sql (⚠ stale vs. 006, not regenerated) + migrate.py
├── frontend/src/
│   ├── intake/                 # form + interview flow (former root app; now under /contribute)
│   ├── encyclopedia/           # public browse + search (owns "/")
│   │   ├── components/         # Layout (shared header/footer/nav + SearchBar slot), EntryCard,
│   │   │                       #   Breadcrumbs, TagPill, FilterPanel, FilterChips, SearchBar,
│   │   │                       #   EntrySections/{CoachingPoints,CommonMistakes,Variations}, Skeletons
│   │   ├── pages/               # Home, Section (Template Method, param'd by SECTIONS table),
│   │   │                       #   EntryDetail, Search, NotFound
│   │   ├── seo/Seo.tsx          # react-helmet-async wrapper + HowTo JSON-LD builder
│   │   ├── api/{client,search}.ts # snake_case→camelCase wire mapping (two thin wrappers)
│   │   ├── types.ts             # domain types + SECTIONS table + entryUrl() helper
│   │   └── tests/
│   ├── fieldview/              # play-design toolset (client-only; no API calls)
│   │   ├── scene/              # shared scene model, geometry, pure ops, rAF store, presets
│   │   ├── space/              # headless strong/weak space model (framework-free)
│   │   ├── render/             # tokens.ts (ALL visuals), SVG layers, canvas heatmap, PNG export
│   │   ├── play/               # versioned PlayFile, validation, tween, PlayStore seam
│   │   ├── ui/                 # FieldCanvas stage, overlay rail, tuning, readout, timeline
│   │   └── pages/              # Whiteboard, Designer
│   └── router.tsx               # / (Layout: Home/Section/EntryDetail/Search/fieldview/404) · /contribute/*
├── seed-kb/                   # rights-clean seed corpus (entities.json, kb_chunks.json)
├── eval/                      # interview eval harness + scenarios
└── scripts/smoke_test.py      # end-to-end submit check
```

---

## Architecture

### System Design

Layered service architecture. The **backend is the single trusted boundary** — the browser
only ever calls the API, never Supabase directly. Handlers are thin; all logic lives in
`services/`, and only `storage.py`/`persistence.py`/`encyclopedia.py` touch Supabase. The v2
interview is an additive layer over the same envelope and storage: an engine makes
deterministic decisions (aspect routing, entity-confirm, deflection, guardrails) and
delegates only question *phrasing* to the LLM.

The encyclopedia is a **separate read-only vertical slice** sharing the same backend and
frontend shell: one `EncyclopediaService` facade (`search_entries`/`get_entry`/`get_similar`)
over a swappable `EncyclopediaStore` port (in-memory for tests/no-config; Supabase when
`SUPABASE_URL`/`SUPABASE_SERVICE_KEY` are set), fronted by three thin FastAPI handlers, and
consumed by a react-router layout route (`Layout` → `Home`/`Section`/`EntryDetail`/`Search`).
The frontend was extended in place rather than split into a second app or framework (see
ADR-Enc-1 below) — react-router now owns top-level routing for both verticals.

### Encyclopedia Architecture Decisions (ADRs)

- **ADR-Enc-1 — Extends the existing Vite SPA, not a new Next.js app.** The PRD's original
  vision was a standalone Next.js site; implementation pivoted to extend the existing SPA
  (single deploy target, one unified app, `react-router-dom` added). Accepted trade-off:
  weaker out-of-the-box SEO than SSR/SSG (see ADR-Enc-3), justified against maintaining two
  frontend stacks. Site root moved: encyclopedia now owns `/`, intake relocated to
  `/contribute/*` — a URL change made safely because intake had no external inbound links yet.
- **ADR-Enc-2 — `status='published'` gating lives inside `EncyclopediaService`, not the API
  layer.** `_published_rows()` is the one gate every public method reads through; stores may
  pre-filter as an optimization but are never trusted for correctness. This is the load-bearing
  invariant behind the "no draft ever reachable" success criterion — protect it in any future
  change to the service.
- **ADR-Enc-3 — Client-rendered SEO (react-helmet-async + build-time sitemap), not SSR/SSG.**
  Accepted MVP posture per ADR-Enc-1; weaker for non-JS-executing crawlers and social-card
  unfurlers. Re-verify via Search Console post-launch; the sitemap script fails soft (static
  URLs only) if the API is unreachable at build time — a missing backend must never break a build.
- **ADR-Enc-4 — Query/filter/sort execution runs in Python inside `EncyclopediaService`, not as
  Postgres FTS.** The `006` migration still ships a generated `search_vector` column + GIN index,
  so a future swap to real Postgres full-text search (or an external search service) is possible
  without touching callers — the facade is the intentional seam (matches the original ADR-6 in
  the tech-design doc). Chosen because the required design patterns (Chain of Responsibility
  filter pipeline, Strategy sort/similarity, Flyweight tag interning) and the "mock at the store
  boundary" test convention live naturally in Python at current (low-hundreds-of-entries) scale.
- **ADR-Enc-5 — Single `entries` table, `type` discriminator + JSONB `attributes`.** One query/
  search/filter path serves all five entry types (Drill/Strategy/Formation/Play/Skill); per-type
  fields are Pydantic-validated at the service boundary (`backend/app/schemas/encyclopedia.py`),
  not at the DB layer, so schema stays additive as new attribute needs appear.

### Field View Architecture Decisions (ADRs)

Field View is a third vertical in the same SPA and the only one with **no server component
at all**. Full detail in [`modules/fieldview.md`](modules/fieldview.md); the two that constrain
future work anywhere near it:

- **ADR-FV-2 — Mutable subscribe-store + rAF loop; React is never in the drag path.** Pointer
  moves mutate a plain object and schedule a frame; React does not re-render during a drag.
  A `Profiler` test records **0 React commits across 25 pointer moves**. The designer extends
  this (keyframes in a ref) and the heatmap readout extends it again (imperative DOM writes via
  `useImperativeHandle`). This is what makes a full 220×80×14 model grid repaint live under the
  pointer. Lifting drag state into React "to clean it up" would silently destroy the feature.
- **ADR-FV-7 — The play format is versioned and validated at the boundary, and `validate.ts`
  drops unknown keys rather than rejecting them.** That property — not the version number — is
  the forward-compatibility guarantee. It is why the client's requested `annotations` feature
  can be added additively later instead of forcing a `formatVersion` bump and a migration.

### Key Components

| Component | Responsibility | Key Files |
|-----------|----------------|-----------|
| Submission API | Validate + store form submissions | `backend/app/api/submissions.py`, `services/validation.py`, `services/storage.py` |
| Envelope schema | One versioned shape for all producers | `backend/app/schemas/envelope.py` |
| Interview engine | Turn loop, routing, confirm-then-resolve, deflection, guardrails | `backend/app/services/interview_engine.py` |
| Entity registry | Canonical entities + alias/semantic resolution (confirm, not commit) | `backend/app/services/entities.py` |
| Coverage model | Per-aspect fill+confidence; gap ordering | `backend/app/services/coverage.py` |
| Seed KB / RAG | Grounding corpus + vector search | `backend/app/services/kb.py`, `seed_loader.py`, `seed-kb/` |
| Persistence port | Durable entities/coverage/sessions | `backend/app/services/persistence.py` |
| Frontend flow | Form state machine + interview chat (now under `/contribute`) | `frontend/src/intake/App.tsx`, `sections/`, `interview/` |
| Encyclopedia service | Facade: search/filter/sort/similar, published-gate | `backend/app/services/encyclopedia.py` |
| Encyclopedia frontend | Layout shell + Home/Section/EntryDetail/Search pages | `frontend/src/encyclopedia/` |
| Field View scene + store | Shared scene model; mutable store with rAF coalescing | `frontend/src/fieldview/scene/` |
| Space model | Headless, framework-free strong/weak space scoring + per-cell explain | `frontend/src/fieldview/space/` |
| Field View render | Visual tokens, SVG field/piece layers, canvas heatmap painter, PNG export | `frontend/src/fieldview/render/` |
| Play format | Versioned `PlayFile`, boundary validation, tween, storage seam | `frontend/src/fieldview/play/` |

### Data Flow

```
Form:      browser → POST /api/submissions → validate → storage → Supabase (one row)
Interview: browser → /api/interview/{start,turn,resume,submit}
           → engine (registry + coverage + KB + LLM) → per-turn autosave
           → submit writes one interview envelope row + folds coverage
Encyclopedia: browser → GET /api/entries|/api/entries/{type}/{slug}|/api/search
           → EncyclopediaService (published-gate → filter chain → sort/similarity)
           → EncyclopediaStore (Supabase read, or empty in-memory if unconfigured)
```

### Key Architecture Decisions

- **Backend is the sole Supabase writer** — service key server-side only; one place to validate.
- **One versioned envelope for all producers** — form, interview, seed KB; v2 fields nullable-additive (no migration).
- **Free-text tags** — stored raw; `normalized_tags` left for a later AI pass.
- **Engine decisions deterministic, LLM only phrases** — fully testable; provider is a swap.
- **Confirm-then-resolve entities** — never silently match; "mine's different" → variant.
- **Per-aspect coverage (not boolean)** — route to gaps; compliment-pivot on saturation, never dismiss.
- **In-memory default + optional persistence port** — durable when Supabase configured, offline otherwise.

---

## Data Models

### Submission envelope (`submissions` table)

```
submission_id uuid pk · type · schema_version · submitted_at · contributor jsonb
fields jsonb · raw_freeform text · normalized_tags text[] · flagged bool
messages jsonb · audio_refs text[] · media_refs jsonb · resolved_entity_id uuid
coverage_contribution jsonb            # v2 columns nullable-additive
```

**Key rules:** always keep raw + structured; server owns id/timestamp/schema_version;
type ∈ {drill, strategy.formation, strategy.play, strategy.concept, other, interview, seed}.

Other tables: `form_events`, `entities` (+pgvector), `entity_coverage`, `kb_chunks`,
`interview_sessions`.

### Encyclopedia entries (`entries` table, migration `006`) — separate from `submissions`

```
id uuid pk · slug text unique · type entry_type enum (drill|strategy|formation|play|skill)
title · short_description · skill_level · body (markdown)
coaching_points/common_mistakes/variations/related_entry_ids jsonb (lists)
attributes jsonb            # per-type fields, Pydantic-validated at the service boundary
status entry_status enum (draft|published)   # THE gate — see ADR-Enc-2
search_vector tsvector generated column + GIN index   # unused today (ADR-Enc-4), ready for FTS
created_at/updated_at
```

Plus `tags` (name, category — unique pair), `entry_tags` (join), `media` (url/type/caption/
sort_order per entry). **Live in Supabase, migrated, currently empty** — no content-seeding
path exists yet (see product-overview "Content pipeline" open question).

---

## API & Interface Surface

```
POST /api/submissions            # 201 {submission_id}; 413/400/429/422 on reject
POST /api/events                 # 204; funnel events (form_started/field_completed/submitted)
POST /api/interview/start        # {session_id, assistant, ...}
POST /api/interview/turn         # adaptive next turn (+ per-turn autosave)
POST /api/interview/resume       # transcript so far (durable resume)
POST /api/interview/submit       # 201 {submission_id}; writes interview envelope
GET  /api/entries?type=...       # required `type`; + 7 repeatable filter params; array, capped at 100
GET  /api/entries/{type}/{slug}  # full detail + media + similar; 404 if missing/draft
GET  /api/search                 # q, 7 filter params (OR within/AND across), sort, page, page_size
                                  #   → {results, total, page, page_size}; 400 on invalid type/sort/filter
GET  /health
```

---

## Implementation Conventions

### Naming

| Construct | Convention | Example |
|-----------|-----------|---------|
| Python funcs | snake_case | `write_submission()` |
| Python classes | PascalCase | `EntityRegistry` |
| React components | PascalCase | `InterviewChat` |
| TS files | kebab-case | `api/client.ts` |
| Submission types | dotted | `strategy.play` |
| Encyclopedia wire fields | snake_case (matches API); mapped to camelCase in `api/client.ts`/`api/search.ts` | `short_description` → `shortDescription` |

### Key Patterns

- **Error handling:** validation → 4xx with actionable detail; provider/LLM/transcription
  failures degrade gracefully, never drop data or dead-end the user.
- **Testing:** mock at the service boundary (Supabase client, LLM, embedder). Engine logic
  is deterministic and unit-tested; interview quality is gated by the eval harness.
- **Secrets:** env only, never client, never logged. Browser calls backend only.

---

## Module Snapshots

- [`modules/backend.md`](modules/backend.md) — FastAPI app, submission API, interview engine, services.
- [`modules/frontend.md`](modules/frontend.md) — React app shell, routing, intake flow, interview chat.
- [`modules/data.md`](modules/data.md) — schema/migrations, seed KB, entity/coverage/persistence.
- [`modules/encyclopedia.md`](modules/encyclopedia.md) — EncyclopediaService, encyclopedia API, frontend browse/search.

---

## Open Questions

- Real embedding provider (semantic paraphrase matching) — deferred; store embeddings then.
- Transcription + realtime voice providers — voice initiative.
- Streaming `/api/interview/turn`; transcript edit-before-submit — additive follow-ups.
- Session TTL/cleanup for `interview_sessions`; multi-instance rate limiting (Redis).
- Hosting/deploy target. Sitemap `SITE_URL` needs the real deploy origin.
- `backend/app/db/schema.sql` is stale relative to migrations `001`–`006` (not regenerated when `006` was added — flagged, not fixed).
- The migration runner (`migrate.py`) re-applies every file each run; `003_entities_coverage_pgvector.sql` is not idempotent on re-run (`DuplicateObject` on `submissions_resolved_entity_fk`) — pre-existing bug, worth a fix before the next migration is added.
- No `/api/tags` endpoint — encyclopedia filter vocabulary is a curated frontend constant (`FILTER_OPTIONS`/`FilterPanel.tsx`); reconcile with real tag data once entries are seeded.
- `entries.variations` stores raw entry ids with no id→title resolution endpoint yet.
