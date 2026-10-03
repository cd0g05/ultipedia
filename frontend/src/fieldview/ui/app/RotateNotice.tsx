// Shown on a portrait phone: the field is a landscape object (decision D4).
// Dismissible, so no viewport is hard-blocked (canon: "No viewport is
// blocked"). The media query is CSS-only (ADR-15); the dismissal is the only
// state.
//
// PLACEHOLDER(fieldview-ui-rework): wording is a stand-in (#7).

import { useState } from "react";

export function RotateNotice() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div
      role="status"
      data-testid="rotate-notice"
      className="fixed inset-x-0 bottom-0 z-[60] hidden items-center justify-between gap-4 border-t border-film-border bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 [@media(orientation:portrait)_and_(max-width:640px)]:flex"
    >
      <p className="font-mono text-xs font-bold uppercase tracking-wider">
        Rotate your phone to landscape for the best view.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 font-mono text-xs font-bold uppercase tracking-wider text-film-accentPink"
      >
        Continue anyway
      </button>
    </div>
  );
}
