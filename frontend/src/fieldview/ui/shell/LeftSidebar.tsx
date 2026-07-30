// Desktop persistent left sidebar (tech-design.md Project/Module Structure):
// ribbon on top, a selection-driven middle section, bottom system menus.
//
// The middle section is the panel registry in action (ADR-3/ADR-4): it reads
// `useSelection(store)` and renders whatever `panelRegistry` maps that
// selection kind to, with no per-kind branching living in this file — a
// downstream initiative extends coverage by calling `registerPanel`, never
// by editing this component.
//
// "Advanced Settings" is a separate, sidebar-local override state (`view`),
// not part of the selection model: clicking it fully replaces the
// ribbon+middle+bottom-menu content with `AdvancedSettingsPanel` and a
// "← Back" affordance (ux.md UI States: "Advanced Settings open"). Selection
// state itself is untouched while this is open, so "← Back" always lands on
// whatever panel the current selection maps to. Note this is distinct from
// `AdvancedSettingsPanel`'s own `expanded` prop, which this always passes
// `true` (panels/AdvancedSettingsPanel.tsx's own comment: opening it from the
// bottom menu *is* the disclosure).
//
// The Space-view toggle used by `ToolRibbon` is threaded down from a single
// `useOverlayState()` call here rather than letting `ToolRibbon` call the
// hook itself — tasks.md's Panels partition note flagged that
// `Whiteboard.tsx` and the panels already each call `useOverlayState()`
// independently (redundant-but-consistent, since they share one localStorage
// key); this at least avoids adding a *third* independent call for new shell
// code, even though consolidating the existing ones is Integration's call to
// make, not this partition's.

import { useState } from "react";
import type { ReactNode } from "react";
import type { SceneStore } from "../../scene/store";
import { useSelection } from "./useSelection";
import { panelRegistry } from "./panelRegistry";
import { AdvancedSettingsPanel } from "./panels/AdvancedSettingsPanel";
import { useOverlayState } from "../prefs";
import { ToolRibbon } from "./ToolRibbon";

type SidebarView = "selection" | "advancedSettings";

export interface LeftSidebarProps {
  store: SceneStore;
  designerOpen: boolean;
  onToggleDesigner: () => void;
  // tasks.md id 62: PresetMenu relocates into the bottom-menu area, grouped
  // near Advanced Settings / Play Designer, rather than living in the page
  // header. Optional so existing callers/tests that don't pass one still
  // render normally.
  presetMenu?: ReactNode;
}

export function LeftSidebar({ store, designerOpen, onToggleDesigner, presetMenu }: LeftSidebarProps) {
  const selection = useSelection(store);
  const overlay = useOverlayState();
  const [view, setView] = useState<SidebarView>("selection");

  const Panel = panelRegistry[selection.kind];

  return (
    <aside
      aria-label="Field view sidebar"
      className="flex w-[280px] shrink-0 flex-col border-r border-film-border bg-white"
    >
      {view === "advancedSettings" ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <button
            type="button"
            onClick={() => setView("selection")}
            className="border-b border-film-border px-4 py-3 text-left font-mono text-xs uppercase tracking-wider text-zinc-700 hover:text-film-accentPink"
          >
            ← Back
          </button>
          {/* aria-live so a screen reader announces the swap between the
              selection-driven panel and this override, same as the ordinary
              panel-swap case below. */}
          <div aria-live="polite" className="flex-1 overflow-y-auto p-4">
            <AdvancedSettingsPanel selection={selection} />
          </div>
        </div>
      ) : (
        <>
          <ToolRibbon spaceOn={overlay.on} onToggleSpace={overlay.setOn} />
          <div aria-live="polite" className="flex-1 overflow-y-auto p-4">
            <Panel selection={selection} />
          </div>
          <div className="border-t border-film-border">
            {presetMenu && <div className="border-b border-film-border px-4 py-3">{presetMenu}</div>}
            <button
              type="button"
              onClick={() => setView("advancedSettings")}
              className="w-full border-b border-film-border bg-white px-4 py-3 text-left font-mono text-xs uppercase tracking-wider text-zinc-800 hover:text-film-accentPink"
            >
              ⚙ Advanced Settings
            </button>
            <button
              type="button"
              onClick={onToggleDesigner}
              aria-pressed={designerOpen}
              className="w-full bg-film-accentPink px-4 py-3 text-left font-mono text-xs uppercase tracking-wider text-white hover:bg-film-accentPinkDark"
            >
              ▶ Play Designer
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
