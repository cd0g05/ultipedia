"""EncyclopediaService unit tests.

Emphasis per tech-design NFRs: 100% coverage of the status='published'
gating path (search, direct slug lookup, similar-entries), plus the filter
chain's AND-across / OR-within semantics, every sort strategy, tag-overlap
similarity ordering, the row factory, and Flyweight tag interning.
"""

from __future__ import annotations

from uuid import uuid4

from backend.app.schemas.encyclopedia import (
    EntryDetail,
    EntryFilters,
    EntryType,
    SortOption,
)
from backend.app.services.encyclopedia import (
    EncyclopediaService,
    InMemoryEncyclopediaStore,
    TagRegistry,
    entry_from_row,
)


def make_row(
    slug: str,
    *,
    type: str = "drill",
    status: str = "published",
    tags: list[tuple[str, str]] | None = None,  # (category, name)
    created_at: str = "2026-01-01T00:00:00+00:00",
    **overrides,
) -> dict:
    row = {
        "id": str(uuid4()),
        "slug": slug,
        "type": type,
        "title": slug.replace("-", " ").title(),
        "short_description": f"About {slug}.",
        "skill_level": None,
        "body": f"How to run {slug}.",
        "coaching_points": [],
        "common_mistakes": [],
        "variations": [],
        "related_entry_ids": [],
        "attributes": {},
        "status": status,
        "created_at": created_at,
        "updated_at": created_at,
        "tags": [{"name": name, "category": category} for category, name in tags or []],
        "media": [],
    }
    row.update(overrides)
    return row


def make_service(rows: list[dict]) -> EncyclopediaService:
    return EncyclopediaService(InMemoryEncyclopediaStore(rows))


# --------------------------------------------------------------------------
# status='published' gating — the one bug class that must never regress
# --------------------------------------------------------------------------


def test_search_entries_excludes_drafts():
    service = make_service(
        [
            make_row("published-drill", tags=[("focus", "throwing")]),
            make_row("draft-drill", status="draft", tags=[("focus", "throwing")]),
        ]
    )
    result = service.search_entries()
    assert [e.slug for e in result.results] == ["published-drill"]
    assert result.total == 1


def test_search_entries_excludes_drafts_even_when_query_matches():
    service = make_service(
        [make_row("zone-draft", status="draft", title="Zone Defense Draft")]
    )
    result = service.search_entries(query="zone")
    assert result.results == []
    assert result.total == 0


def test_get_entry_returns_none_for_draft():
    service = make_service([make_row("hidden", status="draft")])
    assert service.get_entry(EntryType.DRILL, "hidden") is None


def test_get_entry_returns_none_for_missing_slug():
    service = make_service([make_row("exists")])
    assert service.get_entry(EntryType.DRILL, "does-not-exist") is None


def test_get_entry_returns_none_for_wrong_type():
    service = make_service([make_row("exists", type="drill")])
    assert service.get_entry(EntryType.STRATEGY, "exists") is None


def test_get_entry_returns_published_entry():
    service = make_service([make_row("exists")])
    entry = service.get_entry(EntryType.DRILL, "exists")
    assert isinstance(entry, EntryDetail)
    assert entry.slug == "exists"


def test_get_similar_excludes_drafts():
    source = make_row("source", tags=[("focus", "throwing")])
    service = make_service(
        [
            source,
            make_row("draft-twin", status="draft", tags=[("focus", "throwing")]),
            make_row("published-twin", tags=[("focus", "throwing")]),
        ]
    )
    similar = service.get_similar(source["id"])
    assert [e.slug for e in similar] == ["published-twin"]


def test_get_similar_returns_empty_for_draft_source():
    draft = make_row("draft-source", status="draft", tags=[("focus", "throwing")])
    service = make_service([draft, make_row("other", tags=[("focus", "throwing")])])
    assert service.get_similar(draft["id"]) == []


# --------------------------------------------------------------------------
# Filter chain — Chain of Responsibility semantics
# --------------------------------------------------------------------------


def test_filters_or_within_category():
    service = make_service(
        [
            make_row("throwing-drill", tags=[("focus", "throwing")]),
            make_row("cutting-drill", tags=[("focus", "cutting")]),
            make_row("marking-drill", tags=[("focus", "marking")]),
        ]
    )
    result = service.search_entries(
        filters=EntryFilters(focus=("throwing", "cutting")), sort=SortOption.NEWEST
    )
    assert {e.slug for e in result.results} == {"throwing-drill", "cutting-drill"}


