"""Canonical entity registry + resolution (ADR-4 / ADR-7).

The dangerous error is a false "we already have this," which shuts down a coach
with a novel variation. So `resolve()` NEVER commits a match — it returns at most
a *candidate* for the interview to CONFIRM with the coach ("Sounds like X — is
that the one?"). Saying "mine's different" is cheap and calls `add_variant()`.

Matching combines alias/name lexical overlap with description-embedding cosine.
A configurable floor prevents suggesting a weak, misleading match (below it we
treat the topic as novel and just interview normally — the cold-start case).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID, uuid4

from backend.app.services.embeddings import Embedder, cosine, tokenize


@dataclass
class Entity:
    id: UUID
    kind: str
    canonical_name: str
    aliases: list[str]
    description: str
    embedding: list[float]
    is_variant_of: UUID | None = None

    def names(self) -> list[str]:
        return [self.canonical_name, *self.aliases]


@dataclass
class EntityMatch:
    entity: Entity
    score: float
    reason: str  # "alias" | "semantic" — for logging/telemetry
    # A match is always a suggestion to confirm, never an applied decision.


def _all_tokens_present(query_tokens: set[str], phrase: str) -> bool:
    ptoks = tokenize(phrase)
    return bool(ptoks) and all(t in query_tokens for t in ptoks)


class EntityRegistry:
    """In-memory registry, seeded from the seed corpus (and, in production, from
    the `entities` table). Entity counts are small, so in-memory is fine; the
    same interface backs a pgvector-backed store when persistence is wired.
    """

    def __init__(
        self, embedder: Embedder, *, floor: float = 0.35, persistence=None
    ) -> None:
        self._embedder = embedder
        self._floor = floor
        self._entities: dict[UUID, Entity] = {}
        # Optional durability port (persistence.Persistence). None = in-memory only.
        self._persistence = persistence

    def attach_persistence(self, persistence) -> None:
        """Attach the durability port AFTER seeding, so seed entities (loaded from
        JSON with stable ids every boot) aren't re-persisted; only entities added
        afterward (interview variants/novel topics) write through."""
        self._persistence = persistence

    def __len__(self) -> int:
        return len(self._entities)

    def all(self) -> list[Entity]:
        return list(self._entities.values())

    def _row(self, e: Entity) -> dict:
        return {
            "id": str(e.id),
            "kind": e.kind,
            "canonical_name": e.canonical_name,
            "aliases": e.aliases,
            "description": e.description,
            "is_variant_of": str(e.is_variant_of) if e.is_variant_of else None,
        }

    def hydrate(self) -> int:
        """Load persisted entities into memory (embeddings recomputed from text).

        Call once at startup. Seed entities already loaded stay; persisted rows
        that duplicate an id are skipped. Returns the number loaded.
        """
        if self._persistence is None:
            return 0
        loaded = 0
        for row in self._persistence.load_entities():
            eid = UUID(str(row["id"]))
            if eid in self._entities:
                continue
            aliases = list(row.get("aliases") or [])
            desc = row.get("description") or ""
            name = row["canonical_name"]
            parent = row.get("is_variant_of")
            self._entities[eid] = Entity(
                id=eid,
                kind=row["kind"],
                canonical_name=name,
                aliases=aliases,
                description=desc,
                embedding=self._embed_entity(name, aliases, desc),
                is_variant_of=UUID(str(parent)) if parent else None,
            )
            loaded += 1
        return loaded

    def _embed_entity(self, canonical_name: str, aliases: list[str], description: str) -> list[float]:
        # Enrich the entity embedding with its names so lexical variants still
        # land near the description in vector space.
        blob = " ".join([canonical_name, *aliases, description])
        return self._embedder.embed(blob)

    def add(
        self,
        *,
        kind: str,
        canonical_name: str,
        aliases: list[str] | None = None,
        description: str = "",
        is_variant_of: UUID | None = None,
        entity_id: UUID | None = None,
    ) -> Entity:
        aliases = aliases or []
        entity = Entity(
            id=entity_id or uuid4(),
            kind=kind,
            canonical_name=canonical_name,
            aliases=aliases,
            description=description,
            embedding=self._embed_entity(canonical_name, aliases, description),
            is_variant_of=is_variant_of,
        )
        self._entities[entity.id] = entity
        if self._persistence is not None:
            self._persistence.upsert_entity(self._row(entity))
        return entity

    def add_variant(
        self,
        parent_id: UUID,
        *,
        canonical_name: str,
        description: str = "",
        aliases: list[str] | None = None,
    ) -> Entity:
        """Coach said 'mine's different' — record a distinct variant entity."""
        parent = self._entities[parent_id]
        return self.add(
            kind=parent.kind,
            canonical_name=canonical_name,
            aliases=aliases or [],
            description=description,
            is_variant_of=parent_id,
        )

    def resolve(self, description: str, kind: str) -> EntityMatch | None:
        """Return the best candidate to CONFIRM, or None if the topic looks novel.

        `kind` prefix-matches so "strategy" can match "strategy.play" etc.
        """
        query_tokens = set(tokenize(description))
        query_vec = self._embedder.embed(description)

        best: EntityMatch | None = None
        for entity in self._entities.values():
            if not (entity.kind == kind or entity.kind.startswith(kind + ".") or kind.startswith(entity.kind)):
                continue

            alias_hit = any(_all_tokens_present(query_tokens, name) for name in entity.names())
            alias_score = 1.0 if alias_hit else 0.0
            semantic_score = cosine(query_vec, entity.embedding)

            if alias_score >= semantic_score:
                score, reason = alias_score, "alias"
            else:
                score, reason = semantic_score, "semantic"

            if best is None or score > best.score:
                best = EntityMatch(entity=entity, score=score, reason=reason)

        if best is None or best.score < self._floor:
            return None
        return best
