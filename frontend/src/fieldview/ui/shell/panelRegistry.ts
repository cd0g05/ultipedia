// The left sidebar's (and later, the mobile bottom sheet's) middle-section
// content, keyed by selection state (tech-design.md ADR-3). A closed union
// (`SelectionStateKind`) keying a `Record` means a downstream initiative
// that registers a panel for a kind outside the union fails to compile —
// there is no way to leave a selection state without a panel by accident.
//
// Both presentational shells (desktop `LeftSidebar`, mobile `BottomSheet` —
// neither exists yet; they're later partitions) read this same registry via
// `useSelection()` so they can never drift into showing different content
// for the same selection state (ADR-4).

import type { ComponentType } from "react";
import type { SelectionState } from "../../scene/selection";
import { DefaultVisibilityPanel } from "./panels/DefaultVisibilityPanel";
import { OffensePlayerPanel } from "./panels/OffensePlayerPanel";
import { DefensePlayerPanel } from "./panels/DefensePlayerPanel";
import { MarkPanel } from "./panels/MarkPanel";

export type SelectionStateKind = SelectionState["kind"];

export interface PanelProps {
  selection: SelectionState;
}

// A downstream initiative (fieldview-play-model, etc.) replaces an entry —
// e.g. `registerPanel("defense", MatchupPanel)` — rather than editing this
// file or any shell layout file.
export function registerPanel(kind: SelectionStateKind, component: ComponentType<PanelProps>): void {
  panelRegistry[kind] = component;
}

export const panelRegistry: Record<SelectionStateKind, ComponentType<PanelProps>> = {
  none: DefaultVisibilityPanel,
  multi: DefaultVisibilityPanel,
  offense: OffensePlayerPanel,
  defense: DefensePlayerPanel,
  mark: MarkPanel,
};
