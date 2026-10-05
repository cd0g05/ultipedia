// Watch's list of plays (FR-5.3): five rows show at a time (fixed row height)
// and the rest scroll. Same visual pattern as the setup list so the two modes
// feel like one tool.

import type { Play } from "../../play/format";

const ROW_PX = 56;
const VISIBLE_ROWS = 5;

export interface PlayListProps {
  plays: readonly Play[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function PlayList({ plays, activeIndex, onSelect }: PlayListProps) {
  return (
    <ul
      aria-label="Plays"
      data-testid="play-list"
      className="overflow-y-auto"
      style={{ maxHeight: ROW_PX * VISIBLE_ROWS }}
    >
      {plays.map((play, i) => {
        const active = i === activeIndex;
        const frames = play.frames.length;
        return (
          <li key={`${play.name}-${i}`}>
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
                {play.name}
              </span>
              <span className="block truncate text-xs text-zinc-600">
                {frames} frames{play.description ? ` · ${play.description}` : ""}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
