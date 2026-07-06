// Clickable tag pill — routes to a pre-filtered search view
// (/search?{category}={name}). The Search page itself lands in Partition 4;
// the URL contract is fixed here so links are stable across partitions.
// Min 44px touch target per ux.md accessibility requirements.

import { Link } from "react-router-dom";
import type { Tag } from "../types";

export function tagSearchUrl(tag: Tag): string {
  return `/search?${encodeURIComponent(tag.category)}=${encodeURIComponent(tag.name)}`;
}

export function TagPill({ tag }: { tag: Tag }) {
  return (
    <Link
      to={tagSearchUrl(tag)}
      className="inline-flex min-h-[44px] items-center border border-zinc-300 bg-zinc-50 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-emerald-700 transition-colors hover:border-pink-700 hover:text-pink-700"
    >
      {tag.name}
    </Link>
  );
}
