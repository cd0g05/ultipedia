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

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "type": self.type,
            "contributor": self.contributor,
            "messages": self.messages,
            "stage": self.stage,
            "name": self.name,
            "description": self.description,
            "resolved_entity_id": str(self.resolved_entity_id) if self.resolved_entity_id else None,
            "pending_entity_id": str(self.pending_entity_id) if self.pending_entity_id else None,
            "asked_aspects": self.asked_aspects,
            "last_aspect": self.last_aspect,
            "coverage_contribution": self.coverage_contribution,
            "turns": self.turns,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Session":
        return cls(
            id=UUID(str(d["id"])),
            type=d["type"],
            contributor=d.get("contributor") or {},
            messages=list(d.get("messages") or []),
            stage=d.get("stage", "await_name"),
            name=d.get("name", ""),
            description=d.get("description", ""),
            resolved_entity_id=UUID(str(d["resolved_entity_id"])) if d.get("resolved_entity_id") else None,
            pending_entity_id=UUID(str(d["pending_entity_id"])) if d.get("pending_entity_id") else None,
            asked_aspects=list(d.get("asked_aspects") or []),
            last_aspect=d.get("last_aspect"),
            coverage_contribution=dict(d.get("coverage_contribution") or {}),
            turns=int(d.get("turns", 0)),
        )


class SessionStore:
    def __init__(self, persistence=None) -> None:
        self._sessions: dict[UUID, Session] = {}
        self._persistence = persistence  # optional durability port

    def create(self, type: str, contributor: dict | None = None) -> Session:
        s = Session(id=uuid4(), type=type, contributor=contributor or {})
        self._sessions[s.id] = s
        self.save(s)
        return s

    def get(self, session_id: UUID) -> Session | None:
        s = self._sessions.get(session_id)
        if s is not None:
            return s
        # Resume after a restart: rehydrate from the durability port.
        if self._persistence is not None:
            data = self._persistence.load_session(session_id)
            if data is not None:
                s = Session.from_dict(data)
                self._sessions[s.id] = s
                return s
        return None

    def save(self, session: Session) -> None:
        """Per-turn autosave. Call after each mutation for durable resume."""
        self._sessions[session.id] = session
        if self._persistence is not None:
            self._persistence.save_session(session.id, session.to_dict())
