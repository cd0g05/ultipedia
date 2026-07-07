// Typed wrapper for GET /api/search (Partition 4).
//
// Wire format is snake_case (backend/app/schemas/encyclopedia.py); this module
// maps it to the shared camelCase domain types in ../types.ts (the Partition 5
// consolidation of the parallel-build duplication). Search-specific shapes
// (SearchResponse, SortOption, filter categories/helpers) stay here.

import type { EntrySummary, EntryType, Tag } from "../types";

// Re-exported so search consumers keep one import site for entry shapes.
export type { EntrySummary, EntryType, Tag } from "../types";

export interface SearchResponse {
  results: EntrySummary[];
  total: number;
  page: number;
  pageSize: number;
}

export type SortOption =
  | "relevance"
  | "difficulty_asc"
  | "difficulty_desc"
  | "newest";

/** The seven filter categories, using the wire/query-param names. OR within a
 * category (repeat the param), AND across categories. */
export const FILTER_CATEGORIES = [
  "skill_level",
  "team_size",
  "duration",
  "difficulty",
  "focus",
  "drill_type",
  "equipment",
] as const;

export type FilterCategory = (typeof FILTER_CATEGORIES)[number];

export const FILTER_CATEGORY_LABELS: Record<FilterCategory, string> = {
  skill_level: "Skill Level",
  team_size: "Team Size",
  duration: "Duration",
  difficulty: "Difficulty",
  focus: "Focus",
  drill_type: "Drill Type",
  equipment: "Equipment",
};

/** Selected values per category. Empty array = category inactive. */
export type ActiveFilters = Record<FilterCategory, string[]>;

export function emptyFilters(): ActiveFilters {
  return {
    skill_level: [],
    team_size: [],
    duration: [],
    difficulty: [],
    focus: [],
    drill_type: [],
    equipment: [],
  };
}

/** Parse filter state out of URL search params (`/search?focus=throwing&...`).
 * The URL is the single source of truth so filtered views are shareable and
 * Partition 3's TagPill links (`/search?<category>=<name>`) pre-filter. */
export function filtersFromSearchParams(params: URLSearchParams): ActiveFilters {
  const filters = emptyFilters();
  for (const category of FILTER_CATEGORIES) {
    filters[category] = params.getAll(category).filter((v) => v.trim() !== "");
  }
  return filters;
}

/** Flatten to [category, value] pairs, in chain order. */
export function activeFilterPairs(
  filters: ActiveFilters
): [FilterCategory, string][] {
  const pairs: [FilterCategory, string][] = [];
  for (const category of FILTER_CATEGORIES) {
    for (const value of filters[category]) pairs.push([category, value]);
  }
  return pairs;
}

export function countActiveFilters(filters: ActiveFilters): number {
  return activeFilterPairs(filters).length;
}

/** Return a copy of `filters` without one (category, value) pair. */
export function withoutFilter(
  filters: ActiveFilters,
  category: FilterCategory,
  value: string
): ActiveFilters {
  return {
    ...filters,
    [category]: filters[category].filter((v) => v !== value),
  };
}

export interface SearchQuery {
  q?: string;
  filters?: Partial<ActiveFilters>;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
}

export function buildSearchParams(query: SearchQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  for (const category of FILTER_CATEGORIES) {
    for (const value of query.filters?.[category] ?? []) {
      params.append(category, value);
    }
  }
  if (query.sort) params.set("sort", query.sort);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined)
    params.set("page_size", String(query.pageSize));
  return params;
}

// --- wire types (snake_case, as served by the backend) ----------------------

interface WireEntrySummary {
  id: string;
  slug: string;
  type: EntryType;
  title: string;
  short_description: string;
  skill_level: string | null;
  attributes: Record<string, unknown>;
  tags: Tag[]; // wire tag shape is identical to the domain Tag
}

interface WireSearchResult {
  results: WireEntrySummary[];
  total: number;
  page: number;
  page_size: number;
}

function toEntrySummary(wire: WireEntrySummary): EntrySummary {
  return {
    id: wire.id,
    slug: wire.slug,
    type: wire.type,
    title: wire.title,
    shortDescription: wire.short_description,
    skillLevel: wire.skill_level ?? null,
    attributes: wire.attributes ?? {},
    tags: (wire.tags ?? []).map((t) => ({ name: t.name, category: t.category })),
  };
}

/** GET /api/search. Throws on non-200 (callers render inline error + retry). */
export async function searchEntries(
  query: SearchQuery = {},
  init?: { signal?: AbortSignal }
): Promise<SearchResponse> {
  const params = buildSearchParams(query);
  const qs = params.toString();
  const res = await fetch(`/api/search${qs ? `?${qs}` : ""}`, {
    signal: init?.signal,
  });
  if (!res.ok) {
    let detail: string | undefined;
    try {
      detail = ((await res.json()) as { detail?: string }).detail;
    } catch {
      /* ignore body parse failures */
    }
    throw new Error(detail ?? `Search failed (${res.status})`);
  }
  const body = (await res.json()) as WireSearchResult;
  return {
    results: (body.results ?? []).map(toEntrySummary),
    total: body.total,
    page: body.page,
    pageSize: body.page_size,
  };
}
