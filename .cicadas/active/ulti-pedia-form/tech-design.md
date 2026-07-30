
---
summary: "React/Vite + Framer Motion + Tailwind front end posts submissions to a FastAPI backend that validates server-side and writes one row (envelope + jsonb fields + raw_freeform + contributor) to Supabase Postgres. The same versioned envelope serves v1 form, v2 interview (messages[] + coverage_contribution + resolved entity), and the seed KB. v2 adds a transcription endpoint, an LLM interview engine (tiered Claude models, RAG over a hand-curated seed KB with pgvector), a canonical entity registry, and a per-aspect coverage model. Browser never touches Supabase directly; service key stays server-side."
phase: "tech"
when_to_load:
  - "When implementing or reviewing architecture, interfaces, data models, conventions, and sequencing."
  - "When checking whether changes still conform to the agreed technical approach."
depends_on:
  - "prd.md"
  - "ux.md"
modules:
  - "backend (FastAPI), frontend (React), data (Supabase/pgvector)"
index:
  overview: "## Overview & Context"
  stack: "## Tech Stack & Dependencies"
  structure: "## Project / Module Structure"
  adrs: "## Architecture Decisions (ADRs)"
  data_models: "## Data Models"
  interfaces: "## API & Interface Design"
  conventions: "## Implementation Patterns & Conventions"
  security_performance: "## Security & Performance"
  implementation_sequence: "## Implementation Sequence"
next_section: "Overview & Context"
---

# Tech Design: Ulti-pedia Knowledge Intake

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

**Summary:** A thin, animated SPA front end talks to a Python (FastAPI) backend over a small
JSON API. The backend is the **single trusted boundary**: it validates, formats, normalizes,
and writes every submission as one row to **Supabase Postgres**, keeping the Supabase service
key server-side. The architectural spine is **one versioned submission envelope** reused by
three producers — the v1 form, the v2 AI interview, and the hand-curated seed knowledge base —
so adding AI/voice is additive, never a migration. v2 layers an LLM interview engine
(retrieval-grounded, tiered models), a transcription endpoint, a canonical entity registry,
and a per-aspect coverage model onto that same spine.

### Cross-Cutting Concerns

1. **Backend is the only writer to Supabase** — the browser never holds the service key or
   writes the DB directly; all integrity/anti-troll lives server-side.
2. **One schema, three producers** — form, interview, and seed KB all conform to the
   `submission` envelope + `schema_version`; never fork the shape.
3. **Capture raw + structured always** — keep verbatim text, raw transcript, and raw audio
   refs alongside any structured fields; curation is a later agent's job.
4. **Goodwill/reliability** — no path may drop a submission; local autosave + retry, plus
   per-turn server autosave for interviews.
5. **Cost/latency awareness (v2)** — model tiering (cheap for routing/coverage, strong for
   question generation), streaming, summarization, caching on every LLM turn.

### Brownfield Notes

Greenfield. Existing `main.py` (hello-world) and minimal `pyproject.toml` are replaced/
extended; no API contracts or data to preserve.

---

## Tech Stack & Dependencies

| Category | Selection | Rationale |
|----------|-----------|-----------|
| **Frontend** | React + Vite + TypeScript | Component model fits the sectioned single-page flow; Vite for fast DX |
| **Animation** | Framer Motion | Smooth slide/expand/shrink transitions the UX demands |
| **Styling** | Tailwind CSS | Fast iteration on the warm, per-section palette; mobile-first utilities |
| **Backend** | Python 3.11+ / FastAPI | Async, Pydantic validation, natural home for submission API + voice + AI; matches existing Python scaffold |
| **Validation** | Pydantic v2 | Server-side schema enforcement at the API boundary |
| **Database** | Supabase (Postgres) | Decided. Managed Postgres + Storage + future RLS; keeps raw+structured together |
| **Vector search (v2)** | pgvector (Supabase) | Embeddings for entity resolution + RAG without a second datastore |
| **DB access** | `supabase-py` (server) / SQL via `psycopg`/SQLAlchemy as needed | Server-side service-role client |
| **LLM (v2)** | Latest Claude models, tiered (Haiku 4.5 routing/coverage, Opus/Sonnet for question gen) | Quality where it matters, cost control where it doesn't |
| **Transcription (v2)** | Pluggable provider behind an interface | Provider TBD (Open Question); keep raw audio regardless |
| **Object storage (v2)** | Supabase Storage | Raw audio + play-diagram images live next to the DB |
| **Analytics** | Plausible/Umami + custom backend events | Privacy-friendly page funnel + per-field drop-off next to submissions |
| **Testing** | pytest (backend), Vitest + React Testing Library (frontend) | Standard, light |

