"""Submission schemas — the shared contract for form, interview, and seed KB."""

from backend.app.schemas.envelope import (
    ALLOWED_TYPES,
    SCHEMA_VERSION,
    Contributor,
    MediaRef,
    Message,
    Submission,
    SubmissionCreate,
)

__all__ = [
    "ALLOWED_TYPES",
    "SCHEMA_VERSION",
    "Contributor",
    "MediaRef",
    "Message",
    "Submission",
    "SubmissionCreate",
]
