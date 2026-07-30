"""FastAPI application factory for the Ulti-pedia backend.

Wires settings, the submission store, and the rate limiter onto app state, and
mounts the v1 API. Using a factory keeps the app testable (inject a custom
Settings/store) with no global mutable state.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import Settings, get_settings
from backend.app.api import events, submissions
from backend.app.services.storage import SubmissionStore, build_store
from backend.app.services.validation import RateLimiter


def create_app(
    settings: Settings | None = None,
    store: SubmissionStore | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    store = store if store is not None else build_store(settings)

    app = FastAPI(title="Ulti-pedia Intake API", version="0.1.0")
    app.state.settings = settings
    app.state.store = store
    app.state.limiter = RateLimiter(settings.rate_limit_per_minute)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(submissions.router)
    app.include_router(events.router)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
