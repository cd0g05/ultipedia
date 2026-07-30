// Breakpoint behaviour (ux.md "Responsive & Accessibility", tasks 133/134).
//
// jsdom does not evaluate media queries or apply Tailwind, so these assert
// the *contract* — which utility classes carry the responsive intent — rather
// than computed layout. That is a real guard against the intent being
// deleted, and an honest one about what it can see; the visual confirmation
// at each breakpoint belongs to the manual pass (task 131).

import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Whiteboard } from "../pages/Whiteboard";
import { Designer } from "../pages/Designer";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

function renderPage(page: "whiteboard" | "designer") {
  return render(
    <MemoryRouter>{page === "whiteboard" ? <Whiteboard /> : <Designer />}</MemoryRouter>,
  );
}

describe("no viewport blocks rendering (PRD FR-6.2)", () => {
  // SmallScreenNotice is removed entirely (fieldview-shell Mobile partition):
  // there is no width at which Field View shows a message instead of the
  // tool, and no width at which the tool's container is display:none.
  it.each(["whiteboard", "designer"] as const)(
    "%s never renders the old small-screen notice",
    (page) => {
      renderPage(page);
      expect(screen.queryByText("Field View needs a bigger screen")).not.toBeInTheDocument();
      expect(screen.queryByText(/at least 768 px wide/)).not.toBeInTheDocument();
    },
  );

  it.each(["whiteboard", "designer"] as const)("%s's own container is never display:none", (page) => {
    renderPage(page);
    const stage = screen.getByRole("group", { name: /Ultimate field/i });
    const toolRoot = stage.closest("div.hidden");
    expect(toolRoot).toBeNull();
  });
});

describe("tablet (768–1279) vs desktop (1280+)", () => {
  it.each(["whiteboard", "designer"] as const)(
    "%s stacks the controls under the field until xl, then moves them beside it",
    (page) => {
      renderPage(page);
      const stage = screen.getByRole("group", { name: /Ultimate field/i });
      // Up past FieldCanvas's own wrappers (the fullscreen target and the
      // aspect-locked inner box) to the split container the page owns.
      const split = stage.closest(".fv-stage")!.parentElement!;
      expect(split.className).toContain("flex-col");
      expect(split.className).toContain("xl:flex-row");
    },
  );

  it("lays the rail out as a horizontal bar on tablet and a vertical rail on desktop", () => {
    renderPage("whiteboard");
    const rail = screen.getByRole("complementary", { name: "Field view controls" });
    expect(rail.className).toContain("flex-row");
    expect(rail.className).toContain("xl:flex-col");
  });

  it("keeps the Designer timeline full width at every breakpoint", () => {
    renderPage("designer");
    const strip = screen.getByRole("button", { name: "+ Keyframe" }).closest("div")!.parentElement!;
    expect(strip.className).toContain("w-full");
    expect(strip.className).not.toContain("xl:w-");
  });

  it("gives the field the width, not the rail, on tablet", () => {
    renderPage("whiteboard");
    const rail = screen.getByRole("complementary", { name: "Field view controls" });
    const railColumn = rail.parentElement!;
    // Full width when stacked; a fixed 320px column only from xl.
    expect(railColumn.className).toContain("w-full");
    expect(railColumn.className).toContain("xl:w-80");
  });
});