**New dependencies introduced:**
- `fastapi`, `uvicorn`, `pydantic` — API + validation.
- `supabase` (supabase-py) — server-side DB/storage client.
- `anthropic` — Claude models for the v2 interview engine.
- `pgvector` (Postgres extension) — embeddings for entity resolution + RAG.
- Frontend: `react`, `vite`, `framer-motion`, `tailwindcss`, `@tanstack/react-query` (or
  lightweight fetch) for API calls.

**Dependencies explicitly rejected:**
- Direct browser→Supabase writes (`@supabase/supabase-js` as the writer) — would expose keys
  / move validation client-side. Browser may only call our backend.
- A separate vector DB (Pinecone/Weaviate) — pgvector in Supabase is enough at this scale.

---

## Project / Module Structure

```
ulti-pedia/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, router wiring
│   │   ├── config.py               # env-based settings (Supabase keys, model keys)
│   │   ├── schemas/
│   │   │   ├── envelope.py         # Submission envelope (Pydantic) — THE contract
│   │   │   ├── drill.py            # type-specific field models
│   │   │   ├── strategy.py         # formation / play / concept
│   │   │   └── interview.py        # messages[], coverage_contribution (v2)
│   │   ├── api/
│   │   │   ├── submissions.py      # POST /api/submissions (v1)
│   │   │   ├── events.py           # POST /api/events (analytics)
│   │   │   ├── transcribe.py       # POST /api/transcribe (v2)
│   │   │   └── interview.py        # POST /api/interview/turn, /start, /resume (v2)
│   │   ├── services/
│   │   │   ├── validation.py       # length caps, honeypot, rate limit, garbage flagging
│   │   │   ├── storage.py          # Supabase writes (only writer)
│   │   │   ├── transcription.py    # provider-abstracted transcribe (v2)
│   │   │   ├── interview_engine.py # turn loop, model tiering, RAG (v2)
│   │   │   ├── coverage.py         # per-aspect coverage model (v2)
│   │   │   └── entities.py         # canonical entity registry + resolution (v2)
│   │   └── db/
│   │       └── migrations/         # SQL: tables, pgvector, indexes
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api/client.ts           # calls backend only
│   │   ├── state/draft.ts          # localStorage autosave + retry queue
│   │   ├── sections/               # Tutorial, PathSelect, Drill, Strategy, Other, Contributor, Confirm, ThankYou
│   │   ├── interview/              # Chat surface, mic capture, transcript review (v2)
│   │   └── ui/                     # Tooltip(tap), Toast, ConfirmDialog, animated Section
│   └── tests/
├── seed-kb/                        # hand-curated corpus authored to the envelope schema (v2)
└── pyproject.toml                  # backend deps
```

**Key structural decisions:**
- The **envelope schema is the contract**; `schemas/envelope.py` is imported by every
  producer/endpoint. Changing it bumps `schema_version`.
- API handlers stay thin; all logic lives in `services/`. Only `services/storage.py` writes
  Supabase.
- v2 modules (`interview_engine`, `coverage`, `entities`, `transcription`) are additive — v1
  ships without them.

---

## Architecture Decisions (ADRs)

### ADR-1: Backend is the sole writer to Supabase
**Decision:** The browser posts raw submissions to FastAPI; only `services/storage.py` (with
the service-role key) writes Supabase. No direct browser→DB writes.
**Rationale:** One trusted place to validate + anti-troll; keeps secrets server-side; lets
the same endpoint serve form, interview, and scribe inputs.
**Affects:** all API handlers, `storage.py`, frontend `api/client.ts`.

### ADR-2: One versioned envelope for all producers
**Decision:** Form, interview, and seed KB all serialize to the same `submission` envelope
with `schema_version`; type-specific data lives in a free `jsonb fields`, verbatim input in
`raw_freeform`.
**Rationale:** Makes v2 additive and the encyclopedia flywheel possible without migration;
keeps raw + structured together for later curation agents.
**Affects:** `schemas/`, Supabase table, every endpoint.

