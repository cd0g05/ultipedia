# Canon Summary

> Auto-generated during canon synthesis. Consumed by agents at branch start.
> Load this first; open full canon / spec front matter only as needed.

## Purpose

Ulti-pedia: two products, one repo/backend/Supabase project. **Intake** (`/contribute`) is a
mobile-first form + AI interview collecting ultimate frisbee drills/strategies from coaches.
The **encyclopedia** (`/`) is a public, no-login site for browsing and searching that
knowledge (Drills/Strategies/Formations/Plays/Skills). No code connects them yet — intake
writes `submissions`, the encyclopedia reads a separate `entries` schema (currently empty).
**Field View** (`/fieldview`) is a third, standalone product: a play-design toolset (coaching
whiteboard, keyframed play designer, live strong/weak space heatmap). It is entirely
client-side — no backend, no Supabase, no shared state with the other two.

## Architecture

- FastAPI backend is the sole trusted boundary + only Supabase writer; browser calls API only.
- One versioned `Submission` envelope for all intake producers (form, interview, seed KB).
- Encyclopedia: one `EncyclopediaService` facade over a swappable store (in-memory/Supabase);
  `status='published'` gating lives ONLY inside the service (`_published_rows()`) — never at
  the API layer. Query/filter/sort run in Python (Chain of Responsibility + Strategy patterns)
  over rows, not Postgres FTS, though `entries.search_vector`+GIN exists for a future swap.
  Single `entries` table, `type` discriminator + JSONB `attributes` (no per-type tables).
- One Vite/React SPA, react-router-owned: encyclopedia `Layout` shell wraps `/`, `/:section`,
  `/:section/:slug`, `/search`, `/fieldview`, `/fieldview/designer`, `*`; intake mounts at
  `/contribute/*`. Extended in place rather
  than a second Next.js app (accepted trade-off: client-rendered SEO only — helmet + build-time
  sitemap, not SSR/SSG).
- Durability via a Persistence port (Null default / InMemory tests / Supabase); entities,
  coverage, sessions survive restart. Deterministic seed ids.
- Field View: a mutable subscribe-store + rAF loop keeps **React out of the drag path** (proven
  by a Profiler test: 0 commits across 25 pointer moves). Canvas heatmap under an SVG piece
  layer. The space model is a pure framework-free library with no UI imports. Do not "clean this
  up" by lifting drag state into React — it is what makes the live repaint possible.

## Modules

- backend: FastAPI app, submission + interview + encyclopedia APIs, services layer.
- frontend: intake (form/interview flow) + encyclopedia (browse/search) + fieldview under one router.
- data: schema/migrations 001–006 (`006` stale schema.sql), seed-kb, entity/coverage/persistence.
- encyclopedia: EncyclopediaService facade, encyclopedia API, browse+search frontend.
- fieldview: scene model + store, headless space model, render tokens/layers/heatmap, versioned
  play format, overlay UI. Client-only. All visuals in `render/tokens.ts` (one edit re-skins it).

## Conventions

- Backend sole Supabase writer; validation server-side; secrets env-only; browser→backend only.
- Python snake_case/PascalCase; TS kebab files; submission types dotted (`strategy.play`).
- Encyclopedia wire format is snake_case; frontend `api/client.ts`/`api/search.ts` map to
  camelCase — components never see raw wire payloads.
- Failures degrade gracefully, never drop a submission; encyclopedia fetches always show
  skeleton/error+retry, search empty state is measured (names the blocking filter), never dead-ends.
- Tests mock at the service/store boundary (Supabase/LLM/embedder). 92 backend + 336 frontend
  tests (Vitest + RTL + axe-core); WCAG AA verified by an automated contrast test.
- Timing assertions live in `npm run test:perf` (`--no-file-parallelism`), never the parallel
  suite — the same code measures 2–3× slower under contention.
- jsdom gotcha worth remembering: `toBeVisible()` reads only the `hidden` attribute, so an
  element kept on screen by a CSS display utility still passes. Verify UI in a real browser.

## Not built yet

Voice dictation/interview, media uploads, real embedding/transcription providers, streaming
interview turns, transcript edit-before-submit. Content-seeding pipeline (intake → published
`entries`), `/api/tags` endpoint (filter vocabulary is a frontend constant), `variations`
id→title resolution. `/api/tags` endpoint (filter vocabulary is a frontend constant).
Field View: annotations (arrows/text/cones — key name reserved, `validate.ts` drops unknown keys
so it stays additive), server-side play storage or URL sharing (`PlayStore` seam exists), phone
support (<768 px shows a notice by design).

**Deployed**: frontend only, on Vercel (auto-deploys `main`, root dir `frontend/`). The backend
is NOT deployed — only `/fieldview` works on the live site. Sitemap `SITE_URL` needs the real
origin. **Field View's client visual review is still outstanding** (visuals, presets, ramp, copy,
plus the two by-eye §8 checks) — it merged to `main` ahead of that review by explicit decision.
