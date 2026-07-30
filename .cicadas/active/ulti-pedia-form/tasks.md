
---
summary: "Execution checklist for ulti-pedia-form across 7 partitions: Foundation (schema/API/Supabase) → parallel form track (Form UI → Polish/Analytics, + Voice Dictation) and AI track (Seed KB/Entities → AI Interview) → convergence (Voice Interview/Media/Enrichments). No PR boundaries; feature branches merge directly to the initiative branch, which merges once to main. Ship-able v1 milestone after the Polish/Analytics partition."
phase: "tasks"
when_to_load:
  - "When selecting the next implementation task or reviewing completion state."
  - "When checking partition progress, PR boundaries, or execution sequencing."
depends_on:
  - "prd.md"
  - "ux.md"
  - "tech-design.md"
  - "approach.md"
modules:
  - "backend, frontend, data/seed-kb, eval"
index:
  foundation: "## Partition: feat/foundation"
  form_ui: "## Partition: feat/form-ui"
  polish: "## Partition: feat/polish-analytics"
  seed_kb: "## Partition: feat/seed-kb-entities"
  ai_interview: "## Partition: feat/ai-interview"
  voice_dictation: "## Partition: feat/voice-dictation"
  voice_media: "## Partition: feat/voice-interview-media"
  initiative_boundary: "## Initiative Boundary"
next_section: "## Partition: feat/form-ui"
---

# Tasks: Ulti-pedia Knowledge Intake

<!-- No PR boundaries configured (lifecycle: features=false, initiatives=false). Feature branches merge directly into initiative/ulti-pedia-form; the initiative merges once to main. -->

## Partition: feat/foundation

- [x] Define `schemas/envelope.py` (Submission + Contributor) and per-type models (drill, strategy.formation/play/concept, other) per tech-design Data Models <!-- id: 1 -->
- [x] Write Supabase migration `001_submissions.sql` (envelope + jsonb fields + raw_freeform + normalized_tags + flagged). NOTE: written; application to a live Supabase project deferred until credentials exist (no project provisioned yet). <!-- id: 2 -->
- [x] Write migration `002_events.sql` (`form_events`). NOTE: same apply caveat as id:2. <!-- id: 3 -->
- [x] FastAPI skeleton: `main.py`, `config.py` (env settings, service key server-side only), `/health`. Implemented as an app factory `create_app()`; in-memory store used automatically when Supabase env is unset. <!-- id: 4 -->
- [x] `services/validation.py`: per-field length caps, total payload cap, whitespace-only reject, honeypot, per-IP/per-contact rate limit, garbage heuristic → `flagged` <!-- id: 5 -->
- [x] `services/storage.py` as the sole Supabase writer (service role); lazy supabase import + `InMemorySubmissionStore` fallback for dev/tests <!-- id: 6 -->
- [x] `api/submissions.py` (`POST /api/submissions` → 201 {submission_id}) <!-- id: 7 -->
- [x] `api/events.py` (`POST /api/events` → 204) <!-- id: 8 -->
- [x] Tests: valid submission persists; 413/400(honeypot)/429/422 paths; event persists; schema_version stamped — 12 tests, all passing <!-- id: 9 -->

## Partition: feat/form-ui

- [x] Vite + React + TS + Tailwind scaffold; mobile-first layout primitives <!-- id: 10 -->
- [x] Tap-to-open `Tooltip`, `Toast`, `ConfirmDialog` UI primitives (animated `Section` transitions deferred to feat/polish-analytics per approach scoping) <!-- id: 11 -->
- [x] Sections: Tutorial, PathSelect, FormSection (drill/formation/play/concept/other via field config), Contributor, Confirm (dialog), ThankYou <!-- id: 12 -->
- [x] `state/draft.ts`: debounced localStorage autosave + restore-on-return + manual Save + submit retry/queue (queue in api/client.ts) <!-- id: 13 -->
- [x] `api/client.ts`: POST submission + events to backend only; offline retry queue + flushQueue; 4xx surfaced, 5xx/network queued <!-- id: 14 -->
- [x] Switch-away data-loss warning; confirm-before-submit; thank-you → submit-another loop <!-- id: 15 -->
- [x] Contributor+consent capture once, prefilled on repeat submission in session <!-- id: 16 -->
- [x] Tests: draft autosave/restore + contributor prefill, api submit/queue/flush, App flow + switch-away warning — 13 tests passing; tsc + vite build clean <!-- id: 17 -->

