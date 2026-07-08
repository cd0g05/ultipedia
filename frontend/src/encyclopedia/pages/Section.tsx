// Section browse page — ONE component serving all five sections (Template
// Method): the page skeleton (breadcrumbs → header → grid) is fixed; the
// `:section` route param selects the SectionMeta that parameterizes the
// fetch, copy, and links. An unknown segment renders the 404 page.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchEntries } from "../api/client";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { EntryCard } from "../components/EntryCard";
import { InlineError, SkeletonGrid } from "../components/Skeletons";
import { pageTitle, Seo } from "../seo/Seo";
import type { EntrySummary, SectionMeta } from "../types";
import { sectionByPath } from "../types";
import { NotFound } from "./NotFound";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; entries: EntrySummary[] };

function sectionDescription(section: SectionMeta): string {
  return `Browse ultimate frisbee ${section.label.toLowerCase()} — setup, instructions, coaching points, and variations. Free, no login required.`;
}

function SectionContent({ section }: { section: SectionMeta }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchEntries(section.type)
      .then((entries) => {
        if (!cancelled) setState({ status: "ready", entries });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [section.type, retryToken]);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <Seo
        title={pageTitle(section.label)}
        description={sectionDescription(section)}
      />

      <div className="mb-6">
        <Breadcrumbs
          crumbs={[{ label: "Home", to: "/" }, { label: section.label }]}
        />
      </div>

      <div className="mb-8 border-b border-film-border pb-3">
        <h1 className="font-heading inline-block border-b-2 border-film-accentPink pb-3 text-4xl font-bold uppercase tracking-wide text-zinc-900">
          {section.label}
        </h1>
      </div>

      {state.status === "loading" && (
        <SkeletonGrid label={`Loading ${section.label.toLowerCase()}`} />
      )}

      {state.status === "error" && (
        <InlineError
          message="Something went wrong loading results"
          onRetry={() => setRetryToken((t) => t + 1)}
        />
      )}

      {state.status === "ready" && state.entries.length === 0 && (
        <p className="text-lg text-zinc-600">
          Nothing published in {section.label} yet — check back soon
        </p>
      )}

      {state.status === "ready" && state.entries.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {state.entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Section() {
  const { section: sectionPath } = useParams();
  const section = sectionByPath(sectionPath ?? "");

  if (!section) return <NotFound />;

  // key= forces a clean remount (fresh load state) when navigating between
  // sections via the header nav.
  return <SectionContent key={section.type} section={section} />;
}
