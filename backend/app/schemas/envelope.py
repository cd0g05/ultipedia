"""The submission envelope — one versioned shape for every producer.

The v1 form, the v2 AI interview, and the hand-curated seed KB all serialize to
`Submission` (ADR-2). Type-specific structured data lives in the schemaless
`fields` dict; verbatim input is always kept in `raw_freeform`. v2-only fields
(`messages`, `audio_refs`, ...) are nullable additions on the same envelope so
adding AI/voice is never a migration.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

SCHEMA_VERSION = 1

# Allowed submission types. Dotted for strategy sub-paths (see PRD FR-1.2).
ALLOWED_TYPES: frozenset[str] = frozenset(
    {
        "drill",
        "strategy.formation",
        "strategy.play",
        "strategy.concept",
        "other",
        "interview",  # v2
        "seed",  # seed KB
    }
)


class Contributor(BaseModel):
    """Who gave us this knowledge. All optional; consent captured explicitly."""

    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    consent_to_credit: bool = False
    consent_to_record: bool = False  # v2 audio


class Message(BaseModel):
    """One turn of an interview transcript (v2)."""

    role: str  # "assistant" | "user"
    content: str
    audio_ref: str | None = None


class MediaRef(BaseModel):
    """A linked media asset (v2)."""

    kind: str  # "video_url" | "diagram_image"
    ref: str


def _type_validator(value: str) -> str:
    if value not in ALLOWED_TYPES:
        raise ValueError(
            f"unknown submission type {value!r}; expected one of {sorted(ALLOWED_TYPES)}"
        )
    return value


class SubmissionCreate(BaseModel):
    """What a client is allowed to send. Server-set fields are excluded.

    Extra keys are ignored (the honeypot is inspected on the raw body before
    parsing — see services.validation), so unknown junk never reaches storage.
    """

    model_config = ConfigDict(extra="ignore")

    type: str
    contributor: Contributor = Field(default_factory=Contributor)
    fields: dict[str, Any] = Field(default_factory=dict)
    raw_freeform: str | None = None
    normalized_tags: list[str] | None = None  # normally null; AI fills later

    # v2-only, optional on the same envelope
    messages: list[Message] | None = None
    audio_refs: list[str] | None = None
    media_refs: list[MediaRef] | None = None
    resolved_entity_id: UUID | None = None
    coverage_contribution: dict[str, Any] | None = None

    @field_validator("type")
    @classmethod
    def _check_type(cls, v: str) -> str:
        return _type_validator(v)


class Submission(BaseModel):
    """The stored envelope. One row in the `submissions` table."""

    submission_id: UUID = Field(default_factory=uuid4)
    type: str
    schema_version: int = SCHEMA_VERSION
    submitted_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    contributor: Contributor = Field(default_factory=Contributor)
    fields: dict[str, Any] = Field(default_factory=dict)
    raw_freeform: str | None = None
    normalized_tags: list[str] | None = None

    # v2-only
    messages: list[Message] | None = None
    audio_refs: list[str] | None = None
    media_refs: list[MediaRef] | None = None
    resolved_entity_id: UUID | None = None
    coverage_contribution: dict[str, Any] | None = None

    # server-side moderation signal (never auto-deletes; flags for review)
    flagged: bool = False

    @field_validator("type")
    @classmethod
    def _check_type(cls, v: str) -> str:
        return _type_validator(v)

    @classmethod
    def from_create(cls, create: SubmissionCreate, *, flagged: bool = False) -> "Submission":
        """Build a stored envelope from a validated client payload.

        The server owns `submission_id`, `submitted_at`, and `schema_version`.
        """
        return cls(
            type=create.type,
            contributor=create.contributor,
            fields=create.fields,
            raw_freeform=create.raw_freeform,
            normalized_tags=create.normalized_tags,
            messages=create.messages,
            audio_refs=create.audio_refs,
            media_refs=create.media_refs,
            resolved_entity_id=create.resolved_entity_id,
            coverage_contribution=create.coverage_contribution,
            flagged=flagged,
        )

    def to_row(self) -> dict[str, Any]:
        """Serialize to a Supabase-insertable row (JSON-safe)."""
        return self.model_dump(mode="json")
