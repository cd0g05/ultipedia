# Review: form-plan.md

A review of the Grand Plan for the Ulti-pedia knowledge-collection form.

## TL;DR

**Is this a good idea?** Yes. A structured, low-friction intake form to seed an
ultimate-frisbee knowledge base is a genuinely good MVP, and the design instincts
(tutorial-first, tooltips, one-page flow, warm aesthetics) are sound. The plan is
strong on *UX feel* and *content structure*.

**Decisions now locked in (from review discussion):**
- **Storage:** custom front end → **backend → Supabase DB**. The backend exists anyway
  for the AI step, so submissions post to it, it formats them, and writes to Supabase.
- **No deadline crunch:** at the tournament you'll **collect coach contact info, not
  hand out the form.** The polished form gets sent afterward (see Section 4 — this is
  the right call). This removes the "ship by Saturday" pressure entirely.
- **Mobile-first is a hard requirement.** Native voice dictation is a planned next step.
- **Most/all fields optional**, submit allowed after the first word, **autosave + a
  manual save button.**
- **Tags stay free-text** — AI reconciles later; tooltip just says "treat like tags."

What's left to nail down is mostly schema details, validation/anti-troll rules, and
the contributor-info section. Covered below.

---

## 1. Foundations (decided — captured here for the build)

### 1.1 Data storage / backend — DECIDED: Supabase via your backend
Submissions post to your backend, which validates + formats them and writes to a
**Supabase** table. This is the right choice given the backend already has to exist for
the AI step, and it keeps raw + structured data together for the encyclopedia. Notes:

- Have the **front end post the raw submission to the backend**, and let the backend own
  formatting, validation, tag-normalization-later, and the DB write. Don't write to
  Supabase directly from the browser unless you're deliberately using Row Level Security
  + the anon key with tight policies — routing through your backend keeps the service
  key server-side and gives you one place to validate (see 2.6).
- Store **raw + structured** in the same row (a `jsonb` `fields` column + a `raw_freeform`
  text column) so the future AI has the verbatim input.
- Keep `submission_id`, `type`, `schema_version`, `submitted_at`, and a `contributor`
  blob (see 2.5) on every row.

### 1.2 Define the data schema now, not later
You already list great per-type fields. Lock them into an explicit schema (even a
JSON shape) **before** building, because:
- It's the contract between the form, the storage, and the future encyclopedia/AI.
- It forces decisions like: are tags free-text or a fixed vocabulary? (Mixed is best —
  see 2.1.)
- It lets you store a stable `type`, `schema_version`, `submission_id`, and timestamp
  so later cleanup and dedup are possible.

Suggested envelope for every submission:
```
{
  "submission_id": "...",
  "type": "drill" | "strategy.formation" | "strategy.play" | "strategy.concept" | "other",
  "schema_version": 1,
  "submitted_at": "...",
  "contributor": { "name?": "...", "email?": "...", "consent_to_credit": bool },
  "fields": { ...type-specific... },
  "raw_freeform": "..."   // always keep an open text catch-all
}
```

### 1.3 Tech stack and the Python backend
The repo is currently a bare Python scaffold (`main.py` prints hello, no deps). That's
fine now that you're keeping a backend — Python (FastAPI/Flask) is a reasonable home for
the submission endpoint, the future voice transcription, and the AI step. For the front
end, "lots of smooth animation, warm feel, one page" points to **React/Vite + Framer
Motion + Tailwind**. Plain HTML/CSS/JS is lighter but you'll hand-roll the slide/expand
animations. So: **Python backend + JS front end**, talking over your submission API.

### 1.4 Scope is no longer deadline-bound — sequence deliberately
Because you're collecting contacts at the tournament and sending the form *afterward*
(Section 4), you have breathing room. Sensible sequence:
- **First slice:** the 3 paths, mobile-first, data posting to Supabase, optional fields +
  a freeform box each, autosave + save button, contributor section, basic validation.
- **Then:** the slide/shrink-to-dropdown animations, per-section colors, rich tooltips,
  learn-more page, analytics.
