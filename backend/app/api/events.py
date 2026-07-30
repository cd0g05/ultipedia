"""POST /api/events — analytics funnel events (PRD FR-5.1).

Custom events (`form_started`, `field_completed`, `submitted`) are stored next
to submissions so drop-off analysis lives with the data.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/api", tags=["events"])

_ALLOWED_EVENTS = {"form_started", "field_completed", "submitted"}


class EventIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    event: str
    submission_id: str | None = None
    meta: dict[str, Any] | None = None


@router.post("/events", status_code=204)
async def record_event(payload: EventIn, request: Request) -> Response:
    store = request.app.state.store
    if payload.event not in _ALLOWED_EVENTS:
        # Unknown events are ignored, not errored — analytics must never block UX.
        return Response(status_code=204)
    store.save_event(
        {
            "id": str(uuid4()),
            "event": payload.event,
            "submission_id": payload.submission_id,
            "meta": payload.meta,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return Response(status_code=204)
