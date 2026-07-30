// Entry detail page — the ONE shared template for all five entry types
// (Template Method): header/breadcrumbs → title → badges/meta row → primary
// media → numbered instructions body → optional EntrySections/* blocks
// (Decorator: each self-omits when its data is absent) → tag pills →
// SimilarEntries. Type-specific variation comes from the data (attributes,
// tags, sections present), never from per-type page components.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchEntry } from "../api/client";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { skillBadgeClass } from "../components/EntryCard";
import { CoachingPoints } from "../components/EntrySections/CoachingPoints";
import { CommonMistakes } from "../components/EntrySections/CommonMistakes";
import { Variations } from "../components/EntrySections/Variations";
import { MediaEmbed } from "../components/MediaEmbed";
import { SimilarEntries } from "../components/SimilarEntries";
import { EntryDetailSkeleton, InlineError } from "../components/Skeletons";
import { TagPill } from "../components/TagPill";
import { entryDescription, entryTitle, howToJsonLd, Seo } from "../seo/Seo";
import type { EntryDetail as EntryDetailData, SectionMeta } from "../types";
import { instructionSteps, sectionByPath } from "../types";
import { NotFound } from "./NotFound";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "not-found" }
  | { status: "ready"; entry: EntryDetailData };

/** Meta badges: skill level + duration tag + team size (attributes or tag). */
function metaBadges(entry: EntryDetailData): { label: string; className: string }[] {
  const badges: { label: string; className: string }[] = [];

  if (entry.skillLevel) {
    badges.push({
      label: entry.skillLevel,
      className: skillBadgeClass(entry.skillLevel),
    });
  }

  const duration = entry.tags.find((t) => t.category === "duration");
  if (duration) {
    badges.push({
      label: duration.name,
      className: "bg-zinc-50 border-film-border text-film-accentGreen",
    });
  }

  const min = entry.attributes["player_count_min"];
  const max = entry.attributes["player_count_max"];
  let teamSize: string | null = null;
  if (typeof min === "number" && typeof max === "number") {
    teamSize = min === max ? `${min} players` : `${min}–${max} players`;
  } else if (typeof min === "number") {
    teamSize = `${min}+ players`;
  } else {
    teamSize = entry.tags.find((t) => t.category === "team_size")?.name ?? null;
  }
  if (teamSize) {
    badges.push({
      label: teamSize,
      className: "bg-zinc-50 border-film-border text-film-accentGreen",
    });
  }

  return badges;
}

/** Graph-paper media pane with the mockup's mini "diagram frame" window —
 * the empty/loading state for the media slot until an entry has real media
 * (or the future Drill Visualizer renders here). */
function DiagramPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="graph-paper flex items-center justify-center border border-film-border bg-film-panel p-8"
    >
      <div className="flex aspect-square w-full max-w-md flex-col border border-zinc-300 bg-white shadow-sm">
        <div className="flex h-8 items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3">
          <span className="font-mono text-[10px] text-zinc-500">
            PLAYBOOK_VIEW_V1
          </span>
          <div className="flex gap-1">
            <div className="h-2 w-2 bg-zinc-300" />
            <div className="h-2 w-2 bg-zinc-300" />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center font-mono text-sm text-zinc-400">
          [ DIAGRAM COMING SOON ]
        </div>
      </div>
    </div>
  );
}

