
---
summary: "The intake experience is warm, animated, mobile-first, and tutorial-led. v1 is a single-page flow: tutorial → pick path (Drills/Strategies/Other) → optional fields + freeform with tooltips → confirm → thank-you → submit-another, with autosave + save. v2 swaps the field set for an AI chat/interview (text + voice) over the same shell, with per-aspect probing, complimentary deflection, transcript review, and a chat-hater escape hatch. Tone: knowledgeable humble peer; never dismiss a volunteer."
phase: "ux"
when_to_load:
  - "When designing or reviewing journeys, flows, states, copy, and interaction constraints."
  - "When implementation questions depend on experience details rather than product goals alone."
depends_on:
  - "prd.md"
modules:
  - "frontend form/interview UI"
index:
  design_goals: "## Design Goals & Constraints"
  journeys: "## User Journeys & Touchpoints"
  information_architecture: "## Information Architecture"
  key_flows: "## Key User Flows"
  ui_states: "## UI States"
  copy_tone: "## Copy & Tone"
  visual_design: "## Visual Design Direction"
  mockups: "## HTML/CSS Mock-Ups"
  consistency: "## UX Consistency Patterns"
  accessibility: "## Responsive & Accessibility"
next_section: "Design Goals & Constraints"
---

# UX Design: Ulti-pedia Knowledge Intake

## Progress

- [x] Design Goals & Constraints
- [x] User Journeys & Touchpoints
- [x] Information Architecture
- [x] Key User Flows
- [x] UI States
- [x] Copy & Tone
- [x] Visual Design Direction
- [x] HTML/CSS Mock-Ups
- [x] UX Consistency Patterns
- [x] Responsive & Accessibility

---

## Design Goals & Constraints

**Primary goal:** A great first use feels *warm, effortless, and respectful of the
contributor's time.* The emotional outcome: "that was easy and kind of pleasant — I'll do
another." The contributor should never feel quizzed, blocked, dismissed, or at risk of
losing their work.

**Design constraints:**
- **Mobile-first is a hard requirement** — design narrow-screen first; everything must work
  one-handed on a phone. Desktop is an enhancement, not the base case.
- **Establish a new design system** — warm, vibrant-but-not-bold palette; smooth animation
  on nearly everything; per-section contrasting colors for clear boundaries.
- **Low-friction over completeness** — nearly all fields optional; submit after first word.
- **Capture-rich, curate-later** — never block the user for the sake of clean data.
- v2 adds **conversational + voice** interaction over the same shell; design v1 so the chat
  step is an additive surface, not a rebuild.

**Skip condition:** Not backend-only — this initiative is UI-heavy. (Backend-only partitions
are noted N/A in their own sections.)

---

## User Journeys & Touchpoints

### Maya — post-tournament coach (typing, v1→v2)

**Entry point:** Personal follow-up email after the tournament (warm, not a cold link).
**First touchpoint:** Tutorial landing — short, friendly, "here's what this is."
**Key moment:** Picks **Drills**, sees only optional fields + a freeform box, realizes she
can give as little or as much as she wants. (v2) the AI asks a sharp follow-up that pulls
out a cue she'd never have typed.
**Exit state:** Thank-you screen, "submit another?" — she does, because it was painless.
**Pain points to design around:** fear of losing work; not understanding jargon prompts;
feeling interrogated; tiny tap targets; hover-only tooltips on a phone.

### Dev — rambler, voice (v2)

**Entry point:** Same email; opens on phone.
**First touchpoint:** Picks a topic, taps the **mic** instead of the keyboard.
**Key moment:** Talks freely; sees his words transcribed and gets one crisp follow-up at a
time — no thumb fatigue.
**Exit state:** Long, dense submission captured; quick "worth your time?" tap.
**Pain points to design around:** transcription errors on names/jargon; not knowing if it's
recording; consent anxiety; wanting to fix a garbled line.

### Carter — operator/scribe (cross-cutting)

**Entry point:** Direct/admin; also "scribe mode" = the same intake UI filled by Carter
while a coach talks in person.
**First touchpoint:** Reviews incoming submissions + drop-off analytics (operator surface,
lightweight — could be Supabase dashboard initially).
**Key moment:** Spots a flagged/troll row; sees which field kills completion.
**Exit state:** Clean, trusted data flowing in; seed KB curated.
**Pain points to design around:** noise/garbage; no visibility into drop-off; tedious manual
review.

---

## Information Architecture

### Site/App Map

```
Ulti-pedia Intake (single page, sectioned)
├── Tutorial / Landing
│   ├── "Begin" → Path Selection
│   └── "Learn more" → Documentation (project + form explainer)
├── Collapsible Info Bar (post-begin; re-expands the tutorial)
├── Path Selection  [ Drills | Strategies | Other ]
│   ├── Drills → Drill fields + freeform   (v1)  /  Drill interview  (v2)
│   ├── Strategies → [ Formation | Play | Concept ] → fields/interview
│   └── Other → single freeform / open interview
├── Contributor & Consent  (collected once, prefilled after)
├── Confirm & Submit
└── Thank-you → "Submit another" (→ Path Selection)
```

