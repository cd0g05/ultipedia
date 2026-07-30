// The shell's default middle-section content: shown for both "none" and
// "multi" selection states (ux.md UI States). Migrated from OverlayRail's
// "Show on diagram" fieldset — the only part of OverlayRail that this panel
// covers. OverlayRail's Space toggle is its own top-ribbon button, and its
// AdvancedPanel content is migrated separately into AdvancedSettingsPanel.
//
// Self-contained via useOverlayState (the same localStorage-backed hook
// Whiteboard.tsx already uses) rather than accepting visibility as props:
// PanelProps is deliberately just `{ selection }` (tech-design.md ADR-3), so
// a panel that needs more state manages it itself instead of requiring the
// registry's caller to know what every registered panel needs.

import { useOverlayState } from "../../prefs";
import type { TeamVisibility } from "../../prefs";
import type { PanelProps } from "../panelRegistry";

const TEAM_LABELS: { key: keyof TeamVisibility; label: string }[] = [
  { key: "offense", label: "Offense" },
  { key: "defense", label: "Defense" },
];

export function DefaultVisibilityPanel(_props: PanelProps) {
  const overlay = useOverlayState();

  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="font-mono text-xs uppercase tracking-wider text-zinc-500">
        Show on diagram
      </legend>
      {TEAM_LABELS.map(({ key, label }) => (
        <label key={key} className="flex items-center gap-2 font-mono text-xs text-zinc-800">
          <input
            type="checkbox"
            checked={overlay.visible[key]}
            onChange={(e) => overlay.setVisible(key, e.target.checked)}
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}
