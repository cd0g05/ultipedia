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

describe("below 768 px", () => {
  it.each(["whiteboard", "designer"] as const)(
    "%s shows a readable message instead of a broken canvas",
    (page) => {
      renderPage(page);

      const notice = screen.getByRole("heading", { name: "Field View needs a bigger screen" });
      const container = notice.closest("div")!;
      // Visible below md, hidden from md up.
      expect(container.className).toContain("md:hidden");
      expect(screen.getByText(/at least 768 px wide/)).toBeInTheDocument();
    },
  );

  it.each(["whiteboard", "designer"] as const)("%s hides the tool itself below md", (page) => {
    renderPage(page);
    const stage = screen.getByRole("group", { name: /Ultimate field/i });
    // The tool's own container is display:none below md and flex from md up.
    const toolRoot = stage.closest("div.hidden");
    expect(toolRoot).not.toBeNull();
    expect(toolRoot!.className).toContain("md:flex");
  });
});

describe("tablet (768–1279) vs desktop (1280+)", () => {
  it.each(["whiteboard", "designer"] as const)(
    "%s stacks the controls under the field until xl, then moves them beside it",
    (page) => {
      renderPage(page);
      const stage = screen.getByRole("group", { name: /Ultimate field/i });
      // FieldCanvas's own wrapper, then the split container above it.
      const split = stage.closest("div")!.parentElement!;
      expect(split.className).toContain("flex-col");
      expect(split.className).toContain("xl:flex-row");
    },
  );

  it("lays the rail out as a horizontal bar on tablet and a vertical rail on desktop", () => {
    renderPage("whiteboard");
    const rail = screen.getByRole("complementary", { name: "Space overlay controls" });
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
    const rail = screen.getByRole("complementary", { name: "Space overlay controls" });
    const railColumn = rail.parentElement!;
    // Full width when stacked; a fixed 320px column only from xl.
    expect(railColumn.className).toContain("w-full");
    expect(railColumn.className).toContain("xl:w-80");
  });
});
