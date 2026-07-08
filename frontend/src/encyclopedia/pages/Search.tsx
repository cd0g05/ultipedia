// /search results page (Partition 4, tasks 53–56; restyled to the Light Film
// Room system in Partition 5 — white/zinc base, film-* accent tokens, square
// corners, mono uppercase micro-copy — so /search matches the browse pages).
//
// The URL's search params are the single source of truth for query, filters,
// sort, and page — so every filtered view is shareable, back/forward works,
// and Partition 3's TagPill links (`/search?<category>=<name>`) land
// pre-filtered. Filter semantics: OR within a category (repeated params),
// AND across categories — enforced server-side; the page just reflects and
// round-trips the params.
//
// Zero results are never a dead end (UX "Empty (over-filtered)"): the page
// names the most restrictive active filter (the one whose removal frees up the
// most results — measured by re-querying with each active pair removed),
// offers a one-tap removal, and shows 2–3 close-match cards.

import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  type ActiveFilters,
  type EntrySummary,
  type FilterCategory,
  type SortOption,
  FILTER_CATEGORIES,
  FILTER_CATEGORY_LABELS,
  activeFilterPairs,
  filtersFromSearchParams,
  searchEntries,
  withoutFilter,
} from "../api/search";
import { skillBadgeClass } from "../components/EntryCard";
import { FilterChips } from "../components/FilterChips";
import { FilterPanel, filterValueLabel } from "../components/FilterPanel";
import { SearchBar } from "../components/SearchBar";
import { InlineError, SkeletonGrid } from "../components/Skeletons";
import { pageTitle, Seo } from "../seo/Seo";
import { entryUrl } from "../types";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "difficulty_asc", label: "Difficulty (low to high)" },
  { value: "difficulty_desc", label: "Difficulty (high to low)" },
  { value: "newest", label: "Newest" },
];

const RESULTS_GRID = "grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3";

interface EmptyState {
  /** Present when ≥1 filter was active: the (category, value) whose removal
   * frees up the most results. */
  mostRestrictive: [FilterCategory, string] | null;
  closeMatches: EntrySummary[];
}

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "populated"; results: EntrySummary[]; total: number }
  | { status: "empty"; empty: EmptyState };

/** Find the most restrictive active filter by re-querying with each active
 * (category, value) removed and measuring which removal frees up the most
 * results; its relaxed results double as the close-match cards. */
async function buildEmptyState(
  q: string,
  filters: ActiveFilters,
  sort: SortOption | undefined
): Promise<EmptyState> {
  const pairs = activeFilterPairs(filters);
  if (pairs.length === 0) {
    // Query-only zero: suggest close matches from the newest published entries.
    const fallback = await searchEntries({ sort: "newest", pageSize: 3 });
    return { mostRestrictive: null, closeMatches: fallback.results.slice(0, 3) };
  }

  const relaxed = await Promise.all(
    pairs.map(([category, value]) =>
      searchEntries({
        q: q || undefined,
        filters: withoutFilter(filters, category, value),
        sort,
        pageSize: 3,
      })
    )
  );
  let best = 0;
  for (let i = 1; i < relaxed.length; i++) {
    if (relaxed[i].total > relaxed[best].total) best = i;
  }

  let closeMatches = relaxed[best].results.slice(0, 3);
  if (closeMatches.length === 0) {
    // Removing any single filter still yields nothing — relax harder so the
    // state is never a dead end: drop all filters, then drop the query too.
    const noFilters = await searchEntries({ q: q || undefined, pageSize: 3 });
    closeMatches = noFilters.results.slice(0, 3);
    if (closeMatches.length === 0) {
      const anything = await searchEntries({ sort: "newest", pageSize: 3 });
      closeMatches = anything.results.slice(0, 3);
    }
  }
  return { mostRestrictive: pairs[best], closeMatches };
}

/** Result card in the EntryCard visual frame (type strip → title →
 * description → badges). Only the title is a link so assistive tech (and the
 * sort-order tests) read one clean link per card. */
function ResultCard({ entry }: { entry: EntrySummary }) {
  return (
    <li className="border border-film-border bg-white transition-colors hover:border-film-accentPink">
      <div className="border-b border-film-border bg-film-panel px-3 py-2">
        <span className="bg-zinc-900 px-2 py-1 font-mono text-[10px] font-bold uppercase text-white">
          {entry.type}
        </span>
      </div>
      <div className="p-4">
        <Link
          to={entryUrl(entry)}
          className="text-lg font-bold uppercase tracking-wide text-zinc-900 hover:text-film-accentPink"
        >
          {entry.title}
        </Link>
        <p className="mb-3 mt-1 line-clamp-2 text-xs text-zinc-600">
          {entry.shortDescription}
        </p>
        <div className="flex flex-wrap gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider">
          {entry.skillLevel && (
            <span
              className={`border px-1.5 py-0.5 ${skillBadgeClass(entry.skillLevel)}`}
            >
              {entry.skillLevel}
            </span>
          )}
          {entry.tags.slice(0, 3).map((tag) => (
            <span
              key={`${tag.category}:${tag.name}`}
              className="border border-film-border bg-zinc-50 px-1.5 py-0.5 text-film-accentGreen"
            >
              {tag.name}
            </span>
          ))}
        </div>
      </div>
    </li>
  );
}

