"""FastAPI application factory for the Ulti-pedia backend.

Wires settings, the submission store, and the rate limiter onto app state, and
mounts the v1 API. Using a factory keeps the app testable (inject a custom
Settings/store) with no global mutable state.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import Settings, get_settings
from backend.app.api import encyclopedia, events, interview, submissions
from backend.app.services.coverage import CoverageModel
from backend.app.services.encyclopedia import (
    EncyclopediaService,
    EncyclopediaStore,
    build_encyclopedia_store,
)
from backend.app.services.interview_engine import InterviewEngine
from backend.app.services.llm import build_llm
from backend.app.services.persistence import build_persistence
from backend.app.services.seed_loader import build_seed
from backend.app.services.sessions import SessionStore
from backend.app.services.storage import SubmissionStore, build_store
from backend.app.services.validation import RateLimiter


def create_app(
    settings: Settings | None = None,
    store: SubmissionStore | None = None,
    encyclopedia_store: EncyclopediaStore | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    store = store if store is not None else build_store(settings)
    if encyclopedia_store is None:
        encyclopedia_store = build_encyclopedia_store(settings)

    app = FastAPI(title="Ulti-pedia Intake API", version="0.1.0")
    app.state.settings = settings
    app.state.store = store
    app.state.limiter = RateLimiter(settings.rate_limit_per_minute)

    # v2 interview: seed registry + KB, coverage model, LLM (Fake unless keyed).
    # Durability: attach the persistence port AFTER seeding (so seed rows aren't
    # re-persisted), then hydrate persisted variants/coverage/sessions.
    persistence = build_persistence(settings)
    registry, kb = build_seed()
    registry.attach_persistence(persistence)
    registry.hydrate()
    coverage = CoverageModel(persistence=persistence)
    coverage.hydrate()
    app.state.persistence = persistence
    app.state.registry = registry
    app.state.coverage = coverage
    app.state.sessions = SessionStore(persistence=persistence)
    app.state.interview_engine = InterviewEngine(registry, coverage, kb, build_llm())

    # Read-only encyclopedia facade (ADR-6); status='published' gating lives
    # inside the service itself, not in the API handlers.
    app.state.encyclopedia = EncyclopediaService(encyclopedia_store)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(submissions.router)
    app.include_router(events.router)
    app.include_router(interview.router)
    app.include_router(encyclopedia.router)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
