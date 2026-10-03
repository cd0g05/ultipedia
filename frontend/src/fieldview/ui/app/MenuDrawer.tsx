// The compact (phone/tablet) menu: a left drawer holding modes, the colour
// guide, colour-blind mode and the way back to the site (decision D8). Mode
// pages add their own rows through `extras` (e.g. Explore's Defense follows).
//
// Escape and the scrim close it; focus moves in on open and returns to the
// opener on close.
//
// PLACEHOLDER(fieldview-ui-rework): menu labels are stand-ins (#9).

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { MODES } from "./modes";
import { Switch } from "../content/Switch";

export interface MenuDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpenGuide: () => void;
  colourBlind: boolean;
  onColourBlind: (next: boolean) => void;
  extras?: ReactNode;
}

export function MenuDrawer({
  open,
  onClose,
  onOpenGuide,
  colourBlind,
  onColourBlind,
  extras,
}: MenuDrawerProps) {
  const firstRef = useRef<HTMLAnchorElement | null>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    firstRef.current?.focus();
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
        aria-label="Close menu"
        tabIndex={-1}
        className="absolute inset-0 bg-zinc-900/50"
        onClick={onClose}
      />
      <nav
        aria-label="Field View menu"
        role="dialog"
        aria-modal="true"
        className="absolute inset-y-0 left-0 w-[300px] max-w-[85vw] overflow-y-auto border-r border-film-border bg-white pb-4"
      >
        <p className="border-b border-film-border px-4 py-4 font-heading text-lg uppercase">
          Field View
        </p>
        <p className="px-4 pb-1 pt-3 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Mode
        </p>
        <ul>
          {MODES.map(({ mode, label, soon }, i) => (
            <li key={mode}>
              <NavLink
                ref={i === 0 ? firstRef : undefined}
                to={`/fieldview/${mode}`}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 border-l-[3px] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider ${
                    isActive
                      ? "border-film-accentPink bg-film-panel text-film-accentPink"
                      : "border-transparent text-zinc-900 hover:bg-film-panel"
                  }`
                }
              >
                {label}
                {soon && (
                  <span className="ml-auto border border-zinc-300 px-1.5 text-[10px] font-normal text-zinc-500">
                    Soon
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
        {extras && (
          <>
            <hr className="my-2 border-film-border" />
            {extras}
          </>
        )}
        <hr className="my-2 border-film-border" />
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenGuide();
          }}
          className="block w-full px-4 py-2 text-left font-mono text-xs font-bold uppercase tracking-wider hover:bg-film-panel"
        >
          How to read the colours
        </button>
        <Switch checked={colourBlind} onChange={onColourBlind}>
          Colour-blind mode
        </Switch>
        <hr className="my-2 border-film-border" />
        <Link
          to="/"
          className="block px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider hover:bg-film-panel"
        >
          ← Back to Ultipedia
        </Link>
      </nav>
    </div>
  );
}
