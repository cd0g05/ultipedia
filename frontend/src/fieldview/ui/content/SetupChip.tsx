// The compact top bar's setup chip: ◀ name ▶, with ✎ when the live scene has
// drifted from the loaded setup. Tapping the label opens the full list.

export interface SetupChipProps {
  label: string;
  custom: boolean;
  onPrev: () => void;
  onNext: () => void;
  onOpen: () => void;
}

const arrow = "grid w-9 place-items-center text-zinc-600 hover:bg-film-panel";

export function SetupChip({ label, custom, onPrev, onNext, onOpen }: SetupChipProps) {
  return (
    <div className="flex h-10 min-w-0 items-stretch border border-film-border bg-white">
      <button type="button" aria-label="Previous setup" onClick={onPrev} className={`${arrow} border-r border-film-border`}>
        ◀
      </button>
      <button
        type="button"
        aria-label="Choose a setup"
        aria-haspopup="dialog"
        onClick={onOpen}
        className="flex min-w-0 flex-col justify-center px-3 text-left leading-tight hover:bg-film-panel"
      >
        <span className="font-mono text-[10px] uppercase text-zinc-400">Setup</span>
        <span className="truncate font-mono text-xs font-bold uppercase tracking-wider">
          {label}
          {custom && <span title="Changed from the preset"> ✎</span>}
        </span>
      </button>
      <button type="button" aria-label="Next setup" onClick={onNext} className={`${arrow} border-l border-film-border`}>
        ▶
      </button>
    </div>
  );
}
