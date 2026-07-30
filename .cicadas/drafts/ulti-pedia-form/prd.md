
---
summary: "Ulti-pedia's knowledge-intake product: a warm, mobile-first web experience that collects ultimate-frisbee drills/strategies from coaches, starting as a low-friction structured form (v1) and evolving into an AI-guided, coverage-aware interview with voice and a seed knowledge base (v2). Every submission is stored raw + structured in Supabase via a Python backend so later AI agents can curate it into an encyclopedia. The scarce resource is contributor goodwill; the design optimizes for painless, high-richness extraction."
phase: "clarify"
when_to_load:
  - "When defining or reviewing initiative goals, users, scope, success criteria, and risks."
  - "When validating that implementation still aligns with the intended problem and outcomes."
depends_on: []
modules:
  - "frontend (form + interview UI)"
  - "backend (submission API, transcription, AI interview engine)"
  - "data (Supabase schema, seed knowledge base, entity registry)"
index:
  executive_summary: "## Executive Summary"
  project_classification: "## Project Classification"
  success_criteria: "## Success Criteria"
  user_journeys: "## User Journeys"
  scope: "## Scope"
  functional_requirements: "## Functional Requirements"
  non_functional_requirements: "## Non-Functional Requirements"
  open_questions: "## Open Questions"
  risk_mitigation: "## Risk Mitigation"
next_section: "Executive Summary"
---

# PRD: Ulti-pedia Knowledge Intake (Form + AI Interview)

## Progress

- [x] Executive Summary
- [x] Project Classification
- [x] Success Criteria
- [x] User Journeys
- [x] Scope & Phasing
- [x] Functional Requirements
- [x] Non-Functional Requirements
- [x] Open Questions
- [x] Risk Mitigation

## Executive Summary

Ulti-pedia is building an encyclopedia of ultimate-frisbee drills and strategies — a sport
too small to have good coaching resources. This initiative is the **knowledge-intake front
door**: a warm, low-friction web experience that extracts as much useful knowledge as
painlessly as possible from coaches and players who are generously donating their time.

It ships in two phases under one initiative. **v1** is a polished, mobile-first structured
form (Drills / Strategies / Other) that posts submissions through a Python backend into
Supabase. **v2** turns that form into an **AI-guided interview** that asks adaptive
follow-ups, recognizes when a topic is already well covered and digs for the unique
variation instead, supports voice dictation, and is grounded in a seed knowledge base.
Both phases store raw + structured data against one stable schema so later AI agents can
curate submissions into the encyclopedia.

### What Makes This Special

- **Coverage-aware probing** — the system tracks what it already knows per topic and
  routes the conversation toward gaps and novel variations instead of collecting the 50th
  basic description of "4 lines." This is what turns intake from a form into a
  knowledge-acquisition engine.
- **Goodwill-first design** — contributors are volunteers. Optional-everything, autosave,
  voice, resume-anywhere, and a complimentary (never dismissive) tone treat their time and
  generosity as the scarce resource the whole pipeline depends on.
- **Capture-rich, curate-later** — verbatim transcripts, raw audio, and free-text tags are
  all preserved against a versioned schema; structuring is deferred to later AI agents, so
  nothing valuable is lost to rigid fields.

## Project Classification

**Technical Type:** Consumer web app + AI backend service
**Domain:** Sports / Knowledge collection (niche expert elicitation)
**Complexity:** High — spans a polished mobile front end, a submission/storage backend,
voice transcription, and an LLM interview engine with retrieval, entity resolution, and a
coverage model.
**Project Context:** Greenfield. Repo is currently a bare Python scaffold (`main.py` prints
hello, no deps, `pyproject.toml` minimal). No existing system to preserve.

---

## Success Criteria

### User Success

A contributing coach achieves success when they can:

1. **Submit knowledge in under a couple of minutes of effort** — land on the page,
   understand it immediately, pick a path, and contribute at least one drill/strategy
   without confusion or required-field friction. _Known by:_ completion from first word to
   submit with no dead ends; works one-handed on a phone.
