// The rhythm ux.md's "UX Consistency Patterns" describes for these panels: a
// monospace uppercase label with plain sentence-case status lines under it,
// matching the visibility toggles already in DefaultVisibilityPanel.
//
// Shared rather than triplicated so the three play-model panels cannot drift
// apart typographically — and so a later visual-review pass is one edit.
// Classes only; no colour literals (canon ADR-10 keeps those in tokens.ts /
// the `film.*` Tailwind palette).

import type { ReactNode } from "react";

export function PanelLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">{children}</span>
  );
}

// Deliberate states (free roam, Custom) are never styled as errors — ux.md
// Copy & Tone. This is ordinary body text, and there is no `warning` variant
// on purpose.
export function StatusLine({ children }: { children: ReactNode }) {
  return <p className="font-mono text-xs text-zinc-800">{children}</p>;
}

export function HintLine({ children }: { children: ReactNode }) {
  return <p className="font-mono text-xs text-zinc-500">{children}</p>;
}

// The shell's existing toggle-row treatment: 1px borders, negative margins so
// neighbours share an edge, accent when active. Matches the ribbon's own row
// of buttons, which is what ux.md points at for the force controls.
export function ToggleRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex">
      {children}
    </div>
  );
}

export function ToggleRowButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      // Not the native `disabled` attribute, matching ToolRibbon's reasoning:
      // a disabled control that leaves the tab order takes its explanation
      // with it.
      aria-disabled={disabled || undefined}
      aria-pressed={active}
      onClick={disabled ? undefined : onClick}
      // 44px minimum touch target on mobile (ux.md Responsive &
      // Accessibility); the shell's own breakpoint does the rest.
      className={`-ml-px min-h-[44px] flex-1 border px-1 py-2 font-mono text-[10px] uppercase tracking-wide first:ml-0 ${
        disabled
          ? "cursor-not-allowed border-film-border bg-film-panel text-zinc-400"
          : active
            ? "border-film-accentPink bg-film-accentPink/5 text-film-accentPink"
            : "border-film-border bg-white text-zinc-800 hover:border-film-accentPink hover:text-film-accentPink"
      }`}
    >
      {label}
    </button>
  );
}
