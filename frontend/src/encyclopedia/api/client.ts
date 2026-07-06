// Typed fetch wrappers for the encyclopedia read API (ADR-4: browser talks to
// the FastAPI backend only, never Supabase). Owns the snake_case (wire) →
// camelCase (types.ts) mapping so components never touch raw payloads.
//
// Component tests mock this module (vi.mock("../api/client")), mirroring the
// intake convention of mocking at the client boundary.

import type {
  EntryDetail,
  EntrySummary,
  EntryType,
  MediaItem,
  Tag,
} from "../types";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// --- Wire shapes (snake_case, backend/app/schemas/encyclopedia.py) ----------

interface WireTag {
  name: string;
  category: string;
}

interface WireMedia {
  url: string;
  type: string;
  caption: string | null;
  sort_order: number;
}

interface WireEntrySummary {
  id: string;
  slug: string;
  type: EntryType;
  title: string;
  short_description: string;
  skill_level: string | null;
  attributes: Record<string, unknown>;
  tags: WireTag[];
}

interface WireEntryDetail extends WireEntrySummary {
  body: string;
  coaching_points: string[];
  common_mistakes: string[];
  variations: string[];
  media: WireMedia[];
  similar: WireEntrySummary[];
}

// --- Mapping -----------------------------------------------------------------

function toTag(raw: WireTag): Tag {
  return { name: raw.name, category: raw.category };
}

function toMedia(raw: WireMedia): MediaItem {
  return {
    url: raw.url,
    type: (raw.type as MediaItem["type"]) ?? "image",
    caption: raw.caption ?? null,
    sortOrder: raw.sort_order ?? 0,
  };
}

function toEntrySummary(raw: WireEntrySummary): EntrySummary {
  return {
    id: raw.id,
    slug: raw.slug,
    type: raw.type,
    title: raw.title,
    shortDescription: raw.short_description,
    skillLevel: raw.skill_level ?? null,
    attributes: raw.attributes ?? {},
    tags: (raw.tags ?? []).map(toTag),
  };
}

function toEntryDetail(raw: WireEntryDetail): EntryDetail {
  return {
    ...toEntrySummary(raw),
    body: raw.body ?? "",
    coachingPoints: raw.coaching_points ?? [],
    commonMistakes: raw.common_mistakes ?? [],
    variations: raw.variations ?? [],
    media: (raw.media ?? [])
      .map(toMedia)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    similar: (raw.similar ?? []).map(toEntrySummary),
  };
}

// --- Fetch wrappers ----------------------------------------------------------

/**
 * GET /api/entries?type={type} — published entries of one type (plain array,
 * server-capped at 100). `type` is required by the backend (400 without it).
 */
export async function fetchEntries(type: EntryType): Promise<EntrySummary[]> {
  const res = await fetch(`/api/entries?type=${encodeURIComponent(type)}`);
  if (!res.ok) {
    throw new ApiError(`Failed to load ${type} entries`, res.status);
  }
  const body = (await res.json()) as WireEntrySummary[];
  return body.map(toEntrySummary);
}

/**
 * GET /api/entries/{type}/{slug} — full detail incl. media + similar.
 * Returns null for missing/draft entries (backend 404) so callers can render
 * the not-found state; throws ApiError on any other failure.
 */
export async function fetchEntry(
  type: EntryType,
  slug: string
): Promise<EntryDetail | null> {
  const res = await fetch(
    `/api/entries/${encodeURIComponent(type)}/${encodeURIComponent(slug)}`
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new ApiError(`Failed to load entry ${type}/${slug}`, res.status);
  }
  const body = (await res.json()) as WireEntryDetail;
  return toEntryDetail(body);
}
