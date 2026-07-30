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

// Designer (`pages/Designer.tsx`) is explicitly out of scope for the
// fieldview-shell initiative beyond linking to it (tech-design.md Brownfield
// Notes) — it still composes `OverlayRail` directly and keeps the pre-shell
// tablet/desktop rail split below.
describe("Designer: tablet (768–1279) vs desktop (1280+)", () => {
  it("stacks the controls under the field until xl, then moves them beside it", () => {
    renderPage("designer");
    const stage = screen.getByRole("group", { name: /Ultimate field/i });
    const split = stage.closest(".fv-stage")!.parentElement!;
    expect(split.className).toContain("flex-col");
    expect(split.className).toContain("xl:flex-row");
  });

  it("keeps the timeline full width at every breakpoint", () => {
    renderPage("designer");
    const strip = screen.getByRole("button", { name: "+ Keyframe" }).closest("div")!.parentElement!;
    expect(strip.className).toContain("w-full");
    expect(strip.className).not.toContain("xl:w-");
  });
});

// Whiteboard (`pages/Whiteboard.tsx`) composes `ShellLayout` (Integration
// partition) — its own responsive story is the `lg` (1024px) shell
// breakpoint (ADR-5), not the old tablet/xl rail split OverlayRail used.
// `shellDesktop.test.tsx` covers the CSS-only hidden/lg:flex /lg:hidden
// contract on the shell components directly; this asserts the same contract
// holds once actually composed into the real page.
describe("Whiteboard: shell breakpoint (lg, 1024px)", () => {
  it("keeps the field itself outside anything that goes display:none at any width", () => {
    renderPage("whiteboard");
    const stage = screen.getByRole("group", { name: /Ultimate field/i });
    expect(stage.closest("div.hidden")).toBeNull();
  });

  it("gates the desktop sidebar behind hidden/lg:flex and the bottom sheet behind lg:hidden", () => {
    renderPage("whiteboard");
    const sidebarWrapper = screen.getByRole("complementary", { name: "Field view sidebar" }).parentElement!;
    expect(sidebarWrapper.className).toContain("hidden");
    expect(sidebarWrapper.className).toContain("lg:flex");

    const bottomSheetRoot = screen.getByTestId("bottom-sheet-root");
    expect(bottomSheetRoot.className).toContain("lg:hidden");
  });
});
