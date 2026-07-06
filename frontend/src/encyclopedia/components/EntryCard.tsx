// Grid card used by Home (Popular Resources), Section pages, and
// SimilarEntries. Title, short description, difficulty/skill badge, and 2–3
// tags. Tags on cards are static labels (the whole card is one link — nested
// links are invalid HTML); clickable TagPills live on the entry detail page.

import { Link } from "react-router-dom";
import type { EntrySummary } from "../types";
import { entryUrl } from "../types";

// Badge palette: color is never the only signal — the text label is always
// shown (WCAG requirement per ux.md).
const SKILL_BADGE_CLASSES: Record<string, string> = {
  beginner: "bg-emerald-50 border-emerald-700 text-emerald-800",
  intermediate: "bg-yellow-50 border-yellow-700 text-yellow-800",
  advanced: "bg-red-50 border-red-700 text-red-800",
};

export function skillBadgeClass(skillLevel: string): string {
  return (
    SKILL_BADGE_CLASSES[skillLevel.toLowerCase()] ??
    "bg-zinc-50 border-zinc-400 text-zinc-700"
  );
}

export function EntryCard({ entry }: { entry: EntrySummary }) {
  // Difficulty badge shows skillLevel; the remaining tag slots skip the
  // skill_level category so the same label isn't shown twice.
  const cardTags = entry.tags
    .filter(
      (t) =>
        !(
          t.category === "skill_level" &&
          entry.skillLevel &&
          t.name.toLowerCase() === entry.skillLevel.toLowerCase()
        )
    )
    .slice(0, 3);

  return (
    <Link
      to={entryUrl(entry)}
      className="group block border border-zinc-300 bg-white transition-colors hover:border-pink-700"
      data-testid="entry-card"
    >
      <div className="relative border-b border-zinc-300 bg-zinc-100 px-3 py-2">
        <span className="bg-zinc-900 px-2 py-1 font-mono text-[10px] font-bold uppercase text-white">
          {entry.type}
        </span>
      </div>
      <div className="p-4">
        <h3 className="mb-1 truncate text-lg font-bold uppercase tracking-wide text-zinc-900">
          {entry.title}
        </h3>
        <p className="mb-3 line-clamp-2 text-xs text-zinc-600">
          {entry.shortDescription}
        </p>
        <div className="flex flex-wrap gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider">
          {entry.skillLevel && (
            <span
              className={`border px-1.5 py-0.5 ${skillBadgeClass(entry.skillLevel)}`}
            >
              {entry.skillLevel}
            </span>
          )}
          {cardTags.map((tag) => (
            <span
              key={`${tag.category}:${tag.name}`}
              className="border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-emerald-700"
            >
              {tag.name}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
