from __future__ import annotations

from fastapi.testclient import TestClient

from backend.app.config import Settings
from backend.app.main import create_app
from backend.app.services.storage import InMemorySubmissionStore
from backend.tests.conftest import make_settings


def _drill_payload(**extra):
    payload = {
        "type": "drill",
        "contributor": {"name": "Coach Maya", "consent_to_credit": True},
        "fields": {"name": "4 lines", "setup": "Four lines across the field."},
        "raw_freeform": "A team warmup that works cuts and throws.",
    }
    payload.update(extra)
    return payload


def test_health(client: TestClient):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_valid_submission_persists(client: TestClient, store: InMemorySubmissionStore):
    r = client.post("/api/submissions", json=_drill_payload())
    assert r.status_code == 201
    body = r.json()
    assert "submission_id" in body
    assert len(store.submissions) == 1
    row = store.submissions[0]
    assert row["type"] == "drill"
    assert row["schema_version"] == 1  # server-stamped
    assert row["submitted_at"]  # server-stamped
    assert row["fields"]["name"] == "4 lines"
    assert row["raw_freeform"].startswith("A team warmup")
    assert row["flagged"] is False


def test_unknown_type_is_422(client: TestClient):
    r = client.post("/api/submissions", json=_drill_payload(type="nonsense"))
    assert r.status_code == 422


def test_empty_submission_is_422(client: TestClient):
    r = client.post(
        "/api/submissions",
        json={"type": "other", "fields": {"x": "   "}, "raw_freeform": "  "},
    )
    assert r.status_code == 422


def test_honeypot_tripped_is_400(client: TestClient, store: InMemorySubmissionStore):
    r = client.post("/api/submissions", json=_drill_payload(website="http://spam"))
    assert r.status_code == 400
    assert len(store.submissions) == 0  # never stored


def test_oversized_payload_is_413():
    settings = make_settings(max_payload_bytes=200)
    store = InMemorySubmissionStore()
    client = TestClient(create_app(settings=settings, store=store))
    r = client.post("/api/submissions", json=_drill_payload(raw_freeform="x" * 500))
    assert r.status_code == 413
    assert len(store.submissions) == 0


def test_field_length_cap_is_422():
    settings = make_settings(max_field_len=50, max_payload_bytes=1024 * 1024)
    store = InMemorySubmissionStore()
    client = TestClient(create_app(settings=settings, store=store))
    r = client.post("/api/submissions", json=_drill_payload(raw_freeform="x" * 100))
    assert r.status_code == 422


def test_rate_limit_is_429():
    settings = make_settings(rate_limit_per_minute=2)
    store = InMemorySubmissionStore()
    client = TestClient(create_app(settings=settings, store=store))
    # same contributor email → same rate-limit key
    payload = _drill_payload(contributor={"email": "coach@example.com"})
    assert client.post("/api/submissions", json=payload).status_code == 201
    assert client.post("/api/submissions", json=payload).status_code == 201
    assert client.post("/api/submissions", json=payload).status_code == 429


def test_garbage_content_is_flagged(client: TestClient, store: InMemorySubmissionStore):
    r = client.post(
        "/api/submissions",
        json={"type": "other", "raw_freeform": "a" * 60},
    )
    assert r.status_code == 201
    assert store.submissions[0]["flagged"] is True


def test_interview_envelope_roundtrips(client: TestClient, store: InMemorySubmissionStore):
    r = client.post(
        "/api/submissions",
        json={
            "type": "interview",
            "messages": [
                {"role": "assistant", "content": "How do you set up 4 lines?"},
                {"role": "user", "content": "Four lines across the field."},
            ],
            "coverage_contribution": {"setup": 0.8},
        },
    )
    assert r.status_code == 201
    row = store.submissions[0]
    assert row["type"] == "interview"
    assert len(row["messages"]) == 2
    assert row["coverage_contribution"] == {"setup": 0.8}
