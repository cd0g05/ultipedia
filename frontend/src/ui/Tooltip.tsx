// Tap-to-open tooltip (NOT hover) — hover tooltips are unusable on phones and
// this is a mobile-first requirement (UX "Tooltip Pattern").

import { useEffect, useRef, useState } from "react";

export function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-label="More info"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="ml-1 h-5 w-5 rounded-full bg-amber/30 text-xs font-bold text-clay"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-10 mt-1 block w-56 rounded-lg bg-white p-2 text-sm text-gray-700 shadow-lg ring-1 ring-black/10"
        >
          {text}
        </span>
      )}
    </span>
  );
}
