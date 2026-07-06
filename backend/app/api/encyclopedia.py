"""Encyclopedia read endpoints — GET /api/entries, /api/entries/{type}/{slug},
GET /api/search.

Handlers stay thin (tech-design error-handling pattern): validate params,
delegate to `EncyclopediaService`, translate `None` into 404. Draft gating is
NOT done here — `EncyclopediaService` scopes every query to
status='published' itself, so no handler can leak a draft by omission.

Invalid `type` / `sort` / filter values return 400 (not FastAPI's default
422), per the API contract — hence params are taken as plain strings and
parsed against the enums explicitly.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from backend.app.schemas.encyclopedia import (
    EntryDetail,
    EntryFilters,
    EntrySummary,
    EntryType,
    SearchResult,
    SortOption,
)
from backend.app.services.encyclopedia import EncyclopediaService

router = APIRouter(prefix="/api", tags=["encyclopedia"])

#: /api/entries returns a plain array (no pagination in the contract); cap it
#: so the response can never be unbounded (Iterator/pagination NFR).
BROWSE_PAGE_SIZE = 100
MAX_PAGE_SIZE = 100


def get_encyclopedia_service(request: Request) -> EncyclopediaService:
    return request.app.state.encyclopedia


def _parse_entry_type(value: str | None) -> EntryType:
    try:
        return EntryType(value or "")
    except ValueError:
        valid = ", ".join(t.value for t in EntryType)
        raise HTTPException(status_code=400, detail=f"invalid type; expected one of: {valid}")


def _parse_sort(value: str | None) -> SortOption:
    if value is None:
        return SortOption.RELEVANCE  # degrades to newest when no query is given
    try:
        return SortOption(value)
    except ValueError:
        valid = ", ".join(s.value for s in SortOption)
        raise HTTPException(status_code=400, detail=f"invalid sort; expected one of: {valid}")


def _build_filters(**categories: list[str]) -> EntryFilters:
    cleaned: dict[str, tuple[str, ...]] = {}
    for category, values in categories.items():
        stripped = tuple(v.strip() for v in values)
        if any(not v for v in stripped):
            raise HTTPException(
                status_code=400, detail=f"invalid {category} filter value"
            )
        cleaned[category] = stripped
    return EntryFilters(**cleaned)


@router.get("/entries", response_model=list[EntrySummary])
def list_entries(
    type: str | None = Query(default=None),
    skill_level: list[str] = Query(default=[]),
    team_size: list[str] = Query(default=[]),
    duration: list[str] = Query(default=[]),
    difficulty: list[str] = Query(default=[]),
    focus: list[str] = Query(default=[]),
    drill_type: list[str] = Query(default=[]),
    equipment: list[str] = Query(default=[]),
    service: EncyclopediaService = Depends(get_encyclopedia_service),
) -> list[EntrySummary]:
    entry_type = _parse_entry_type(type)
    filters = _build_filters(
        skill_level=skill_level,
        team_size=team_size,
        duration=duration,
        difficulty=difficulty,
        focus=focus,
        drill_type=drill_type,
        equipment=equipment,
    )
    result = service.search_entries(
        filters=filters, entry_type=entry_type, page=1, page_size=BROWSE_PAGE_SIZE
    )
    return result.results


@router.get("/entries/{entry_type}/{slug}", response_model=EntryDetail)
def get_entry(
    entry_type: str,
    slug: str,
    service: EncyclopediaService = Depends(get_encyclopedia_service),
) -> EntryDetail:
    parsed_type = _parse_entry_type(entry_type)
    entry = service.get_entry(parsed_type, slug)
    if entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@router.get("/search", response_model=SearchResult)
def search(
    q: str | None = Query(default=None),
    skill_level: list[str] = Query(default=[]),
    team_size: list[str] = Query(default=[]),
    duration: list[str] = Query(default=[]),
    difficulty: list[str] = Query(default=[]),
    focus: list[str] = Query(default=[]),
    drill_type: list[str] = Query(default=[]),
    equipment: list[str] = Query(default=[]),
    sort: str | None = Query(default=None),
    page: int = Query(default=1),
    page_size: int = Query(default=24),
    service: EncyclopediaService = Depends(get_encyclopedia_service),
) -> SearchResult:
    sort_option = _parse_sort(sort)
    filters = _build_filters(
        skill_level=skill_level,
        team_size=team_size,
        duration=duration,
        difficulty=difficulty,
        focus=focus,
        drill_type=drill_type,
        equipment=equipment,
    )
    if page < 1:
        raise HTTPException(status_code=400, detail="page must be >= 1")
    if not 1 <= page_size <= MAX_PAGE_SIZE:
        raise HTTPException(
            status_code=400, detail=f"page_size must be between 1 and {MAX_PAGE_SIZE}"
        )
    return service.search_entries(
        query=q,
        filters=filters,
        sort=sort_option,
        page=page,
        page_size=page_size,
    )
