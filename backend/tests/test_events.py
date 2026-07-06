from __future__ import annotations

from fastapi.testclient import TestClient

from backend.app.services.storage import InMemorySubmissionStore


def test_known_event_persists(client: TestClient, store: InMemorySubmissionStore):
    r = client.post("/api/events", json={"event": "form_started"})
    assert r.status_code == 204
    assert len(store.events) == 1
    assert store.events[0]["event"] == "form_started"


def test_unknown_event_is_ignored_not_errored(
    client: TestClient, store: InMemorySubmissionStore
):
    r = client.post("/api/events", json={"event": "bogus"})
    assert r.status_code == 204
    assert len(store.events) == 0
