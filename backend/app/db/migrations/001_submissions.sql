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