### Navigation Model

**Primary nav:** Vertical, scroll-driven single page. Selecting a path **slides** the user
down to the relevant section. The user can **scroll up** to revisit prior sections; future
sections are not reachable until the current one is engaged.
**Secondary nav:** Collapsible top **info bar** (the shrunken tutorial) — tap to re-expand.
Path switcher chips remain reachable (with a data-loss warning if there's unsaved input).
**Key entry points:** Email link → tutorial. Returning users land with autosaved draft +
prefilled contributor info.

---

## Key User Flows

### Flow 1: Submit a drill — v1 happy path

1. Land on tutorial → tap **Begin**. Tutorial slides up into the info bar.
2. Path Selection appears → tap **Drills**. Slide down to Drill section.
3. Fill any optional fields (name, overview, concepts/tags, setup, walkthrough, focuses) +/or
   the freeform box. Autosave runs on a debounce; a **Save** button is available.
4. Tap **Submit** → contributor section (if not yet provided) → **Confirm** dialog.
5. Success → **Thank-you** + "Submit another?" → returns to Path Selection (contributor
   prefilled).

**Alternate A — switch path with unsaved input:** show "You'll lose what you've written in
this section — switch anyway?" Confirm → load new section; Cancel → stay.
**Alternate B — submit fails (bad signal):** keep draft locally, show non-blocking "Saved —
we'll retry," auto-retry/queue.
**Alternate C — return visit:** restore autosaved draft + prefilled contributor; offer
"resume or start fresh."

### Flow 2: Strategies sub-path

1. Tap **Strategies** → reveal sub-choice chips **Formation / Play / Concept / Other**.
2. Tap one → slide to that field set (formation = tips/wisdom; play = setup/run/goals/cautions;
   concept = name + "what should people know").
3. Continue as Flow 1 from step 3.

### Flow 3: AI interview — v2

1. Pick path/topic (preset openers ground the AI).
2. AI asks an opener; user answers by **typing or mic** (tap-to-talk → transcribe → show
   text to confirm/edit; raw audio kept).
3. AI asks an **adaptive follow-up**. If the topic/aspect is already well covered, it
   **compliments + pivots** to a gap/variation rather than dismissing.
4. If it thinks it recognizes the entity: **confirm** ("Sounds like '4 lines' — that one?")
   with an easy "no, mine's different."
5. Controls always visible: **skip question**, **I'm done / submit now**, **switch to one-box
   mode** (escape hatch).
6. Before submit, **review/edit** the captured transcript/summary → Confirm → Thank-you +
   "worth your time?" tap.

**Alternate A — abandon mid-interview:** per-turn server autosave; returning resumes the
conversation.
**Alternate B — chat-hater:** tap "just let me type/say it all" → v1 single freeform box.
**Alternate C — off-topic/troll:** scope guard gently redirects ("I'm here to talk ultimate").

---

## UI States

### Form section (v1)

| State | Trigger | What the User Sees |
|-------|---------|-------------------|
| **Empty** | Section just opened | Optional fields + freeform, friendly placeholder, tooltips available |
| **In progress** | User typing | Live autosave indicator ("Saved"), Save button enabled |
| **Saved** | Save tapped / autosave fired | Toast "Draft saved" |
| **Submitting** | Submit confirmed | Button spinner, inputs locked |
| **Submit success** | 2xx from backend | Thank-you screen + "Submit another?" |
| **Submit failed** | Network/5xx | Non-blocking "Saved — we'll retry"; draft kept locally |
| **Switch-away warning** | Path change w/ unsaved input | Confirm dialog (lose work?) |

### Interview surface (v2)

| State | Trigger | What the User Sees |
|-------|---------|-------------------|
| **Opener** | Topic chosen | First preset question, mic + text input |
| **Listening** | Mic tapped | Clear recording indicator + timer; stop button |
| **Transcribing** | Audio sent | Inline "transcribing…" then editable text |
| **Thinking** | Answer submitted | Streaming/typing indicator for next question |
| **Entity confirm** | Match suspected | "Sounds like X — is that it?" Yes / No, mine's different |
| **Pivot/deflect** | Aspect well covered | Compliment + targeted gap question |
| **Review** | "I'm done" | Editable summary/transcript before final submit |
| **Resumed** | Return visit | "Welcome back — pick up where you left off?" |
| **Scope-guard** | Off-topic input | Gentle redirect, conversation continues |

---

## Copy & Tone

**Voice:** Warm, concise, knowledgeable peer — like a fellow player who respects your time.
Never chipper-assistant ("Great question! Let's dive in!"), never interrogating, never
dismissive.

**Key principles:**
- Treat the contributor as the expert; the app asks and listens.
- Never blame the user; never imply their contribution is unwanted.
- Deflect by **complimenting + pivoting**, never "we already have this."
- Plain language in onboarding; ultimate jargon is fine in prompts (audience are players).

**Critical copy samples:**

| Context | Copy |
|---------|------|
| Onboarding headline | `Help build the ultimate frisbee encyclopedia.` |
| Onboarding sub | `Share a drill, strategy, or hard-won tip. Takes a couple minutes — say as much or as little as you like.` |
| Primary CTA | `Begin` |
| Path selection prompt | `What do you want to share?` |
| Tags tooltip | `Treat these like tags — short, comma-separated (e.g. agility, throwing, warmup).` |
| Field hint (optional) | `All optional — fill in whatever you've got.` |
| Save toast | `Draft saved.` |
| Switch-away warning | `You'll lose what you've written here. Switch anyway?` |
| Submit confirm | `Submit this drill? You can add another after.` |
| Submit success | `Thank you — this genuinely helps. Add another?` |
| Submit-failed | `Saved on your device — we'll retry sending it.` |
| Consent line | `OK to use this in a public ultimate knowledge base?` |
| Audio consent (v2) | `OK to record and store your voice for this? We keep the audio to fix transcription slip-ups.` |
| Deflection (v2) ✅ | `You clearly know 4 lines inside out. What's a variation or cue most teams miss?` |
| Entity confirm (v2) | `Sounds like the "4 lines" cutting drill — is that the one? (or "mine's different")` |
| Escape hatch (v2) | `Prefer to just say it all in one go? Switch to a single box.` |
| Scope guard (v2) | `I'm here to talk ultimate — want to tell me about a drill or strategy?` |
| Worth-your-time (v2) | `Was this worth your time?  👍 / 👎` |

---

## Visual Design Direction

**Style:** Warm, friendly, smoothly animated; "comfortable" over "slick/corporate."
**Color palette:** Warm and vibrant but not bold — think sunset-adjacent tones (terracotta,
amber, soft coral) on a warm off-white; each section (Drills/Strategies/Other) gets a
**slightly different contrasting hue** for clear boundaries. Semantic colors for
success/warn/error.
**Typography:** Friendly humanist sans (e.g. Inter/Nunito) with a clear weight hierarchy;
large, legible body text for mobile.
**Spacing & density:** Comfortable-to-spacious; generous tap targets; one primary thing in
focus at a time.
**Animation:** Smooth slide/expand transitions between sections; the tutorial→info-bar
shrink; respect `prefers-reduced-motion`.
**Mood reference:** "A warm, encouraging coach's clipboard" — inviting, unintimidating,
tactile. Framer Motion-driven transitions.

---

## HTML/CSS Mock-Ups

**Status:** `Deferred to implementation` — no static mock-up file is committed at draft time.
The visual direction above + the React/Framer Motion stack (see tech-design.md) define the
target; the first front-end partition (`feat/form-ui`) will produce a working mobile prototype
that serves as the living mock-up. _If a static mock-up is desired before build, add
`.cicadas/drafts/ulti-pedia-form/mockups/landing-mobile.html` and reference it here._

> Rationale for deferring: the animation/feel is the point and is far better evaluated as a
> running React prototype on a phone than as static HTML. Flagged for Builder awareness.

---

## UX Consistency Patterns

### Button Hierarchy
- **Primary action:** filled, warm accent, one per screen (`Begin`, `Submit`, `Add another`).
- **Secondary action:** outlined/ghost (`Save`, `Learn more`, `Skip question`).
- **Destructive/risky action:** switch-away & "start fresh" require a confirm dialog.

### Feedback Patterns
- **Success:** toast, brief auto-dismiss (`Draft saved`, `Submitted`).
- **Error:** inline below the field for validation; non-blocking toast for submit/network
  (never a dead end — always keep the draft).
- **Warning:** confirm dialog for data-loss (switch-away, start-fresh).
- **Info:** tap-to-open tooltips per section/field.

### Form Patterns
- **Validation timing:** light client hints; **authoritative validation server-side**.
- **Error placement:** below each field; system errors as toast.
- **Required fields:** essentially none — copy states "all optional"; submit enabled after
  first word.

### Navigation Patterns
- **Active state:** current section is expanded/colored; prior sections collapsed above.
- **Back navigation:** scroll up to revisit; info-bar tap to re-open tutorial.

### Modal & Overlay Patterns
- **When to use:** confirm-before-submit, data-loss warnings, consent — not for content.
- **Dismissal:** explicit buttons; tap-outside/ESC cancels non-destructive dialogs.

### Tooltip Pattern (mobile-critical)
- **Tap to open, not hover.** Every section + jargon-heavy field has an info affordance.

---

## Responsive & Accessibility

**Breakpoints:**

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile (base) | < 640px | Single column, stacked sections, large targets, tap tooltips |
| Tablet | 640–1024px | Single column, more breathing room |
| Desktop | > 1024px | Centered single column (max-width), same flow — not a redesign |

**Accessibility standards:** WCAG 2.1 AA.

**Key requirements:**
- Keyboard navigation: full (forms + dialogs).
- Screen reader support: labelled fields, dialog roles, live region for autosave/toasts.
- Color contrast: AA minimum across the warm palette (verify the lighter accents).
- Touch targets: 44×44px minimum.
- Reduced motion: respect `prefers-reduced-motion` — disable slides/large transitions.
- Voice (v2): clear recording state for low-vision users; never rely on color alone for
  "recording."
