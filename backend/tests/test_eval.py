"""CI gate: the offline eval harness must pass its deterministic hard gates."""

from __future__ import annotations

from eval.run_eval import check_gates, run


def test_interview_eval_gates_pass():
    metrics = run()
    failures = check_gates(metrics)
    assert failures == [], f"eval gate failures: {failures}"
    # Sanity: we actually matched the known entities (no false positives).
    assert metrics["entity_precision"] == 1.0
    assert metrics["_counts"]["tp"] >= 5