export function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [retryToken, setRetryToken] = useState(0);

  const q = searchParams.get("q") ?? "";
  const filters = filtersFromSearchParams(searchParams);
  const sortParam = searchParams.get("sort");
  const sort = SORT_OPTIONS.some((o) => o.value === sortParam)
    ? (sortParam as SortOption)
    : undefined;
  const paramsKey = searchParams.toString();

  useEffect(() => {
    let stale = false;
    setState({ status: "loading" });
    (async () => {
      try {
        const params = new URLSearchParams(paramsKey);
        const activeFilters = filtersFromSearchParams(params);
        const query = params.get("q") ?? "";
        const sortValue = params.get("sort");
        const activeSort = SORT_OPTIONS.some((o) => o.value === sortValue)
          ? (sortValue as SortOption)
          : undefined;
        const result = await searchEntries({
          q: query || undefined,
          filters: activeFilters,
          sort: activeSort,
        });
        if (stale) return;
        if (result.total === 0) {
          const empty = await buildEmptyState(query, activeFilters, activeSort);
          if (!stale) setState({ status: "empty", empty });
        } else {
          setState({
            status: "populated",
            results: result.results,
            total: result.total,
          });
        }
      } catch (error) {
        if (!stale) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Something went wrong loading results",
          });
        }
      }
    })();
    return () => {
      stale = true;
    };
  }, [paramsKey, retryToken]);

  const updateParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams);
      mutate(next);
      next.delete("page"); // any narrowing change restarts pagination
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const toggleFilter = useCallback(
    (category: FilterCategory, value: string) => {
      updateParams((params) => {
        const values = params.getAll(category);
        params.delete(category);
        const next = values.includes(value)
          ? values.filter((v) => v !== value)
          : [...values, value];
        for (const v of next) params.append(category, v);
      });
    },
    [updateParams]
  );

  const removeFilter = useCallback(
    (category: FilterCategory, value: string) => {
      updateParams((params) => {
        const values = params.getAll(category).filter((v) => v !== value);
        params.delete(category);
        for (const v of values) params.append(category, v);
      });
    },
    [updateParams]
  );

  const clearAllFilters = useCallback(() => {
    updateParams((params) => {
      for (const category of FILTER_CATEGORIES) params.delete(category);
    });
  }, [updateParams]);

  const setSort = useCallback(
    (value: string) => {
      updateParams((params) => params.set("sort", value));
    },
    [updateParams]
  );

  const clearQuery = useCallback(() => {
    updateParams((params) => params.delete("q"));
  }, [updateParams]);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <Seo
        title={q ? pageTitle(`Search: ${q}`) : pageTitle("Search")}
        description="Search and filter the full ultimate frisbee encyclopedia — drills, strategies, formations, plays, and skills — by skill level, team size, duration, and focus."
      />

      <div className="mb-8 border-b border-film-border pb-3">
        <h1 className="font-heading inline-block border-b-2 border-film-accentPink pb-3 text-4xl font-bold uppercase tracking-wide text-zinc-900">
          Search
        </h1>
      </div>

      {/* Page-level full-width bar (the header bar is compact/desktop-only). */}
      <SearchBar />

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <aside aria-label="Filter results" className="lg:w-64 lg:shrink-0">
          <FilterPanel active={filters} onToggle={toggleFilter} />
        </aside>

        <section aria-label="Search results" className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              className="font-mono text-sm uppercase tracking-wider text-zinc-600"
              role="status"
            >
              {state.status === "populated" &&
                `${state.total} result${state.total === 1 ? "" : "s"}${q ? ` for "${q}"` : ""}`}
              {state.status === "empty" && "0 results"}
              {state.status === "loading" && "Searching…"}
            </p>
            <label className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-zinc-600">
              Sort by
              <select
                value={sort ?? "relevance"}
                onChange={(e) => setSort(e.target.value)}
                className="border border-film-border bg-white px-2 py-1.5 font-mono text-sm text-zinc-900"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3">
            <FilterChips
              active={filters}
              onRemove={removeFilter}
              onClearAll={clearAllFilters}
            />
          </div>

          <div className="mt-4">
            {state.status === "loading" && (
              <SkeletonGrid gridClassName={RESULTS_GRID} />
            )}

            {state.status === "error" && (
              <InlineError
                message="Something went wrong loading results"
                onRetry={() => setRetryToken((t) => t + 1)}
              />
            )}

            {state.status === "populated" && (
              <ul className={`${RESULTS_GRID} list-none`}>
                {state.results.map((entry) => (
                  <ResultCard key={entry.id} entry={entry} />
                ))}
              </ul>
            )}

            {state.status === "empty" && (
              <div className="border border-film-border bg-white p-6">
                {state.empty.mostRestrictive ? (
                  <>
                    <h2 className="text-lg font-bold uppercase tracking-wide text-zinc-900">
                      No exact matches for these filters
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      {`Your most restrictive filter is ${FILTER_CATEGORY_LABELS[state.empty.mostRestrictive[0]]}: ${filterValueLabel(state.empty.mostRestrictive[1])}.`}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        removeFilter(
                          state.empty.mostRestrictive![0],
                          state.empty.mostRestrictive![1]
                        )
                      }
                      className="mt-3 bg-film-accentPink px-4 py-2 font-mono text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-film-accentPinkDark"
                    >
                      {`Remove "${filterValueLabel(state.empty.mostRestrictive[1])}" to see more`}
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-bold uppercase tracking-wide text-zinc-900">
                      {q
                        ? `No results for "${q}"`
                        : "Nothing published here yet — check back soon"}
                    </h2>
                    {q && (
                      <button
                        type="button"
                        onClick={clearQuery}
                        className="mt-3 bg-film-accentPink px-4 py-2 font-mono text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-film-accentPinkDark"
                      >
                        Clear search
                      </button>
                    )}
                  </>
                )}

                {state.empty.closeMatches.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-600">
                      Close matches
                    </h3>
                    <ul className={`mt-3 list-none ${RESULTS_GRID}`}>
                      {state.empty.closeMatches.map((entry) => (
                        <ResultCard key={entry.id} entry={entry} />
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