def test_filters_and_across_categories():
    service = make_service(
        [
            make_row(
                "both",
                tags=[("skill_level", "beginner"), ("focus", "throwing")],
            ),
            make_row("only-skill", tags=[("skill_level", "beginner")]),
            make_row("only-focus", tags=[("focus", "throwing")]),
        ]
    )
    result = service.search_entries(
        filters=EntryFilters(skill_level=("beginner",), focus=("throwing",))
    )
    assert [e.slug for e in result.results] == ["both"]


def test_skill_level_filter_matches_entry_column_too():
    service = make_service(
        [
            make_row("column-only", skill_level="beginner"),
            make_row("neither", skill_level="advanced"),
        ]
    )
    result = service.search_entries(filters=EntryFilters(skill_level=("beginner",)))
    assert [e.slug for e in result.results] == ["column-only"]


def test_no_active_filters_pass_everything_through():
    service = make_service([make_row("a"), make_row("b")])
    assert service.search_entries().total == 2


# --------------------------------------------------------------------------
# Sort strategies
# --------------------------------------------------------------------------


def _difficulty_rows() -> list[dict]:
    return [
        make_row(
            "hard-drill",
            tags=[("difficulty", "hard")],
            created_at="2026-01-01T00:00:00+00:00",
        ),
        make_row(
            "easy-drill",
            tags=[("difficulty", "easy")],
            created_at="2026-01-02T00:00:00+00:00",
        ),
        make_row(
            "medium-drill",
            tags=[("difficulty", "medium")],
            created_at="2026-01-03T00:00:00+00:00",
        ),
        make_row("unranked-drill", created_at="2026-01-04T00:00:00+00:00"),
    ]


def test_sort_difficulty_asc():
    service = make_service(_difficulty_rows())
    result = service.search_entries(sort=SortOption.DIFFICULTY_ASC)
    assert [e.slug for e in result.results] == [
        "easy-drill",
        "medium-drill",
        "hard-drill",
        "unranked-drill",  # unrankable entries always trail
    ]


def test_sort_difficulty_desc_keeps_unranked_last():
    service = make_service(_difficulty_rows())
    result = service.search_entries(sort=SortOption.DIFFICULTY_DESC)
    assert [e.slug for e in result.results] == [
        "hard-drill",
        "medium-drill",
        "easy-drill",
        "unranked-drill",
    ]


def test_sort_difficulty_falls_back_to_skill_level_column():
    service = make_service(
        [
            make_row("advanced", skill_level="advanced"),
            make_row("beginner", skill_level="beginner"),
        ]
    )
    result = service.search_entries(sort=SortOption.DIFFICULTY_ASC)
    assert [e.slug for e in result.results] == ["beginner", "advanced"]


def test_sort_newest():
    service = make_service(
        [
            make_row("old", created_at="2026-01-01T00:00:00+00:00"),
            make_row("new", created_at="2026-03-01T00:00:00+00:00"),
            make_row("mid", created_at="2026-02-01T00:00:00+00:00"),
        ]
    )
    result = service.search_entries(sort=SortOption.NEWEST)
    assert [e.slug for e in result.results] == ["new", "mid", "old"]


def test_sort_relevance_weights_title_over_description_over_body():
    service = make_service(
        [
            make_row("body-hit", body="A zone look.", title="Cup Movement"),
            make_row("title-hit", title="Zone Offense", body="none"),
            make_row(
                "description-hit",
                short_description="Beating a zone.",
                title="Popping",
                body="none",
            ),
        ]
    )
    result = service.search_entries(query="zone", sort=SortOption.RELEVANCE)
    assert [e.slug for e in result.results] == [
        "title-hit",
        "description-hit",
        "body-hit",
    ]


def test_default_relevance_sort_without_query_degrades_to_newest():
    service = make_service(
        [
            make_row("old", created_at="2026-01-01T00:00:00+00:00"),
            make_row("new", created_at="2026-02-01T00:00:00+00:00"),
        ]
    )
    result = service.search_entries()  # default sort=RELEVANCE, no query
    assert [e.slug for e in result.results] == ["new", "old"]


def test_query_requires_all_terms():
    service = make_service(
        [
            make_row("both-terms", title="Zone Offense Basics"),
            make_row("one-term", title="Zone Defense"),
        ]
    )
    result = service.search_entries(query="zone offense")
    assert [e.slug for e in result.results] == ["both-terms"]


# --------------------------------------------------------------------------
# Pagination (Iterator — one page at a time, never the full set)
# --------------------------------------------------------------------------


