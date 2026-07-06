"""Encyclopedia read-model schemas — the /api/entries and /api/search contract.

These mirror `frontend/src/encyclopedia/types.ts` (tech-design "API & Interface
Design"). Wire format is snake_case, matching the existing API convention
(e.g. `submission_id`); the frontend client maps to camelCase TS types.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class EntryType(str, Enum):
    DRILL = "drill"
    STRATEGY = "strategy"
    FORMATION = "formation"
    PLAY = "play"
    SKILL = "skill"


class SortOption(str, Enum):
    RELEVANCE = "relevance"
    DIFFICULTY_ASC = "difficulty_asc"
    DIFFICULTY_DESC = "difficulty_desc"
    NEWEST = "newest"


#: The seven filter categories, in Chain of Responsibility order (tech-design):
#: skill level → team size → duration → difficulty → focus → drill type → equipment.
FILTER_CATEGORIES: tuple[str, ...] = (
    "skill_level",
    "team_size",
    "duration",
    "difficulty",
    "focus",
    "drill_type",
    "equipment",
)


class Tag(BaseModel):
    """A `(name, category)` taxonomy value. Frozen → hashable → suitable for
    Flyweight interning and set-overlap similarity scoring."""

    model_config = ConfigDict(frozen=True)

    name: str
    category: str


class EntryFilters(BaseModel):
    """Selected tag names per category. OR within a category, AND across
    categories (each category is one narrowing handler in the filter chain)."""

    skill_level: tuple[str, ...] = ()
    team_size: tuple[str, ...] = ()
    duration: tuple[str, ...] = ()
    difficulty: tuple[str, ...] = ()
    focus: tuple[str, ...] = ()
    drill_type: tuple[str, ...] = ()
    equipment: tuple[str, ...] = ()

    def values_for(self, category: str) -> tuple[str, ...]:
        return getattr(self, category)


class MediaItem(BaseModel):
    url: str
    type: str  # image | youtube | vimeo
    caption: str | None = None
    sort_order: int = 0


class EntrySummary(BaseModel):
    """Card-level entry shape returned by /api/entries and /api/search."""

    id: str
    slug: str
    type: EntryType
    title: str
    short_description: str
    skill_level: str | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)
    tags: list[Tag] = Field(default_factory=list)


class EntryDetail(EntrySummary):
    """Full entry shape returned by /api/entries/{type}/{slug}."""

    body: str = ""
    coaching_points: list[str] = Field(default_factory=list)
    common_mistakes: list[str] = Field(default_factory=list)
    variations: list[str] = Field(default_factory=list)  # entry ids
    related_entry_ids: list[str] = Field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None
    media: list[MediaItem] = Field(default_factory=list)
    similar: list[EntrySummary] = Field(default_factory=list)


class SearchResult(BaseModel):
    """One page of results (Iterator pattern — never the full result set)."""

    results: list[EntrySummary]
    total: int
    page: int
    page_size: int


# --- Per-type `attributes` JSONB payloads (Factory Method targets) -----------
# Untyped at the DB layer by design (ADR-5); validated here at the service
# boundary. `extra="allow"` tolerates additive drift without dropping data.


class DrillAttributes(BaseModel):
    model_config = ConfigDict(extra="allow")

    player_count_min: int | None = None
    player_count_max: int | None = None


class StrategyAttributes(BaseModel):
    """Shared by `strategy` and `formation` entries."""

    model_config = ConfigDict(extra="allow")

    offense_or_defense: str | None = None
    diagram_ref: str | None = None


class PlayAttributes(BaseModel):
    model_config = ConfigDict(extra="allow")

    parent_entry_id: str | None = None


class SkillAttributes(BaseModel):
    model_config = ConfigDict(extra="allow")

    difficulty_progression: list[str] | None = None
    prerequisite_skill_ids: list[str] | None = None
