// "How to read the colours". A modal dialog so it works the same from the
// legend, the compact menu and the desktop bar. Escape, the close button and a
// press outside all dismiss it, and focus returns to whatever opened it.
//
// The words are the model's own (space/explain.ts, ui/CellReadout.tsx):
// Closed / Contested / Strong space. The explanatory sentences are
// PLACEHOLDER(fieldview-ui-rework) copy — docs/fieldview-placeholders.md #6.

import { useEffect, useRef } from "react";
import { rampStopsFor } from "../../space/palette";

const ROWS: { label: string; text: string }[] = [
  // PLACEHOLDER(fieldview-ui-rework): Builder supplies final wording (#6).
  { label: "Closed", text: "Defenders can get to this spot before a receiver can. Throwing here is unlikely to work." },
  { label: "Contested", text: "Reachable, but a defender can still get there. It could go either way." },
  { label: "Strong space", text: "Open and worth attacking: a cutter has room to catch here." },
];

export interface ColourGuideProps {
  open: boolean;
  onClose: () => void;
  colourBlind: boolean;
}

export function ColourGuide({ open, onClose, colourBlind }: ColourGuideProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const stops = rampStopsFor(colourBlind);
  // The three rows sample the active ramp's anchors — the same interior stops
  // OverlayRail's legend used: red/amber/green is stops 0, 1 and 3 of four;
  // the colour-blind ramp has three stops, so 0, 1 and 2.
  const anchorIndex = colourBlind ? [0, 1, 2] : [0, 1, 3];
  const hexFor = (rowIndex: number) => stops[anchorIndex[rowIndex]].hex;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close colour guide"
        tabIndex={-1}
        className="absolute inset-0 bg-zinc-900/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="How to read the colours"
        className="relative max-h-full w-full max-w-md overflow-auto border border-film-border bg-white"
      >
        <div className="flex items-center justify-between border-b border-film-border px-4 py-3">
          <h2 className="font-heading text-lg uppercase">How to read the colours</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="px-2 font-mono text-sm text-zinc-600 hover:text-film-accentPink"
          >
            ✕
          </button>
        </div>
        <ul className="divide-y divide-film-border">
          {ROWS.map((row, i) => (
            <li key={row.label} className="flex gap-3 px-4 py-3">
              <span
                aria-hidden="true"
                className="mt-1 h-4 w-4 shrink-0 border border-black/20"
                style={{ background: hexFor(i) }}
              />
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-wider">{row.label}</p>
                <p className="text-sm text-zinc-600">{row.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="border-t border-film-border px-4 py-3 text-xs text-zinc-500">
          The shading shows space for the offense. Move a player and it updates live.
        </p>
      </div>
    </div>
  );
}
