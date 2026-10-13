// The space colours can be switched off (the legend is the switch): they are the
// point of Explore, but a distraction when building or watching a play. Off means
// nothing is computed or painted; the choice persists; the "?" still opens the
// colour guide.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { routes } from "../../router";
import { DEFAULT_PREFS, parsePrefs } from "../ui/prefs";

vi.mock("../space/score", async (importOriginal) => {
  const real = await importOriginal<typeof import("../space/score")>();
  return { ...real, computeGrid: vi.fn(real.computeGrid) };
});
import { computeGrid } from "../space/score";

const rAF = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

function AppRoutes() {
  return useRoutes(routes);
}
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}
const toggle = () => screen.getByRole("button", { name: "Show the space colours" });
const nudge = async () => {
  fireEvent.keyDown(screen.getByRole("button", { name: "Offense 3" }), { key: "ArrowRight" });
  await act(async () => {
    await rAF();
  });
};

beforeEach(() => {
  localStorage.clear();
  vi.mocked(computeGrid).mockClear();
});

describe("heat toggle", () => {
  it("is on by default and persisted as a preference that defaults to on for old stored prefs", () => {
    expect(DEFAULT_PREFS.heat).toBe(true);
    expect(parsePrefs({ on: false }).heat).toBe(true); // a stale entry from before the toggle
    expect(parsePrefs({ heat: false }).heat).toBe(false);
    expect(parsePrefs({ heat: "no" }).heat).toBe(true);
  });

  it("the legend switches the colours off and back on, and says so", () => {
    renderAt("/fieldview/explore");
    expect(toggle()).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Closed")).toBeInTheDocument();
    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Colours off")).toBeInTheDocument();
    expect(screen.queryByText("Strong")).toBeNull();
    expect(JSON.parse(localStorage.getItem("fieldview.overlayPrefs")!).heat).toBe(false);
    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("while off, nothing is computed when the scene changes; turning it on paints again", async () => {
    renderAt("/fieldview/explore");
    await nudge();
    expect(vi.mocked(computeGrid)).toHaveBeenCalled();

    fireEvent.click(toggle());
    await act(async () => {
      await rAF();
    });
    vi.mocked(computeGrid).mockClear();
    await nudge();
    await nudge();
    expect(vi.mocked(computeGrid)).not.toHaveBeenCalled();

    fireEvent.click(toggle());
    await act(async () => {
      await rAF();
    });
    await nudge();
    expect(vi.mocked(computeGrid)).toHaveBeenCalled();
  });

  it("is remembered across a reload and shared by Explore, Watch and Build", () => {
    const first = renderAt("/fieldview/build");
    fireEvent.click(toggle());
    first.unmount();
    for (const path of ["/fieldview/explore", "/fieldview/watch", "/fieldview/build"]) {
      const r = renderAt(path);
      expect(toggle()).toHaveAttribute("aria-pressed", "false");
      r.unmount();
    }
  });

  it("the ? still opens the colour guide, with the colours off", () => {
    renderAt("/fieldview/explore");
    fireEvent.click(toggle());
    fireEvent.click(screen.getByRole("button", { name: /colour guide/i }));
    expect(screen.getByRole("dialog", { name: /how to read the colours/i })).toBeInTheDocument();
  });

  it("the moves, the selected-player card and the pieces do not depend on the colours", async () => {
    renderAt("/fieldview/explore");
    fireEvent.click(toggle());
    const piece = screen.getByRole("button", { name: "Offense 3" });
    const before = piece.getAttribute("transform");
    await nudge();
    expect(piece.getAttribute("transform")).not.toBe(before);
  });
});
