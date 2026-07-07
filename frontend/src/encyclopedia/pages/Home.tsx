// Encyclopedia homepage: hero + "Popular Resources" card grid (ux.md mockup
// 1). Replaces Partition 2's placeholder root route. With no popularity
// signal yet, "popular" = a cross-type sample (first entries of each type,
// interleaved) so every entry type is one click from "/" — this keeps the
// ≤2-clicks reachability criterion via homepage → card → entry alongside
// homepage → section → entry.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchEntries } from "../api/client";
import { EntryCard } from "../components/EntryCard";
import { SkeletonGrid } from "../components/Skeletons";
import { pageTitle, Seo } from "../seo/Seo";
import type { EntrySummary } from "../types";
import { SECTIONS } from "../types";

const FEATURED_COUNT = 6;

type LoadState =
  | { status: "loading" }
  | { status: "ready"; entries: EntrySummary[] };

/** Interleave per-type result lists so the featured grid spans types. */
export function interleaveFeatured(
  perType: EntrySummary[][],
  count: number
): EntrySummary[] {
  const featured: EntrySummary[] = [];
  const longest = Math.max(0, ...perType.map((list) => list.length));
  for (let i = 0; i < longest && featured.length < count; i++) {
    for (const list of perType) {
      if (i < list.length && featured.length < count) featured.push(list[i]);
    }
  }
  return featured;
}

function Hero() {
  return (
    <section className="border-b border-film-border bg-white">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-6 py-16 lg:py-24">
        <h1 className="max-w-4xl text-5xl font-bold uppercase leading-none tracking-tight text-zinc-900 lg:text-7xl">
          Everything your team needs to run a great practice.
        </h1>
        <p className="max-w-lg text-xl text-zinc-600">
          A free encyclopedia of ultimate frisbee drills, strategies, and
          formations — built for coaches and captains who don&apos;t have a
          playbook yet.
        </p>
        <div className="flex flex-col gap-4 pt-2 sm:flex-row">
          <Link
            to="/drills"
            className="bg-film-accentPink px-8 py-4 text-center font-mono text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-film-accentPinkDark"
          >
            Browse the Encyclopedia
          </Link>
          <Link
            to="/contribute"
            className="border border-film-border bg-film-panel px-8 py-4 text-center font-mono text-sm uppercase tracking-wider text-zinc-900 transition-colors hover:border-zinc-400"
          >
            Submit a Drill
          </Link>
        </div>
      </div>
    </section>
  );
}

function SectionTiles() {
  return (
    <nav
      aria-label="Browse by section"
      className="grid grid-cols-2 gap-4 sm:grid-cols-5"
    >
      {SECTIONS.map((section) => (
        <Link
          key={section.path}
          to={`/${section.path}`}
          className="border border-film-border bg-white px-4 py-6 text-center font-mono text-sm font-bold uppercase tracking-wider text-zinc-900 transition-colors hover:border-film-accentPink hover:text-film-accentPink"
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}

export function Home() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    // Each per-type fetch degrades to [] on failure so one failing type never
    // blanks the whole grid — and Promise.all therefore cannot reject: the
    // grid's worst case is the "nothing published" empty state, and the five
    // section tiles above remain the recovery path. No retry UI needed here.
    Promise.all(
      SECTIONS.map((section) =>
        fetchEntries(section.type).catch(() => [] as EntrySummary[])
      )
    ).then((perType) => {
      if (cancelled) return;
      setState({
        status: "ready",
        entries: interleaveFeatured(perType, FEATURED_COUNT),
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <Seo
        title={pageTitle("The Ultimate Frisbee Encyclopedia")}
        description="A free encyclopedia of ultimate frisbee drills, strategies, formations, plays, and skills — built for coaches and captains. Search, filter, and run a better practice."
      />

      <Hero />

      <section className="border-b border-film-border bg-film-panel">
        <div className="mx-auto max-w-[1400px] px-6 py-12">
          <SectionTiles />
        </div>
      </section>

      <section
        aria-label="Popular Resources"
        className="mx-auto max-w-[1400px] px-6 py-12"
      >
        <h2 className="mb-8 border-l-4 border-film-accentPink pl-3 text-2xl font-bold uppercase tracking-wide text-zinc-900">
          Popular Resources
        </h2>

        {state.status === "loading" && <SkeletonGrid label="Loading resources" />}

        {state.status === "ready" && state.entries.length === 0 && (
          <p className="text-lg text-zinc-600">
            Nothing published yet — check back soon
          </p>
        )}

        {state.status === "ready" && state.entries.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {state.entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