2. **Say more than they would have typed** — a coach who hates typing can speak their
   answer (v2) and have it captured, getting richer detail out with less effort. _Known by:_
   voice answers produce longer, more detailed content than typed ones.
3. **Feel their time was respected** — the experience never makes them re-explain something
   already known, never dismisses them, and lets them stop or resume anytime. _Known by:_ a
   one-tap "was this worth your time?" trending positive (v2).

### Technical Success

The system is successful when:

1. **No submission is ever dropped** — every started submission is autosaved locally and
   reliably persisted to Supabase (raw + structured) once submitted, with retry on failure.
2. **One stable schema serves both phases** — the v1 form and the v2 interview write to the
   same versioned envelope, so adding AI/voice is an additive change, not a data migration.
3. **The AI reads as someone who knows the sport** (v2) — interview questions are grounded
   in the seed KB, use correct terminology, and never explain the sport back to an expert.

### Measurable Outcomes

- v1: ≥ X% of contributors who start the form submit at least one item (drop-off funnel
  instrumented).
- v1: median contributor effort to first submission ≤ ~2 minutes.
- v2: voice answers average meaningfully longer than typed answers (richness proxy).
- v2: false "we already have this" rate (incorrect entity matches) below an agreed
  threshold on the eval set (see eval-spec.md).
- v2: per-interview LLM cost stays within an agreed budget at expected turn counts.

> Specific numeric targets (X%, cost ceiling, match-accuracy threshold) are deferred to the
> eval spec and to post-launch baselines — see Open Questions.

---

## User Journeys

### Journey 1: Maya — the post-tournament coach (primary, v1 → v2)

Maya coaches a college women's team. Carter met her between games at a tournament, pitched
the project, and took her contact info rather than handing her a link mid-event. A few days
later she gets a personal email with the form. On her phone, on the couch, she opens it,
reads a short tutorial, taps **Drills**, and shares her favorite warmup. Fields are
optional; she fills the ones she cares about and dumps a paragraph in the freeform box. In
v2, instead of fields, an AI asks her how she sets it up, then — recognizing "4 lines" is
already well documented — compliments her and asks what most teams get wrong, surfacing a
coaching cue she'd never have written unprompted. She submits, gets a thank-you, and adds a
second drill because it was painless.

**Requirements Revealed:** mobile-first one-page flow; tutorial + tooltips; 3 intake paths;
optional fields + per-type freeform; autosave + save; contributor capture with prefill on
repeat; confirm-and-submit → thank-you → submit-another loop; (v2) adaptive questioning,
coverage-aware deflection with complimentary tone, resume.

### Journey 2: Dev — the rambler who hates typing (v2 voice)

Dev is an experienced coach with a lot to say but no patience for typing on a phone. He taps
the mic and just talks through his zone-defense philosophy. The app transcribes each answer,
shows it back for a quick confirm/edit, keeps the raw audio in case the transcript garbled a
name, and the AI asks one sharp follow-up at a time. He gets ten minutes of dense wisdom out
with almost no thumbs.

**Requirements Revealed:** voice dictation pipeline (browser capture → backend transcription
→ confirm/edit), raw-audio retention, turn-by-turn interview, transcription-error tolerance,
explicit record consent.

### Journey 3: Carter — the operator/scribe (cross-cutting)

Carter runs the project. On-site he needs a dead-simple way to collect contacts (out of
scope for the build — a Google Form/Notes page is fine). Later he wants to review what's
coming in, spot trolls/garbage, see where people drop off, and — for the most generous
in-person talkers — capture knowledge as a scribe against the same schema. He also curates
the seed knowledge base.

**Requirements Revealed:** backend validation/anti-troll; analytics drop-off funnel;
moderation/review of submissions; seed-KB authoring; (optional) scribe-mode reuse of the
intake UI.

### Journey Requirements Summary