- **Later next-steps:** native voice dictation → backend transcription; AI chat probing;
  the full encyclopedia front end.
Even without the deadline, keep data capture ahead of polish in priority — a saved
submission with plain styling beats a beautiful form that drops data.

---

## 2. Areas that need more coverage

### 2.1 Tags / concepts — free-text, by design (DECIDED)
You've decided tags stay **free-text** and the AI reconciles "marking / Marking / mark D"
later. That's a reasonable call given an AI normalization pass is coming — it keeps
friction near zero. Two small things to make that later pass easier:
- In the **tooltip, tell users to "treat these like tags"** (short, comma-separated
  concepts) so the raw text is at least tag-shaped rather than a paragraph.
- Store it as a list if the UI allows comma/enter-to-chip, or just as raw text with a
  `normalized_tags` column left null for the AI to fill. Either way, **don't block on it.**

### 2.2 Mobile-first (REQUIREMENT) + voice dictation (next step)
Mobile is a hard requirement, so design narrow-screen first:
- Big tap targets, minimal typing, generous defaults, **touch-friendly tooltips**
  (tap to open, not hover).
- Re-examine the desktop-shaped parts of the plan (scroll-up-to-revisit, slide reveals,
  expandable top bar) and make sure each works one-handed on a phone.

**Native voice dictation (planned next step) is a strong fit here** — it's the single
biggest friction-killer for the "coach has lots to say but hates typing on a phone"
problem. Design notes so today's choices don't block it:
- Capture an audio clip in the browser → POST to the backend → transcribe → drop the
  text into the relevant field for the coach to confirm/edit.
- Keep the **raw audio** (or at least the raw transcript) alongside the structured text;
  transcription isn't perfect and you'll want the original.
- It maps naturally onto per-field dictation **and** onto the later AI-chat step (voice
  in, AI probes follow-ups). Same pipeline.

### 2.3 Friction vs. richness — DECIDED: optional-first
Confirmed approach: **most/all fields optional, submit enabled after the first word.**
Good — that's the right tradeoff for volunteers on phones. Complements:
- Mark at most the 1–2 genuinely useful required fields (e.g. a name) if any; otherwise
  truly all-optional is fine.
- A lightweight progress/"you've filled N fields" cue so it still feels finite.
- Keep a freeform box per type so a coach who only wants to dump one paragraph can.

### 2.4 Autosave + save button (DECIDED) and connectivity
Confirmed: **autosave** (great) plus a **manual save button** (very doable). Suggested shape:
- Autosave the in-progress entry to `localStorage` on a debounce; restore it on return.
  This also softens the "you'll lose your work when you switch sections" warning.
- The **save button** = an explicit "save draft" that reassures the user their work is
  kept (same `localStorage` mechanism, just user-triggered + a confirmation toast).
- Tournament/poor-signal aside (relevant once you do share the form): on submit failure,
  keep the draft locally and retry/queue rather than dropping it.

### 2.5 Contributor info section (DECIDED — quick add)
Add a short contributor section: **name, email, phone (optional)**. Recommendations:
- Make it lightweight and ideally **collected once**, then prefilled on subsequent
  submissions (see 2.8).
- Add a one-line consent checkbox: "OK to use this in a public ultimate knowledge base?"
  — cheap now, builds trust, and you're storing personal contact info so it's worth being
  explicit.
- Store it in the `contributor` blob on the submission row; this is also how you tie the
  tournament-collected contacts (Section 4) to the forms they later fill out.

### 2.6 Validation / anti-troll (DECIDED to include)
You want validation so people can't troll. Practical layers, validate **on the backend**
(client checks are bypassable):
- Reasonable length caps per field; reject empty-but-whitespace; cap total payload size.
- A **honeypot** hidden field and a basic per-IP/per-contact rate limit to stop spam bots.
- Optional: a lightweight profanity/garbage heuristic to flag (not auto-delete) suspect
  rows for your review, since the AI/encyclopedia step will surface them anyway.
- Since submissions route through your backend (1.1), this is one clean place to enforce
  all of it before the Supabase write.

