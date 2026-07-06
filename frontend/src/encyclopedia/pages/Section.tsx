// Section browse page — ONE component serving all five sections (Template
// Method): the page skeleton (breadcrumbs → header → grid) is fixed; the
// `:section` route param selects the SectionMeta that parameterizes the
// fetch, copy, and links. An unknown segment renders the 404 page.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchEntries } from "../api/client";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { EntryCard } from "../components/EntryCard";
import type { EntrySummary, SectionMeta } from "../types";
import { sectionByPath } from "../types";
import { NotFound } from "./NotFound";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; entries: EntrySummary[] };

function SectionContent({ section }: { section: SectionMeta }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

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
  }, [section.type]);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="mb-6">
        <Breadcrumbs
          crumbs={[{ label: "Home", to: "/" }, { label: section.label }]}
        />
      </div>

      <div className="mb-8 border-b border-zinc-300 pb-3">
        <h1 className="inline-block border-b-2 border-pink-700 pb-3 text-4xl font-bold uppercase tracking-wide text-zinc-900">
          {section.label}
        </h1>
      </div>

      {state.status === "loading" && (
        <p className="font-mono text-sm uppercase tracking-wider text-zinc-500">
          Loading {section.label.toLowerCase()}…
        </p>
      )}

      {state.status === "error" && (
        <p className="font-mono text-sm uppercase tracking-wider text-zinc-600">
          Something went wrong loading results
        </p>
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
