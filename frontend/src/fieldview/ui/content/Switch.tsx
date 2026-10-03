// A labelled on/off switch in the Light Film Room style: hard corners, green
// when on (style guide: green = on-state). `role="switch"` rather than a
// checkbox so assistive tech announces "on/off".

import type { ReactNode } from "react";

export interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
  // Secondary line under the label (e.g. "coming soon").
  hint?: ReactNode;
}

export function Switch({ checked, onChange, children, hint }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-4 px-4 py-2 text-left font-mono text-xs font-bold uppercase leading-snug tracking-wider text-zinc-900 hover:bg-film-panel"
    >
      <span className="flex-1">
        {children}
        {hint && (
          <span className="block font-sans text-[11px] font-normal normal-case tracking-normal text-zinc-500">
            {hint}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-[22px] w-10 shrink-0 ${checked ? "bg-film-accentGreen" : "bg-film-border"}`}
      >
        <span
          className={`absolute top-[3px] h-4 w-4 bg-white ${checked ? "left-[21px]" : "left-[3px]"}`}
        />
      </span>
    </button>
  );
}
