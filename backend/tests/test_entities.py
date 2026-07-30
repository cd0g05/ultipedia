from __future__ import annotations

from backend.app.services.embeddings import HashingEmbedder
from backend.app.services.entities import EntityRegistry
from backend.app.services.seed_loader import build_seed


def test_seed_loads_entities():
    registry, _ = build_seed()
    assert len(registry) >= 5


def test_resolves_known_drill_by_free_text_as_candidate():
    registry, _ = build_seed()
    match = registry.resolve("four lines cutting drill", "drill")
    assert match is not None
    assert match.entity.canonical_name == "4 lines"
    # It's a candidate to confirm, not a silent decision.
    assert match.score >= 0.35


def test_resolves_alias_for_formation():
    registry, _ = build_seed()
    match = registry.resolve("we run vert stack a lot", "strategy.formation")
    assert match is not None
    assert match.entity.canonical_name == "Vertical stack"


def test_distinct_topic_returns_no_match_for_novel_contribution():
    registry, _ = build_seed()
    # Something not in the seed corpus should NOT falsely match (the dangerous
    # error the whole confirm-then-resolve design guards against).
    match = registry.resolve("underwater basket weaving choreography", "drill")
    assert match is None


def test_kind_is_respected():
    registry, _ = build_seed()
    # "zone" is a formation; asking within drills should not surface it.
    match = registry.resolve("zone", "drill")
    assert match is None or match.entity.kind.startswith("drill")


def test_add_variant_creates_distinct_entity_linked_to_parent():
    embedder = HashingEmbedder()
    registry = EntityRegistry(embedder)
    parent = registry.add(
        kind="drill", canonical_name="4 lines", aliases=["four lines"],
        description="four lines warmup",
    )
    variant = registry.add_variant(
        parent.id, canonical_name="4 lines (endzone variant)",
        description="four lines run from the endzone with goal-line cuts",
    )
    assert variant.id != parent.id
    assert variant.is_variant_of == parent.id
    assert len(registry) == 2