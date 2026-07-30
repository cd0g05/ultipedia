# Eval Spec: Ulti-pedia AI Interview Engine

> Cicadas does not run evals. This spec guides your eval harness (built in `feat/ai-interview`,
> task id 47). Fill in numeric thresholds as you establish baselines, then run it outside Cicadas.

## 1) Problem & Success

**Problem Statement:** The v2 AI interview must extract rich, novel ultimate-frisbee knowledge
from expert coaches without (a) sounding like it doesn't know the sport, (b) falsely telling a
coach "we already have this," or (c) dismissing a generous volunteer. These three failures
silently kill the data pipeline, and none are caught by ordinary unit tests — they need
behavioral evals.

**Use Case:** A coach is interviewed about a drill ("4 lines") or strategy (zone D). The engine
asks grounded openers, recognizes the entity, confirms it, routes around saturated aspects, and
probes the gaps/variations — in a humble-peer tone — then captures a clean transcript.

**Objective / Intended Impact:** Maximize *novel knowledge captured per interview* while
preserving contributor goodwill (they come back and submit again).

**Primary Hypothesis:** A RAG-grounded, tiered-model interview engine can ask domain-credible,
coverage-aware questions with entity-match precision ≥ \<threshold\> and a dismissiveness rate ≈ 0,
within a per-interview cost ≤ \<budget\> and turn latency ≤ \<target\>.

**Scope:**
- **In:** opener grounding, follow-up relevance, entity resolution (confirm-then-resolve),
  coverage routing, deflection tone, scope-guard, prompt-injection resistance.
- **Out:** transcription accuracy (covered separately in `feat/voice-dictation`), realtime
  voice quality, the later encyclopedia curation agents.

**Success Criteria (numeric — hard gates, fill in):**
- Entity-match **precision** ≥ \<P\> (false "same drill" is the dangerous error → favor precision).
- **Dismissiveness rate** ≤ \<near-0\> (judge-rated: did it brush off the contributor?).
- **Domain-credibility** pass rate ≥ \<threshold\> (no terminology misuse / no quizzing experts /
  no explaining the sport back).
- Per-interview **cost** ≤ \<budget\>; p90 turn **latency** ≤ \<target\>.

---

## 2) Metrics

| **Metric** | **Target / Constraint** | **Type (Hard Gate/Monitor)** | **Bucket** |
|------------|-------------------------|------------------------------|-----------|
| Entity-match precision | ≥ \<P\> | Hard Gate | Task |
| Entity-match recall | ≥ \<R\> (monitor; recall less critical than precision) | Monitor | Task |
| Coverage-routing correctness (probes a true low-coverage aspect) | ≥ \<threshold\> | Hard Gate | Task |
| Question relevance/specificity (judge) | ≥ \<threshold\> | Hard Gate | Task |
| Domain-credibility (no jargon misuse / no basic-quizzing) | ≥ \<threshold\> | Hard Gate | Safety/Quality |
| Dismissiveness rate (deflects rudely) | ≤ \<near-0\> | Hard Gate | Safety |
| Scope-guard + injection resistance | 100% on adversarial set | Hard Gate | Safety |
| Novel-info-per-interview (aspects advanced) | trend up | Monitor | Task |
| Per-interview cost | ≤ \<budget\> | Hard Gate | Cost |
| p90 turn latency | ≤ \<target\> | Monitor | Latency |

**Metric definitions:** Entity precision/recall computed against labeled (description → canonical
entity) pairs. Tone/credibility/relevance graded by an LLM judge with a rubric, spot-audited by a
human (Carter). Coverage-routing checked by whether the asked aspect was the lowest-coverage one
in the fixture state. Cost/latency from per-turn token + timing logs.

---

## 3) Data

**Dataset Description:** A scenario set of mock interviews: (a) common saturated drills ("4 lines"
and friends) to test deflection + coverage routing; (b) near-duplicate-but-novel variants to test
that precision doesn't cause false suppression; (c) genuinely distinct entities; (d) adversarial /
off-topic / prompt-injection inputs; (e) expert vs. novice phrasing for adaptive depth.

**Sources & Privacy:** Hand-authored by Carter (domain expert) + lightly anonymized snippets from
real submissions **only with contributor consent**. No PII in the scenario files. Keep any private
data out of the public repo / in gitignored paths.

**Labels & Guidelines:** Each scenario labels the expected canonical entity (or "novel"), the
true low-coverage aspect to probe, and a tone/credibility rubric. Guidelines define
"dismissive vs. complimentary-pivot" with the ✅/❌ examples from ux.md Copy & Tone.

**Storage & Manifest:** `eval/scenarios/*.jsonl` + `eval/manifest.md` (owner: Carter).

---

## 4) Methodology

**Experiment Approach:** Establish a baseline (current prompts/models), then change one variable
at a time (persona prompt, few-shot set, model tier, retrieval depth, coverage thresholds) and
compare against gates. Confirm-always entity matching stays on until precision gate is met.

**Graders & Rubrics:** Deterministic checks (entity id match, aspect-id match, injection-blocked
boolean) + LLM judge for tone/credibility/relevance + human spot-audit on a sample each run to
calibrate the judge.

---

## 5) Model & Resource Requirements

**Model Configuration:** Tiered — Haiku 4.5 for routing/coverage/entity-candidate checks;
Opus/Sonnet for question generation. Record temperature, max tokens, system prompt version, and
output schema per variant. Judge model fixed across runs for comparability.

**Human & Technical Resources:** Carter for authoring + audits; Anthropic API budget for runs;
embeddings provider for the entity/RAG fixtures.

---

## 6) Experiment Harness / Framework

**Tooling:** Lightweight Python harness in `eval/` (runs scenarios through `interview_engine.py`
in a test mode, logs turns + tokens + timings, applies graders). Lab-style first; in-situ
monitoring (real interviews) added once live.

**Assets Location:** prompts in `backend/app/services` prompt assets; scenarios in
`eval/scenarios/`; run outputs in `eval/runs/` (gitignored).

---

## 7) Timeline

**Milestones & Decision Date:** Baseline during `feat/ai-interview`; iterate to green gates
before relying on automated deflection/entity-suppression in production. Ship/no-ship on the
automated-deflection behavior decided once precision + dismissiveness gates pass. Until then:
confirm-always + freeform escape hatch stay on (see approach.md parallel-evals risk).

---

## 8) Results & Experiment Snapshots

| **Variant ID** | **Change Description** | **Primary Metric** | **Δ vs Baseline** | **Notes** |
|----------------|------------------------|--------------------|-------------------|-----------|
|                |                         |                    |                   |           |

**Best Run Snapshot:** (name, dataset, prompt version, model tier, key metrics, run link)

---

## 9) Exit Criteria

Ship automated deflection/entity-suppression when entity-match precision, dismissiveness, domain-
credibility, coverage-routing, and safety (scope/injection) hard gates are all met on the scenario
set and the human audit agrees with the LLM judge at an acceptable rate.

Abort/Pivot: if after N serious prompt/model variants precision or dismissiveness stays below
target, keep confirm-always permanently and treat coverage routing as advisory (suggest, never
suppress).

---

## 10) Wrap-Up & Peer Review

**Summary:** What was tried, scenario set used, metrics achieved, decision made.

**Reviewers:** Carter (product + domain). [Add an ML/eval reviewer if one joins.]
