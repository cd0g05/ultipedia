"""EncyclopediaService — read-only facade over entries/tags/entry_tags/media.

Design patterns required by tech-design ("Design Patterns (Required)"):

- **Factory Method** — `entry_from_row()` is the ONE place a raw `entries` row
  (+ its `attributes` JSONB) becomes a typed `EntrySummary`/`EntryDetail`.
  No other layer branches on `type` to interpret a row.
- **Flyweight** — `TagRegistry` interns one shared `Tag` per `(name, category)`
  so tag-set comparisons across the whole result set reuse instances.
- **Chain of Responsibility** — the filter pipeline is a linked sequence of
  independent narrowing handlers, one per category (skill level → team size →
  duration → difficulty → focus → drill type → equipment). OR within a
  category's handler; AND across the chain.
- **Strategy** — interchangeable `SortStrategy` implementations (relevance /
  difficulty asc / difficulty desc / newest) and a `SimilarityStrategy` seam
  (`TagOverlapStrategy` ships now; an embedding strategy can swap in later).
- **Facade + Iterator** — `EncyclopediaService` is the only entry point
  (ADR-6), and `search_entries()` always returns one paginated page.

SECURITY INVARIANT: `status = 'published'` gating lives HERE, in
`EncyclopediaService._published_rows()`, which every public method reads
through. No API handler or store implementation is trusted to remember it,
so no new endpoint can leak a draft entry by omission.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Protocol
from uuid import UUID

from pydantic import BaseModel, ValidationError

from backend.app.config import Settings
from backend.app.services.embeddings import tokenize
from backend.app.schemas.encyclopedia import (
    FILTER_CATEGORIES,
    DrillAttributes,
    EntryDetail,
    EntryFilters,
    EntrySummary,
    EntryType,
    MediaItem,
    PlayAttributes,
    SearchResult,
    SkillAttributes,
    SortOption,
    StrategyAttributes,
    Tag,
)

logger = logging.getLogger("ulti.encyclopedia")


# --------------------------------------------------------------------------
# Store boundary (mocked in tests, matches storage.py's Protocol pattern)
# --------------------------------------------------------------------------


class EncyclopediaStore(Protocol):
    """Raw-row source for encyclopedia data.

    Each row is a dict of `entries` columns plus two embedded lists:
    `tags` (`[{name, category}]`) and `media` (`[{url, type, caption,
    sort_order}]`). Stores may pre-filter for efficiency, but the service
    NEVER relies on it — the published gate is applied in the service.
    """

    def list_entries(self) -> list[dict[str, Any]]: ...


class InMemoryEncyclopediaStore:
    """Non-persistent store for local dev and tests."""

    def __init__(self, entries: list[dict[str, Any]] | None = None) -> None:
        self.entries: list[dict[str, Any]] = list(entries or [])

    def add(self, row: dict[str, Any]) -> None:
        self.entries.append(row)

    def list_entries(self) -> list[dict[str, Any]]:
        return list(self.entries)


class SupabaseEncyclopediaStore:
    """Real store. Imports supabase lazily so the dep isn't needed for tests."""

    def __init__(self, url: str, service_key: str) -> None:
        from supabase import create_client  # lazy import

        self._client = create_client(url, service_key)

    def list_entries(self) -> list[dict[str, Any]]:
        # `.eq("status", ...)` here is an optimization only (don't ship drafts
        # over the wire) — the service re-applies the published gate itself.
        res = (
            self._client.table("entries")
            .select("*, entry_tags(tags(name, category)), media(url, type, caption, sort_order)")
            .eq("status", "published")
            .execute()
        )
        rows: list[dict[str, Any]] = list(res.data or [])
        for row in rows:
            row["tags"] = [
                et["tags"] for et in row.pop("entry_tags", []) or [] if et.get("tags")
            ]
        return rows


def build_encyclopedia_store(settings: Settings) -> EncyclopediaStore:
    if settings.supabase_configured:
        assert settings.supabase_url and settings.supabase_service_key
        logger.info("Using Supabase encyclopedia store")
        return SupabaseEncyclopediaStore(
            settings.supabase_url, settings.supabase_service_key
        )
    logger.warning(
        "SUPABASE_URL / SUPABASE_SERVICE_KEY not set — using empty in-memory "
        "encyclopedia store."
    )
    return InMemoryEncyclopediaStore()


# --------------------------------------------------------------------------
# Flyweight — tag interning
# --------------------------------------------------------------------------


