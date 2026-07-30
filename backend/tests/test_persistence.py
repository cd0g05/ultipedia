"""Persistence tests — prove durability across a simulated restart.

We use InMemoryPersistence as the durability port: write with one set of
components, then build fresh components sharing the SAME port and hydrate, as if
the process restarted. This exercises the exact write-through + load paths the
Supabase port uses, without a live database.
"""

from __future__ import annotations

from backend.app.services.coverage import CoverageModel
from backend.app.services.embeddings import HashingEmbedder
from backend.app.services.entities import EntityRegistry
from backend.app.services.interview_engine import InterviewEngine
from backend.app.services.kb import KbIndex
from backend.app.services.llm import FakeLLM
from backend.app.services.persistence import InMemoryPersistence, NullPersistence
from backend.app.services.seed_loader import build_seed
from backend.app.services.sessions import SessionStore


def _fresh_registry(persistence):
    """Simulate a boot: seed (stable ids), attach port, hydrate persisted rows."""
    registry, kb = build_seed()
    registry.attach_persistence(persistence)
    registry.hydrate()
    return registry, kb


def test_seed_ids_are_stable_across_boots():
    r1, _ = build_seed()
    r2, _ = build_seed()
    names1 = {(e.canonical_name, str(e.id)) for e in r1.all()}
    names2 = {(e.canonical_name, str(e.id)) for e in r2.all()}
    assert names1 == names2  # deterministic ids


def test_variant_persists_across_restart():
    p = InMemoryPersistence()
    r1, _ = _fresh_registry(p)
    match = r1.resolve("four lines across the field", "drill")
    assert match is not None
    variant = r1.add_variant(
        match.entity.id, canonical_name="4 lines (endzone)",
        description="four lines from the endzone",
    )
    # Restart: new registry, same port.
    r2, _ = _fresh_registry(p)
    ids = {e.id for e in r2.all()}
    assert variant.id in ids
    reloaded = next(e for e in r2.all() if e.id == variant.id)
    assert reloaded.is_variant_of == match.entity.id  # parent ref still valid


def test_coverage_persists_across_restart():
    p = InMemoryPersistence()
    r1, _ = _fresh_registry(p)
    eid = r1.resolve("four lines across the field", "drill").entity.id
    c1 = CoverageModel(persistence=p)
    c1.record(eid, {"setup": 0.5})
    c1.record(eid, {"setup": 0.5})
    # Restart.
    c2 = CoverageModel(persistence=p)
    c2.hydrate()
    assert c2.coverage_of(eid)["setup"].fill_score > 0


def test_session_resumes_across_restart():
    p = InMemoryPersistence()
    store1 = SessionStore(persistence=p)
    s = store1.create("drill")
    s.add("assistant", "What's the drill called?")
    s.add("user", "4 lines")
    s.stage = "await_desc"
    store1.save(s)

    # Restart: brand-new in-memory store, same port.
    store2 = SessionStore(persistence=p)
    resumed = store2.get(s.id)
    assert resumed is not None
    assert resumed.stage == "await_desc"
    assert len(resumed.messages) == 2


def test_null_persistence_is_default_noop():
    # A registry with no port behaves exactly as before (no persistence side effects).
    registry, _ = build_seed()
    n = len(registry)
    registry.attach_persistence(NullPersistence())
    registry.hydrate()  # loads nothing
    assert len(registry) == n


def test_full_interview_persists_and_resumes():
    p = InMemoryPersistence()
    registry, kb = _fresh_registry(p)
    coverage = CoverageModel(persistence=p)
    coverage.hydrate()
    engine = InterviewEngine(registry, coverage, kb, FakeLLM())
    store = SessionStore(persistence=p)

    s = store.create("drill")
    engine.start(s); store.save(s)
    engine.turn(s, "4 lines"); store.save(s)
    engine.turn(s, "warmup four lines across the field"); store.save(s)

    # Restart mid-interview and resume.
    store2 = SessionStore(persistence=p)
    resumed = store2.get(s.id)
    assert resumed is not None
    assert resumed.stage == "confirm"  # awaiting entity confirmation
