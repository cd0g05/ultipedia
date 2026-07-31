import { beforeEach, describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createSceneStore } from "../scene/store";
import type { SceneStore } from "../scene/store";
import { getPreset } from "../scene/presets";
import { movePlayer } from "../scene/scene";
import { normalize } from "../scene/possession";
import { reassign } from "../scene/matchups";
import { readForce } from "../scene/force";
import { SceneStoreProvider } from "../ui/shell/sceneStore";
import { resetSwapNotice } from "../ui/shell/panels/DefensePlayerPanel";
import { DefaultVisibilityPanel } from "../ui/shell/panels/DefaultVisibilityPanel";
import { AdvancedSettingsPanel } from "../ui/shell/panels/AdvancedSettingsPanel";
import { OffensePlayerPanel } from "../ui/shell/panels/OffensePlayerPanel";
import { DefensePlayerPanel } from "../ui/shell/panels/DefensePlayerPanel";
import { MarkPanel } from "../ui/shell/panels/MarkPanel";

// PanelProps only requires `selection`; none of these panels read it, but it
// must be a valid SelectionState so a panel could in principle inspect it.
const NONE_SELECTION = { selection: { kind: "none" as const } };

function makeStore(): SceneStore {
  return createSceneStore(getPreset("vertStackForceSide"));
}

beforeEach(() => {
  localStorage.clear();
  // The swap confirmation is module-level for the same reason overlay prefs
  // are (both shells mount these panels at once), so it outlives cleanup.
  resetSwapNotice();
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

// fieldview-play-model replaced the three PENDING placeholders with real
// panels. They need a scene to describe, so they render through the
// SceneStoreProvider the shells install (ui/shell/sceneStore.tsx) — the same
// seam, and the same components, on both surfaces (canon ADR-14).
describe("play-model panels (offense/defense/mark player selected)", () => {
  function withStore(ui: ReactElement, store: SceneStore) {
    return render(<SceneStoreProvider store={store}>{ui}</SceneStoreProvider>);
  }

  it("OffensePlayerPanel reports possession and who is guarding this player", () => {
    const store = makeStore();
    withStore(<OffensePlayerPanel selection={{ kind: "offense", id: "o1" }} />, store);

    // o1 is the thrower in every built-in preset, and d1 (label "M") is
    // matched to them.
    expect(screen.getByText(/Has the disc/)).toBeVisible();
    expect(screen.getByText("Guarded by")).toBeVisible();
    expect(screen.getByText("#M")).toBeVisible();
  });

  it("OffensePlayerPanel says nobody, not an error, for an unguarded cutter", () => {
    const store = makeStore();
    store.mutate((draft) => reassign(draft, "d2", null));
    withStore(<OffensePlayerPanel selection={{ kind: "offense", id: "o2" }} />, store);

    expect(screen.getByText("Guarded by: nobody")).toBeVisible();
  });

  it("DefensePlayerPanel edits the matchup through the selector", () => {
    const store = makeStore();
    withStore(<DefensePlayerPanel selection={{ kind: "defense", id: "d2" }} />, store);

    const select = screen.getByLabelText("Guarding") as HTMLSelectElement;
    expect(select.value).toBe("o2");

    fireEvent.change(select, { target: { value: "o3" } });
    expect(store.getScene().matchups.d2).toBe("o3");
  });

  it("DefensePlayerPanel names the displaced defender's new mark after a swap", () => {
    const store = makeStore();
    withStore(<DefensePlayerPanel selection={{ kind: "defense", id: "d2" }} />, store);

    // d2 takes o3, so d3 (who held o3) inherits d2's old mark, o2.
    fireEvent.change(screen.getByLabelText("Guarding"), { target: { value: "o3" } });
    expect(store.getScene().matchups.d3).toBe("o2");
    expect(screen.getByText("Swapped — #2 now guards #1.")).toBeVisible();
  });

  it("DefensePlayerPanel offers No assignment and explains free roam", () => {
    const store = makeStore();
    withStore(<DefensePlayerPanel selection={{ kind: "defense", id: "d2" }} />, store);

    fireEvent.change(screen.getByLabelText("Guarding"), { target: { value: "" } });
    expect(store.getScene().matchups.d2).toBeNull();
    expect(screen.getByText("Not tracking anyone — place this defender by hand.")).toBeVisible();
    // A deliberate state, so no swap is claimed and nothing reads as an error.
    expect(screen.queryByText(/^Swapped/)).not.toBeInTheDocument();
  });

  it("MarkPanel moves the mark to the chosen force and reads it back (ADR-3)", () => {
    const store = makeStore();
    withStore(<MarkPanel selection={{ kind: "mark", id: "d1" }} />, store);

    fireEvent.click(screen.getByRole("button", { name: "Backhand" }));
    expect(readForce(store.getScene())).toEqual({ side: "backhand", angle: "default" });
    expect(screen.getByText("Backhand · Default")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Around" }));
    expect(readForce(store.getScene())).toEqual({ side: "backhand", angle: "around" });
    expect(screen.getByText("Backhand · Around")).toBeVisible();

    // The active state is read out of the geometry, never out of which button
    // was pressed — that is the whole of ADR-3.
    expect(screen.getByRole("button", { name: "Backhand" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("MarkPanel reads Custom once the mark is dragged off a preset", () => {
    const store = makeStore();
    withStore(<MarkPanel selection={{ kind: "mark", id: "d1" }} />, store);

    fireEvent.click(screen.getByRole("button", { name: "Flick" }));
    expect(screen.getByText("Flick · Default")).toBeVisible();

    const mark = store.getScene().players.find((p) => p.id === "d1")!;
    const dragged = { x: mark.pos.x + 5, y: mark.pos.y + 5 };
    act(() => {
      store.mutate((draft) => movePlayer(draft, "d1", dragged));
    });

    expect(screen.getByText("Custom")).toBeVisible();
    expect(
      screen.getByText("Pick a force to snap the mark back to a named position."),
    ).toBeVisible();
    for (const name of ["Flat", "Flick", "Backhand", "Default", "Inside", "Around"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("MarkPanel disables the force controls with an explanation when nobody has the disc", () => {
    const store = makeStore();
    store.mutate((draft) => {
      draft.possession = null;
      normalize(draft);
    });
    withStore(<MarkPanel selection={{ kind: "mark", id: "d1" }} />, store);

    expect(screen.getByText("Force needs a thrower — give someone the disc first.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Flick" })).toHaveAttribute("aria-disabled", "true");
  });
});
