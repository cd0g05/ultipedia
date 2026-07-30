import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DefaultVisibilityPanel } from "../ui/shell/panels/DefaultVisibilityPanel";
import { AdvancedSettingsPanel } from "../ui/shell/panels/AdvancedSettingsPanel";
import { OffensePlayerPanel } from "../ui/shell/panels/OffensePlayerPanel";
import { DefensePlayerPanel } from "../ui/shell/panels/DefensePlayerPanel";
import { MarkPanel } from "../ui/shell/panels/MarkPanel";

// PanelProps only requires `selection`; none of these panels read it, but it
// must be a valid SelectionState so a panel could in principle inspect it.
const NONE_SELECTION = { selection: { kind: "none" as const } };

beforeEach(() => {
  localStorage.clear();
});

describe("DefaultVisibilityPanel (migrated from OverlayRail)", () => {
  it("shows Offense and Defense visibility toggles, both checked by default", () => {
    render(<DefaultVisibilityPanel {...NONE_SELECTION} />);
    const offense = screen.getByRole("checkbox", { name: "Offense" });
    const defense = screen.getByRole("checkbox", { name: "Defense" });
    expect(offense).toBeChecked();
    expect(defense).toBeChecked();
  });

  it("unchecking Defense persists via the same overlayPrefs localStorage key OverlayRail used", () => {
    render(<DefaultVisibilityPanel {...NONE_SELECTION} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Defense" }));
    const stored = JSON.parse(localStorage.getItem("fieldview.overlayPrefs") ?? "{}");
    expect(stored.visible.defense).toBe(false);
    expect(stored.visible.offense).toBe(true);
  });
});

describe("AdvancedSettingsPanel (migrated from AdvancedPanel)", () => {
  it("always renders expanded, unlike the original collapsible AdvancedPanel", () => {
    render(<AdvancedSettingsPanel {...NONE_SELECTION} />);
    expect(screen.getByText("Include offense in space calculations")).toBeVisible();
    expect(screen.getByRole("slider", { name: "Top speed" })).toBeVisible();
  });

  it("Reset to defaults clears the modified indicator", () => {
    render(<AdvancedSettingsPanel {...NONE_SELECTION} />);
    const slider = screen.getByRole("slider", { name: "Top speed" });
    fireEvent.change(slider, { target: { value: "1" } });
    expect(screen.getByTitle("Modified from defaults")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset to defaults" }));
    expect(screen.queryByTitle("Modified from defaults")).not.toBeInTheDocument();
  });
});

describe("placeholder panels (offense/defense/mark player selected)", () => {
  it.each([
    ["OffensePlayerPanel", OffensePlayerPanel],
    ["DefensePlayerPanel", DefensePlayerPanel],
    ["MarkPanel", MarkPanel],
  ] as const)("%s shows the pending-feature copy, not a blank or broken panel", (_name, Panel) => {
    render(<Panel {...NONE_SELECTION} />);
    expect(screen.getByText("Matchup and mark controls ship in a future update.")).toBeVisible();
    expect(screen.getByText("PENDING FIELDVIEW-PLAY-MODEL")).toBeVisible();
  });
});
