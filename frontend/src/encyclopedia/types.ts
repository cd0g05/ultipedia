// Encyclopedia domain types — the camelCase mirror of the backend read-model
// contract in backend/app/schemas/encyclopedia.py. The wire format is
// snake_case; api/client.ts owns the mapping so no component ever sees a raw
// wire payload.

export type EntryType = "drill" | "strategy" | "formation" | "play" | "skill";

export interface Tag {
  name: string;
  category: string;
}

export interface MediaItem {
  url: string;
  type: "image" | "youtube" | "vimeo";
  caption: string | null;
  sortOrder: number;
}

export interface EntrySummary {
  id: string;
  slug: string;
  type: EntryType;
  title: string;
  shortDescription: string;
  skillLevel: string | null;
  attributes: Record<string, unknown>;
  tags: Tag[];
}

export interface EntryDetail extends EntrySummary {
  body: string;
  coachingPoints: string[];
  commonMistakes: string[];
  variations: string[]; // entry ids per contract; rendered as-is until resolvable
  media: MediaItem[];
  similar: EntrySummary[];
}

// --- Section metadata (Template Method parameterization) --------------------
// One Section.tsx serves all five browse pages; this table is the single
// source of truth mapping the URL segment (plural) to the entry type
// (singular, per the API contract) and display copy.

export interface SectionMeta {
  type: EntryType;
  path: string; // URL segment, e.g. "drills"
  label: string; // display name, e.g. "Drills"
}

export const SECTIONS: readonly SectionMeta[] = [
  { type: "drill", path: "drills", label: "Drills" },
  { type: "strategy", path: "strategies", label: "Strategies" },
  { type: "formation", path: "formations", label: "Formations" },
  { type: "play", path: "plays", label: "Plays" },
  { type: "skill", path: "skills", label: "Skills" },
] as const;

export function sectionByPath(path: string): SectionMeta | undefined {
  return SECTIONS.find((s) => s.path === path);
}

export function sectionByType(type: EntryType): SectionMeta {
  // Every EntryType has a section by construction.
  return SECTIONS.find((s) => s.type === type)!;
}

/** Canonical detail-page URL for an entry. */
export function entryUrl(entry: Pick<EntrySummary, "type" | "slug">): string {
  return `/${sectionByType(entry.type).path}/${entry.slug}`;
}
