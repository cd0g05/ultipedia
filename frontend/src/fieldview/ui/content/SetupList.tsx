// The list of curated setups (FR-4.1/4.2): name in mono caps, the one-line
// takeaway under it, the active row marked with the pink rule. Five rows show
// at a time (fixed row height) and the rest scroll.

// One row of the setup list: a one-frame play, shown by name with its one-line
// takeaway (the play's description).
export interface SetupItem {
  id: string;
  label: string;
  takeaway: string;
}

const ROW_PX = 68;
const VISIBLE_ROWS = 5;

export interface SetupListProps {
  setups: SetupItem[];
  activeIndex: number;
  // Whether the live scene differs from the loaded setup (the ✎ marker).
  custom: boolean;
  onSelect: (index: number) => void;
}

export function SetupList({ setups, activeIndex, custom, onSelect }: SetupListProps) {
  return (
    <ul
      aria-label="Setups"
      data-testid="setup-list"
      className="overflow-y-auto"
      style={{ maxHeight: ROW_PX * VISIBLE_ROWS }}
    >
      {setups.map((setup, i) => {
        const active = i === activeIndex;
        return (
          <li key={setup.id}>
            <button
              type="button"
              aria-current={active ? "true" : undefined}
              onClick={() => onSelect(i)}
              style={{ height: ROW_PX }}
              className={`block w-full overflow-hidden border-b border-l-[3px] border-b-film-border px-4 py-2 text-left ${
                active
                  ? "border-l-film-accentPink bg-film-panel"
                  : "border-l-transparent hover:bg-film-panel"
              }`}
            >
              <span
                className={`block font-mono text-xs font-bold uppercase tracking-wider ${
                  active ? "text-film-accentPink" : "text-zinc-900"
                }`}
              >
                {setup.label}
                {active && custom && <span title="Changed from the preset"> ✎</span>}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-zinc-600">
                {setup.takeaway}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
