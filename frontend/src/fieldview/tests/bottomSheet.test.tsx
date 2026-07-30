// Mobile bottom sheet (fieldview-shell Mobile partition, tasks 50–57):
// collapsed/expanded states, tab switching, the SELECTION tab's empty-state
// copy override, "select while collapsed doesn't auto-expand" + indicator,
// the Play Designer full-screen overlay, and prefers-reduced-motion.
//
// Built directly against a `createSceneStore` instance, matching this
// module's existing mocking-free convention (drag.test.tsx, overlay.test.tsx)
// — there is no live SceneStore in any page yet to wire this into
// (Integration partition's job), so the store is constructed here exactly
// like Whiteboard.tsx's own `useRef(createSceneStore(...))` does.

import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BottomSheet } from "../ui/shell/BottomSheet";
import { createSceneStore } from "../scene/store";
import { getPreset } from "../scene/presets";

beforeEach(() => {
  localStorage.clear();
});

function renderSheet() {
  const store = createSceneStore(getPreset("vertStackForceSide"));
  render(
    <MemoryRouter>
      <BottomSheet store={store} />
    </MemoryRouter>,
  );
  return store;
}

describe("collapsed (default) state", () => {
  it("shows the handle bar, not the tabbed sheet", () => {
    renderSheet();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand field view tools" })).toBeInTheDocument();
  });

  it("expands to the TOOLS tab when the handle bar is tapped", () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Expand field view tools" }));
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tools" })).toHaveAttribute("aria-selected", "true");
  });
});

describe("tab switching", () => {
  it("switches to SELECTION and SETTINGS on tap", () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Expand field view tools" }));

    fireEvent.click(screen.getByRole("tab", { name: "Selection" }));
    expect(screen.getByRole("tab", { name: "Selection" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Select a player on the field to see options here.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Settings" }));
    expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Play Designer" })).toBeInTheDocument();
  });

  it("collapses again via the grabber", () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Expand field view tools" }));
    fireEvent.click(screen.getByRole("button", { name: "Collapse tools" }));
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });
});

describe("SELECTION tab content", () => {
  it("shows the empty-state copy override when nothing is selected", () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Expand field view tools" }));
    fireEvent.click(screen.getByRole("tab", { name: "Selection" }));
    expect(screen.getByText("Select a player on the field to see options here.")).toBeInTheDocument();
  });

  it("renders the registry's panel (not the empty-state copy) once a player is selected", () => {
    const store = renderSheet();
    const playerId = store.getScene().players.find((p) => p.team === "offense")!.id;
    act(() => {
      store.setSelection({ kind: "offense", id: playerId });
    });

    fireEvent.click(screen.getByRole("button", { name: /Expand field view tools/ }));
    fireEvent.click(screen.getByRole("tab", { name: "Selection" }));

    expect(screen.queryByText("Select a player on the field to see options here.")).not.toBeInTheDocument();
    expect(screen.getByText("Matchup and mark controls ship in a future update.")).toBeInTheDocument();
  });

  it("still uses the registry's DefaultVisibilityPanel (not the empty-state copy) for a multi selection", () => {
    const store = renderSheet();
    act(() => {
      store.setSelection({ kind: "multi", ids: [] });
    });

    fireEvent.click(screen.getByRole("button", { name: /Expand field view tools/ }));
    fireEvent.click(screen.getByRole("tab", { name: "Selection" }));

    expect(screen.queryByText("Select a player on the field to see options here.")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Offense" })).toBeInTheDocument();
  });
});

describe("selecting while collapsed", () => {
  it("does not auto-expand the sheet", () => {
    const store = renderSheet();
    const playerId = store.getScene().players.find((p) => p.team === "defense")!.id;
    act(() => {
      store.setSelection({ kind: "defense", id: playerId });
    });

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("shows an indicator dot on the collapsed bar instead", () => {
    const store = renderSheet();
    expect(screen.queryByTestId("selection-indicator")).not.toBeInTheDocument();

    const playerId = store.getScene().players.find((p) => p.team === "defense")!.id;
    act(() => {
      store.setSelection({ kind: "defense", id: playerId });
    });

    expect(screen.getByTestId("selection-indicator")).toBeInTheDocument();
  });

  it("clears the indicator once the sheet is expanded", () => {
    const store = renderSheet();
    const playerId = store.getScene().players.find((p) => p.team === "defense")!.id;
    act(() => {
      store.setSelection({ kind: "defense", id: playerId });
    });
    expect(screen.getByTestId("selection-indicator")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Expand field view tools/ }));
    expect(screen.queryByTestId("selection-indicator")).not.toBeInTheDocument();
  });
});

describe("Play Designer", () => {
  it("opens as a full-screen overlay, not a slot, with the same placeholder copy as desktop", () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Expand field view tools" }));
    fireEvent.click(screen.getByRole("tab", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Play Designer" }));

    const overlay = screen.getByRole("dialog", { name: "Play Designer" });
    expect(overlay.className).toContain("fixed");
    expect(overlay.className).toContain("inset-0");
    expect(screen.getByText("Play Designer — coming in a future update.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "/fieldview/designer" })).toHaveAttribute(
      "href",
      "/fieldview/designer",
    );
  });

  it("closes via the ✕ button", () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Expand field view tools" }));
    fireEvent.click(screen.getByRole("tab", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Play Designer" }));
    fireEvent.click(screen.getByRole("button", { name: "Close Play Designer" }));

    expect(screen.queryByRole("dialog", { name: "Play Designer" })).not.toBeInTheDocument();
  });
});

describe("prefers-reduced-motion", () => {
  it("gates the expand/collapse transition behind motion-safe, never the state change itself", () => {
    renderSheet();
    const sheet = screen.getByRole("region", { name: "Field view tools" });
    const transitionClasses = sheet.className.split(/\s+/).filter((c) => c.includes("transition"));
    expect(transitionClasses.length).toBeGreaterThan(0);
    for (const cls of transitionClasses) expect(cls.startsWith("motion-safe:")).toBe(true);

    // The expanded/collapsed state itself is not gated by the transition —
    // a reduced-motion user still gets the sheet expanded, just instantly.
    fireEvent.click(screen.getByRole("button", { name: "Expand field view tools" }));
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });
});

describe("disabled ribbon buttons (TOOLS tab)", () => {
  it("render aria-disabled with a reachable tooltip, not the native disabled attribute", () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Expand field view tools" }));

    const throwButton = screen.getByRole("button", { name: "Throw to Player" });
    expect(throwButton).toHaveAttribute("aria-disabled", "true");
    expect(throwButton).toHaveAttribute("title", "Ships in a future update.");
    expect(throwButton).toHaveAttribute("tabIndex", "0");

    const statsButton = screen.getByRole("button", { name: "Advanced Stats" });
    expect(statsButton).toHaveAttribute("aria-disabled", "true");
    expect(statsButton).toHaveAttribute("title", "Ships in a future update.");
  });

  it("Space View toggles the shared overlay prefs, same as desktop's Space button", () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Expand field view tools" }));

    const spaceButton = screen.getByRole("button", { name: "Space View" });
    expect(spaceButton).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(spaceButton);
    expect(spaceButton).toHaveAttribute("aria-pressed", "true");

    const stored = JSON.parse(localStorage.getItem("fieldview.overlayPrefs") ?? "{}");
    expect(stored.on).toBe(true);
  });
});

// SmallScreenNotice.tsx itself is deleted (confirmed via
// `grep -r SmallScreenNotice frontend/src` finding no import/render sites);
// a dynamic import assertion isn't usable here since Vite's static import
// analysis fails the transform before the test can run, rather than
// rejecting at runtime.
