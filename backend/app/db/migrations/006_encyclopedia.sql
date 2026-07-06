-- 006_encyclopedia.sql
-- Public read-only encyclopedia: one polymorphic entries table (type discriminator
-- + jsonb attributes, ADR-5), a fixed tags taxonomy, an entry_tags join, and media.
-- Purely additive; no existing table is touched. status = 'published' gating is
-- enforced inside EncyclopediaService (the sole reader), never left to callers.

-- Enum types. CREATE TYPE has no IF NOT EXISTS, so idempotency comes from a
-- DO block written as a single-quoted string (the migration runner splits on
-- top-level semicolons only, respecting single-quoted literals).
do '
begin
    create type entry_type as enum (''drill'', ''strategy'', ''formation'', ''play'', ''skill'');
exception when duplicate_object then null;
end';

do '
begin
    create type entry_status as enum (''draft'', ''published'');
exception when duplicate_object then null;
end';

create table if not exists entries (
    id                 uuid primary key default gen_random_uuid(),
    slug               text not null unique,
    type               entry_type not null,
    title              text not null,
    short_description  text not null,
    skill_level        text,                          -- beginner | intermediate | advanced
    body               text not null,                 -- markdown/rich text instructions
    coaching_points    jsonb not null default '[]',   -- list[str]
    common_mistakes    jsonb not null default '[]',   -- list[str]
    variations         jsonb not null default '[]',   -- list[uuid] self-referencing entry ids
    related_entry_ids  jsonb not null default '[]',   -- list[uuid], manual curation
    attributes         jsonb not null default '{}',   -- type-specific fields, validated in the service layer
    status             entry_status not null default 'draft',
    search_vector      tsvector generated always as (
                           to_tsvector('english', title || ' ' || short_description || ' ' || body)
                       ) stored,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);

create index if not exists idx_entries_search_vector on entries using gin (search_vector);
create index if not exists idx_entries_status        on entries (status);
create index if not exists idx_entries_type          on entries (type);

create table if not exists tags (
    id       uuid primary key default gen_random_uuid(),
    name     text not null,
    category text not null,   -- skill_level | team_size | duration | difficulty | focus | drill_type | equipment
    unique (name, category)
);

create table if not exists entry_tags (
    entry_id uuid not null references entries(id) on delete cascade,
    tag_id   uuid not null references tags(id) on delete cascade,
    primary key (entry_id, tag_id)
);

create index if not exists idx_entry_tags_tag_id on entry_tags (tag_id);

create table if not exists media (
    id          uuid primary key default gen_random_uuid(),
    entry_id    uuid not null references entries(id) on delete cascade,
    url         text not null,
    type        text not null,   -- image | youtube | vimeo
    caption     text,
    sort_order  int not null default 0
);

create index if not exists idx_media_entry_id on media (entry_id);
