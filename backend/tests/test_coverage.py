from __future__ import annotations

from uuid import uuid4

from backend.app.services.coverage import ASPECTS, CoverageModel


def test_cold_start_all_aspects_are_gaps():
    cov = CoverageModel()
    eid = uuid4()
    gaps = cov.gaps(eid)
    assert set(gaps) == set(ASPECTS)  # brand-new entity: interview normally


def test_record_moves_aspect_out_of_top_gaps():
    cov = CoverageModel()
    eid = uuid4()
    # Saturate "setup" repeatedly.
    for _ in range(3):
        cov.record(eid, {"setup": 0.5})
    gaps = cov.gaps(eid)
    # setup should now be the MOST covered → last in the least-covered-first order.
    assert gaps[-1] == "setup"
    assert gaps[0] != "setup"


def test_saturation_flag():
    cov = CoverageModel(saturated_at=0.5)
    eid = uuid4()
    assert cov.is_saturated(eid, "setup") is False
    for _ in range(4):
        cov.record(eid, {"setup": 1.0})
    assert cov.is_saturated(eid, "setup") is True
    # An untouched aspect stays a gap → interview pivots there, not dismisses.
    assert cov.is_saturated(eid, "common_mistakes") is False


def test_unknown_aspect_is_ignored():
    cov = CoverageModel()
    eid = uuid4()
    cov.record(eid, {"not_an_aspect": 1.0})  # must not raise
    assert cov.coverage_of(eid)["setup"].fill_score == 0.0