"""API tests for GET /api/entries, /api/entries/{type}/{slug}, /api/search.

Covers happy paths, 400s (invalid type/sort/filter/pagination values), and
404s (missing or draft entries) for all three endpoints.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.app.main import create_app
from backend.app.services.encyclopedia import InMemoryEncyclopediaStore
from backend.tests.conftest import make_settings
from backend.tests.services.test_encyclopedia import make_row


def make_client(rows: list[dict]) -> TestClient:
    app = create_app(
        settings=make_settings(),
        encyclopedia_store=InMemoryEncyclopediaStore(rows),
    )
    return TestClient(app)


@pytest.fixture
def seeded_client() -> TestClient:
    rows = [
        make_row(
            "huck-drill",
            tags=[("skill_level", "beginner"), ("focus", "throwing"), ("difficulty", "easy")],
            title="Huck Warmup",
            created_at="2026-01-03T00:00:00+00:00",
            attributes={"player_count_min": 4, "player_count_max": 10},
            media=[
                {"url": "https://x/a.png", "type": "image", "caption": "Setup", "sort_order": 0}
            ],
        ),
        make_row(
            "cutting-ladder",
            tags=[("skill_level", "advanced"), ("focus", "cutting"), ("difficulty", "hard")],
            title="Cutting Ladder",
            created_at="2026-01-02T00:00:00+00:00",
        ),
        make_row(
            "zone-offense",
            type="strategy",
            tags=[("focus", "throwing")],
            title="Zone Offense",
            body="Beat the zone with swings.",
            created_at="2026-01-01T00:00:00+00:00",
        ),
        make_row(
            "secret-draft",
            status="draft",
            tags=[("focus", "throwing")],
            title="Secret Zone Draft",
        ),
    ]
    return make_client(rows)


# --------------------------------------------------------------------------
# GET /api/entries
# --------------------------------------------------------------------------


def test_list_entries_returns_summaries_with_tags(seeded_client: TestClient):
    r = seeded_client.get("/api/entries", params={"type": "drill"})
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    assert {e["slug"] for e in body} == {"huck-drill", "cutting-ladder"}
    huck = next(e for e in body if e["slug"] == "huck-drill")
    assert huck["type"] == "drill"
    assert huck["short_description"]
    assert {"name": "throwing", "category": "focus"} in huck["tags"]
    assert huck["attributes"]["player_count_min"] == 4


def test_list_entries_excludes_drafts(seeded_client: TestClient):
    r = seeded_client.get("/api/entries", params={"type": "drill"})
    assert "secret-draft" not in {e["slug"] for e in r.json()}


def test_list_entries_invalid_type_is_400(seeded_client: TestClient):
    r = seeded_client.get("/api/entries", params={"type": "invalid"})
    assert r.status_code == 400


def test_list_entries_missing_type_is_400(seeded_client: TestClient):
    r = seeded_client.get("/api/entries")
    assert r.status_code == 400


def test_list_entries_applies_filters(seeded_client: TestClient):
    r = seeded_client.get(
        "/api/entries", params=[("type", "drill"), ("focus", "cutting")]
    )
    assert r.status_code == 200
    assert [e["slug"] for e in r.json()] == ["cutting-ladder"]


# --------------------------------------------------------------------------
# GET /api/entries/{type}/{slug}
# --------------------------------------------------------------------------


def test_get_entry_happy_path_includes_media_and_similar(seeded_client: TestClient):
    r = seeded_client.get("/api/entries/drill/huck-drill")
    assert r.status_code == 200
    body = r.json()
    assert body["slug"] == "huck-drill"
    assert body["title"] == "Huck Warmup"
    assert body["body"]
    assert body["media"] == [
        {"url": "https://x/a.png", "type": "image", "caption": "Setup", "sort_order": 0}
    ]
    # zone-offense shares the 'throwing' focus tag; the draft twin must not appear
    assert {e["slug"] for e in body["similar"]} == {"zone-offense"}


def test_get_entry_missing_slug_is_404(seeded_client: TestClient):
    r = seeded_client.get("/api/entries/drill/not-a-real-slug")
    assert r.status_code == 404


def test_get_entry_draft_is_404(seeded_client: TestClient):
    r = seeded_client.get("/api/entries/drill/secret-draft")
    assert r.status_code == 404


def test_get_entry_wrong_type_is_404(seeded_client: TestClient):
    r = seeded_client.get("/api/entries/strategy/huck-drill")
    assert r.status_code == 404


def test_get_entry_invalid_type_is_400(seeded_client: TestClient):
    r = seeded_client.get("/api/entries/invalid/huck-drill")
    assert r.status_code == 400


# --------------------------------------------------------------------------
# GET /api/search
# --------------------------------------------------------------------------


def test_search_returns_paginated_envelope_and_excludes_drafts(
    seeded_client: TestClient,
):
    r = seeded_client.get("/api/search", params={"q": "zone"})
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"results", "total", "page", "page_size"}
    assert body["total"] == 1
    assert body["page"] == 1
    assert body["page_size"] == 24
    assert [e["slug"] for e in body["results"]] == ["zone-offense"]  # draft excluded


def test_search_or_within_category(seeded_client: TestClient):
    r = seeded_client.get(
        "/api/search", params=[("focus", "throwing"), ("focus", "cutting")]
    )
    assert r.status_code == 200
    slugs = {e["slug"] for e in r.json()["results"]}
    assert slugs == {"huck-drill", "cutting-ladder", "zone-offense"}


def test_search_and_across_categories(seeded_client: TestClient):
    r = seeded_client.get(
        "/api/search", params=[("skill_level", "beginner"), ("focus", "throwing")]
    )
    assert r.status_code == 200
    assert [e["slug"] for e in r.json()["results"]] == ["huck-drill"]


def test_search_sort_difficulty_asc(seeded_client: TestClient):
    r = seeded_client.get("/api/search", params={"sort": "difficulty_asc"})
    assert r.status_code == 200
    slugs = [e["slug"] for e in r.json()["results"]]
    # easy → hard → unranked strategy entry trails
    assert slugs == ["huck-drill", "cutting-ladder", "zone-offense"]


def test_search_sort_newest(seeded_client: TestClient):
    r = seeded_client.get("/api/search", params={"sort": "newest"})
    slugs = [e["slug"] for e in r.json()["results"]]
    assert slugs == ["huck-drill", "cutting-ladder", "zone-offense"]


def test_search_invalid_sort_is_400(seeded_client: TestClient):
    r = seeded_client.get("/api/search", params={"sort": "alphabetical"})
    assert r.status_code == 400


def test_search_blank_filter_value_is_400(seeded_client: TestClient):
    r = seeded_client.get("/api/search", params={"focus": "  "})
    assert r.status_code == 400


def test_search_invalid_pagination_is_400(seeded_client: TestClient):
    assert seeded_client.get("/api/search", params={"page": 0}).status_code == 400
    assert (
        seeded_client.get("/api/search", params={"page_size": 1000}).status_code == 400
    )


def test_search_pagination_slices_results(seeded_client: TestClient):
    r = seeded_client.get(
        "/api/search", params={"sort": "newest", "page": 2, "page_size": 1}
    )
    body = r.json()
    assert body["total"] == 3
    assert body["page"] == 2
    assert [e["slug"] for e in body["results"]] == ["cutting-ladder"]


def test_search_without_params_returns_all_published(seeded_client: TestClient):
    r = seeded_client.get("/api/search")
    assert r.status_code == 200
    assert r.json()["total"] == 3
