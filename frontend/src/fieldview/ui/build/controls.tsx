// Build's small controls: undo/redo, the save pill, the compact frame chip and
// the frame action buttons. Presentational; the page wires them to the session.

import type { ReactNode } from "react";
import type { SaveStatus } from "./BuildSession";

export const BTN =
  "inline-flex h-10 items-center justify-center gap-2 border border-film-border bg-white px-3 font-mono text-xs font-bold uppercase tracking-wider text-zinc-900 hover:bg-film-panel disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-white";
export const BTN_PRIMARY =
  "inline-flex h-10 items-center justify-center gap-2 border border-film-accentPink bg-film-accentPink px-3 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-film-accentPinkDark disabled:cursor-not-allowed disabled:opacity-50";

export function UndoRedo({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <div className="flex shrink-0 gap-1" role="group" aria-label="History">
      <button type="button" aria-label="Undo" title="Undo (Ctrl/⌘ Z)" disabled={!canUndo} onClick={onUndo} className={`${BTN} w-10 px-0`}>
        ↶
      </button>
      <button type="button" aria-label="Redo" title="Redo (Shift Ctrl/⌘ Z)" disabled={!canRedo} onClick={onRedo} className={`${BTN} w-10 px-0`}>
        ↷
      </button>
    </div>
  );
}

// PLACEHOLDER(fieldview-build): the wording of these four states is a stand-in
// (docs/fieldview-placeholders.md #23).
const SAVE_COPY: Record<SaveStatus, string> = {
  new: "New play · saves as you go",
  saved: "✓ Saved to this device",
  saving: "Saving…",
  unsaved: "Unsaved changes",
  error: "Couldn't save — storage full",
};

export function SavePill({ status }: { status: SaveStatus }) {
  const tone =
    status === "saved"
      ? "text-emerald-700"
      : status === "error"
        ? "border-film-accentPink text-film-accentPink"
        : "text-zinc-600";
  return (
    <span
      role="status"
      data-testid="save-status"
      data-status={status}
      className={`hidden h-10 items-center border border-transparent px-2 font-mono text-[11px] font-bold uppercase tracking-wider desktop:inline-flex ${tone}`}
    >
      {SAVE_COPY[status]}
    </span>
  );
}

// Compact top bar: ◀ n / N · label ▶
export function FrameChip({
  index,
  count,
  label,
  onPrev,
  onNext,
}: {
  index: number;
  count: number;
  label?: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex min-w-0 items-stretch border border-film-border bg-white">
      <button type="button" aria-label="Previous frame" disabled={index <= 0} onClick={onPrev} className="grid h-10 w-9 place-items-center hover:bg-film-panel disabled:text-zinc-300">
        ◀
      </button>
      <span className="flex min-w-0 flex-col justify-center px-2 leading-tight">
        <span className="font-mono text-[10px] uppercase text-zinc-400">Frame</span>
        <span data-testid="frame-chip" className="truncate font-mono text-xs font-bold uppercase tracking-wider">
          {index + 1} / {count}
          {label ? ` · ${label}` : ""}
        </span>
      </span>
      <button type="button" aria-label="Next frame" disabled={index >= count - 1} onClick={onNext} className="grid h-10 w-9 place-items-center hover:bg-film-panel disabled:text-zinc-300">
        ▶
      </button>
    </div>
  );
}

export function Card({ title, tag, children }: { title: string; tag?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="min-w-0 border border-film-border bg-white p-4">
      <h2 className="mb-3 flex items-center justify-between gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
        {title}
        {tag && <span className="border border-film-border px-1.5 text-zinc-600">{tag}</span>}
      </h2>
      {children}
    </section>
  );
}
