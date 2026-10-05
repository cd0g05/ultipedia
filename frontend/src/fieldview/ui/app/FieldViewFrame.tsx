// The chrome around the field for every mode (ADR-30). ONE component whose
// compact (phone/tablet) and desktop parts are both in the DOM and are shown or
// hidden by CSS alone — the `desktop` screen in tailwind.config.js is the only
// switch. The FieldCanvas is rendered exactly once, in the shared field cell,
// never inside a branch that goes `display:none`.
//
// Compact: top bar (☰ + mode, page centre slot, legend, page right slot) over a
// full-width landscape field; menu in a drawer.
// Desktop: site header, top bar with mode tabs, an always-open right sidebar,
// and a dock under the field.
//
// Mode pages supply slots; they never edit this file (the ADR-13 lesson).

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { SiteHeader } from "../../../encyclopedia/components/Layout";
import { FIELD_PX_HEIGHT, FIELD_PX_WIDTH } from "../../render/fieldLayer";
import { getStageViewBox } from "../../render/coords";
import { useOverlayState } from "../prefs";
import { Legend } from "../content/Legend";
import { ColourGuide } from "../content/ColourGuide";
import { FieldHost } from "./FieldHost";
import { MenuDrawer } from "./MenuDrawer";
import { SettingsPopover } from "./SettingsPopover";
import { RotateNotice } from "./RotateNotice";
import { MODES, MODE_LABEL } from "./modes";
import type { Mode } from "./modes";

const STAGE = getStageViewBox(FIELD_PX_WIDTH, FIELD_PX_HEIGHT);
const STAGE_ASPECT = STAGE.width / STAGE.height;

export interface FieldViewFrameProps {
  mode: Mode;
  // Compact top bar, between the mode label and the legend.
  barCenter?: ReactNode;
  // Compact top bar, after the legend.
  barRight?: ReactNode;
  // Desktop right sidebar content.
  sidebar?: ReactNode;
  // A line directly under the field on every layout (Watch: the frame label).
  caption?: ReactNode;
  // Desktop content under the field.
  dock?: ReactNode;
  // Extra rows in the compact menu drawer (below the modes).
  menuExtras?: ReactNode;
  // False for modes with no field (Build).
  showField?: boolean;
  // Replaces the field area entirely (Build's placeholder).
  body?: ReactNode;
  // Watch: read-only field, tap to pause/resume, trails drawn over the pieces.
  fieldDisabled?: boolean;
  onFieldTap?: () => void;
  fieldOverlay?: ReactNode;
  // Build: players placed in the current frame get a corner mark; the end of a
  // drag reports what it moved.
  fieldPlaced?: ReadonlySet<string>;
  onFieldGestureEnd?: (info: { movedIds: string[] }) => void;
  // Desktop top bar, between the tabs and the legend (Build: undo/redo, save
  // state, Share).
  barDesktop?: ReactNode;
  // Compact layouts only: content under the field (Build: frame strip, actions,
  // selected-player bar). Desktop uses `dock`.
  compactDock?: ReactNode;
}

export function FieldViewFrame({
  mode,
  barCenter,
  barRight,
  sidebar,
  caption,
  dock,
  menuExtras,
  showField = true,
  body,
  fieldDisabled,
  onFieldTap,
  fieldOverlay,
  fieldPlaced,
  onFieldGestureEnd,
  barDesktop,
  compactDock,
}: FieldViewFrameProps) {
  const overlay = useOverlayState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div
      className="fv-app film-room flex flex-col overflow-hidden bg-film-panel graph-paper"
      style={{ height: "100dvh", ["--fv-stage-aspect" as string]: STAGE_ASPECT } as CSSProperties}
    >
      {/* The site header is a desktop-only part of the frame (decision D8). */}
      <div className="hidden desktop:block">
        <SiteHeader />
      </div>

      {/* A div, not <header>: on desktop the site header is already the page's
          banner landmark, and a second one fails axe (landmark-no-duplicate-banner). */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-film-border bg-white pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] desktop:h-16 desktop:gap-4 desktop:px-6">
        <button
          type="button"
          aria-label="Menu"
          aria-haspopup="dialog"
          onClick={() => setMenuOpen(true)}
          className="grid h-10 w-10 shrink-0 place-items-center border border-film-border bg-white text-zinc-900 hover:bg-film-panel desktop:hidden"
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
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <span className="hidden font-heading text-xl uppercase desktop:block">Field View</span>

        {/* Mode: a label on compact, tabs on desktop. */}
        <span
          data-testid="mode-label"
          className="flex h-10 shrink-0 items-center bg-zinc-900 px-3 font-mono text-xs font-bold uppercase tracking-wider text-white desktop:hidden"
        >
          {MODE_LABEL[mode]}
        </span>
        <nav aria-label="Mode" className="ml-2 hidden border border-film-border desktop:flex">
          {MODES.map(({ mode: m, label, soon }) => (
            <NavLink
              key={m}
              to={`/fieldview/${m}`}
              className={({ isActive }) =>
                `flex h-10 items-center gap-2 border-r border-film-border px-5 font-mono text-xs font-bold uppercase tracking-wider last:border-r-0 ${
                  isActive ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-film-panel"
                }`
              }
            >
              {label}
              {soon && (
                <span className="border border-current px-1.5 text-[10px] font-normal opacity-70">
                  Soon
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 desktop:hidden">
          {barCenter}
        </div>
        <div className="hidden flex-1 desktop:block" />
        {barDesktop && <div className="hidden items-center gap-3 desktop:flex">{barDesktop}</div>}

        <Legend colourBlind={overlay.colourBlind} onOpenGuide={() => setGuideOpen(true)} />
        <div className="flex shrink-0 items-center gap-2 desktop:hidden">{barRight}</div>
        <div className="hidden desktop:block">
          <SettingsPopover colourBlind={overlay.colourBlind} onColourBlind={overlay.setColourBlind} />
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col items-center overflow-auto pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] desktop:p-6">
          {body ??
            (showField && (
              <div
                className="my-auto w-full"
                // Height-cap the field by its own aspect so a wide, short
                // window never pushes it past the fold (--fv-chrome is the
                // vertical space the surrounding chrome takes; see index.css).
                style={{ maxWidth: `calc((100dvh - var(--fv-chrome)) * ${STAGE_ASPECT})` }}
              >
                <FieldHost
                  disabled={fieldDisabled}
                  onTap={onFieldTap}
                  overlayLayer={fieldOverlay}
                  placed={fieldPlaced}
                  onGestureEnd={onFieldGestureEnd}
                />
              </div>
            ))}
          {caption && <div className="w-full shrink-0 px-2 pb-1 pt-2 text-center">{caption}</div>}
          {compactDock && <div className="mt-2 w-full shrink-0 pb-3 desktop:hidden">{compactDock}</div>}
          {dock && <div className="mt-4 hidden w-full desktop:block">{dock}</div>}
        </main>
        {sidebar && (
          <aside
            aria-label="Sidebar"
            className="hidden w-80 shrink-0 overflow-y-auto border-l border-film-border bg-white desktop:block"
          >
            {sidebar}
          </aside>
        )}
      </div>

      <MenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenGuide={() => setGuideOpen(true)}
        colourBlind={overlay.colourBlind}
        onColourBlind={overlay.setColourBlind}
        extras={menuExtras}
      />
      <ColourGuide
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        colourBlind={overlay.colourBlind}
      />
      <RotateNotice />
    </div>
  );
}