### 2.7 Analytics (DECIDED — if doable)
Worth it: track visits, starts, completions, and **where people drop off**. Even a
minimal funnel tells you which field is killing completion. Low-lift options: a
privacy-friendly analytics tool (Plausible/Umami) for page-level, plus a couple of
custom events (`form_started`, `field_completed`, `submitted`) posted to your backend so
the drop-off data lives next to your submissions.

### 2.8 Multi-submit ergonomics & prefill (DECIDED)
You nailed "submit → thank you → submit another." Add: **prefill the contributor info**
(2.5) on the 2nd+ submission so a coach entering 5 drills types their name/email once.
Persist it in `localStorage` so it survives a refresh within their session.

---

## 3. Things in the plan that are good — keep them

- **Tutorial-first landing + collapsible info bar** — great for first-time clarity.
- **Tooltips everywhere** — right call for a niche-jargon domain.
- **Confirm-before-submit and return-to-start loop** — good completion UX.
- **Per-type field lists** — genuinely well thought through; they map cleanly to a schema.
- **Always-an-"Other"/freeform escape hatch** — exactly right; keep a freeform box on
  *every* type, not just the "Other" path, so nothing valuable is lost to rigid fields.
- **Planning for the AI step without building it yet** — correct sequencing.

---

## 4. Go-to-market: collect contacts at the tournament, send the form after (DECIDED)

This is the key strategic decision and it's a strong one. **Don't hand coaches the form
mid-tournament.** Between games, coaches are tired, on the field, and thinking about
their next opponent — exactly the wrong moment to ask for thoughtful written input.
Instead:

1. **At the tournament:** talk to coaches in person, explain the project, and **collect
   their contact info** (name, email, phone). Low-friction for them, and the personal
   pitch is far more compelling than a cold link.
2. **After the tournament:** email them the polished form when they have spare time and
   headspace to give real, considered answers.

Why this is better:
- Removes all deadline pressure on the build — you ship a *good* form, not a rushed one.
- Higher-quality submissions (relaxed coach > field-side coach).
- The in-person ask + follow-up dramatically beats completion rates of a link handed out
  and forgotten.
- It gives you a **warm contact list** — an asset beyond this one form (future encyclopedia
  launch, beta testers, etc.).

Implications to plan for:
- You need a **dead-simple contact-capture method for the day** — even a Google Form,
  a Notes doc, or a single-screen "leave your info" page. This is separate from and much
  simpler than the real form.
- Personalize the follow-up email (you met them; reference it) and consider including the
  contributor info you already have so they don't re-enter it.
- A gentle reminder/nudge if they don't fill it out within a week or two.

### Still worth considering: "scribe mode"
You'll be *physically with* coaches. For the most generous talkers, the richest data may
come from you taking notes (or a voice memo) against the schema while they talk, rather
than any form. A "scribe mode" — the same form, filled by *you* during a conversation —
could be a high-value capture path and dovetails perfectly with the planned voice
pipeline (2.2). Optional, but cheap to keep in mind.

---

## 5. Designing for the AI next step (since the plan asks)

The planned AI "probe the user with questions" step is much easier if you do these now:
- **Store raw + structured.** Always keep the verbatim text (and raw audio/transcript
  from the voice step) alongside any structured fields; the AI (and you) will want the
  original.
- **Stable schema + `schema_version`** so the AI has a consistent target to fill, and so
  the later **tag-normalization pass** (2.1) has clean rows to write `normalized_tags` to.
- **Three AI jobs share one pipeline:** (a) voice transcription (2.2), (b) tag/concept
  reconciliation (2.1), (c) conversational probing to fill the schema. All three are
  "text/audio in → fill the same schema." If the schema and the backend submission
  endpoint are solid, each is an additive change, not a data migration.
- The AI chat step is essentially: same schema, but a chat front end fills the fields.
  When you build it, use the latest Claude models for the conversational probing (and
  for the tag normalization).

---

## 6. Suggested build order

**This weekend (tournament) — minimal, separate from the real form:**
0. A dead-simple **contact-capture** method for the day (Google Form / Notes / one-screen
   page). That's all you need on-site (Section 4).

