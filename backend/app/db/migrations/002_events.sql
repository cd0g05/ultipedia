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
