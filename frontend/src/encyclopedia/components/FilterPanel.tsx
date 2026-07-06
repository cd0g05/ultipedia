// Filter panel for the search page (Partition 4, task 51).
//
// One DOM instance, two presentations: on desktop (lg+) the panel renders as
// an always-visible left sidebar; below that it collapses behind a "Filters"
// disclosure button (drawer) with an active-count badge, per UX "Filter Panel"
// states. Checkbox semantics give OR-within-a-category for free; the page-level
// state combines categories with AND. Native inputs keep everything
// keyboard-operable (Tab to reach, Space to toggle).

import { useState } from "react";
import {
  type ActiveFilters,
  type FilterCategory,
  FILTER_CATEGORIES,
  FILTER_CATEGORY_LABELS,
  countActiveFilters,
} from "../api/search";

// Curated starter taxonomy (free-text tags — no /api/tags endpoint yet, so the
// panel ships a fixed vocabulary aligned with the backend's difficulty ranking
// and the seed content's tag naming; see Reflect notes).
export const FILTER_OPTIONS: Record<FilterCategory, string[]> = {
  skill_level: ["beginner", "intermediate", "advanced"],
  team_size: ["individual", "pairs", "small-group", "full-team"],
  duration: ["under-10-min", "10-20-min", "20-40-min", "40-min-plus"],
  difficulty: ["easy", "medium", "hard"],
  focus: [
    "throwing",
    "cutting",
    "handling",
    "marking",
    "defense",
    "zone-defense",
    "conditioning",
  ],
  drill_type: ["warmup", "skill-development", "scrimmage", "game-situation"],
  equipment: ["disc", "cones", "none"],
};

/** "zone-defense" → "zone defense" (display only; wire value is untouched). */
export function filterValueLabel(value: string): string {
  return value.replace(/-/g, " ");
}

/** Panel options merged with any active values arriving from the URL (e.g. a
 * TagPill link with a tag outside the curated list) so every active filter is
 * always visible and un-checkable in the panel. */
function optionsFor(category: FilterCategory, active: ActiveFilters): string[] {
  const extras = active[category].filter(
    (v) => !FILTER_OPTIONS[category].includes(v)
  );
  return [...FILTER_OPTIONS[category], ...extras];
}

function FilterGroups({
  active,
  onToggle,
}: {
  active: ActiveFilters;
  onToggle: (category: FilterCategory, value: string) => void;
}) {
  return (
    <div className="space-y-5">
      {FILTER_CATEGORIES.map((category) => (
        <fieldset key={category}>
          <legend className="font-mono text-xs font-semibold uppercase tracking-wider text-gray-500">
            {FILTER_CATEGORY_LABELS[category]}
          </legend>
          <div className="mt-2 space-y-1">
            {optionsFor(category, active).map((value) => (
              <label
                key={value}
                className="flex min-h-[2.75rem] cursor-pointer items-center gap-2.5 rounded-lg px-1 text-sm capitalize text-gray-700 hover:bg-cream lg:min-h-0 lg:py-1"
              >
                <input
                  type="checkbox"
                  checked={active[category].includes(value)}
                  onChange={() => onToggle(category, value)}
                  className="h-4 w-4 rounded border-gray-300 accent-clay"
                />
                {filterValueLabel(value)}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export function FilterPanel({
  active,
  onToggle,
}: {
  active: ActiveFilters;
  onToggle: (category: FilterCategory, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const count = countActiveFilters(active);

  return (
    <div>
      {/* Mobile/tablet: collapsed-by-default drawer disclosure. */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls="filter-panel-groups"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[2.75rem] w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-semibold text-gray-800 lg:hidden"
      >
        <span>Filters</span>
        <span className="flex items-center gap-2">
          {count > 0 && (
            <span
              aria-label={`${count} active`}
              className="rounded-full bg-clay px-2 py-0.5 text-xs font-bold text-white"
            >
              {count}
            </span>
          )}
          <span aria-hidden="true">{open ? "▴" : "▾"}</span>
        </span>
      </button>

      {/* One instance of the groups: drawer body on mobile (hidden until the
          disclosure opens), always-visible sidebar content on lg+. */}
      <div
        id="filter-panel-groups"
        className={`${open ? "mt-3 block" : "hidden"} rounded-xl border border-gray-200 bg-white p-4 lg:mt-0 lg:block lg:border-0 lg:bg-transparent lg:p-0`}
      >
        <h2 className="mb-4 hidden font-bold text-gray-900 lg:block">Filters</h2>
        <FilterGroups active={active} onToggle={onToggle} />
      </div>
    </div>
  );
}
