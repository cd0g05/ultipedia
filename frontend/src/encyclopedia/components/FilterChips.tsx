// Removable active-filter chip row (Partition 4, task 52).
//
// Rendered above the results grid whenever ≥1 filter is active, mirroring the
// panel's checked state (UX "Active filters applied"). Each chip is a native
// button (keyboard-operable) whose activation removes exactly that
// (category, value) pair — results update in place, no page reload.

import {
  type ActiveFilters,
  type FilterCategory,
  FILTER_CATEGORY_LABELS,
  activeFilterPairs,
} from "../api/search";
import { filterValueLabel } from "./FilterPanel";

export function FilterChips({
  active,
  onRemove,
  onClearAll,
}: {
  active: ActiveFilters;
  onRemove: (category: FilterCategory, value: string) => void;
  onClearAll: () => void;
}) {
  const pairs = activeFilterPairs(active);
  if (pairs.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {pairs.map(([category, value]) => (
        <li key={`${category}:${value}`}>
          <button
            type="button"
            onClick={() => onRemove(category, value)}
            aria-label={`Remove filter ${FILTER_CATEGORY_LABELS[category]}: ${filterValueLabel(value)}`}
            className="flex min-h-[2.25rem] items-center gap-1.5 rounded-full border border-clay/40 bg-cream px-3 py-1 font-mono text-xs uppercase tracking-wider text-clay hover:border-clay"
          >
            {filterValueLabel(value)}
            <span aria-hidden="true" className="font-sans text-sm leading-none">
              ×
            </span>
          </button>
        </li>
      ))}
      {pairs.length > 1 && (
        <li>
          <button
            type="button"
            onClick={onClearAll}
            className="min-h-[2.25rem] px-2 py-1 text-xs font-semibold text-gray-500 underline underline-offset-2 hover:text-gray-800"
          >
            Clear all
          </button>
        </li>
      )}
    </ul>
  );
}
