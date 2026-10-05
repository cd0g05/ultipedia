// "My plays" (fieldview-build ADR-43): the one list of plays saved on this
// device — plays and one-frame setups together — with New play, open,
// duplicate and delete. The built-in examples sit below it, read-only: you open
// a copy ("Duplicate to edit"), never the example itself.
//
// PLACEHOLDER(fieldview-build): the labels and empty-state wording are stand-ins
// (docs/fieldview-placeholders.md #23).

import type { Play } from "../../play/format";
import type { StoredPlay } from "../../play/library";
import { BTN } from "./controls";

export interface LibraryListProps {
  entries: readonly StoredPlay[];
  currentId: string | null;
  examples: readonly Play[];
  onNew: () => void;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicateExample: (play: Play) => void;
}

const describe = (play: Play) => (play.frames.length === 1 ? "1 frame · setup" : `${play.frames.length} frames`);

const head = "px-4 pb-2 pt-4 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400";
const small =
  "h-8 border border-film-border bg-white px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-700 hover:bg-film-panel";

export function LibraryList({
  entries,
  currentId,
  examples,
  onNew,
  onOpen,
  onDuplicate,
  onDelete,
  onDuplicateExample,
}: LibraryListProps) {
  return (
    <div>
      <div role="group" aria-label="My plays">
        <h2 className={`${head} flex justify-between`}>
          My plays <span>{entries.length}</span>
        </h2>
        {entries.length === 0 ? (
          <p className="px-4 pb-3 text-sm text-zinc-600">No plays yet. Start with New play.</p>
        ) : (
          <ul aria-label="My plays" data-testid="library-list">
            {entries.map((entry) => {
              const active = entry.id === currentId;
              return (
                <li key={entry.id} className={`border-b border-l-[3px] border-b-film-border ${active ? "border-l-film-accentPink bg-film-panel" : "border-l-transparent"}`}>
                  <button
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onClick={() => onOpen(entry.id)}
                    className="block w-full px-4 pb-1 pt-2 text-left hover:bg-film-panel"
                  >
                    <span className={`block truncate font-mono text-xs font-bold uppercase tracking-wider ${active ? "text-film-accentPink" : "text-zinc-900"}`}>
                      {entry.play.name}
                    </span>
                    <span className="block text-xs text-zinc-600">{describe(entry.play)}</span>
                  </button>
                  <div className="flex gap-1 px-4 pb-2">
                    <button type="button" className={small} aria-label={`Duplicate ${entry.play.name}`} onClick={() => onDuplicate(entry.id)}>
                      Duplicate
                    </button>
                    <button type="button" className={small} aria-label={`Delete ${entry.play.name}`} onClick={() => onDelete(entry.id)}>
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="border-t border-film-border px-4 py-3">
          <button type="button" className={`${BTN} w-full`} onClick={onNew}>
            + New play
          </button>
        </div>
      </div>

      <div role="group" aria-label="Examples" className="border-t border-film-border">
        <h2 className={`${head} flex justify-between`}>
          Examples <span>{examples.length}</span>
        </h2>
        <ul aria-label="Examples" data-testid="example-list">
          {examples.map((play, i) => (
            <li key={`${i}-${play.name}`} className="flex items-center justify-between gap-2 border-b border-film-border px-4 py-2">
              <span className="min-w-0">
                <span className="block truncate font-mono text-xs font-bold uppercase tracking-wider">{play.name}</span>
                <span className="block text-xs text-zinc-600">{describe(play)}</span>
              </span>
              <button type="button" className={small} aria-label={`Duplicate ${play.name} to edit`} onClick={() => onDuplicateExample(play)}>
                Duplicate to edit
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
