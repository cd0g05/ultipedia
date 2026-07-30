// Encyclopedia homepage, matching the accepted landing mockup
// (design/landing-and-encyclopedia-mockup.html #page1): two-column hero with
// tactical-board visual → section tiles → value props + "Popular Resources"
// split → practice-planner teaser → community callout band. With no
// popularity signal yet, "popular" = a cross-type sample (first entries of
// each type, interleaved) so every entry type is one click from "/" — this
// keeps the ≤2-clicks reachability criterion via homepage → card → entry
// alongside homepage → section → entry.

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
      <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-12 px-6 py-16 lg:flex-row lg:py-24">
        <div className="w-full space-y-8 lg:w-1/2">
          <h1 className="font-heading text-5xl uppercase leading-none tracking-tight text-zinc-900 lg:text-7xl">
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
            {/* Planner doesn't exist yet — visible-but-disabled placeholder
                so coaches see where it will live (mockup-parity plan #2). */}
            <button
              type="button"
              disabled
              title="Coming soon"
              className="cursor-not-allowed border border-film-border bg-film-panel px-8 py-4 text-center font-mono text-sm uppercase tracking-wider text-zinc-400"
            >
              Generate a Practice Plan
            </button>
          </div>
        </div>
        {/* Tactical-board visual placeholder (graph paper) per mockup; a real
            image/animation replaces the label when one exists. */}
        <div className="w-full lg:w-1/2">
          <div
            aria-hidden="true"
            className="graph-paper relative flex aspect-video items-center justify-center border border-film-border bg-film-panel"
          >
            <span className="border border-zinc-200 bg-white px-2 py-1 font-mono text-sm tracking-widest text-zinc-400">
              [ VISUAL PLACEHOLDER: TACTICAL TIMELINE ]
            </span>
          </div>
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

const VALUE_PROPS: { icon: JSX.Element; title: string; copy: string }[] = [
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    ),
    title: "Searchable Encyclopedia",
    copy: "Find the right drill in seconds, filtered by skill level, team size, and focus.",
  },
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
    title: "Automatic Practice Plans",
    copy: "Generate a full warm-up-to-scrimmage session, ready to export as a PDF.",
  },
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    ),
    title: "Built by the Community",
    copy: "Coaches contribute drills and strategies so the library keeps growing.",
  },
];

function ValueProps() {
  return (
    <div className="w-full space-y-12 border-film-border bg-film-panel p-8 lg:w-1/3 lg:border-r lg:p-12">
      {VALUE_PROPS.map((prop) => (
        <div key={prop.title}>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mb-4 h-8 w-8 text-film-accentGreen"
          >
            {prop.icon}
          </svg>
          {/* h2, not the mockup's h3: these directly follow the page h1 in
              DOM order (axe: heading-order). */}
          <h2 className="font-heading mb-2 text-xl uppercase tracking-wide text-zinc-900">
            {prop.title}
          </h2>
          <p className="text-sm leading-relaxed text-zinc-600">{prop.copy}</p>
        </div>
      ))}
    </div>
  );
}

function PlannerTeaser() {
  return (
    <section
      aria-label="Practice planner (coming soon)"
      className="border-b border-film-border bg-white"
    >
      <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-16 px-6 py-20 lg:flex-row">
        <div className="w-full space-y-6 lg:w-5/12">
          <h2 className="font-heading text-4xl uppercase leading-tight text-zinc-900">
            Build a practice plan in under a minute
          </h2>
          <p className="text-zinc-600">
            Tell us your practice length, team size, and focus — we&apos;ll
            build a warm-up, drills, and a scrimmage, complete with coaching
            points. Export it as a PDF and send it to your team.
          </p>
          <div className="pt-4">
            <button
              type="button"
              disabled
              className="cursor-not-allowed border border-zinc-300 bg-white px-6 py-3 font-mono text-sm uppercase tracking-wider text-zinc-400"
            >
              Try the Planner (Coming Soon)
            </button>
          </div>
        </div>
        {/* Mock PDF/export visual per mockup — pure decoration. */}
        <div className="w-full lg:w-7/12" aria-hidden="true">
          <div className="relative border border-film-border bg-film-panel p-4">
            <div className="mb-4 flex items-center justify-between border-b border-film-border pb-2">
              <span className="font-mono text-xs font-bold text-film-accentPink">
                EXPORT_MODULE_v1.0
              </span>
              <span className="font-mono text-xs text-zinc-500">.PDF</span>
            </div>
            <div className="space-y-2 opacity-60">
              <div className="h-4 w-full bg-zinc-300" />
              <div className="h-4 w-5/6 bg-zinc-300" />
              <div className="h-4 w-4/6 bg-zinc-300" />
              <div className="h-4 w-full bg-zinc-300" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="border border-zinc-300 bg-white px-4 py-1 font-mono text-sm tracking-widest text-zinc-600 shadow-sm">
                [ GENERATED PLAN VISUAL ]
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CommunityCallout() {
  return (
    <section
      aria-label="Community contribution"
      className="border-b border-film-border bg-film-panel"
    >
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-6 px-6 py-12 sm:flex-row">
        <div className="flex-1">
          <h2 className="font-heading mb-2 text-2xl uppercase text-zinc-900">
            Have a drill worth sharing?
          </h2>
          <p className="text-sm text-zinc-600">
            Ultipedia is built by coaches, for coaches. Submit a drill,
            strategy, or coaching tip and help other teams get better.
          </p>
        </div>
        {/* The one green primary button — reserved for the community action
            (MOCKUP-NOTES.md); hard shadow is the mockup's tactical accent. */}
        <Link
          to="/contribute"
          className="shrink-0 bg-film-accentGreen px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-white shadow-[4px_4px_0_0_#064e3b] transition-colors hover:bg-emerald-800"
        >
          Submit a Drill
        </Link>
      </div>
    </section>
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

      {/* Value props + Popular Resources split (mockup: 1/3 panel / 2/3 white). */}
      <div className="mx-auto flex max-w-[1400px] flex-col border-b border-film-border lg:flex-row">
        <ValueProps />

        <section
          aria-label="Popular Resources"
          className="w-full bg-white p-8 lg:w-2/3 lg:p-12"
        >
          <h2 className="font-heading mb-8 border-l-4 border-film-accentPink pl-3 text-2xl uppercase tracking-wide text-zinc-900">
            Popular Resources
          </h2>

          {state.status === "loading" && (
            <SkeletonGrid label="Loading resources" />
          )}

          {state.status === "ready" && state.entries.length === 0 && (
            <p className="text-lg text-zinc-600">
              Nothing published yet — check back soon
            </p>
          )}

          {state.status === "ready" && state.entries.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {state.entries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </section>
      </div>

      <PlannerTeaser />

      <CommunityCallout />
    </div>
  );
}