| User Type | Key Requirements |
|-----------|-----------------|
| **Maya (coach, typing)** | mobile-first flow, tutorial+tooltips, 3 paths, optional+freeform, autosave/save, contributor+consent+prefill, submit loop, (v2) adaptive+coverage-aware interview |
| **Dev (coach, voice)** | voice dictation, transcription+confirm, raw-audio retention, turn-based interview, record consent |
| **Carter (operator)** | validation/anti-troll, analytics funnel, submission review/moderation, seed-KB authoring, (optional) scribe mode |

---

## Scope

### MVP — Minimum Viable Product (v1: structured form)

**Core Deliverables:**
- Versioned submission **schema** + **Supabase** table (raw `jsonb` fields + `raw_freeform`
  text + envelope: `submission_id`, `type`, `schema_version`, `submitted_at`, `contributor`).
- Python **backend submission endpoint** that validates, formats, and writes to Supabase.
- **Mobile-first** one-page form with three paths (Drills / Strategies{formation, play,
  concept} / Other), mostly-optional fields + a freeform box per type.
- **Autosave** (localStorage, debounced) + manual **save** button; submit-failure retry/queue.
- **Contributor** section (name, email, phone optional) + **consent** checkbox; prefilled on
  repeat submissions.
- Backend **validation / anti-troll** (length caps, payload cap, honeypot, rate limit).
- Tutorial-first landing + collapsible info bar; **tooltips**; confirm-before-submit;
  thank-you → submit-another loop.
- UX polish: smooth animations, warm per-section colors; **analytics drop-off funnel**.

**Quality Gates:**
- A submission survives refresh (autosave restore) and reliably lands in Supabase.
- Whole flow is usable one-handed on a phone; tooltips are tap-not-hover.
- Validation rejects oversized/empty/honeypot payloads server-side.

### Growth Features (Post-MVP, in this initiative)

**v2: AI interview**
- Conversational data model (`messages[]`, raw audio/media refs, resolved entity,
  `coverage_contribution`) sharing the v1 envelope.
- Hybrid **preset openers → AI-generated follow-ups**, grounded in the seed KB.
- **Coverage model** (per-aspect fill+confidence) + **entity resolution** (canonical
  registry, aliases, embeddings, confirm-with-coach) driving coverage-aware probing and
  complimentary deflection.
- **Voice dictation** (capture → transcribe → confirm/edit; keep raw audio).
- **Seed knowledge base** (hand-curated, rights-clean) grounding questions + seeding the
  entity registry.
- Guardrails (scope guard, prompt-injection resistance, media moderation), record/audio
  consent, model tiering for latency/cost, interview-length governance, chat-hater escape
  hatch (keep the v1 freeform path reachable).
- Coach **review/edit** of captured content before it becomes "knowledge."

**v3: Phasing-out / enrichment**
- Turn-based voice interview → realtime speech-to-speech (later phases; nothing gates on the
  realtime phase).
- Media uploads (play-diagram images stored for a later vision model; video stored as URL).
- Provoke-with-conflicting-answers, adaptive depth, async email follow-ups, close-the-loop
  credit.

### Vision (Future)

- The seed KB grows into the public **encyclopedia**; intake submissions feed it, and a
  growing KB sharpens intake questions — the core flywheel. Same schema throughout.

---

## Functional Requirements

### 1. Intake — structured form (v1)

