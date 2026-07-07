// 404 page for unresolved routes and missing/draft entry slugs. Never a dead
// end (ux.md): always links back to the relevant section (when known) and to
// search. Copy per ux.md: "We couldn't find that entry".

import { Link } from "react-router-dom";
import type { SectionMeta } from "../types";
import { SECTIONS } from "../types";

export function NotFound({ section }: { section?: SectionMeta }) {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col items-start gap-8 px-6 py-24">
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-film-accentPink">
        404 — Not Found
      </p>
      <h1 className="text-4xl font-bold uppercase leading-tight tracking-tight text-zinc-900 lg:text-5xl">
        We couldn&apos;t find that entry
      </h1>
      <p className="max-w-lg text-lg text-zinc-600">
        It may have moved, or it isn&apos;t published yet. Head back to a
        section or search for what you need.
      </p>
      <div className="flex flex-wrap gap-4">
        {section && (
          <Link
            to={`/${section.path}`}
            className="bg-film-accentPink px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-film-accentPinkDark"
          >
            Browse {section.label}
          </Link>
        )}
        <Link
          to="/search"
          className="border border-film-border bg-film-panel px-6 py-3 font-mono text-sm uppercase tracking-wider text-zinc-900 transition-colors hover:border-zinc-400"
        >
          Search the Encyclopedia
        </Link>
      </div>
      {!section && (
        <nav
          aria-label="Browse a section"
          className="flex flex-wrap gap-3 border-t border-film-border pt-6 font-mono text-xs uppercase tracking-wider"
        >
          {SECTIONS.map((s) => (
            <Link
              key={s.path}
              to={`/${s.path}`}
              className="border border-film-border px-3 py-2 text-zinc-600 transition-colors hover:border-film-accentPink hover:text-film-accentPink"
            >
              {s.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
