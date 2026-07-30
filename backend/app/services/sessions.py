"""In-memory interview session state + store (per-turn autosave / resume).

Interviews are multi-turn and abandonment-prone, so state persists across turns
and can be resumed by session id. In-memory is fine for a single-process MVP; a
Supabase-backed store drops in behind `SessionStore` for multi-instance/durable
resume (noted in tech-design).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID, uuid4


@dataclass
class Session:
    id: UUID
    type: str
    contributor: dict
    messages: list[dict] = field(default_factory=list)  # {role, content}
    stage: str = "await_name"
    name: str = ""
    description: str = ""
    resolved_entity_id: UUID | None = None
    pending_entity_id: UUID | None = None  # entity awaiting coach confirmation
    asked_aspects: list[str] = field(default_factory=list)
    last_aspect: str | None = None
    coverage_contribution: dict[str, float] = field(default_factory=dict)
    turns: int = 0

    def add(self, role: str, content: str) -> None:
        self.messages.append({"role": role, "content": content})


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[UUID, Session] = {}

    def create(self, type: str, contributor: dict | None = None) -> Session:
        s = Session(id=uuid4(), type=type, contributor=contributor or {})
        self._sessions[s.id] = s
        return s

    def get(self, session_id: UUID) -> Session | None:
        return self._sessions.get(session_id)
