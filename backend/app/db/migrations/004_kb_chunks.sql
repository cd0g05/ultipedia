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