def test_search_entries_paginates():
    rows = [
        make_row(f"drill-{i}", created_at=f"2026-01-{i + 1:02d}T00:00:00+00:00")
        for i in range(5)
    ]
    service = make_service(rows)
    page2 = service.search_entries(sort=SortOption.NEWEST, page=2, page_size=2)
    assert page2.total == 5
    assert page2.page == 2
    assert page2.page_size == 2
    assert [e.slug for e in page2.results] == ["drill-2", "drill-1"]


def test_search_entries_filters_by_entry_type():
    service = make_service(
        [make_row("a-drill", type="drill"), make_row("a-play", type="play")]
    )
    result = service.search_entries(entry_type=EntryType.PLAY)
    assert [e.slug for e in result.results] == ["a-play"]


# --------------------------------------------------------------------------
# get_similar — TagOverlapStrategy ordering
# --------------------------------------------------------------------------


def test_get_similar_orders_by_tag_overlap():
    source = make_row(
        "source",
        tags=[("focus", "throwing"), ("skill_level", "beginner"), ("equipment", "cones")],
    )
    service = make_service(
        [
            source,
            make_row("one-shared", tags=[("focus", "throwing")]),
            make_row(
                "three-shared",
                tags=[
                    ("focus", "throwing"),
                    ("skill_level", "beginner"),
                    ("equipment", "cones"),
                ],
            ),
            make_row(
                "two-shared",
                tags=[("focus", "throwing"), ("skill_level", "beginner")],
            ),
            make_row("zero-shared", tags=[("focus", "marking")]),
        ]
    )
    similar = service.get_similar(source["id"])
    assert [e.slug for e in similar] == ["three-shared", "two-shared", "one-shared"]


def test_get_similar_respects_limit_and_excludes_self():
    tags = [("focus", "throwing")]
    source = make_row("source", tags=tags)
    others = [make_row(f"other-{i}", tags=tags) for i in range(5)]
    service = make_service([source] + others)
    similar = service.get_similar(source["id"], limit=3)
    assert len(similar) == 3
    assert "source" not in {e.slug for e in similar}


def test_get_similar_unknown_entry_returns_empty():
    service = make_service([make_row("only")])
    assert service.get_similar(str(uuid4())) == []


def test_get_similar_untagged_source_returns_empty():
    source = make_row("untagged")
    service = make_service([source, make_row("other", tags=[("focus", "throwing")])])
    assert service.get_similar(source["id"]) == []


# --------------------------------------------------------------------------
# entry_from_row — Factory Method
# --------------------------------------------------------------------------


def test_entry_from_row_builds_summary_with_typed_drill_attributes():
    row = make_row(
        "kill-drill",
        attributes={"player_count_min": "4", "player_count_max": 12, "junk": "kept"},
        tags=[("focus", "conditioning")],
    )
    summary = entry_from_row(row, TagRegistry())
    assert summary.type is EntryType.DRILL
    assert summary.attributes["player_count_min"] == 4  # coerced to int
    assert summary.attributes["player_count_max"] == 12
    assert summary.attributes["junk"] == "kept"  # additive drift tolerated
    assert [t.name for t in summary.tags] == ["conditioning"]


def test_entry_from_row_invalid_attributes_degrade_to_empty():
    row = make_row("bad-attrs", attributes={"player_count_min": "not-a-number"})
    summary = entry_from_row(row, TagRegistry())
    assert summary.attributes == {}


def test_entry_from_row_detail_orders_media_and_includes_sections():
    row = make_row(
        "full",
        coaching_points=["Stay low"],
        common_mistakes=["Rushing"],
        media=[
            {"url": "https://x/2.png", "type": "image", "caption": None, "sort_order": 2},
            {"url": "https://x/1.png", "type": "image", "caption": "First", "sort_order": 1},
        ],
    )
    detail = entry_from_row(row, TagRegistry(), detail=True)
    assert isinstance(detail, EntryDetail)
    assert detail.coaching_points == ["Stay low"]
    assert detail.common_mistakes == ["Rushing"]
    assert [m.url for m in detail.media] == ["https://x/1.png", "https://x/2.png"]


# --------------------------------------------------------------------------
# TagRegistry — Flyweight interning
# --------------------------------------------------------------------------


def test_tag_registry_interns_by_name_and_category():
    registry = TagRegistry()
    a = registry.get("throwing", "focus")
    b = registry.get("throwing", "focus")
    c = registry.get("throwing", "drill_type")
    assert a is b  # same flyweight instance
    assert a is not c
    assert len(registry) == 2


def test_service_reuses_tag_flyweights_across_entries():
    service = make_service(
        [
            make_row("one", tags=[("focus", "throwing")]),
            make_row("two", tags=[("focus", "throwing")]),
        ]
    )
    results = service.search_entries().results
    assert results[0].tags[0] is results[1].tags[0]
