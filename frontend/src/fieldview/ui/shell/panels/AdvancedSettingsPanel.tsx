// The shell's bottom-menu "Advanced Settings" content: migrated from
// AdvancedPanel, sourcing its props from the same useOverlayState hook
// Whiteboard.tsx already uses. Unlike the original AdvancedPanel (a
// disclosure that expands in place beside the field), this panel always
// renders expanded — in the shell, opening "Advanced Settings" from the
// bottom menu *is* the disclosure; there is no second collapse affordance
// once the coach has already chosen to open it.

import { AdvancedPanel } from "../../AdvancedPanel";
import type { PanelProps } from "../panelRegistry";
import { useOverlayState } from "../../prefs";

export function AdvancedSettingsPanel(_props: PanelProps) {
  const overlay = useOverlayState();

  return (
    <AdvancedPanel
      lens={overlay.lens}
      layers={overlay.layers}
      params={overlay.params}
      expanded={true}
      onExpandedChange={() => {
        // No-op: the shell's own "← Back" affordance (a later partition)
        // closes this panel, not AdvancedPanel's internal +/- disclosure.
      }}
      onLensChange={overlay.setLens}
      onLayerChange={overlay.setLayer}
      onParamChange={overlay.setParam}
      onReset={overlay.resetParams}
    />
  );
}