## Partition: feat/polish-analytics

- [ ] Framer Motion section transitions + tutorial→info-bar shrink/expand <!-- id: 20 -->
- [ ] Warm per-section palette + AA contrast pass; `prefers-reduced-motion` disables large transitions <!-- id: 21 -->
- [ ] Learn-more documentation page (project + form explainer), reachable from tutorial <!-- id: 22 -->
- [ ] Wire Plausible/Umami + custom events (`form_started`, `field_completed`, `submitted`); verify per-field drop-off funnel <!-- id: 23 -->
- [ ] ✅ MILESTONE: v1 is shippable here — a polished, data-collecting form to send to tournament contacts <!-- id: 24 -->

## Partition: feat/seed-kb-entities

- [ ] Migrations `003_entities_coverage_pgvector.sql` (entities, entity_coverage, pgvector) + `004_kb_chunks.sql` <!-- id: 30 -->
- [ ] Author rights-clean seed corpus (canonical drills/strategies/terminology) to the envelope schema + load script <!-- id: 31 -->
- [ ] Provider-abstracted embedding pipeline for `entities` and `kb_chunks` <!-- id: 32 -->
- [ ] `services/entities.py`: semantic resolve over description → candidate-to-confirm (never silent match); variant creation on "mine's different" <!-- id: 33 -->
- [ ] `services/coverage.py`: per-aspect fill+confidence; `gaps()` ordered by low coverage; `record()` <!-- id: 34 -->
- [ ] Tests: resolution precision/recall on a fixture set; coverage gap ordering <!-- id: 35 -->

## Partition: feat/ai-interview

- [ ] `services/interview_engine.py`: turn loop, model tiering (Haiku route/coverage, Opus/Sonnet question-gen), RAG over kb_chunks, few-shot humble-peer persona <!-- id: 40 -->
- [ ] Hybrid preset openers → AI follow-ups; coverage-routing toward low-confidence aspects <!-- id: 41 -->
- [ ] Confirm-then-resolve entity matching wired into the loop; compliment-pivot deflection (never dismiss) <!-- id: 42 -->
- [ ] Guardrails: scope guard, prompt-injection resistance (treat transcript as data) <!-- id: 43 -->
- [ ] `api/interview.py`: `/start`, `/turn` (streamed), `/resume`, `/submit`; per-turn server-side autosave <!-- id: 44 -->
- [ ] Conversational data model write: one envelope row with `messages[]`, `coverage_contribution`, `resolved_entity_id` <!-- id: 45 -->
- [ ] Frontend `interview/`: chat surface, controls (skip / I'm done / escape hatch to one-box), entity-confirm, transcript review/edit <!-- id: 46 -->
- [ ] Author eval harness + scenario set per eval-spec.md; run baseline; report metrics <!-- id: 47 -->

## Partition: feat/voice-dictation

- [ ] Browser mic capture + clear recording state; record-consent gate before first recording <!-- id: 50 -->
- [ ] `api/transcribe.py` + `services/transcription.py` (provider Protocol); store raw audio in Supabase Storage, return `audio_ref` <!-- id: 51 -->
- [ ] Confirm/edit-transcript UI; wire dictation into form fields and (if present) interview answers <!-- id: 52 -->
- [ ] Graceful degrade to typing on provider error without losing audio or turn; tests <!-- id: 53 -->

## Partition: feat/voice-interview-media

- [ ] Turn-based voice answers over the interview (TTS optional); keep raw audio per turn <!-- id: 60 -->
- [ ] Media uploads: types/size limits, Supabase Storage, link-to-submission, image moderation; video stored as URL <!-- id: 61 -->
- [ ] Provoke-with-conflicting-answers retrieval; adaptive-depth signal <!-- id: 62 -->
- [ ] Async follow-up email hook; close-the-loop credit; end-of-interview "worth your time?" capture <!-- id: 63 -->

## Initiative Boundary

- [ ] Merge `initiative/ulti-pedia-form` → `main` directly (no PR per lifecycle), synthesize canon, archive specs <!-- id: 100 -->
