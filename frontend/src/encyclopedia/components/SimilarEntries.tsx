// Similar Entries row — up to 3 cards from the entry detail payload's
// `similar` field (EncyclopediaService.get_similar() tag-overlap scoring,
// delivered inline by GET /api/entries/{type}/{slug} via api/client.ts).
// Omitted entirely when nothing shares a tag (ux.md UI States) — Decorator
// convention, same as EntrySections/*.

import type { EntrySummary } from "../types";
import { EntryCard } from "./EntryCard";

export function SimilarEntries({ entries }: { entries: EntrySummary[] }) {
  if (entries.length === 0) return null;

  return (
    <section
      aria-label="Similar Entries"
      className="mt-16 border-t border-film-border pt-12"
    >
      <h2 className="mb-6 border-l-4 border-film-accentPink pl-3 text-2xl font-bold uppercase tracking-wide text-zinc-900">
        Similar Entries
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {entries.slice(0, 3).map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}
