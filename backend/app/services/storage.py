"""Persistence — the ONLY writer to Supabase (ADR-1).

The browser never writes the database directly; every submission and analytics
event flows through here with the server-side service key. An in-memory store is
used automatically when Supabase is not configured, so local dev and tests run
without credentials.
"""

from __future__ import annotations

import logging
from typing import Any, Protocol
from uuid import UUID

from backend.app.config import Settings
from backend.app.schemas import Submission

logger = logging.getLogger("ulti.storage")


class SubmissionStore(Protocol):
    def save_submission(self, submission: Submission) -> UUID: ...

    def save_event(self, event: dict[str, Any]) -> None: ...


class InMemorySubmissionStore:
    """Non-persistent store for local dev and tests."""

    def __init__(self) -> None:
        self.submissions: list[dict[str, Any]] = []
        self.events: list[dict[str, Any]] = []

    def save_submission(self, submission: Submission) -> UUID:
        self.submissions.append(submission.to_row())
        return submission.submission_id

    def save_event(self, event: dict[str, Any]) -> None:
        self.events.append(event)


class SupabaseSubmissionStore:
    """Real store. Imports supabase lazily so the dep isn't needed for tests."""

    def __init__(self, url: str, service_key: str) -> None:
        from supabase import create_client  # lazy import

        self._client = create_client(url, service_key)

    def save_submission(self, submission: Submission) -> UUID:
        self._client.table("submissions").insert(submission.to_row()).execute()
        return submission.submission_id

    def save_event(self, event: dict[str, Any]) -> None:
        self._client.table("form_events").insert(event).execute()


def build_store(settings: Settings) -> SubmissionStore:
    if settings.supabase_configured:
        assert settings.supabase_url and settings.supabase_service_key
        logger.info("Using Supabase submission store")
        return SupabaseSubmissionStore(
            settings.supabase_url, settings.supabase_service_key
        )
    logger.warning(
        "SUPABASE_URL / SUPABASE_SERVICE_KEY not set — using in-memory store "
        "(data will NOT persist). Configure Supabase for real use."
    )
    return InMemorySubmissionStore()
