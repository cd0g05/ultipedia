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
