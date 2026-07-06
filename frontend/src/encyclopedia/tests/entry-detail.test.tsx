// EntryDetail.tsx template tests — header/badges/media/instructions/optional
// blocks/tags/similar, plus the not-found state. api/client.ts is mocked.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { routes } from "../../router";
import { makeDetail, makeSummary } from "./fixtures";

vi.mock("../api/client");

import * as client from "../api/client";

const fetchEntries = vi.mocked(client.fetchEntries);
const fetchEntry = vi.mocked(client.fetchEntry);

function AppRoutes() {
  return useRoutes(routes);
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

const fullDrill = makeDetail({
  type: "drill",
  slug: "give-and-go",
  title: "Give-and-Go Warmup",
  shortDescription: "A fast-paced passing warmup.",
  skillLevel: "beginner",
  attributes: { player_count_min: 6 },
  body: "Form two lines.\nThrow a forehand.\nSprint to the cone.",
  coachingPoints: ["Do not watch your throw.", "Lead the receiver."],
  commonMistakes: ["Watching the disc after release."],
  variations: ["Add a mark to the thrower."],
  tags: [
    { name: "Throwing", category: "focus" },
    { name: "10 min", category: "duration" },
  ],
  media: [
    { url: "/img/give-and-go.png", type: "image", caption: "Setup", sortOrder: 0 },
  ],
  similar: [
    makeSummary({ type: "drill", title: "Break Mark Ladder", slug: "break-mark" }),
  ],
});

beforeEach(() => {
  vi.clearAllMocks();
  fetchEntries.mockResolvedValue([]);
  fetchEntry.mockResolvedValue(fullDrill);
});

describe("EntryDetail", () => {
  it("fetches by (type, slug) from the route params", async () => {
    renderAt("/drills/give-and-go");

    await screen.findByRole("heading", { name: "Give-and-Go Warmup" });
    expect(fetchEntry).toHaveBeenCalledWith("drill", "give-and-go");
  });

  it("shows title, skill badge, duration, and team size above the fold", async () => {
    renderAt("/drills/give-and-go");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Give-and-Go Warmup" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("beginner").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10 min").length).toBeGreaterThan(0);
    expect(screen.getByText("6+ players")).toBeInTheDocument();
  });

  it("renders the primary media", async () => {
    renderAt("/drills/give-and-go");

    expect(await screen.findByRole("img", { name: "Setup" })).toHaveAttribute(
      "src",
      "/img/give-and-go.png"
    );
  });

  it("renders the body as numbered instructions", async () => {
    renderAt("/drills/give-and-go");

    const instructions = await screen.findByRole("region", {
      name: "Setup & Instructions",
    });
    const steps = instructions.querySelectorAll("ol li");
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent("Form two lines.");
  });

  it("renders coaching points, common mistakes, and variations when present", async () => {
    renderAt("/drills/give-and-go");

    expect(
      await screen.findByRole("heading", { name: "Coaching Points" })
    ).toBeInTheDocument();
    expect(screen.getByText("Do not watch your throw.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Common Mistakes" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Variations" })).toBeInTheDocument();
  });

  it("omits absent optional sections entirely — no empty shells", async () => {
    fetchEntry.mockResolvedValue(
      makeDetail({ type: "strategy", slug: "bare", title: "Bare Strategy" })
    );

    renderAt("/strategies/bare");

    await screen.findByRole("heading", { name: "Bare Strategy" });
    expect(
      screen.queryByRole("heading", { name: "Coaching Points" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Common Mistakes" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Variations" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Similar Entries" })
    ).not.toBeInTheDocument();
  });

  it("routes tag pills to the pre-filtered search URL", async () => {
    renderAt("/drills/give-and-go");

    const tags = await screen.findByRole("region", { name: "Tags" });
    const pill = tags.querySelector('a[href="/search?focus=Throwing"]');
    expect(pill).not.toBeNull();
    expect(pill).toHaveTextContent("Throwing");
  });

  it("shows up to 3 Similar Entries cards when tags overlap", async () => {
    renderAt("/drills/give-and-go");

    expect(
      await screen.findByRole("heading", { name: "Similar Entries" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Break Mark Ladder/ })
    ).toHaveAttribute("href", "/drills/break-mark");
  });

  it("renders the 404 page (with section + search links) for a missing/draft slug", async () => {
    fetchEntry.mockResolvedValue(null);

    renderAt("/drills/not-a-real-slug");

    expect(
      await screen.findByRole("heading", { name: /couldn't find that entry/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse Drills" })).toHaveAttribute(
      "href",
      "/drills"
    );
    expect(
      screen.getByRole("link", { name: "Search the Encyclopedia" })
    ).toHaveAttribute("href", "/search");
  });

  it("shows an inline error message when the fetch fails", async () => {
    fetchEntry.mockRejectedValue(new Error("network down"));

    renderAt("/drills/give-and-go");

    expect(
      await screen.findByText("Something went wrong loading this entry")
    ).toBeInTheDocument();
  });
});
