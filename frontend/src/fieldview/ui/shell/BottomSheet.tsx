// Mobile presentation of the shell (tech-design.md ADR-4, ADR-5): a
// collapsed handle bar by default, expanding to a tabbed sheet covering
// ~46% of the viewport (ux.md "Mobile Bottom Sheet" UI States / Flow 2).
//
// Reads the exact same `panelRegistry` + `useSelection()` seam the desktop
// `LeftSidebar` reads (ADR-4) — this file must never grow a second, ad-hoc
// path to panel content. The one deliberate exception is the SELECTION tab's
// empty-state copy: ux.md specifies mobile-only wording ("Select a player on
// the field to see options here.") for `kind === "none"`, which is *not* a
// second content source — every other kind (including "multi") still comes
// straight from `panelRegistry`, identical to desktop.
//
// Integration dedupe (tasks.md's fieldview-shell-mobile note flagged this
// explicitly): the expanded TOOLS tab now renders the real, shared
// `ToolRibbon.tsx` component — built in parallel by the Desktop partition and
// merged after this file was originally written — instead of a second,
// independently-maintained copy of "Marquee/Throw/Stats/Space, same labels,
// same disabled+tooltip treatment." Only the collapsed handle bar's
// icon-only summary strip below stays bespoke: it is decorative
// (`aria-hidden`, no interactive semantics, no tooltip), a different UI
// concern from the reachable ribbon itself, so a small local icon list is
// simpler than rendering (and CSS-hiding) a second full `ToolRibbon` just for
// its glyphs.
//
// Reduced motion (ux.md "Responsive & Accessibility") is handled the same
// CSS-only way the rest of this module already does it (see overlay.test.tsx
// / OverlayRail's `motion-safe:` transitions): every transition class here is
// `motion-safe:`-prefixed, so `prefers-reduced-motion` users get an instant
// show/hide with no JS media-query listener (matching ADR-5's "CSS-only
// breakpoint switch" philosophy extended to motion).

import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { SceneStore } from "../../scene/store";
import type { SelectionState } from "../../scene/selection";
import { useSelection } from "./useSelection";
import { panelRegistry } from "./panelRegistry";
import { AdvancedSettingsPanel } from "./panels/AdvancedSettingsPanel";
import { useOverlayState } from "../prefs";
import { ToolRibbon } from "./ToolRibbon";

type SheetTab = "tools" | "selection" | "settings";

// Collapsed-bar-only icon summary — decorative, not the reachable ribbon.
const COLLAPSED_ICONS: { key: string; icon: string; disabled?: boolean }[] = [
  { key: "marquee", icon: "⬚" },
  { key: "throw", icon: "➤", disabled: true },
  { key: "stats", icon: "▤", disabled: true },
  { key: "space", icon: "◈" },
];

export interface BottomSheetProps {
  store: SceneStore;
  // tasks.md id 62: PresetMenu relocates into the SETTINGS tab, grouped near
  // Play Designer / Advanced Settings, rather than living in the page header.
  presetMenu?: ReactNode;
}

