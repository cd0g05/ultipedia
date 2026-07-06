"""Load the hand-curated seed corpus into the entity registry and RAG index.

In production this also upserts into the `entities` / `kb_chunks` tables (with
real embeddings); here it builds the in-memory structures used by the interview
engine and tests. Run as a module to sanity-check the corpus:

    python -m backend.app.services.seed_loader
"""

from __future__ import annotations

import json
from pathlib import Path
from uuid import NAMESPACE_DNS, uuid5

from backend.app.services.embeddings import Embedder, build_embedder
from backend.app.services.entities import EntityRegistry
from backend.app.services.kb import KbIndex

SEED_DIR = Path(__file__).resolve().parents[3] / "seed-kb"


def _seed_id(kind: str, canonical_name: str):
    # Deterministic id so seed entities keep the same id across restarts — this
    # keeps persisted interview variants' parent references valid, and lets seed
    # load skip re-persisting.
    return uuid5(NAMESPACE_DNS, f"ulti-seed:{kind}:{canonical_name}")


def load_entities(registry: EntityRegistry, path: Path | None = None) -> int:
    path = path or (SEED_DIR / "entities.json")
    data = json.loads(path.read_text())
    for e in data["entities"]:
        registry.add(
            kind=e["kind"],
            canonical_name=e["canonical_name"],
            aliases=e.get("aliases", []),
            description=e.get("description", ""),
            entity_id=_seed_id(e["kind"], e["canonical_name"]),
        )
    return len(registry)


def load_kb(index: KbIndex, path: Path | None = None) -> int:
    path = path or (SEED_DIR / "kb_chunks.json")
    data = json.loads(path.read_text())
    for c in data["chunks"]:
        index.add(kind=c["kind"], title=c["title"], content=c["content"])
    return len(index)


def build_seed(embedder: Embedder | None = None) -> tuple[EntityRegistry, KbIndex]:
    embedder = embedder or build_embedder()
    registry = EntityRegistry(embedder)
    index = KbIndex(embedder)
    load_entities(registry)
    load_kb(index)
    return registry, index


if __name__ == "__main__":
    reg, idx = build_seed()
    print(f"Loaded {len(reg)} entities and {len(idx)} KB chunks from {SEED_DIR}")
