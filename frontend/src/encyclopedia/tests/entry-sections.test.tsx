// EntrySections/* Decorator tests: each block renders its content when data
// is present and contributes NOTHING (renders null) when absent — the
// EntryDetail template never branches on presence itself. Partition 5 made
// each block a collapsible disclosure (default expanded): the heading button
// carries aria-expanded/aria-controls and toggles with Enter/Space.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CoachingPoints } from "../components/EntrySections/CoachingPoints";
import { CommonMistakes } from "../components/EntrySections/CommonMistakes";
import { Variations } from "../components/EntrySections/Variations";
import { SimilarEntries } from "../components/SimilarEntries";
import { MemoryRouter } from "react-router-dom";
import { makeSummary } from "./fixtures";

describe("EntrySections decorators", () => {
  it("CoachingPoints renders nothing when there are no points", () => {
    const { container } = render(<CoachingPoints points={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("CoachingPoints renders a titled block when points exist", () => {
    render(<CoachingPoints points={["Throw with touch.", "Clear hard."]} />);
    expect(
      screen.getByRole("heading", { name: "Coaching Points" })
    ).toBeInTheDocument();
    expect(screen.getByText("Throw with touch.")).toBeInTheDocument();
    expect(screen.getByText("Clear hard.")).toBeInTheDocument();
  });

  it("CommonMistakes renders nothing when there are no mistakes", () => {
    const { container } = render(<CommonMistakes mistakes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("CommonMistakes renders a titled block when mistakes exist", () => {
    render(<CommonMistakes mistakes={["Floating the reset pass."]} />);
    expect(
      screen.getByRole("heading", { name: "Common Mistakes" })
    ).toBeInTheDocument();
    expect(screen.getByText("Floating the reset pass.")).toBeInTheDocument();
  });

  it("Variations renders nothing when there are no variations", () => {
    const { container } = render(<Variations variations={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("Variations renders a titled block when variations exist", () => {
    render(<Variations variations={["Add a static mark."]} />);
    expect(screen.getByRole("heading", { name: "Variations" })).toBeInTheDocument();
    expect(screen.getByText("Add a static mark.")).toBeInTheDocument();
  });

  it("SimilarEntries renders nothing when no entry shares a tag", () => {
    const { container } = render(
      <MemoryRouter>
        <SimilarEntries entries={[]} />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("SimilarEntries caps the row at 3 cards", () => {
    const entries = [1, 2, 3, 4].map((n) =>
      makeSummary({ type: "drill", title: `Similar ${n}` })
    );
    render(
      <MemoryRouter>
        <SimilarEntries entries={entries} />
      </MemoryRouter>
    );
    expect(screen.getAllByTestId("entry-card")).toHaveLength(3);
    expect(screen.queryByText("Similar 4")).not.toBeInTheDocument();
  });
});

describe("EntrySections collapsible disclosures (a11y, task 66)", () => {
  it.each([
    ["Coaching Points", () => <CoachingPoints points={["Point one."]} />, "Point one."],
    ["Common Mistakes", () => <CommonMistakes mistakes={["Mistake one."]} />, "Mistake one."],
    ["Variations", () => <Variations variations={["Variation one."]} />, "Variation one."],
  ])(
    "%s exposes aria-expanded/aria-controls and toggles via keyboard",
    async (title, Block, content) => {
      const user = userEvent.setup();
      render(Block());

      const toggle = screen.getByRole("button", { name: title });
      const regionId = toggle.getAttribute("aria-controls");
      expect(regionId).toBeTruthy();

      // Default expanded: content visible, crawlable, ready to scan.
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByText(content)).toBeVisible();

      // Enter collapses (native button semantics).
      toggle.focus();
      await user.keyboard("{Enter}");
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(screen.getByText(content)).not.toBeVisible();
      expect(document.getElementById(regionId!)).toHaveAttribute("hidden");

      // Space expands again.
      await user.keyboard(" ");
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByText(content)).toBeVisible();
    }
  );
});