/** Numbered instructions: multi-line bodies render as an ordered list. */
function InstructionsBody({ body }: { body: string }) {
  const steps = instructionSteps(body);

  if (steps.length === 0) return null;

  return (
    <section aria-label="Setup & Instructions">
      <div className="mb-6 flex items-center gap-3 border-b border-film-border pb-2">
        <span className="bg-film-accentPink px-2 py-1 font-mono text-[10px] text-white">
          01
        </span>
        <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-zinc-900">
          Setup &amp; Instructions
        </h2>
      </div>
      {steps.length === 1 ? (
        <p className="text-base leading-relaxed text-zinc-700">{steps[0]}</p>
      ) : (
        <ol className="ml-5 list-decimal space-y-4 text-base leading-relaxed text-zinc-700">
          {steps.map((step, i) => (
            <li key={i} className="pl-2">
              {step}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function EntryDetailContent({
  section,
  slug,
}: {
  section: SectionMeta;
  slug: string;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchEntry(section.type, slug)
      .then((entry) => {
        if (cancelled) return;
        setState(entry ? { status: "ready", entry } : { status: "not-found" });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [section.type, slug, retryToken]);

  if (state.status === "loading") return <EntryDetailSkeleton />;

  if (state.status === "not-found") return <NotFound section={section} />;

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <InlineError
          message="Something went wrong loading this entry"
          onRetry={() => setRetryToken((t) => t + 1)}
        />
      </div>
    );
  }

  const { entry } = state;
  const primaryMedia = entry.media[0] ?? null;

  return (
    <article className="mx-auto max-w-[1400px] px-6 py-10">
      {/* Unique per-entry title/description; drills also emit HowTo JSON-LD
          (PRD FR-5.3) built from the same parsed steps rendered below. */}
      <Seo
        title={entryTitle(entry)}
        description={entryDescription(entry)}
        jsonLd={howToJsonLd(entry)}
      />

      {/* Breadcrumbs + type badge */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="bg-zinc-900 px-2 py-1 font-mono text-[10px] font-bold uppercase text-white">
          {entry.type}
        </span>
        <Breadcrumbs
          crumbs={[
            { label: "Home", to: "/" },
            { label: section.label, to: `/${section.path}` },
            { label: entry.title },
          ]}
        />
      </div>

      {/* Title */}
      <h1 className="font-heading mb-6 text-5xl uppercase leading-[1.1] tracking-tight text-zinc-900 lg:text-6xl">
        {entry.title}
      </h1>

      {/* Badges / duration / team-size row (above the fold). Every badge
          carries its text label — color is never the only signal. */}
      <div className="mb-8 flex flex-wrap gap-2 font-mono text-xs font-bold uppercase tracking-wider">
        {metaBadges(entry).map((badge) => (
          <span
            key={badge.label}
            className={`border px-3 py-1.5 ${badge.className}`}
          >
            {badge.label}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-12 md:flex-row md:items-start">
        {/* Primary media (sticky visual focus on desktop, per mockup); when
            an entry has no media yet, the mockup's graph-paper "diagram
            frame" holds the slot so the two-column layout stays intact. */}
        <div className="w-full md:sticky md:top-20 md:w-5/12">
          {primaryMedia ? (
            <MediaEmbed media={primaryMedia} />
          ) : (
            <DiagramPlaceholder />
          )}
        </div>

        {/* Scrollable info column */}
        <div className="w-full md:w-7/12">
          {entry.shortDescription && (
            <p className="mb-12 border-l-4 border-film-accentPink pl-5 text-lg leading-relaxed text-zinc-600">
              {entry.shortDescription}
            </p>
          )}

          <div className="space-y-16">
            <InstructionsBody body={entry.body} />

            {/* Decorator blocks — each contributes nothing when absent */}
            <CoachingPoints points={entry.coachingPoints} />
            <CommonMistakes mistakes={entry.commonMistakes} />
            <Variations variations={entry.variations} />

            {/* Tag pills → pre-filtered search */}
            {entry.tags.length > 0 && (
              <section aria-label="Tags">
                <h2 className="mb-4 font-mono text-sm font-bold uppercase tracking-widest text-zinc-900">
                  Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map((tag) => (
                    <TagPill key={`${tag.category}:${tag.name}`} tag={tag} />
                  ))}
                </div>
              </section>
            )}

            {/* Mockup's closing action block; disabled until the practice
                planner exists (mockup-parity plan #11). */}
            <div className="pt-2">
              <button
                type="button"
                disabled
                title="Coming soon"
                className="w-full cursor-not-allowed border-2 border-zinc-300 bg-white py-4 font-mono text-sm font-bold uppercase tracking-widest text-zinc-400"
              >
                + Add to Current Practice Plan (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Entries (self-omitting when no tag overlap) */}
      <SimilarEntries entries={entry.similar} />
    </article>
  );
}

export function EntryDetail() {
  const { section: sectionPath, slug } = useParams();
  const section = sectionByPath(sectionPath ?? "");

  if (!section || !slug) return <NotFound section={section} />;

  return (
    <EntryDetailContent
      key={`${section.type}/${slug}`}
      section={section}
      slug={slug}
    />
  );
}
