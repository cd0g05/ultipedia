// Shared visual frame for the optional entry-page blocks (Decorator pattern):
// each concrete section (CoachingPoints / CommonMistakes / Variations)
// decorates EntryDetail's template with its block ONLY when it has data, and
// contributes nothing (renders null) otherwise — the template never branches
// on presence/absence itself.
//
// Each block is a collapsible disclosure (ux.md mockup 2's "expand to see
// more" pattern): a native <button> in the heading carries
// aria-expanded/aria-controls and is operable with Enter/Space for free;
// the controlled region gets `hidden` when collapsed. Blocks default to
// expanded so content stays visible to crawlers (ADR-3: client-rendered
// SEO) and to coaches scanning the page; collapsing is an opt-out. The
// chevron rotation is suppressed under prefers-reduced-motion.

import { useId, useState, type ReactNode } from "react";

export function SectionBlock({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const regionId = useId();

  return (
    <section aria-label={title}>
      <h2 className="mb-6 border-b border-film-border pb-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={regionId}
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-[44px] w-full items-center gap-3 text-left"
        >
          {/* decorative block numbering — excluded from the accessible name */}
          <span
            aria-hidden="true"
            className="bg-film-accentPink px-2 py-1 font-mono text-[10px] text-white"
          >
            {number}
          </span>
          <span className="flex-1 font-mono text-sm font-bold uppercase tracking-widest text-zinc-900">
            {title}
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-4 w-4 text-zinc-500 transition-transform motion-reduce:transition-none ${
              open ? "" : "-rotate-90"
            }`}
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </h2>
      <div id={regionId} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
