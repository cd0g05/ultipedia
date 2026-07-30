from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.app.config import Settings
from backend.app.main import create_app
from backend.app.services.storage import InMemorySubmissionStore


def make_settings(**overrides) -> Settings:
    base = dict(
        supabase_url=None,
        supabase_service_key=None,
        max_field_len=8000,
        max_payload_bytes=128 * 1024,
        rate_limit_per_minute=20,
        honeypot_field="website",
        allowed_origins=("http://localhost:5173",),
    )
    base.update(overrides)
    return Settings(**base)


@pytest.fixture
def store() -> InMemorySubmissionStore:
    return InMemorySubmissionStore()


@pytest.fixture
def client(store: InMemorySubmissionStore) -> TestClient:
    app = create_app(settings=make_settings(), store=store)
    return TestClient(app)
