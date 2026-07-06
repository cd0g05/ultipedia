// EntrySections/* Decorator tests: each block renders its content when data
// is present and contributes NOTHING (renders null) when absent — the
// EntryDetail template never branches on presence itself.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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