export function BottomSheet({ store, presetMenu }: BottomSheetProps) {
  const selection = useSelection(store);
  const overlay = useOverlayState();
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<SheetTab>("tools");
  const [designerOpen, setDesignerOpen] = useState(false);

  // Selecting a player while the sheet is collapsed must not auto-expand it
  // (ux.md Flow 2, Alternate path A) — the indicator is purely a function of
  // "collapsed + something is selected," never a trigger to expand.
  const showSelectionIndicator = !expanded && selection.kind !== "none";

  function expand(tab: SheetTab = "tools") {
    setActiveTab(tab);
    setExpanded(true);
  }

  function collapse() {
    setExpanded(false);
  }

  function toggle() {
    if (expanded) collapse();
    else expand();
  }

  return (
    <div className="lg:hidden" data-testid="bottom-sheet-root">
      <div
        role="region"
        aria-label="Field view tools"
        className={`fixed inset-x-0 bottom-0 z-30 flex flex-col border-t border-film-border bg-film-base motion-safe:transition-[height] motion-safe:duration-300 motion-safe:ease-out ${
          expanded ? "h-[46vh]" : "h-14"
        }`}
      >
        {expanded ? (
          <>
            <button
              type="button"
              aria-label="Collapse tools"
              onClick={collapse}
              className="mx-auto my-2 h-1 w-9 shrink-0 bg-film-border"
            />
            <div role="tablist" aria-label="Field view tool tabs" className="flex shrink-0 border-b border-film-border">
              <SheetTabButton
                label="Tools"
                selected={activeTab === "tools"}
                onClick={() => setActiveTab("tools")}
              />
              <SheetTabButton
                label="Selection"
                selected={activeTab === "selection"}
                onClick={() => setActiveTab("selection")}
              />
              <SheetTabButton
                label="Settings"
                selected={activeTab === "settings"}
                onClick={() => setActiveTab("settings")}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === "tools" && <ToolRibbon spaceOn={overlay.on} onToggleSpace={overlay.setOn} />}
              {activeTab === "selection" && <SelectionTabContent selection={selection} />}
              {activeTab === "settings" && (
                <div className="flex flex-col gap-4">
                  <button
                    type="button"
                    onClick={() => setDesignerOpen(true)}
                    className="self-start border border-film-accentPink bg-film-accentPink px-4 py-1.5 font-mono text-sm uppercase tracking-wider text-white"
                  >
                    Play Designer
                  </button>
                  {presetMenu}
                  <AdvancedSettingsPanel selection={selection} />
                </div>
              )}
            </div>
          </>
        ) : (
          <button
            type="button"
            aria-label={
              showSelectionIndicator
                ? "Expand field view tools. A selection is waiting in the Selection tab."
                : "Expand field view tools"
            }
            onClick={toggle}
            className="relative flex h-14 w-full items-stretch"
          >
            {/* Decorative only — the collapsed bar is a single tap target
                that expands the sheet; the reachable, tooltip-bearing ribbon
                controls live in the TOOLS tab once expanded. */}
            <span aria-hidden="true" className="flex flex-1 items-stretch">
              {COLLAPSED_ICONS.map((item) => {
                const active = item.key === "space" && overlay.on;
                return (
                  <span
                    key={item.key}
                    className={`flex flex-1 flex-col items-center justify-center gap-0.5 border-r border-film-border font-mono text-[9px] last:border-r-0 ${
                      item.disabled ? "text-zinc-400" : active ? "text-film-accentPink" : "text-zinc-700"
                    }`}
                  >
                    {item.icon}
                  </span>
                );
              })}
            </span>
            {showSelectionIndicator && (
              <span
                data-testid="selection-indicator"
                className="absolute right-3 top-1.5 h-2 w-2 bg-film-accentPink"
              />
            )}
          </button>
        )}
      </div>

      {designerOpen && (
        <div
          role="dialog"
          aria-label="Play Designer"
          className="fixed inset-0 z-50 flex flex-col bg-film-base"
        >
          <div className="flex items-center justify-between border-b border-film-border px-4 py-3">
            <span className="font-heading text-sm uppercase tracking-widest text-zinc-900">
              Play Designer
            </span>
            <button
              type="button"
              aria-label="Close Play Designer"
              onClick={() => setDesignerOpen(false)}
              className="font-mono text-lg text-zinc-500"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="font-mono text-sm text-zinc-700">Play Designer — coming in a future update.</p>
            <p className="font-mono text-xs text-zinc-500">
              The existing designer is still available at{" "}
              <Link to="/fieldview/designer" className="text-film-accentPink underline">
                /fieldview/designer
              </Link>
              .
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SheetTabButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`relative flex-1 border-r border-film-border py-2 font-mono text-xs uppercase tracking-wider last:border-r-0 ${
        selected ? "text-film-accentPink" : "text-zinc-700"
      }`}
    >
      {label}
    </button>
  );
}

function SelectionTabContent({ selection }: { selection: SelectionState }) {
  if (selection.kind === "none") {
    // Mobile-only empty-state copy override (ux.md Copy & Tone) — every other
    // kind, including "multi", still comes straight from `panelRegistry`
    // (ADR-4), so this is the one intentional divergence from desktop, not a
    // second content path.
    return (
      <p className="border border-dashed border-zinc-300 p-4 text-center font-mono text-xs text-zinc-500">
        Select a player on the field to see options here.
      </p>
    );
  }
  const Panel = panelRegistry[selection.kind];
  return <Panel selection={selection} />;
}
