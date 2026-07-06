-- schema.sql — full Ulti-pedia schema (generated from db/migrations/*.sql in order).
-- Paste this into the Supabase SQL Editor, or run: python -m backend.app.db.migrate
-- Idempotent (IF NOT EXISTS), so re-running is safe.

-- ============================================================
-- 001_submissions.sql
-- ============================================================
-- 001_submissions.sql
-- The core submissions table: one row per submission (form, interview, or seed).
-- Envelope columns + schemaless jsonb `fields` + verbatim `raw_freeform`.
-- v2 columns are included up front as nullable so the AI track needs no migration
-- of v1 data (ADR-2). Forward-only.

create table if not exists submissions (
    submission_id          uuid primary key,
    type                   text not null,
    schema_version         int  not null default 1,
    submitted_at           timestamptz not null default now(),
    contributor            jsonb not null default '{}'::jsonb,
    fields                 jsonb not null default '{}'::jsonb,
    raw_freeform           text,
    normalized_tags        text[],            -- null until the AI normalization pass

    -- v2 (nullable, additive)
    messages               jsonb,             -- turn-by-turn interview transcript
    audio_refs             text[],            -- Supabase Storage keys
    media_refs             jsonb,             -- [{kind, ref}]
    resolved_entity_id     uuid,              -- -> entities(id) (added in 003)
    coverage_contribution  jsonb,

    -- moderation: flag, never auto-delete (FR-4.3)
    flagged                boolean not null default false,

    created_at             timestamptz not null default now()
);

create index if not exists submissions_type_idx        on submissions (type);
create index if not exists submissions_submitted_at_idx on submissions (submitted_at desc);
create index if not exists submissions_flagged_idx      on submissions (flagged) where flagged;

-- ============================================================
-- 002_events.sql
-- ============================================================
-- 002_events.sql
-- Analytics funnel events (form_started / field_completed / submitted), stored
-- next to submissions so drop-off analysis lives with the data (FR-5.1).

create table if not exists form_events (
    id            uuid primary key,
    event         text not null,
    submission_id uuid,                 -- optional link to a submission
    meta          jsonb,
    created_at    timestamptz not null default now()
);

create index if not exists form_events_event_idx      on form_events (event);
create index if not exists form_events_created_at_idx  on form_events (created_at desc);

-- ============================================================
-- 003_entities_coverage_pgvector.sql
-- ============================================================
-- 003_entities_coverage_pgvector.sql
-- Canonical entity registry + per-aspect coverage model for the v2 interview.
-- Additive; forward-only. The vector dimension must match the embedding provider
-- chosen for production (1536 shown; adjust to the provider's output dim).

create extension if not exists vector;

-- Canonical drills / strategies. One entity can have many aliases; matching is by
-- description embedding + alias overlap, then CONFIRMED with the coach (ADR-7).
create table if not exists entities (
    id             uuid primary key,
    kind           text not null,              -- drill | strategy.formation | strategy.play | strategy.concept
    canonical_name text not null,
    aliases        text[] not null default '{}',
    description    text,
    embedding      vector(1536),
    is_variant_of  uuid references entities(id),  -- "mine's different" creates a variant
    created_at     timestamptz not null default now()
);

create index if not exists entities_kind_idx on entities (kind);
-- Approximate nearest-neighbour index for description matching (cosine).
create index if not exists entities_embedding_idx
    on entities using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Per-aspect coverage: NOT a single boolean (ADR-5). A drill can be saturated on
-- "setup" but wide open on "common_mistakes"; the interview routes to low coverage.
create table if not exists entity_coverage (
    entity_id  uuid not null references entities(id) on delete cascade,
    aspect     text not null,   -- setup | how_to_run | focuses | variations | common_mistakes
    fill_score real not null default 0,   -- 0..1 how much we have
    confidence real not null default 0,   -- 0..1 how sure we are
    updated_at timestamptz not null default now(),
    primary key (entity_id, aspect)
);

-- Link submissions to the entity they advanced (column added nullable in 001).
alter table submissions
    add constraint submissions_resolved_entity_fk
    foreign key (resolved_entity_id) references entities(id)
    not valid;   -- not-valid: don't block on pre-existing rows; validate later

-- ============================================================
-- 004_kb_chunks.sql
-- ============================================================
-- 004_kb_chunks.sql
-- Seed knowledge-base chunks for RAG grounding of interview questions (FR-8.1).
-- Hand-curated, rights-clean content authored to the envelope where applicable.
-- Additive; forward-only.

create table if not exists kb_chunks (
    id        uuid primary key,
    source    text,             -- rights-clean provenance (author / license note)
    kind      text,             -- drill | strategy | terminology | general
    title     text,
    content   text not null,
    embedding vector(1536)
);

create index if not exists kb_chunks_kind_idx on kb_chunks (kind);
create index if not exists kb_chunks_embedding_idx
    on kb_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ============================================================
-- 005_interview_sessions.sql
-- ============================================================
-- 005_interview_sessions.sql
-- Durable interview sessions so a coach can resume across backend restarts.
-- The whole session (messages, stage, resolved entity, coverage contribution) is
-- stored as jsonb — it's an append-mostly working document, read/written by id.

create table if not exists interview_sessions (
    id         uuid primary key,
    data       jsonb not null,
    updated_at timestamptz not null default now()
);