**FR-1.1:** Landing presents a short tutorial explaining purpose + how it works, with a
clear "begin" CTA and a "learn more" path; after begin, the tutorial collapses into an
expandable top bar.
**FR-1.2:** User picks one of three paths — Drills, Strategies (→ formation / play / concept
sub-paths), Other.
**FR-1.3:** Each path shows its type-specific fields (per the plan's field lists); **all or
nearly all fields are optional**; submit becomes available after the first word.
**FR-1.4:** Every type includes a **freeform catch-all** text box.
**FR-1.5:** Tags/concepts are **free-text** (no fixed vocabulary); tooltip instructs "treat
like tags"; stored raw with a nullable `normalized_tags` column for later AI.
**FR-1.6:** Switching paths with unsaved input shows a clear data-loss warning.
**FR-1.7:** Confirm-before-submit; on success show a thank-you with a "submit another"
option that returns to path selection.

### 2. Persistence & resilience

**FR-2.1:** In-progress entries autosave to localStorage on a debounce and restore on return.
**FR-2.2:** A manual **save** button gives an explicit "draft saved" confirmation toast.
**FR-2.3:** On submit, the **front end posts raw submission to the backend**; the browser
never writes to Supabase directly.
**FR-2.4:** On submit failure, the draft is kept locally and retried/queued, never dropped.

### 3. Contributor & consent

**FR-3.1:** A lightweight contributor section captures name, email, phone (optional).
**FR-3.2:** A one-line consent checkbox ("OK to use this in a public ultimate knowledge
base?") is recorded with the submission.
**FR-3.3:** Contributor info is persisted (localStorage) and **prefilled** on subsequent
submissions in the same session.

### 4. Backend, schema & integrity

**FR-4.1:** Every submission is stored as one row: envelope + `jsonb fields` + `raw_freeform`
+ `contributor` blob, with a stable `type` and `schema_version`.
**FR-4.2:** Backend validates server-side: per-field length caps, total payload cap, reject
whitespace-only, **honeypot** field, per-IP/per-contact **rate limit**.
**FR-4.3:** Suspect rows (profanity/garbage heuristic) are **flagged for review**, not
auto-deleted.

### 5. Analytics

**FR-5.1:** Track visits, starts, completions, and **per-field drop-off** via a
privacy-friendly tool + custom events (`form_started`, `field_completed`, `submitted`)
posted to the backend so drop-off data lives next to submissions.

### 6. AI interview (v2)

**FR-6.1:** After path/topic selection, a **hybrid** flow asks a few preset openers, then
**AI-generated follow-ups** based on prior answers.
**FR-6.2:** The AI is **grounded in the seed KB** (retrieval) and uses correct terminology;
it never quizzes an expert on basics or explains the sport back to them.
**FR-6.3:** The system maintains a **coverage model** per canonical entity, scoring fill +
confidence **per aspect** (setup / how-to-run / focuses / variations / common-mistakes).
**FR-6.4:** **Entity resolution** matches a coach's free-text description to a canonical
entity by semantic similarity (not just name) and **confirms with the coach**; saying "no,
mine's different" is cheap and creates a new/variant entity.
**FR-6.5:** When an aspect is well covered, the AI **pivots** (compliment + ask for the
gap/variation) rather than **dismissing**; the contributor may always keep talking.
**FR-6.6:** Cold start: with empty coverage the system behaves like a normal interview and
expects to collect basics; behavior scales with coverage.
**FR-6.7:** Interview submissions store `messages[]`, audio/media refs, the resolved entity,
and a `coverage_contribution`, sharing the v1 envelope.
**FR-6.8:** Per-turn **server-side autosave + resume**; the coach can leave and return.
**FR-6.9:** The coach can **review/edit** captured content before submission.
**FR-6.10:** Always-available "I'm done / submit now" and "skip this question"; the AI has a
soft question budget; a **single-box escape hatch** (type/say it all) remains reachable.
**FR-6.11:** **Guardrails:** scope guard ("here to talk ultimate"), prompt-injection
resistance, carry-over anti-troll, media moderation.

### 7. Voice & media (v2)

**FR-7.1:** Voice **dictation**: capture audio in the browser → POST to backend →
transcribe → drop text into the field/answer for the coach to **confirm/edit**.
**FR-7.2:** **Raw audio** (or at least raw transcript) is retained alongside structured text.
**FR-7.3:** Explicit **record/store/reuse consent** for audio, on top of FR-3.2.
**FR-7.4:** Media: **video → store URL**; **play diagram → store image** (for a later vision
model); decide file types, size limits, storage location, and link-to-submission.
**FR-7.5:** Voice **interview** mode is **phased** (dictation → turn-based → realtime);
nothing gates on the realtime phase.

### 8. Seed knowledge base & entity registry (v2 foundation)

**FR-8.1:** A hand-curated, **rights-clean** seed corpus of ultimate basics
(drills/strategies/terminology) grounds interview questions.
**FR-8.2:** A **canonical entity registry** (drills/strategies) with aliases + embeddings
backs entity resolution and the coverage model.
**FR-8.3:** The seed corpus uses the **same schema** as intake so it can later become the
encyclopedia (flywheel).

---

## Non-Functional Requirements

- **Performance:** v1 submit round-trip feels instant on mobile. v2 interview turns stream;
  use a cheap model for routing/coverage checks and a stronger one for question generation
  to control latency and per-interview cost; tolerate poor mobile signal.
- **Reliability:** never drop a submission (local autosave + retry/queue + per-turn server
  autosave). Transcription and AI failures degrade gracefully to the typed/freeform path.
- **Security:** all validation/anti-troll enforced **server-side**; Supabase **service key
  stays server-side** (browser never writes the DB directly); secrets in env only; scope
  guard + prompt-injection resistance on the AI; media moderation.
- **Privacy/Consent:** explicit contribution consent (v1) and audio record/reuse consent
  (v2); store personal contact info responsibly.
- **Maintainability:** one **versioned schema** shared by form, interview, and seed KB so
  additions are additive; model choices are per-task and swappable; latest Claude models.
- **Accessibility:** mobile-first, one-handed; tap-not-hover tooltips; 44×44px touch
  targets; respect `prefers-reduced-motion`; WCAG 2.1 AA for color contrast.

---

## Open Questions

- **Numeric targets:** completion-rate goal, per-interview cost ceiling, and acceptable
  entity-match accuracy — set via the eval spec + post-launch baselines. _(Owner: Carter,
  before v2 ship.)_
- **Seed-KB sourcing:** exactly which sources are rights-clean vs. hand-written; how big the
  seed needs to be to ground questions credibly. _(Owner: Carter — domain expert.)_
- **Auth/identity:** is the form fully open (link + honeypot/rate-limit) or gated by a
  per-contact token in the follow-up email? Token gating improves anti-troll + lets you tie
  submissions to known contacts. _(Decide before sending the form out.)_
- **Media in v2 MVP:** are uploads in the first AI cut or deferred to v3? _(Plan stores them;
  building the UI may wait.)_
- **Transcription provider** and **realtime voice provider/cost** for later phases.
- **Hosting/deploy** target for backend + front end (not yet chosen).

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AI sounds like it doesn't know ultimate → experts bail | High | High | Ground every question in the seed KB (RAG); humble-peer persona; few-shot with real questions; never explain the sport back. (FR-6.2) |
| Entity resolution false-positive ("we already have this") shuts down a novel contribution | Med | High | Match on description not name; **confirm with coach**; cheap "mine's different"; per-aspect coverage, bias to pivot not dismiss. (FR-6.4/6.5) |
| Deflection tone deflates a volunteer | Med | High | Compliment + pivot, never dismiss; always let them keep talking. (FR-6.5) |
| Dropped submissions erode trust + data | Med | High | localStorage autosave + retry/queue; per-turn server autosave. (FR-2.1/2.4/6.8) |
| Scope creep: building all of v1+v2 at once delays anything usable | High | Med | Phase strictly — ship v1 first (partitions ordered so the form is usable before AI starts). (see approach.md) |
| LLM latency/cost balloons over many turns on mobile | Med | Med | Model tiering, streaming, context summarization, caching, question budget. (NFR/FR-6.10) |
| Trolls/garbage/prompt-injection in a public AI chat | Med | Med | Server-side anti-troll, honeypot, rate limit, scope guard, injection resistance, media moderation. (FR-4.2/6.11) |
| Seed-KB copyright issues from scraping | Low | High | Hand-curate/vet; use only rights-clean sources. (FR-8.1) |
| Voice transcription mangles jargon/names | Med | Low | Keep raw audio; show transcript for confirm/edit. (FR-7.1/7.2) |
