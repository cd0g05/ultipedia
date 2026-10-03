// Desktop gear menu. Colour-blind mode is its only MVP entry (Advanced
// settings are deferred). Closes on Escape or an outside press.

import { useEffect, useRef, useState } from "react";
import { Switch } from "../content/Switch";

export interface SettingsPopoverProps {
  colourBlind: boolean;
  onColourBlind: (next: boolean) => void;
}

export function SettingsPopover({ colourBlind, onColourBlind }: SettingsPopoverProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onDown(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid h-10 w-10 place-items-center border border-film-border bg-white text-zinc-800 hover:bg-film-panel"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="square"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
        </svg>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Settings"
          className="absolute right-0 top-12 z-50 w-72 border border-film-border bg-white py-2"
        >
          <p className="px-4 pb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Settings
          </p>
          <Switch checked={colourBlind} onChange={onColourBlind}>
            Colour-blind mode
          </Switch>
        </div>
      )}
    </div>
  );
}