**Then, the real form (no deadline crunch):**
1. Lock the schema + the Supabase table (envelope in 1.2, storage in 1.1).
2. Stand up the **backend submission endpoint** that validates + formats + writes to
   Supabase (1.1, 2.6).
3. Build the 3 paths **mobile-first**, mostly-optional fields + a freeform box each (2.2, 2.3).
4. Wire real submission + **autosave + save button** (`localStorage`) (2.4).
5. Add the **contributor info + consent** section, with prefill on repeat submits (2.5, 2.8).
6. Backend **validation / anti-troll** (length caps, honeypot, rate limit) (2.6).
7. Layer in animations, per-section colors, tooltips, learn-more page (the UX polish).
8. Add **analytics / drop-off funnel** before you send the link out (2.7).
9. Send the personalized follow-up to your tournament contacts (Section 4).

**Later next-steps (plan-for, don't build yet):**
10. Native **voice dictation → backend transcription** (2.2).
11. **AI tag normalization** and **AI conversational probing** (Section 5).
12. The full encyclopedia front end.

---

*Bottom line: the vision and content are strong, and the open questions from the first
draft are now resolved — Supabase via your backend, mobile-first, optional fields with
autosave + save, free-text tags, a contributor section, validation, and (the smart move)
collecting contacts at the tournament to send a polished form afterward. With the deadline
pressure gone, build data-capture-first, then polish. This is a winner.*

---
---

# Review: Plan v2 — the AI interview process

A review of the v2 section: turning the form into an AI-guided interview, with
coverage-aware probing, voice/media, and a seed knowledge base.

## TL;DR

**Is the interview direction right?** Yes — strongly. For extracting *tacit* expert
knowledge (the stuff coaches know but wouldn't think to write in a form field), an
adaptive interview beats a static form, and your hybrid "preset questions first, then
AI-generated follow-ups" is exactly the right way to do it. The **coverage-aware
probing** ("don't collect the 50th basic description of 4 lines, dig for the variation
instead") is the standout idea — it's genuinely sophisticated and it's what would make
this product feel smart rather than like a chatbot bolted onto a form.

**Where the risk concentrates:** three things will make or break it, and none are in the
plan yet. (1) **Domain credibility** — if the AI sounds like it doesn't know ultimate,
expert coaches bail in one turn. (2) **Entity resolution** — "recognize this is the same
drill" is the hard unsolved problem the dedup feature rests on. (3) **Tone when
deflecting** — telling a generous volunteer "we already have this" can sting. The seed
knowledge base (your stretch item) is actually the linchpin for #1 and #2, so it's worth
pulling earlier than "stretch."

---

## v2.1 Strong points — keep these

- **Interview over form for expert elicitation.** Correct instinct. Open-ended, adaptive
  questioning surfaces the tacit knowledge a fixed form can't reach.
- **Hybrid preset → AI-generated questions.** Smart cold-start: the canned openers ground
  the AI in real context before it has to generate, avoid an awkward blank-chat start, and
  guarantee you capture the basics even if the AI underperforms.
- **Coverage-aware probing / dedup.** The best idea in the doc. Treating redundancy as a
  signal to go *deeper* (not collect another duplicate) is what turns this from "AI form"
  into a knowledge-acquisition engine. See v2.3 for how to make it real.
- **Defer curation to later agents.** Right separation of concerns — capture richly now,
  structure later. Keep the verbatim transcript so those agents have everything.
- **Voice-first for ramblers.** Speaking lowers the activation energy for a tired coach
  enormously; this likely *doubles* the richness of answers vs. typing on a phone.
- **Seed knowledge base to ground the AI.** This is more foundational than "stretch" — see
  v2.6.

## v2.2 Domain credibility — the thing that silently kills it

Expert coaches will judge the AI in the **first one or two questions.** If it asks "what
is a cut?", misuses terminology, or hallucinates ultimate "facts," a knowledgeable coach
concludes the tool is dumb and stops giving you their good material (or leaves). This is
the highest-leverage risk and it's not addressed yet.

- **Ground every question in real domain knowledge** (RAG over the seed KB, v2.6) rather
  than the model's own sport knowledge, which will be patchy and wrong on specifics.
- **Persona:** a knowledgeable, humble *peer*, not a chipper assistant. "I want to make
  sure I capture how *you* run this" beats "Great question! Let's dive in!". Coaches
  respect competence and concision.
- **Few-shot the model** with examples of good, specific ultimate questions (your example
  transcript in the plan is a great seed for this) so it asks like someone who plays.
- **Never have it explain the sport back to the coach** — it's there to ask and listen.

## v2.3 Coverage model + entity resolution — make the dedup real

This is the cleverest feature and also the least specified. Two hard sub-problems:

**(a) "Is this the same drill?" (entity resolution).** Matching a coach's free-text
description to a canonical entry is genuinely hard: one drill has many names, and one name
("4 lines") covers many variants. If you get a false "we already have this," you shut down
a coach who actually had a *novel* variation — the exact opposite of the goal.
- Maintain a **canonical entity registry** (drills/strategies) with aliases and embeddings.
- Match by **semantic similarity over the description**, not just the name, then **confirm
  with the coach** ("Sounds like the '4 lines' cutting drill — is that the one?"). You
  already planned the confirm step; keep it, and make it cheap to say "no, mine's
  different."

**(b) "What do we already know vs. not?" (coverage matrix).** "Well covered" needs a
definition or "early stopping" is arbitrary.
- Model coverage **per aspect** (setup / how-to-run / focuses / variations / common
  mistakes) with a fill + confidence score, not a single boolean. A drill can be
  saturated on "setup" but wide open on "what teams get wrong."
- Then the AI **routes around what's filled**: skip setup, probe the empty/low-confidence
  aspects. This is more useful than a binary "skip this drill."
- **Cold start:** early on, coverage is ~empty, so the system should behave like a normal
  interview and *expect* to collect basics. Behavior should scale with coverage — note
  this so it doesn't feel broken on day one.

**(c) Don't over-suppress — the value is often the variation.** Even a "fully covered"
drill may have a uniquely good take from this specific coach. Bias toward *pivoting*
("we've got the basics — what's a detail most teams get wrong?") over *dismissing*.

## v2.4 Tone when deflecting — protect the generous contributor

"This drill is already well documented, pick something else" can deflate someone who
volunteered their time. Reframe deflection as a **compliment + pivot**, never a dismissal:
- ✅ "You clearly know 4 lines inside out — we've got the basics down. What's a variation
  or coaching cue most teams miss?"
- ❌ "This is already well covered, is there something else?"
Always let them keep talking if they want. A coach who feels brushed off won't fill out the
next one — and your whole pipeline depends on goodwill.

## v2.5 The conversational-submission data model (new vs. v1)

An interview doesn't produce neat fields — it produces a transcript. Decide the shape now:
- Store **`messages[]`** (full turn-by-turn), **raw audio refs**, **media refs**, the
  **resolved canonical entity** it attaches to, and a **`coverage_contribution`** record
  (which aspects this interview advanced). Leave structured-field extraction to the later
  curation agents, but keep everything verbatim so they can.
- Carry over `submission_id`, `contributor`, `schema_version`, timestamps from v1 (§1.2).
- **Per-turn server-side autosave + resume.** Interviews are longer than forms, so
  mid-way abandonment is more likely — a coach must be able to leave and come back.
- **Let the coach review/edit what was captured.** Voice transcription errors + AI
  paraphrasing can misstate them; before it becomes "knowledge," show it back.

## v2.6 Seed knowledge base — promote it from stretch to foundation

You list this as a stretch feature, but it's the **enabler for v2.2 (credibility), v2.3
(coverage/dedup), and good question generation.** Without a grounding corpus, the AI
interviews from its own shaky sport knowledge. Consider building a small seed *first*.
- **Sourcing caution:** scraping Ultiworld / USAU / YouTube raises copyright + quality
  issues. Better to hand-curate a compact, high-quality seed (you're an expert — you can
  write or vet the canonical basics fast) plus reputable sources you have rights to. You
  don't need everything; you need enough to ground questions and seed the entity registry.
- This corpus does double duty: it grounds the *intake* interview now and becomes the
  *encyclopedia* later — same data, so design the schema once.
- Note the eventual flywheel you already identified: as the KB grows, intake questions get
  sharper, which grows the KB. That's the core loop — worth designing for explicitly.

## v2.7 Voice & media — phase it, and pin down the boring parts

- **Voice dictation ≠ voice interview.** Dictation (speak an answer → transcribe → confirm)
  is easy and high-value: do it first. A full **realtime spoken conversation** ("less
  soulless") is much harder — turn-taking, latency, TTS quality, cost. Phase it:
  1. dictation into text answers → 2. turn-based voice (speak answer, AI replies in
  text/TTS) → 3. realtime speech-to-speech. **Don't gate anything on phase 3.**
- **Always keep raw audio** alongside the transcript (transcription errs on jargon/names).
- **Media uploads are under-specified:** decide file types + size limits, **storage**
  (Supabase Storage / S3), how a file links to a submission, and abuse/moderation. For
  **video, just store the URL.** For **play diagrams**, store the image now; a later
  vision model can interpret it (this is a nice future capability — note it). Get explicit
  rights/consent to reuse anything uploaded.

## v2.8 Things not yet in the plan

- **Consent now covers audio.** You're recording voice — get explicit consent to record,
  store, and reuse audio, on top of the v1 contribution consent (§2.5).
- **Guardrails / scope.** A public AI chat invites off-topic use, prompt-injection, and
  garbage. Add a scope guard ("I'm here to talk ultimate") and carry over v1's anti-troll
  layer (§2.6). Moderate uploaded media.
- **Latency & cost.** Every turn is an LLM call (± transcription ± retrieval); interviews
  are many turns, on mobile, maybe on bad signal. Use a **cheap model for routing/coverage
  checks and a stronger one for question generation**, stream responses, summarize long
  contexts, and cache. Watch per-interview cost at scale. Use the latest Claude models, and
  pick the tier per task rather than one model for everything.
- **Interview length governance.** Open-ended interviews can sprawl and fatigue people.
  Always show "I'm done / submit now" and "skip this question," and give the AI a soft
  question budget so it knows to wrap up.
- **Escape hatch for chat-haters.** Some coaches will hate a chat UI — always offer "just
  let me type/say it all in one box," i.e. keep the v1 free-form path reachable.

## v2.9 Expansions to make it better

- **Provoke with other coaches' answers.** The most powerful upgrade: surface prior (often
  *conflicting*) submissions as prompts — "Some coaches force middle here, others force
  flick; what's your take?" This drives debate, surfaces nuance, and turns disagreement
  into rich, multi-perspective data instead of a curation headache.
- **Adaptive depth by detected expertise.** Sense how knowledgeable the coach is and go
  deeper/lighter accordingly; capture a confidence/experience signal to help later
  curation prioritize.
- **Coach-steered topics.** Let them pick what to talk about ("I want to discuss zone D")
  instead of only AI-driven branching — many experts arrive with a specific thing to say.
- **Close the loop / give credit.** Later, let contributors review and endorse the
  encyclopedia entry their input fed. Credit + a sense of authorship massively boosts
  willingness to contribute again.
- **Async follow-ups.** The AI can email a coach one sharp follow-up question days later —
  cheap, and it deepens entries without re-engaging the whole interview.
- **Define "a good interview."** Track novelty (new info gained), aspects advanced,
  length-vs-value, and a one-tap "was this worth your time?" at the end, so you can tune.

---

*Bottom line: the interview pivot is the right call and the coverage-aware probing is a
genuinely strong, differentiated idea. The plan is strongest on vision and weakest on the
three things that actually determine whether expert coaches trust it — domain credibility,
entity resolution, and deflection tone — all of which lean on a seed knowledge base that's
currently filed under "stretch." Pull the seed KB forward, design the conversational data
model and resume/consent now, phase the voice work, and treat the contributor's goodwill
as the scarce resource it is. Do that and the interview version is meaningfully better than
the form — not just fancier.*
