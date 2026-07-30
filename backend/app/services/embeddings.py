"""Embedding abstraction for entity resolution and RAG.

A real deployment plugs in a provider (Voyage/OpenAI/etc.) behind the `Embedder`
protocol. For local dev, tests, and CI we use a deterministic `HashingEmbedder`
that needs no network or API key — it captures lexical overlap, which is enough
to exercise and test the resolution/coverage logic. The production provider is a
lazy, explicit choice made in the ai-interview partition (Open Question in PRD).
"""

from __future__ import annotations

import hashlib
import math
import re
from typing import Protocol

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


def cosine(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        raise ValueError("vector dimension mismatch")
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


class Embedder(Protocol):
    dim: int

    def embed(self, text: str) -> list[float]: ...


class HashingEmbedder:
    """Deterministic bag-of-words hashing embedder (no deps, no network).

    Tokens are hashed into a fixed-dimension vector; the result is L2-normalized.
    Two texts sharing vocabulary get a high cosine similarity — sufficient for
    the resolution/coverage tests and a reasonable offline fallback.
    """

    def __init__(self, dim: int = 256) -> None:
        self.dim = dim

    def embed(self, text: str) -> list[float]:
        vec = [0.0] * self.dim
        for tok in tokenize(text):
            # Stable, process-independent hash (unlike builtin hash() which is
            # salted per run) so embeddings are reproducible across runs.
            digest = hashlib.md5(tok.encode("utf-8")).digest()
            h = int.from_bytes(digest[:4], "big") % self.dim
            vec[h] += 1.0
        norm = math.sqrt(sum(v * v for v in vec))
        if norm > 0:
            vec = [v / norm for v in vec]
        return vec


def build_embedder() -> Embedder:
    """Return the configured embedder. Defaults to the offline hashing embedder.

    Swap in a real provider here (behind the same protocol) when one is chosen
    for the interview engine.
    """
    return HashingEmbedder()
