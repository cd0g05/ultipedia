# Module: backend

FastAPI service — the single trusted boundary. Thin handlers; logic in `services/`.

## Layout
- `main.py` — app factory `create_app()`; wires settings, submission store, rate limiter,
  and the v2 interview stack (seed registry+KB, coverage, sessions, engine); mounts routers; `/health`.
- `config.py` — env `Settings` (Supabase keys, caps, rate limit, CORS origins). Service key server-side only.
- `api/` — `submissions.py` (POST /api/submissions), `events.py` (POST /api/events),
  `interview.py` (start/turn/resume/submit).
- `services/`:
  - `validation.py` — payload/field caps, honeypot, in-memory sliding-window rate limiter, garbage→`flagged`.
  - `storage.py` — sole Supabase submission writer + `InMemorySubmissionStore` fallback.
  - `llm.py` — `LLM` protocol, `FakeLLM` (offline default), `AnthropicLLM` (lazy); `build_llm()`.
  - `interview_engine.py` — turn loop; deterministic routing/confirm/deflection/guardrails; LLM only phrases.
  - `sessions.py` — `Session` + `SessionStore` (per-turn autosave, resume via persistence port).
  - `persistence.py` — `Persistence` port: Null (default) / InMemory (tests) / Supabase.

## Conventions
- Browser never writes Supabase directly. Validation is server-side.
- Provider/LLM/transcription failures degrade gracefully; submissions never dropped.
- Tests mock at the service boundary; 42 backend tests (pytest).

## Key invariants
- Every submission is one envelope row with a stamped `schema_version`.
- Interview entity matches are suggestions to confirm, never silent decisions.
