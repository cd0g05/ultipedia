# Product Overview

> Canon document. Updated by the Synthesis agent at the close of each initiative.

## What This Is

Ulti-pedia is now three products sharing one repo, backend, and Supabase project: a
knowledge-**intake** flow (structured form + AI interview, now at `/contribute`) that
collects drills and strategies from coaches, a public, no-login **encyclopedia**
(`/`, `/drills`, `/strategies`, `/formations`, `/plays`, `/skills`, `/search`) that lets
anyone browse and search that knowledge, and **Field View** (`/fieldview`) — an interactive
play-design toolset. The first two are read/write halves of the same `entries`-shaped content
— intake captures it, the encyclopedia serves it — sharing one FastAPI backend and one
Vite/React SPA (via react-router).

Field View is the odd one out and deliberately so: it is **entirely client-side**, touches
neither the backend nor Supabase, and holds no shared state with the other two. It is a tool a
coach uses, not content the site stores. Connecting it to the encyclopedia — attaching a
designed play to a published entry — is an open question, not a built path.

## Why It Exists

Ultimate is a small sport with scarce coaching resources, especially for new teams,
high-school programs, and first-time coaches. Existing knowledge is tacit, scattered, and
undocumented. Ulti-pedia captures it directly from experienced coaches — richly and
painlessly — then makes it freely browsable and searchable so any coach can find a drill,
strategy, or skill breakdown in seconds. The scarce resource on the intake side is
contributor goodwill (optimize for effortless, respectful contribution); on the
encyclopedia side it's coach attention mid-practice (optimize for ≤2-click reachability
and phone-first scannability).

---

## Users & Journeys

### Maya — post-tournament coach (form + interview)

**Who they are:** An experienced coach contacted in person at a tournament (contact
collected there; the polished form sent afterward, not handed out mid-event).

**Their journey:** Opens a personal follow-up link on her phone, reads a short tutorial,
picks Drills/Strategies/Other, and shares as little or as much as she wants — all fields
optional, autosaved. In interview mode the AI recognizes a well-known drill and asks what
most teams get *wrong* instead of re-collecting basics.

**Key needs:** low friction, mobile-first, never lose work, never feel interrogated or dismissed.

### Dev — the rambler (interview)

**Who they are:** A coach with lots to say who hates typing on a phone.

**Their journey:** Uses the AI interview; answers one sharp question at a time. (Voice
dictation is a planned follow-on that will let him speak answers.)

**Key needs:** minimal typing, adaptive questions, the ability to stop/resume.

### Carter — operator/curator

**Who they are:** The project owner (domain expert) collecting and curating knowledge.

**Their journey:** Reviews submissions in Supabase, watches the drop-off funnel, curates the
seed knowledge base, and (later) runs evals on the interview. Also the person who will
promote curated intake submissions into published `entries` rows (no admin UI yet — direct
Supabase edits).

**Key needs:** clean/trusted data, anti-troll, visibility, a durable warm-contact list.

### Riley — coach browsing mid-practice (encyclopedia)

**Who they are:** Any coach, logged-in or not, looking for a drill/strategy/skill idea on
their phone, often between drills.

**Their journey:** Lands on `/`, taps a section or searches, reaches an entry in ≤2 clicks,
scans the coaching-points/common-mistakes/variations blocks (only the ones with content),
optionally follows a tag to related entries or a "Similar Entries" card. Never sees a draft
entry, never hits a dead-end empty state.

**Key needs:** fast, phone-first scanning; never a bare "no results"; trustworthy content
(no unpublished/incomplete entries visible).

---

## Core Features (Current)

