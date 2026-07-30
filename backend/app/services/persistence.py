"""Durable persistence for v2 interview state, behind one small port.

The registry, coverage model, and session store were in-memory only, so
mid-interview variants, accumulated coverage, and in-progress sessions reset on
restart. This adds a `Persistence` port with three implementations:

- `NullPersistence` — no-op; the default so nothing changes without Supabase.
- `InMemoryPersistence` — dict-backed; used by tests to simulate a restart
  (write with one instance, reload with another).
- `SupabasePersistence` — writes through to the `entities`, `entity_coverage`,
  and `interview_sessions` tables (lazy supabase import).

Entity embeddings are NOT persisted — they're recomputed on load from text by the
deterministic embedder, so resolution stays in-memory/fast while durability comes
from Supabase.
"""

from __future__ import annotations

from typing import Any, Protocol
from uuid import UUID


class Persistence(Protocol):
    def upsert_entity(self, entity: dict[str, Any]) -> None: ...
    def load_entities(self) -> list[dict[str, Any]]: ...
    def upsert_coverage(
        self, entity_id: UUID, aspect: str, fill_score: float, confidence: float
    ) -> None: ...
    def load_coverage(self) -> list[dict[str, Any]]: ...
    def save_session(self, session_id: UUID, data: dict[str, Any]) -> None: ...
    def load_session(self, session_id: UUID) -> dict[str, Any] | None: ...


class NullPersistence:
    """Default: persist nothing (pure in-memory behavior)."""

    def upsert_entity(self, entity: dict[str, Any]) -> None:
        return None

    def load_entities(self) -> list[dict[str, Any]]:
        return []

    def upsert_coverage(self, entity_id, aspect, fill_score, confidence) -> None:
        return None

    def load_coverage(self) -> list[dict[str, Any]]:
        return []

    def save_session(self, session_id, data) -> None:
        return None

    def load_session(self, session_id):
        return None


class InMemoryPersistence:
    """Dict-backed port used by tests to simulate durability across a restart."""

    def __init__(self) -> None:
        self.entities: dict[str, dict[str, Any]] = {}
        self.coverage: dict[tuple[str, str], dict[str, Any]] = {}
        self.sessions: dict[str, dict[str, Any]] = {}

    def upsert_entity(self, entity: dict[str, Any]) -> None:
        self.entities[str(entity["id"])] = dict(entity)

    def load_entities(self) -> list[dict[str, Any]]:
        return list(self.entities.values())

    def upsert_coverage(self, entity_id, aspect, fill_score, confidence) -> None:
        self.coverage[(str(entity_id), aspect)] = {
            "entity_id": str(entity_id),
            "aspect": aspect,
            "fill_score": fill_score,
            "confidence": confidence,
        }

    def load_coverage(self) -> list[dict[str, Any]]:
        return list(self.coverage.values())

    def save_session(self, session_id, data) -> None:
        self.sessions[str(session_id)] = dict(data)

    def load_session(self, session_id):
        return self.sessions.get(str(session_id))


class SupabasePersistence:
    """Write-through to Supabase tables. Lazy client import."""

    def __init__(self, url: str, service_key: str) -> None:
        from supabase import create_client

        self._client = create_client(url, service_key)

    def upsert_entity(self, entity: dict[str, Any]) -> None:
        self._client.table("entities").upsert(entity, on_conflict="id").execute()

    def load_entities(self) -> list[dict[str, Any]]:
        return self._client.table("entities").select("*").execute().data or []

    def upsert_coverage(self, entity_id, aspect, fill_score, confidence) -> None:
        self._client.table("entity_coverage").upsert(
            {
                "entity_id": str(entity_id),
                "aspect": aspect,
                "fill_score": fill_score,
                "confidence": confidence,
            },
            on_conflict="entity_id,aspect",
        ).execute()

    def load_coverage(self) -> list[dict[str, Any]]:
        return self._client.table("entity_coverage").select("*").execute().data or []

    def save_session(self, session_id, data) -> None:
        self._client.table("interview_sessions").upsert(
            {"id": str(session_id), "data": data}, on_conflict="id"
        ).execute()

    def load_session(self, session_id):
        rows = (
            self._client.table("interview_sessions")
            .select("data")
            .eq("id", str(session_id))
            .execute()
            .data
        )
        return rows[0]["data"] if rows else None


def build_persistence(settings) -> Persistence:
    if getattr(settings, "supabase_configured", False):
        return SupabasePersistence(settings.supabase_url, settings.supabase_service_key)
    return NullPersistence()
