// Share (fieldview-build ux): the link with a Copy button, a QR code for the
// huddle, a file download, and "Open a file…". A modal dialog like the colour
// guide: Escape, the close button and a press outside dismiss it, and focus
// returns to whatever opened it.

import { useEffect, useMemo, useRef, useState } from "react";
import type { Play } from "../../play/format";
import { fileNameFor, playToFileText, shareLink } from "../../play/share";
import { QrCode } from "../content/QrCode";
import { BTN, BTN_PRIMARY } from "./controls";

// PLACEHOLDER(fieldview-build): the dialog copy is a stand-in
// (docs/fieldview-placeholders.md #23).
export const SNAPSHOT_NOTE =
  "Anyone with this link can watch the play on their phone. It is a snapshot: changes you make later won't update a link you already sent.";

export interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  play: Play;
  // "Open a file…": the page validates and opens it; a string is the message to show.
  onImportFile: (file: File) => Promise<string | null>;
}

export function ShareDialog({ open, onClose, play, onImportFile }: ShareDialogProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<Element | null>(null);
  const linkRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setMessage(null);
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

  const link = useMemo(
    () => (open ? shareLink(play, typeof window === "undefined" ? "" : window.location.origin) : ""),
    [open, play],
  );

  if (!open) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard permission: select the text so Ctrl/⌘-C works.
      linkRef.current?.select();
      setMessage("Press Ctrl/⌘-C to copy the link.");
    }
  }

  function download() {
    const blob = new Blob([playToFileText(play)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileNameFor(play);
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const problem = await onImportFile(file);
    if (problem) setMessage(problem);
    else onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button type="button" aria-label="Close share" tabIndex={-1} className="absolute inset-0 bg-zinc-900/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share this play"
        className="relative max-h-full w-full max-w-lg overflow-auto border border-film-border bg-white"
      >
        <div className="flex items-center justify-between border-b border-film-border px-4 py-3">
          <h2 className="font-heading text-lg uppercase">Share this play</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="px-2 font-mono text-sm text-zinc-600 hover:text-film-accentPink">
            ✕
          </button>
        </div>

        <div className="space-y-5 p-4">
          <div>
            <label htmlFor="share-link" className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Link
            </label>
            <div className="flex gap-2">
              <input
                id="share-link"
                ref={linkRef}
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                className="h-10 min-w-0 flex-1 border border-film-border bg-white px-3 font-mono text-xs"
              />
              <button type="button" className={BTN_PRIMARY} onClick={copy}>
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <QrCode text={link} className="h-40 w-40 shrink-0 border border-film-border" />
            <p className="text-xs text-zinc-600">{SNAPSHOT_NOTE}</p>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-film-border pt-4">
            <button type="button" className={BTN} onClick={download}>
              Download file
            </button>
            <button type="button" className={BTN} onClick={() => fileRef.current?.click()}>
              Open a file…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              aria-label="Open a play file"
              className="sr-only"
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          {message && (
            <p role="alert" className="text-sm text-film-accentPink">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