| Feature | Description | Status |
|---------|-------------|--------|
| Structured intake form | Mobile-first, tutorial → 3 paths → optional fields + freeform → contributor/consent → confirm → thank-you → submit-another; autosave + offline retry | Shipped |
| Backend submission API | Validated, anti-troll (length/payload caps, honeypot, rate limit), writes one envelope row to Supabase | Shipped |
| Polish & analytics | Framer Motion transitions, per-section palette, learn-more page, Plausible + funnel events | Shipped |
| Seed knowledge base + entity registry | Rights-clean seed corpus, canonical entities + aliases, per-aspect coverage model, RAG index | Shipped |
| AI interview | Hybrid preset→AI follow-ups, coverage-routed probing, confirm-then-resolve entities, compliment-pivot deflection, guardrails, chat UI, eval harness | Shipped (beta) |
| Durable v2 state | Entities/variants, coverage, and sessions persist to Supabase; resume across restart | Shipped |
| Voice dictation / interview / media | Speak answers; realtime voice; media uploads | Planned (future initiative) |
| **The Encyclopedia** (public browse) | Home + 5 section pages (Drills/Strategies/Formations/Plays/Skills) + entry detail template (coaching points/common mistakes/variations, self-omitting; similar entries by tag overlap); no login | Shipped |
| **Search, Filtering & Discovery** | `/search`: full-text query + 7-category faceted filters (AND across, OR within), sort (relevance/difficulty/newest), shareable URL-driven state, never-a-dead-end empty state | Shipped |
| SEO & content polish | Per-page title/meta, `HowTo` JSON-LD on drills, build-time sitemap, loading/error states, WCAG AA pass | Shipped |
| **Field View — whiteboard** (`/fieldview`) | Drag players and disc on a **vertical** scale field inside a three-pane "Light Film Room" shell (desktop) or a bottom sheet (phone — no viewport blocked); selection-driven contextual sidebar; thrower carries the mark; four built-in presets plus user presets (save/rename/delete/export/import); PNG export; keyboard nudge | Shipped — visuals **and the 2026-07-30 shell overhaul** pending client review |
| **Field View — play designer** (`/fieldview/designer`) | Keyframed plays over a versioned `PlayFile`, linear tween, timeline where reorder *is* retime, transport, JSON import/export | Shipped — visuals pending client review |
| **Field View — space heatmap** | Live strong/weak space overlay repainting during a drag, offense/defense lens, five toggleable model layers, tuning panel, per-cell "why" readout | Shipped — visuals pending client review |

## Out of Scope (Intentional)

- **Voice + media** — deferred to a follow-on initiative; needs a transcription/realtime provider decision.
- **Curation/normalization agents** — capture-rich now, structure later; free-text tags kept raw with `normalized_tags` left for a later AI pass.
- **On-site contact capture** — handled with a simple external tool (Google Form/Notes), not built here.
- **Content seeding / curation pipeline** — the encyclopedia initiative shipped the schema, service, and UI only. The Supabase `entries` table is live but empty; no code path yet turns a curated intake submission into a published entry (manual/future initiative). "Content Checklist" enforcement (what an entry needs before publishing) is documented in `prd.md`/`ux.md` but not code-enforced.
- **Field View below 768 px** — a phone gets a "needs a bigger screen" notice, not a squeezed
  field. Deliberate for v1: the field, control rail, and timeline do not fit a phone at a size
  anyone could coach from.
- **Field View persistence and sharing** — plays and presets live in localStorage and hand-rolled
  JSON files. Nothing is stored server-side, nothing is shareable by URL, and no designed play
  can be attached to an encyclopedia entry. The `PlayStore` seam (ADR-8) exists so a server-backed
  store is a swap rather than a rewrite.
- **Play annotations** — arrows, text, and cone markers are a confirmed future need. The key name
  is reserved in `play/format.ts` and `validate.ts` drops unknown keys rather than rejecting them,
  so adding them later is additive and does not bump `formatVersion`. The *shape* is deliberately
  not designed yet.
- **A `/api/tags` endpoint** — the encyclopedia's filter-category vocabulary (skill level, team size, duration, difficulty, focus, drill type, equipment) is currently a curated frontend constant, not served by the API. Needs reconciling once real tag data exists.

---

## Success Criteria

- Contributors submit at least one item without friction; median effort ≤ ~2 minutes (form).
- No submission is ever dropped (local autosave + retry; per-turn server autosave).
- Interview reads as domain-credible; entity-match precision high (no false "we already have this").
- Numeric targets (completion rate, per-interview cost, match accuracy) finalized via eval baselines.
- Every published entry reachable from `/` in ≤2 clicks; no draft entry ever reachable via any public route, search, or filter (enforced inside `EncyclopediaService`, not at the API/handler layer).
- Zero-result searches never dead-end (always a named cause + one-tap fix + close matches).

---

## Open Questions

- Numeric targets for completion/cost/match-accuracy — Owner: Carter, before wide rollout.
- Seed-KB sourcing/scale for credible grounding — Owner: Carter (domain expert).
- Auth: open form vs. per-contact token in the follow-up email — decide before sending out.
- Providers: embeddings (real semantic matching), transcription, realtime voice — deferred.
- Hosting/deploy target for backend + frontend — not yet chosen. Sitemap defaults to `https://ultipedia.app`; set the real `SITE_URL` at deploy.
- **Content pipeline**: how does a curated intake submission become a published `entries` row? No tooling exists yet (manual Supabase edit today).
- **`variations` resolution**: `entries.variations` stores raw entry ids with no id→title lookup; the encyclopedia UI currently renders the ids as-is. Needs an endpoint or resolution strategy once entries exist.
- Filter taxonomy (`/api/tags` or equivalent) needs to move from a frontend constant to a real source once content is seeded.
