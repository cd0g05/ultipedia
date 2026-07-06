-- 005_interview_sessions.sql
-- Durable interview sessions so a coach can resume across backend restarts.
-- The whole session (messages, stage, resolved entity, coverage contribution) is
-- stored as jsonb — it's an append-mostly working document, read/written by id.

create table if not exists interview_sessions (
    id         uuid primary key,
    data       jsonb not null,
    updated_at timestamptz not null default now()
);