### ADR-3: Free-text tags, normalized later
**Decision:** Tags/concepts stored as raw free text; a nullable `normalized_tags` column is
left for a later AI pass. No fixed vocabulary.
**Rationale:** Near-zero friction now; an AI normalization pass is already planned.
**Affects:** drill/strategy schemas, future normalization job.

### ADR-4: pgvector for entity resolution + RAG (v2)
**Decision:** Store embeddings in Postgres via pgvector for both the canonical entity
registry (match a coach's description to an entity) and RAG over the seed KB.
**Rationale:** One datastore; resolution matches on **description embedding**, not just name;
avoids a second vector service at this scale.
**Affects:** `entities.py`, `interview_engine.py`, migrations.

### ADR-5: Per-aspect coverage model, not a boolean (v2)
**Decision:** Coverage is tracked per entity **per aspect** (setup / how-to-run / focuses /
variations / common-mistakes) as fill + confidence scores; the interview routes toward
low-confidence aspects rather than skipping a whole entity.
**Rationale:** A drill can be saturated on setup but wide open on mistakes; per-aspect routing
is what makes deflection useful instead of dismissive, and avoids false "we have this."
**Affects:** `coverage.py`, `interview_engine.py`, coverage tables.

### ADR-6: Tiered models + grounded persona (v2)
**Decision:** Cheap model (Haiku 4.5) for routing/coverage/entity-match checks; stronger
model (Opus/Sonnet) for question generation. Questions are RAG-grounded in the seed KB;
persona is a humble knowledgeable peer; few-shot with real ultimate questions.
**Rationale:** Controls per-interview cost/latency while protecting domain credibility (the
top risk).
**Affects:** `interview_engine.py`, prompt assets, eval-spec.md.

### ADR-7: Confirm-then-resolve entity matching (v2)
**Decision:** Never silently assume a match. Suggest the matched entity and let the coach
confirm or say "mine's different" (cheap), which spawns a new/variant entity.
**Rationale:** A false positive shuts down a novel contribution — the exact failure to avoid.
**Affects:** `entities.py`, interview flow, UX entity-confirm state.

---

## Data Models

### New Models

**The submission envelope (the contract):**

```python
# schemas/envelope.py  (Pydantic v2)
SubmissionType = Literal[
    "drill", "strategy.formation", "strategy.play", "strategy.concept",
    "other", "interview", "seed",
]

class Contributor(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    consent_to_credit: bool = False
    consent_to_record: bool = False        # v2 audio

class Submission(BaseModel):
    submission_id: UUID
    type: SubmissionType
    schema_version: int = 1
    submitted_at: datetime
    contributor: Contributor
    fields: dict[str, Any] = {}            # type-specific structured data (jsonb)
    raw_freeform: str | None = None        # always-kept verbatim catch-all
    normalized_tags: list[str] | None = None   # null until AI normalizes
    # v2-only, optional on the same envelope:
    messages: list[Message] | None = None       # turn-by-turn transcript
    audio_refs: list[str] | None = None         # Supabase Storage keys
    media_refs: list[MediaRef] | None = None     # video URLs / diagram images
    resolved_entity_id: UUID | None = None
    coverage_contribution: dict | None = None    # which aspects advanced
    flagged: bool = False                        # garbage/troll heuristic
```

**Supabase tables (DDL sketch):**

```sql
create table submissions (
  submission_id   uuid primary key,
  type            text not null,
  schema_version  int  not null default 1,
  submitted_at    timestamptz not null default now(),
  contributor     jsonb not null default '{}',
  fields          jsonb not null default '{}',
  raw_freeform    text,
  normalized_tags text[],
  messages        jsonb,           -- v2
  audio_refs      text[],          -- v2
  media_refs      jsonb,           -- v2
  resolved_entity_id uuid,         -- v2 → entities
  coverage_contribution jsonb,     -- v2
  flagged         boolean not null default false,
  created_at      timestamptz not null default now()
);

-- v2: canonical entity registry
create extension if not exists vector;
create table entities (
  id          uuid primary key,
  kind        text not null,             -- drill | strategy.*
  canonical_name text not null,
  aliases     text[] not null default '{}',
  description text,
  embedding   vector(1536),
  created_at  timestamptz not null default now()
);

-- v2: per-aspect coverage
create table entity_coverage (
  entity_id   uuid references entities(id),
  aspect      text not null,             -- setup|how_to_run|focuses|variations|common_mistakes
  fill_score  real not null default 0,   -- 0..1
  confidence  real not null default 0,   -- 0..1
  updated_at  timestamptz not null default now(),
  primary key (entity_id, aspect)
);

-- v2: seed KB chunks for RAG (authored to the same envelope where applicable)
create table kb_chunks (
  id        uuid primary key,
  source    text,                        -- rights-clean provenance
  content   text not null,
  embedding vector(1536)
);

-- analytics events
create table form_events (
  id uuid primary key, event text not null, submission_id uuid,
  meta jsonb, created_at timestamptz not null default now()
);
```

**Key field decisions:**
- `fields` is **schemaless jsonb** — type-specific shapes evolve without a migration; Pydantic
  validates per-type at the API edge.
- `raw_freeform` is **always** present so a one-paragraph dump is never lost.
- `normalized_tags` nullable — filled by a later AI pass (ADR-3).
- v2 columns are **nullable additions** on the same row — no migration when AI lands (ADR-2).
- `embedding vector(1536)` dimension matches the chosen embedding model (adjust to provider).

### Modified Models

| Model | Change | Migration Required? |
|-------|--------|-------------------|
| `main.py` hello-world | Replaced by FastAPI app | No (greenfield) |

### Schema / Migration Notes

Migrations are forward-only SQL in `backend/app/db/migrations/`. v1 ships
`001_submissions.sql` + `002_events.sql`. v2 adds `003_entities_coverage_pgvector.sql` and
`004_kb_chunks.sql` — all additive (new tables + nullable columns), so v1 data is untouched.

---

## API & Interface Design

### New Endpoints

```
POST /api/submissions                      # v1
Request:  Submission envelope (sans server-set fields) + honeypot field
Response: 201 { submission_id }
Errors:   422 validation, 413 too large, 429 rate-limited, 400 honeypot tripped

POST /api/events                           # analytics
Request:  { event: "form_started"|"field_completed"|"submitted", submission_id?, meta? }
Response: 204

POST /api/transcribe                        # v2
Request:  multipart audio blob
Response: 200 { text, audio_ref }           # raw audio stored, ref returned
Errors:   413 too large, 415 unsupported, 502 provider error (degrade to typing)

POST /api/interview/start                    # v2
Request:  { type, contributor? }
Response: 200 { session_id, opener }

POST /api/interview/turn                      # v2
Request:  { session_id, user_text|audio_ref }
Response: 200 (streamed) { assistant_text, controls, entity_confirm?, done? }
          # per-turn server-side autosave happens here

POST /api/interview/resume                     # v2
Request:  { session_id }
Response: 200 { messages[], next }

POST /api/interview/submit                      # v2
Request:  { session_id, edits? }                # coach review/edit then commit
Response: 201 { submission_id }
```

### Interface Contracts

```python
# services/transcription.py
class Transcriber(Protocol):
    async def transcribe(self, audio: bytes, mime: str) -> str: ...

# services/entities.py
class EntityResolver(Protocol):
    async def resolve(self, description: str, kind: str) -> EntityMatch | None: ...
    # returns a candidate to CONFIRM with the coach, never a silent match

# services/coverage.py
class CoverageModel(Protocol):
    def gaps(self, entity_id: UUID) -> list[Aspect]: ...        # low fill/confidence first
    def record(self, entity_id: UUID, contribution: dict) -> None: ...
```

### Backward Compatibility

No external consumers yet. The envelope's `schema_version` is the forward-compat lever:
additive changes keep `1`; breaking shape changes bump it and are handled at read time.

---

## Implementation Patterns & Conventions

### Naming Conventions

| Construct | Convention | Example |
|-----------|-----------|---------|
| Python funcs | snake_case | `write_submission()` |
| Python classes | PascalCase | `EntityResolver` |
| React components | PascalCase | `DrillSection` |
| TS files | kebab-case | `api/client.ts` |
| API routes | kebab/lower | `/api/interview/turn` |
| Submission types | dotted | `strategy.play` |

### Error Handling Pattern

```python
# Validation failures → 4xx with an actionable message; never a 500 for user input.
# Submit/transcription/LLM provider failures → degrade gracefully, never drop data.
try:
    text = await transcriber.transcribe(audio, mime)
except ProviderError:
    # keep raw audio_ref; let the user type instead — do not 500 the whole turn
    return TurnResponse(fallback="type", audio_ref=ref)
```

**Rules:**
- Never swallow exceptions silently — log + convert to a domain error.
- All user-facing errors are actionable and never blame the contributor.
- An LLM/transcription outage must fall back to the typed/freeform path, not a dead end.

### Testing Pattern

```python
def test_submission_rejects_oversized_payload(client):
    r = client.post("/api/submissions", json=oversized())
    assert r.status_code == 413
```

**Coverage expectations:** validation, storage, and the interview turn loop are the
critical paths — cover them well. UI: component tests for the autosave/restore and
switch-away warning. v2 LLM behavior is covered by the **eval harness** (eval-spec.md), not
unit tests.
**Mocking strategy:** mock at the service boundary (Supabase client, transcriber, Anthropic
client), not below it.

---

## Security & Performance

### Security

| Concern | Mitigation |
|---------|-----------|
| Input validation | Pydantic strict at the API edge; length caps + total payload cap; reject whitespace-only |
| Anti-troll/spam | Honeypot field, per-IP/per-contact rate limit, garbage heuristic → `flagged` (not auto-delete) |
| Secrets | Supabase service key + model keys in env only, never client, never logged |
| Browser trust | Browser calls our backend only; no service key client-side; consider RLS only if ever exposing anon reads |
| Prompt injection (v2) | Treat coach input as data; scope guard; system prompt hardening; don't execute instructions from transcript |
| Media abuse (v2) | Type/size limits; moderation pass on uploaded images; videos stored as URL only |
| Consent/PII | Contribution + audio consent recorded; contact info stored responsibly |

### Performance

| Concern | Target | Approach |
|---------|--------|---------|
| v1 submit | Feels instant on mobile | Single small POST; optimistic UI + retry queue |
| Poor signal | No data loss | localStorage autosave + background retry |
| v2 turn latency | Streamed, responsive | Stream tokens; cheap model for routing/coverage, strong only for question gen |
| v2 per-interview cost | Within agreed budget | Model tiering, context summarization, caching, soft question budget |
| Entity/RAG lookups | Fast | pgvector indexes; precompute embeddings |

### Observability

- **Logs:** submission writes, validation rejects, flagged rows, provider failures, per-turn
  LLM model+token usage (cost tracking).
- **Metrics:** funnel events (`form_started`/`field_completed`/`submitted`), per-field
  drop-off, interview length, false-match confirmations, per-interview cost.
- **Traces:** v2 interview turn spans (route → retrieve → generate → store).

---

## Implementation Sequence

1. **Foundation (blocking)** — envelope schema (`schemas/envelope.py`), Supabase
   `submissions`+`form_events` tables, FastAPI skeleton, `services/storage.py`,
   `services/validation.py`, `POST /api/submissions` + `/api/events`.
2. **Form UI (depends on 1)** — React shell, sections, optional fields + freeform, tooltips,
   autosave/retry (`state/draft.ts`), contributor+consent+prefill, confirm→thank-you loop,
   wire to the API.
3. **Polish & analytics (depends on 2)** — Framer Motion transitions, per-section palette,
   learn-more page, analytics wiring + drop-off funnel.
4. **Seed KB + entity registry (depends on 1; parallel to 2/3)** — author seed corpus to the
   envelope; `entities` + `entity_coverage` + `kb_chunks` tables; pgvector; embeddings;
   `entities.py` + `coverage.py`.
5. **AI interview engine (depends on 1 + 4)** — `interview_engine.py` turn loop, tiered
   models, RAG, confirm-then-resolve, deflection/pivot, guardrails, `/api/interview/*`,
   conversational data model, per-turn autosave/resume, review/edit.
6. **Voice dictation (depends on 1 + 2)** — browser capture, `/api/transcribe`,
   provider-abstracted transcription, raw-audio retention, confirm/edit UI.
7. **Voice interview + media + enrichments (depends on 5 + 6)** — turn-based voice over the
   interview (realtime is a later phase, gated on nothing), media uploads, provoke-with-
   conflicting-answers, async follow-ups, close-the-loop credit.

**Parallel work opportunities:** Foundation (1) unblocks two independent tracks — the
**form** track (2→3→6) and the **AI** track (4→5) — which can proceed concurrently and
converge at (7).

**Known implementation risks:**
- Entity resolution accuracy and the coverage model are research-y — validate with the eval
  harness before trusting deflection in production; ship confirm-always first.
- Transcription provider choice + realtime voice cost/latency are unresolved (Open
  Questions) — keep both behind interfaces; don't gate earlier phases on them.
