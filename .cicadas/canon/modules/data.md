# Module: data (schema, seed KB, v2 state)

## Schema & migrations
- `backend/app/db/migrations/` 001–006 (forward-only, mostly idempotent — see caveat below)
  + `schema.sql` (generated for 001–005; **stale, not regenerated for `006`** — paste
  individual migration files into the Supabase SQL Editor if you need `006` there too) +
  `migrate.py` (statement-splitting runner over `DATABASE_URL`; connects via a Supabase
  session-pooler DSN in practice — the direct `db.<ref>.supabase.co` host resolved IPv6-only
  in this environment).
- Tables: `submissions`, `form_events`, `entities` (+pgvector), `entity_coverage`,
  `kb_chunks`, `interview_sessions` (intake), plus `entries`, `tags`, `entry_tags`, `media`
  (encyclopedia — see `modules/encyclopedia.md`; separate schema, no FK to `submissions`).
- The `submissions` envelope is the contract (see tech-overview Data Models). v2 columns are
  nullable-additive — no migration of v1 data.
- **Caveat**: `003_entities_coverage_pgvector.sql` is not safely re-runnable — re-applying the
  full migration set hits `DuplicateObject` on `submissions_resolved_entity_fk`. Apply new
  migrations individually (as `006` was) until this is fixed.

## Seed knowledge base
- `seed-kb/entities.json` (6 rights-clean canonical drills/strategies/concepts + aliases)
  and `kb_chunks.json` (5 grounding chunks) — all original summaries, not scraped.
- `services/seed_loader.py` builds the in-memory registry + RAG index at startup, using
  **deterministic seed ids** (uuid5) so they're stable across restarts.

## Entity registry & coverage
- `entities.py` — alias + description-embedding matching; `resolve()` returns a candidate to
  confirm (floor guards false positives); `add_variant()` on "mine's different".
- `coverage.py` — per-aspect (fill, confidence); `gaps()` least-covered-first; `is_saturated()`.

## Durability
- `persistence.py` port write-through + hydrate: entities/variants, coverage, and interview
  sessions persist to Supabase and reload on restart. Default is in-memory (Null port).
- Embeddings are recomputed on load (deterministic embedder) — with a real provider, store them.

## Eval
- `eval/run_eval.py` + `scenarios.jsonl` — deterministic gates (entity precision, novel
  handling, injection-blocked, coverage-routing, dismissiveness=0). Gated in CI via `test_eval.py`.
- LLM-judge metrics (question quality, credibility) require a real key — run per eval-spec.
