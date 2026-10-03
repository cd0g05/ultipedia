// A compact-only right-hand slide-over (Explore's setup list, Watch's play
// list). Escape and the scrim close it; focus moves to the close button on open
// and returns to the opener on close.

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function SlideOver({ open, onClose, title, children }: SlideOverProps) {
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
  return (
    <div className="fixed inset-0 z-[60] desktop:hidden">
      <button
        type="button"
        aria-label={`Close ${title.toLowerCase()} list`}
        tabIndex={-1}
        className="absolute inset-0 bg-zinc-900/30"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-y-0 right-0 flex w-[340px] max-w-[90vw] flex-col border-l border-film-border bg-white"
      >
        <div className="flex items-center justify-between border-b border-film-border px-4 py-3">
          <h2 className="font-heading text-lg uppercase">{title}</h2>
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
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
