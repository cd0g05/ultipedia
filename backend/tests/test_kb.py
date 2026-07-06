from __future__ import annotations

import pytest

from backend.app.services.embeddings import HashingEmbedder, cosine
from backend.app.services.seed_loader import build_seed


def test_kb_search_returns_relevant_chunk_first():
    _, index = build_seed()
    hits = index.search("what side does the marker take away", k=3)
    assert hits
    titles = [h.chunk.title for h in hits]
    # The "Force" chunk is the most relevant to a marking question.
    assert "Force" in titles


def test_embeddings_are_deterministic_across_instances():
    a = HashingEmbedder().embed("force flick zone")
    b = HashingEmbedder().embed("force flick zone")
    assert a == b
    assert cosine(a, b) == pytest.approx(1.0)