class TagRegistry:
    """Interns one shared `Tag` instance per `(name, category)` (Flyweight).

    The taxonomy is small (~20–30 fixed values) but referenced by every entry
    and compared across the whole result set in `get_similar()`.
    """

    def __init__(self) -> None:
        self._cache: dict[tuple[str, str], Tag] = {}

    def get(self, name: str, category: str) -> Tag:
        key = (name, category)
        tag = self._cache.get(key)
        if tag is None:
            tag = Tag(name=name, category=category)
            self._cache[key] = tag
        return tag

    def __len__(self) -> int:
        return len(self._cache)


# --------------------------------------------------------------------------
# Factory Method — row hydration
# --------------------------------------------------------------------------

_ATTRIBUTE_MODELS: dict[EntryType, type[BaseModel]] = {
    EntryType.DRILL: DrillAttributes,
    EntryType.STRATEGY: StrategyAttributes,
    EntryType.FORMATION: StrategyAttributes,
    EntryType.PLAY: PlayAttributes,
    EntryType.SKILL: SkillAttributes,
}


def _parse_attributes(entry_type: EntryType, raw: Any) -> dict[str, Any]:
    """Validate the per-type `attributes` JSONB via its Pydantic model."""
    model = _ATTRIBUTE_MODELS[entry_type]
    try:
        return model.model_validate(raw or {}).model_dump(exclude_none=True)
    except ValidationError:
        logger.warning("invalid %s attributes payload; serving empty", entry_type.value)
        return {}


