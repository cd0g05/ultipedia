# Ulti-pedia

A warm, mobile-first web experience for collecting ultimate-frisbee drills and
strategies from coaches — the knowledge-intake front door for a future
encyclopedia. v1 is a low-friction structured form; v2 (planned) turns it into an
AI-guided, coverage-aware interview with voice and a seed knowledge base.

- **Frontend:** React + Vite + TypeScript + Tailwind + Framer Motion (`frontend/`)
- **Backend:** FastAPI, one versioned submission envelope → Supabase (`backend/`)
- **Data/AI grounding:** seed knowledge base + entity registry + coverage model (`seed-kb/`, `backend/app/services/`)

See `.cicadas/active/ulti-pedia-form/` for the full specs (PRD, UX, tech design,
approach, tasks, eval).

## Quick start (local, no database)

The backend runs without Supabase using an in-memory store (data won't persist —
handy for development and the test suite).

```bash
# Backend (Python 3.11+, uv)
uv sync --extra dev
uv run uvicorn backend.app.main:app --reload --port 8000   # http://localhost:8000/health
uv run pytest -q                                            # backend tests

# Frontend (Node 18+)
cd frontend
npm install
npm run dev            # http://localhost:5173 (proxies /api to :8000)
npm test               # frontend tests
```

## Ship v1: wire up Supabase (persist for real)

Only you can create the cloud project; everything else is scripted.

1. **Create a Supabase project** at https://supabase.com (free tier is fine).
2. **Create the schema.** Either:
   - Paste `backend/app/db/schema.sql` into the Supabase **SQL Editor** and run it, **or**
   - Run the migrations from your machine:
     ```bash
     uv sync --extra ops
     export DATABASE_URL="postgresql://postgres:<db-password>@db.<project>.supabase.co:5432/postgres"
     uv run python -m backend.app.db.migrate
     ```
   Both are idempotent (safe to re-run). This creates `submissions`, `form_events`,
   and the v2 tables (`entities`, `entity_coverage`, `kb_chunks`, pgvector).
3. **Configure the backend.** Copy `.env.example` → `.env` and set `SUPABASE_URL`
   and `SUPABASE_SERVICE_KEY` (Project settings → API → `service_role` secret,
   **server-side only**). Then run the backend (`uv run uvicorn ...`); it will log
   "Using Supabase submission store" instead of the in-memory warning.
4. **Verify end-to-end:**
   ```bash
   uv run python scripts/smoke_test.py           # posts a test drill, expects 201
   ```
   Then check the `submissions` table in Supabase — the row should be there.
   Delete the smoke-test row afterwards.

### Deploy sketch
- **Backend:** any Python host (Fly.io / Railway / Render / a container). Set the
  `SUPABASE_*` and `ULTI_ALLOWED_ORIGINS` (your frontend URL) env vars. Put a
  reverse proxy in front and cap request body size there too (defense in depth on
  top of the app's payload cap).
- **Frontend:** `npm run build` → deploy `frontend/dist` to any static host
  (Netlify / Vercel / Cloudflare Pages). Point it at the backend (set the API
  base / proxy) and optionally set `VITE_PLAUSIBLE_DOMAIN` for analytics.

## Security notes
- The browser only ever calls the backend — it never holds the Supabase service
  key or writes the database directly.
- Validation/anti-troll (length caps, payload cap, honeypot, rate limit) is
  enforced server-side. The in-memory rate limiter is per-process; use a shared
  store (e.g. Redis) if you run multiple backend instances.
