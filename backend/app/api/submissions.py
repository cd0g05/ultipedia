"""POST /api/submissions — the v1 intake endpoint.

Order of operations (tech-design API section): read raw body → size cap →
honeypot → rate limit → parse+validate → content checks + garbage flag → build
envelope (server sets id/timestamp/version) → store → 201.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError

from backend.app.schemas import SubmissionCreate, Submission
from backend.app.services.validation import (
    ValidationError,
    check_honeypot,
    check_payload_size,
    is_garbage,
    validate_content,
)

router = APIRouter(prefix="/api", tags=["submissions"])


def _client_key(request: Request, create: SubmissionCreate) -> str:
    """Rate-limit key: prefer contributor email, else client IP."""
    if create.contributor and create.contributor.email:
        return f"email:{create.contributor.email}"
    client = request.client
    return f"ip:{client.host}" if client else "ip:unknown"


@router.post("/submissions", status_code=201)
async def create_submission(request: Request) -> JSONResponse:
    settings = request.app.state.settings
    store = request.app.state.store
    limiter = request.app.state.limiter

    raw = await request.body()
    try:
        check_payload_size(raw, settings)

        try:
            data = json.loads(raw or b"{}")
        except json.JSONDecodeError:
            raise ValidationError(422, "invalid JSON body")
        if not isinstance(data, dict):
            raise ValidationError(422, "body must be a JSON object")

        check_honeypot(data, settings)

        try:
            create = SubmissionCreate.model_validate(data)
        except PydanticValidationError as exc:
            raise ValidationError(422, exc.errors()[0].get("msg", "invalid submission"))

        limiter.check(_client_key(request, create))
        validate_content(create, settings)

        flagged = is_garbage(create)
        submission = Submission.from_create(create, flagged=flagged)
        submission_id = store.save_submission(submission)
    except ValidationError as exc:
        return JSONResponse(status_code=exc.status, content={"detail": exc.detail})

    return JSONResponse(
        status_code=201, content={"submission_id": str(submission_id)}
    )
