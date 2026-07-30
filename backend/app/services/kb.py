"""Seed knowledge-base RAG index (FR-8.1).

An in-memory vector index over the hand-curated seed chunks. The interview engine
(ai-interview partition) calls `search()` to ground its questions in real domain
knowledge instead of the model's own patchy sport knowledge. Backed by the same
embedder as entity resolution; a pgvector-backed implementation drops in behind
the same `search()` interface for production scale.
"""

from __future__ import annotations

from dataclasses import dataclass

from backend.app.services.embeddings import Embedder, cosine


@dataclass
class KbChunk:
    kind: str
    title: str
    content: str
    embedding: list[float]


@dataclass
class KbHit:
    chunk: KbChunk
    score: float


class KbIndex:
    def __init__(self, embedder: Embedder) -> None:
        self._embedder = embedder
        self._chunks: list[KbChunk] = []

    def __len__(self) -> int:
        return len(self._chunks)

    def add(self, *, kind: str, title: str, content: str) -> None:
        self._chunks.append(
            KbChunk(
                kind=kind,
                title=title,
                content=content,
                embedding=self._embedder.embed(f"{title} {content}"),
            )
        )

    def search(self, query: str, k: int = 3) -> list[KbHit]:
        q = self._embedder.embed(query)
        scored = [KbHit(chunk=c, score=cosine(q, c.embedding)) for c in self._chunks]
        scored.sort(key=lambda h: h.score, reverse=True)
        return scored[:k]
