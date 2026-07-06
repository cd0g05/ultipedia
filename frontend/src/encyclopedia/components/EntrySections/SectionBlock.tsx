// Shared visual frame for the optional entry-page blocks (Decorator pattern):
// each concrete section (CoachingPoints / CommonMistakes / Variations)
// decorates EntryDetail's template with its block ONLY when it has data, and
// contributes nothing (renders null) otherwise — the template never branches
// on presence/absence itself.

import type { ReactNode } from "react";

export function SectionBlock({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={title}>
      <div className="mb-6 flex items-center gap-3 border-b border-zinc-300 pb-2">
        <span className="bg-pink-700 px-2 py-1 font-mono text-[10px] text-white">
          {number}
        </span>
        <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-zinc-900">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}
