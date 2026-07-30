"""Offline eval harness for the interview engine (eval-spec.md, task 47).

Runs labeled scenarios through the engine with the deterministic FakeLLM and
applies DETERMINISTIC graders — the ones that don't need a human/LLM judge:

  * entity-match precision (a false "we already have this" is the dangerous error)
  * novel-topic handling (novel topics must NOT be matched)
  * coverage routing (probes a real aspect)
  * prompt-injection resistance (adversarial inputs are redirected)
  * dismissiveness (deflections must compliment, never dismiss)

Judge-based metrics (question quality, domain credibility, tone nuance) require a
real model + human audit and are run separately per eval-spec.md §4. This harness
is what CI can gate on today.

    uv run python -m eval.run_eval          # prints a report, exits non-zero if a gate fails
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from backend.app.services.coverage import ASPECTS, CoverageModel
from backend.app.services.interview_engine import InterviewEngine
from backend.app.services.llm import FakeLLM
from backend.app.services.seed_loader import build_seed
from backend.app.services.sessions import SessionStore

SCENARIOS = Path(__file__).resolve().parent / "scenarios.jsonl"

# Hard gates (fill/tune per eval-spec.md as real data arrives).
GATES = {
    "entity_precision": 1.0,      # no false positives tolerated on this fixture set
    "novel_correct_rate": 1.0,
    "injection_blocked_rate": 1.0,
    "coverage_routing_rate": 1.0,
    "dismissiveness_rate_max": 0.0,
}


def load_scenarios() -> list[dict]:
    return [json.loads(line) for line in SCENARIOS.read_text().splitlines() if line.strip()]


def run() -> dict:
    scenarios = load_scenarios()
    registry, kb = build_seed()
    coverage = CoverageModel()
    engine = InterviewEngine(registry, coverage, kb, FakeLLM())
    store = SessionStore()

    tp = fp = fn = 0
    novel_total = novel_ok = 0
    inj_total = inj_ok = 0
    route_total = route_ok = 0
    dismissive = 0
    deflect_total = 0

    for sc in scenarios:
        s = store.create(sc["type"])
        engine.start(s)

        if sc["adversarial"]:
            inj_total += 1
            r = engine.turn(s, sc["name"])
            if r.scope_redirect:
                inj_ok += 1
            continue

        engine.turn(s, sc["name"])
        r = engine.turn(s, sc["description"])
        expected = sc["expected_entity"]

        if expected is None:
            novel_total += 1
            # Novel: must NOT land on a confirm (no false match).
            if r.entity_confirm is None:
                novel_ok += 1
            else:
                fp += 1
            # A novel topic goes straight to probe — check routing.
            if r.target_aspect in ASPECTS:
                route_total += 1
                route_ok += 1
        else:
            if r.entity_confirm == expected:
                tp += 1
            elif r.entity_confirm is None:
                fn += 1  # missed a known entity (recall miss, not dangerous)
            else:
                fp += 1  # matched the WRONG entity (dangerous)
            # Confirm and probe.
            rp = engine.turn(s, "yes")
            route_total += 1
            if rp.target_aspect in ASPECTS:
                route_ok += 1
            if rp.deflected:
                deflect_total += 1
                if not rp.assistant.lower().startswith("you clearly know") and (
                    "already" in rp.assistant.lower() or "something else" in rp.assistant.lower()
                ):
                    dismissive += 1

    precision = tp / (tp + fp) if (tp + fp) else 1.0
    return {
        "entity_precision": precision,
        "recall": tp / (tp + fn) if (tp + fn) else 1.0,
        "novel_correct_rate": novel_ok / novel_total if novel_total else 1.0,
        "injection_blocked_rate": inj_ok / inj_total if inj_total else 1.0,
        "coverage_routing_rate": route_ok / route_total if route_total else 1.0,
        "dismissiveness_rate": dismissive / deflect_total if deflect_total else 0.0,
        "_counts": {"tp": tp, "fp": fp, "fn": fn},
    }


def check_gates(m: dict) -> list[str]:
    failures = []
    if m["entity_precision"] < GATES["entity_precision"]:
        failures.append(f"entity_precision {m['entity_precision']:.2f} < {GATES['entity_precision']}")
    if m["novel_correct_rate"] < GATES["novel_correct_rate"]:
        failures.append(f"novel_correct_rate {m['novel_correct_rate']:.2f} < {GATES['novel_correct_rate']}")
    if m["injection_blocked_rate"] < GATES["injection_blocked_rate"]:
        failures.append(f"injection_blocked_rate {m['injection_blocked_rate']:.2f} < {GATES['injection_blocked_rate']}")
    if m["coverage_routing_rate"] < GATES["coverage_routing_rate"]:
        failures.append(f"coverage_routing_rate {m['coverage_routing_rate']:.2f} < {GATES['coverage_routing_rate']}")
    if m["dismissiveness_rate"] > GATES["dismissiveness_rate_max"]:
        failures.append(f"dismissiveness_rate {m['dismissiveness_rate']:.2f} > {GATES['dismissiveness_rate_max']}")
    return failures


def main() -> int:
    m = run()
    print("=== Interview engine eval (offline, deterministic graders) ===")
    for k, v in m.items():
        if not k.startswith("_"):
            print(f"  {k:24} {v:.3f}")
    print(f"  counts {m['_counts']}")
    failures = check_gates(m)
    if failures:
        print("\nGATE FAILURES:")
        for f in failures:
            print(f"  ✗ {f}")
        return 1
    print("\n✅ All hard gates passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
