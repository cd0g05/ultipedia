"""Drill field shape (advisory).

`Submission.fields` is schemaless jsonb (ADR-3 / friction-free intake), so these
models are documentation + optional edge validation, not a hard gate. Extra keys
are allowed and everything is optional — a coach may fill only what they want.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class DrillFields(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str | None = None
    overview: str | None = None
    concepts: str | None = None  # free-text tags (see PRD FR-1.5)
    setup: str | None = None
    walkthrough: str | None = None
    focuses: str | None = None
