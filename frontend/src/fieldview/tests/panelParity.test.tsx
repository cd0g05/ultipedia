// canon ADR-14 ("one registry, two presentational shells") and the play-model
// panels' accessibility contract (ux.md Responsive & Accessibility).
//
// The parity assertions here are deliberately structural rather than a
// screenshot comparison, which jsdom could not do anyway: both shells are
// rendered against the SAME store and the same selection, and the panel's
// controls and copy are compared field for field. Anything that grew a
// mobile-specific matchup or force UI would fail this, which is exactly the
// drift ADR-14 exists to prevent.

import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { createSceneStore } from "../scene/store";
import type { SceneStore } from "../scene/store";
import { getPreset } from "../scene/presets";
import { LeftSidebar } from "../ui/shell/LeftSidebar";
import { BottomSheet } from "../ui/shell/BottomSheet";
import type { SelectionState } from "../scene/selection";
import { resetThrowMode } from "../ui/shell/throwMode";
import { resetSwapNotice } from "../ui/shell/panels/DefensePlayerPanel";

beforeEach(() => {
  localStorage.clear();
  resetThrowMode();
  resetSwapNotice();
});

function makeStore(): SceneStore {
  return createSceneStore(getPreset("vertStackForceSide"));
}

// The desktop sidebar's panel area.
function renderDesktop(store: SceneStore, selection: SelectionState): HTMLElement {
  const { container } = render(
    <MemoryRouter>
      <LeftSidebar store={store} designerOpen={false} onToggleDesigner={() => {}} />
    </MemoryRouter>,
  );
  act(() => store.setSelection(selection));
  return container.querySelector("aside")!;
}

// The mobile sheet's SELECTION tab, which is where the same panel lands.
function renderMobile(store: SceneStore, selection: SelectionState): HTMLElement {
  render(
    <MemoryRouter>
      <BottomSheet store={store} />
    </MemoryRouter>,
  );
  act(() => store.setSelection(selection));
  fireEvent.click(screen.getByRole("button", { name: /Expand field view tools/ }));
  fireEvent.click(screen.getByRole("tab", { name: "Selection" }));
  return screen.getByTestId("bottom-sheet-root");
}

// Everything a coach can read or press in a panel, as a comparable shape.
function panelContract(root: HTMLElement) {
  return {
    buttons: within(root)
      .queryAllByRole("button")
      .map((b) => `${b.getAttribute("aria-label") ?? b.textContent}:${b.getAttribute("aria-pressed")}`)
      // The shells' own chrome (tabs, Advanced Settings, Play Designer, the
      // ribbon) is not panel content; the force buttons are the only ones
      // these selections put on screen.
      .filter((label) => /Flat|Flick|Backhand|Default|Inside|Around/.test(label)),
    groups: within(root)
      .queryAllByRole("group")
      .map((g) => g.getAttribute("aria-label")),
    combos: within(root)
      .queryAllByRole("combobox")
      .map((c) => `${(c as HTMLSelectElement).value}:${c.getAttribute("id")}`),
    options: within(root)
      .queryAllByRole("option")
      .map((o) => o.textContent),
  };
}

describe("ADR-14: the same panel renders identically on both shells", () => {
  it.each([
    ["offense", { kind: "offense", id: "o2" } as SelectionState, "Guarded by"],
    ["defense", { kind: "defense", id: "d2" } as SelectionState, "Guarding"],
    ["mark", { kind: "mark", id: "d1" } as SelectionState, "Force side"],
  ])("%s selection", (_kind, selection, marker) => {
    const desktopStore = makeStore();
    const desktop = panelContract(renderDesktop(desktopStore, selection));
    expect(screen.getByText(marker)).toBeInTheDocument();

    // A fresh render (and a fresh store at the same preset) so the two
    // surfaces are compared from identical starting conditions.
    document.body.innerHTML = "";
    const mobileStore = makeStore();
    const mobile = panelContract(renderMobile(mobileStore, selection));
    expect(screen.getByText(marker)).toBeInTheDocument();

    expect(mobile).toEqual(desktop);
  });

  it("a matchup edited on the mobile sheet writes the same scene as on desktop", () => {
    const store = makeStore();
    renderMobile(store, { kind: "defense", id: "d2" });

    fireEvent.change(screen.getByLabelText("Guarding"), { target: { value: "o3" } });
    expect(store.getScene().matchups.d2).toBe("o3");
    expect(store.getScene().matchups.d3).toBe("o2");
    expect(screen.getByText("Swapped — #2 now guards #1.")).toBeVisible();
  });
});

describe("accessibility of the play-model panels", () => {
  it("labels the force controls as two groups rather than a flat list of buttons", () => {
    const store = makeStore();
    const root = renderDesktop(store, { kind: "mark", id: "d1" });

    const groups = within(root).getAllByRole("group");
    const labels = groups.map((g) => g.getAttribute("aria-label"));
    expect(labels).toContain("Force side");
    expect(labels).toContain("Force angle");
  });

  it("states the active force in words, not by colour alone", () => {
    const store = makeStore();
    renderDesktop(store, { kind: "mark", id: "d1" });

    fireEvent.click(screen.getByRole("button", { name: "Backhand" }));
    fireEvent.click(screen.getByRole("button", { name: "Inside" }));
    expect(screen.getByText("Backhand · Inside")).toBeVisible();
  });

  it("announces a swap politely, so it is not a silent change", () => {
    const store = makeStore();
    const root = renderDesktop(store, { kind: "defense", id: "d2" });

    fireEvent.change(screen.getByLabelText("Guarding"), { target: { value: "o3" } });
    const live = within(root)
      .getAllByText("Swapped — #2 now guards #1.")[0]
      .closest('[aria-live="polite"]');
    expect(live).not.toBeNull();
  });

  it("keeps the matchup selector reachable by its visible label", () => {
    const store = makeStore();
    renderDesktop(store, { kind: "defense", id: "d2" });
    // A native <select> associated with its own <label> (ux.md UX Consistency
    // Patterns) — keyboard- and screen-reader-native without extra wiring.
    expect(screen.getByLabelText("Guarding").tagName).toBe("SELECT");
  });
});