def _parse_ts(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _created_key(row: dict[str, Any]) -> float:
    ts = _parse_ts(row.get("created_at"))
    if ts is None:
        return 0.0
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return ts.timestamp()


def _row_tags(row: dict[str, Any], registry: TagRegistry) -> list[Tag]:
    tags = []
    for t in row.get("tags") or []:
        name, category = t.get("name"), t.get("category")
        if name and category:
            tags.append(registry.get(name, category))
    return tags


def entry_from_row(
    row: dict[str, Any],
    registry: TagRegistry,
    *,
    detail: bool = False,
    similar: list[EntrySummary] | None = None,
) -> EntrySummary | EntryDetail:
    """Factory Method: raw `entries` row + `attributes` JSONB → typed object.

    The ONLY place `type` is interpreted to hydrate a row; picks the per-type
    attributes model and interns tags through the Flyweight registry.
    """
    entry_type = EntryType(row["type"])
    base: dict[str, Any] = dict(
        id=str(row["id"]),
        slug=row["slug"],
        type=entry_type,
        title=row["title"],
        short_description=row.get("short_description") or "",
        skill_level=row.get("skill_level"),
        attributes=_parse_attributes(entry_type, row.get("attributes")),
        tags=_row_tags(row, registry),
    )
    if not detail:
        return EntrySummary(**base)

    media = sorted(
        (MediaItem.model_validate(m) for m in row.get("media") or []),
        key=lambda m: m.sort_order,
    )
    return EntryDetail(
        **base,
        body=row.get("body") or "",
        coaching_points=[str(p) for p in row.get("coaching_points") or []],
        common_mistakes=[str(m) for m in row.get("common_mistakes") or []],
        variations=[str(v) for v in row.get("variations") or []],
        related_entry_ids=[str(r) for r in row.get("related_entry_ids") or []],
        created_at=_parse_ts(row.get("created_at")),
        updated_at=_parse_ts(row.get("updated_at")),
        media=list(media),
        similar=similar or [],
    )


# --------------------------------------------------------------------------
# Chain of Responsibility — filter pipeline
# --------------------------------------------------------------------------


class FilterHandler(ABC):
    """One narrowing step. Handlers are linked; each narrows then passes on."""

    def __init__(self) -> None:
        self._next: FilterHandler | None = None

    def set_next(self, handler: "FilterHandler") -> "FilterHandler":
        self._next = handler
        return handler

    def handle(
        self, rows: list[dict[str, Any]], filters: EntryFilters
    ) -> list[dict[str, Any]]:
        rows = self._apply(rows, filters)
        return self._next.handle(rows, filters) if self._next else rows

    @abstractmethod
    def _apply(
        self, rows: list[dict[str, Any]], filters: EntryFilters
    ) -> list[dict[str, Any]]: ...


class TagCategoryFilter(FilterHandler):
    """Narrows to rows carrying ANY selected tag in one category (OR within);
    chaining one handler per category yields AND across categories."""

    def __init__(self, category: str) -> None:
        super().__init__()
        self.category = category

    def _matches(self, row: dict[str, Any], wanted: set[str]) -> bool:
        names = {
            (t.get("name") or "").lower()
            for t in row.get("tags") or []
            if t.get("category") == self.category
        }
        # skill_level is also a first-class column on entries — honor it too.
        if self.category == "skill_level" and row.get("skill_level"):
            names.add(str(row["skill_level"]).lower())
        return bool(wanted & names)

    def _apply(
        self, rows: list[dict[str, Any]], filters: EntryFilters
    ) -> list[dict[str, Any]]:
        wanted = {v.lower() for v in filters.values_for(self.category)}
        if not wanted:
            return rows  # category inactive — pass through unchanged
        return [r for r in rows if self._matches(r, wanted)]


def build_filter_chain() -> FilterHandler:
    """skill level → team size → duration → difficulty → focus → drill type → equipment."""
    handlers = [TagCategoryFilter(category) for category in FILTER_CATEGORIES]
    for current, nxt in zip(handlers, handlers[1:]):
        current.set_next(nxt)
    return handlers[0]


# --------------------------------------------------------------------------
# Strategy — sorting
# --------------------------------------------------------------------------

_DIFFICULTY_RANK = {
    "beginner": 1,
    "easy": 1,
    "intermediate": 2,
    "medium": 2,
    "moderate": 2,
    "advanced": 3,
    "hard": 3,
}


def _difficulty_rank(row: dict[str, Any]) -> int | None:
    """Rank from the entry's `difficulty` tag, falling back to `skill_level`."""
    for t in row.get("tags") or []:
        if t.get("category") != "difficulty":
            continue
        name = str(t.get("name") or "").strip().lower()
        if name.isdigit():
            return int(name)
        if name in _DIFFICULTY_RANK:
            return _DIFFICULTY_RANK[name]
    level = str(row.get("skill_level") or "").strip().lower()
    return _DIFFICULTY_RANK.get(level)


def _matches_query(row: dict[str, Any], terms: list[str]) -> bool:
    haystack = " ".join(
        str(row.get(field) or "")
        for field in ("title", "short_description", "body")
    ).lower()
    return all(term in haystack for term in terms)


class SortStrategy(ABC):
    """Interchangeable result ordering (Strategy)."""

    @abstractmethod
    def sort(
        self, rows: list[dict[str, Any]], query: str | None = None
    ) -> list[dict[str, Any]]: ...


class NewestSort(SortStrategy):
    def sort(
        self, rows: list[dict[str, Any]], query: str | None = None
    ) -> list[dict[str, Any]]:
        return sorted(rows, key=_created_key, reverse=True)


class DifficultySort(SortStrategy):
    def __init__(self, ascending: bool = True) -> None:
        self.ascending = ascending

    def sort(
        self, rows: list[dict[str, Any]], query: str | None = None
    ) -> list[dict[str, Any]]:
        decorated = [(_difficulty_rank(r), r) for r in rows]  # rank once per row
        ranked = [(rank, r) for rank, r in decorated if rank is not None]
        unranked = [r for rank, r in decorated if rank is None]
        sign = 1 if self.ascending else -1
        ranked.sort(key=lambda item: (sign * item[0], -_created_key(item[1])))
        unranked.sort(key=_created_key, reverse=True)
        return [r for _, r in ranked] + unranked  # unrankable entries always trail


class RelevanceSort(SortStrategy):
    """Naive term-frequency scoring (title ×3, short description ×2, body ×1).
    Without a query there is nothing to rank — falls back to newest, which
    also implements the API default ('relevance' if q present, else newest)."""

    def _score(self, row: dict[str, Any], terms: list[str]) -> int:
        title = str(row.get("title") or "").lower()
        short = str(row.get("short_description") or "").lower()
        body = str(row.get("body") or "").lower()
        return sum(
            3 * title.count(t) + 2 * short.count(t) + body.count(t) for t in terms
        )

    def sort(
        self, rows: list[dict[str, Any]], query: str | None = None
    ) -> list[dict[str, Any]]:
        terms = tokenize(query) if query else []
        if not terms:
            return NewestSort().sort(rows)
        return sorted(
            rows, key=lambda r: (-self._score(r, terms), -_created_key(r))
        )


_SORT_STRATEGIES: dict[SortOption, SortStrategy] = {
    SortOption.RELEVANCE: RelevanceSort(),
    SortOption.DIFFICULTY_ASC: DifficultySort(ascending=True),
    SortOption.DIFFICULTY_DESC: DifficultySort(ascending=False),
    SortOption.NEWEST: NewestSort(),
}


# --------------------------------------------------------------------------
# Strategy — similarity
# --------------------------------------------------------------------------


class SimilarityStrategy(ABC):
    """Swappable similarity seam — a future EmbeddingStrategy replaces
    TagOverlapStrategy without touching any caller (ADR-6)."""

    @abstractmethod
    def score(self, source_tags: set[Tag], candidate_tags: set[Tag]) -> float: ...


class TagOverlapStrategy(SimilarityStrategy):
    def score(self, source_tags: set[Tag], candidate_tags: set[Tag]) -> float:
        return float(len(source_tags & candidate_tags))


# --------------------------------------------------------------------------
# Facade
# --------------------------------------------------------------------------


class EncyclopediaService:
    """The one entry point for browse + search + similar (Facade, ADR-6)."""

    def __init__(
        self,
        store: EncyclopediaStore,
        similarity: SimilarityStrategy | None = None,
    ) -> None:
        self._store = store
        self._registry = TagRegistry()
        self._filter_chain = build_filter_chain()
        self._similarity = similarity or TagOverlapStrategy()

    # -- the single draft gate ------------------------------------------------

    def _published_rows(self) -> list[dict[str, Any]]:
        """THE `status = 'published'` gate. Every public method reads through
        here; drafts never travel further into the service."""
        return [
            row
            for row in self._store.list_entries()
            if row.get("status") == "published"
        ]

    # -- public facade ----------------------------------------------------------

    def search_entries(
        self,
        query: str | None = None,
        filters: EntryFilters | None = None,
        sort: SortOption = SortOption.RELEVANCE,
        page: int = 1,
        page_size: int = 24,
        entry_type: EntryType | None = None,
    ) -> SearchResult:
        """Single entry point for browse + search + filter.

        Always scoped to status='published'. Default sort (RELEVANCE) degrades
        to newest when no query is given, per the API contract.
        """
        filters = filters or EntryFilters()
        rows = self._published_rows()
        if entry_type is not None:
            rows = [r for r in rows if r.get("type") == entry_type.value]
        if query:
            terms = tokenize(query)
            rows = [r for r in rows if _matches_query(r, terms)]
        rows = self._filter_chain.handle(rows, filters)
        rows = _SORT_STRATEGIES[sort].sort(rows, query=query)

        total = len(rows)
        start = (page - 1) * page_size
        page_rows = rows[start : start + page_size]
        results = [entry_from_row(r, self._registry) for r in page_rows]
        logger.info(
            "encyclopedia search q=%r type=%s sort=%s page=%d/%d -> %d of %d",
            query,
            entry_type.value if entry_type else None,
            sort.value,
            page,
            page_size,
            len(results),
            total,
        )
        return SearchResult(results=results, total=total, page=page, page_size=page_size)

    def get_entry(self, entry_type: EntryType, slug: str) -> EntryDetail | None:
        """Returns None (→ 404) if missing or not published."""
        rows = self._published_rows()
        for row in rows:
            if row.get("type") == entry_type.value and row.get("slug") == slug:
                similar = self._similar_from_rows(row, rows)
                return entry_from_row(
                    row, self._registry, detail=True, similar=similar
                )
        logger.warning(
            "encyclopedia entry not found: type=%s slug=%s", entry_type.value, slug
        )
        return None

    def get_similar(self, entry_id: UUID | str, limit: int = 3) -> list[EntrySummary]:
        """Published entries sharing tags with `entry_id`, best overlap first
        (SimilarityStrategy — TagOverlapStrategy by default)."""
        rows = self._published_rows()
        source = next((r for r in rows if str(r.get("id")) == str(entry_id)), None)
        if source is None:
            return []
        return self._similar_from_rows(source, rows, limit=limit)

    def _similar_from_rows(
        self, source: dict[str, Any], rows: list[dict[str, Any]], limit: int = 3
    ) -> list[EntrySummary]:
        """Score `rows` (already published-gated) against `source` — shared by
        get_similar() and get_entry() so a detail request fetches rows once."""
        source_tags = set(_row_tags(source, self._registry))
        if not source_tags:
            return []

        scored: list[tuple[float, dict[str, Any]]] = []
        for row in rows:
            if str(row.get("id")) == str(source.get("id")):
                continue
            score = self._similarity.score(
                source_tags, set(_row_tags(row, self._registry))
            )
            if score > 0:
                scored.append((score, row))
        scored.sort(key=lambda item: (-item[0], -_created_key(item[1]), item[1]["slug"]))
        return [entry_from_row(row, self._registry) for _, row in scored[:limit]]
