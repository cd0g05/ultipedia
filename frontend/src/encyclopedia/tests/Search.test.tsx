// Partition 4 component tests (tasks 57–58): search bar navigation, AND/OR
// filter combinations, chip removal, sort switching, the over-filtered empty
// state, error+retry, and keyboard-only operability.
//
// `searchEntries` (the /api/search wrapper) is mocked at the module boundary —
// matching the intake convention of mocking the API client, and because
// AND/OR semantics are enforced server-side: the page's job is to send the
// right params and render what comes back.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { EntrySummary, SearchQuery, SearchResponse } from "../api/search";
import { SearchBar } from "../components/SearchBar";
import { Search } from "../pages/Search";

const { searchEntriesMock } = vi.hoisted(() => ({
  searchEntriesMock: vi.fn(),
}));

vi.mock("../api/search", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/search")>()),
  searchEntries: searchEntriesMock,
}));

function entry(title: string, overrides: Partial<EntrySummary> = {}): EntrySummary {
  return {
    id: `id-${title}`,
    slug: title.toLowerCase().replace(/\s+/g, "-"),
    type: "drill",
    title,
    shortDescription: `${title} description`,
    skillLevel: "beginner",
    attributes: {},
    tags: [{ name: "throwing", category: "focus" }],
    ...overrides,
  };
}

function resp(results: EntrySummary[], total = results.length): SearchResponse {
  return { results, total, page: 1, pageSize: 24 };
}

/** The SearchQuery of the most recent /api/search call. */
function lastQuery(): SearchQuery {
  const calls = searchEntriesMock.mock.calls;
  const call = calls[calls.length - 1];
  return (call?.[0] ?? {}) as SearchQuery;
}

function renderSearchAt(url: string) {
  // HelmetProvider: Search renders <Seo /> — provided by Layout in the real
  // route tree, supplied directly here since the page mounts standalone.
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/search" element={<Search />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  );
}

beforeEach(() => {
  searchEntriesMock.mockResolvedValue(resp([entry("Huck Drill")]));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("SearchBar", () => {
  function LocationProbe() {
    const location = useLocation();
    return <div data-testid="location">{location.pathname + location.search}</div>;
  }

  it("submits via keyboard alone and navigates to /search?q=...", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <SearchBar />
        <LocationProbe />
      </MemoryRouter>
    );

    await user.type(
      screen.getByRole("searchbox", { name: "Search the encyclopedia" }),
      "zone defense{Enter}"
    );

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/search?q=zone+defense"
    );
  });

  it("preserves active filter params when refining the query on /search", async () => {
    const user = userEvent.setup();
    renderSearchAt("/search?focus=throwing");
    await screen.findByText("Huck Drill");

    await user.type(
      screen.getByRole("searchbox", { name: "Search the encyclopedia" }),
      "huck{Enter}"
    );
    await screen.findByText(/1 result for "huck"/);

    expect(lastQuery().q).toBe("huck");
    expect(lastQuery().filters?.focus).toEqual(["throwing"]);
  });
});

describe("Search page — query and filters", () => {
  it("runs the query from the URL and renders results", async () => {
    searchEntriesMock.mockResolvedValue(
      resp([entry("Huck Drill"), entry("Break Mark Drill")])
    );
    renderSearchAt("/search?q=huck");

    expect(await screen.findByText("Huck Drill")).toBeInTheDocument();
    expect(screen.getByText("Break Mark Drill")).toBeInTheDocument();
    expect(screen.getByText('2 results for "huck"')).toBeInTheDocument();
    expect(lastQuery().q).toBe("huck");
  });

  it("pre-filters from tag-pill style URLs (/search?focus=throwing)", async () => {
    renderSearchAt("/search?focus=throwing");
    await screen.findByText("Huck Drill");

    expect(lastQuery().filters?.focus).toEqual(["throwing"]);
    expect(
      screen.getByRole("checkbox", { name: "throwing" })
    ).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Remove filter Focus: throwing" })
    ).toBeInTheDocument();
  });

  it("combines categories with AND: skill level + focus are both sent", async () => {
    const user = userEvent.setup();
    renderSearchAt("/search");
    await screen.findByText("Huck Drill");

    await user.click(screen.getByRole("checkbox", { name: "beginner" }));
    await screen.findByRole("button", {
      name: "Remove filter Skill Level: beginner",
    });
    await user.click(screen.getByRole("checkbox", { name: "throwing" }));
    await screen.findByRole("button", { name: "Remove filter Focus: throwing" });

    expect(lastQuery().filters?.skill_level).toEqual(["beginner"]);
    expect(lastQuery().filters?.focus).toEqual(["throwing"]);
  });

  it("combines values within a category with OR: both focus values repeat", async () => {
    const user = userEvent.setup();
    renderSearchAt("/search");
    await screen.findByText("Huck Drill");

    await user.click(screen.getByRole("checkbox", { name: "throwing" }));
    await user.click(screen.getByRole("checkbox", { name: "cutting" }));
    await screen.findByRole("button", { name: "Remove filter Focus: cutting" });

    expect(lastQuery().filters?.focus).toEqual(["throwing", "cutting"]);
  });

  it("checkboxes toggle via keyboard (Space)", async () => {
    const user = userEvent.setup();
    renderSearchAt("/search");
    await screen.findByText("Huck Drill");

    const checkbox = screen.getByRole("checkbox", { name: "beginner" });
    checkbox.focus();
    await user.keyboard(" ");

    expect(lastQuery().filters?.skill_level).toEqual(["beginner"]);
    expect(
      screen.getByRole("checkbox", { name: "beginner" })
    ).toBeChecked();
  });
});

describe("Search page — filter chips", () => {
  it("removing a chip re-queries without that value and keeps the rest", async () => {
    const user = userEvent.setup();
    renderSearchAt("/search?focus=throwing&focus=cutting");
    await screen.findByText("Huck Drill");

    await user.click(
      screen.getByRole("button", { name: "Remove filter Focus: throwing" })
    );

    await screen.findByText("Huck Drill");
    expect(lastQuery().filters?.focus).toEqual(["cutting"]);
    expect(
      screen.queryByRole("button", { name: "Remove filter Focus: throwing" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove filter Focus: cutting" })
    ).toBeInTheDocument();
  });

  it("clear all removes every active filter but keeps the query", async () => {
    const user = userEvent.setup();
    renderSearchAt("/search?q=huck&focus=throwing&skill_level=beginner");
    await screen.findByText("Huck Drill");

    await user.click(screen.getByRole("button", { name: "Clear all" }));
    await screen.findByText("Huck Drill");

    expect(lastQuery().q).toBe("huck");
    expect(lastQuery().filters?.focus).toEqual([]);
    expect(lastQuery().filters?.skill_level).toEqual([]);
    expect(screen.queryByRole("list", { name: "Active filters" })).not.toBeInTheDocument();
  });
});

describe("Search page — sorting", () => {
  it("switching sort re-queries with the sort param and reorders results", async () => {
    const easy = entry("Easy Drill");
    const hard = entry("Hard Drill");
    searchEntriesMock.mockImplementation(async (query: SearchQuery) =>
      query.sort === "difficulty_desc" ? resp([hard, easy]) : resp([easy, hard])
    );
    const user = userEvent.setup();
    renderSearchAt("/search");
    await screen.findByText("Easy Drill");

    const titles = () =>
      within(screen.getByRole("region", { name: "Search results" }))
        .getAllByRole("link")
        .map((el) => el.textContent);
    expect(titles()).toEqual(["Easy Drill", "Hard Drill"]);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Sort by" }),
      "difficulty_desc"
    );

    await screen.findByText("Hard Drill");
    expect(lastQuery().sort).toBe("difficulty_desc");
    expect(titles()).toEqual(["Hard Drill", "Easy Drill"]);
  });
});

describe("Search page — over-filtered empty state", () => {
  function mockOverFiltered() {
    // difficulty=hard AND focus=throwing → 0. Removing difficulty frees 5
    // results (most restrictive); removing focus frees only 1.
    const has = (query: SearchQuery, cat: "difficulty" | "focus", value: string) =>
      (query.filters?.[cat] ?? []).includes(value);
    searchEntriesMock.mockImplementation(async (query: SearchQuery = {}) => {
      const hard = has(query, "difficulty", "hard");
      const throwing = has(query, "focus", "throwing");
      if (hard && throwing) return resp([], 0);
      if (throwing) return resp([entry("Close A"), entry("Close B"), entry("Close C")], 5);
      if (hard) return resp([entry("Only Hard")], 1);
      return resp([entry("Anything")], 1);
    });
  }

  it("names the most restrictive filter, offers one-tap removal, and shows close matches", async () => {
    mockOverFiltered();
    renderSearchAt("/search?difficulty=hard&focus=throwing");

    expect(
      await screen.findByRole("heading", {
        name: "No exact matches for these filters",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your most restrictive filter is Difficulty: hard.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: 'Remove "hard" to see more' })
    ).toBeInTheDocument();
    // 2–3 close-match cards — never a bare "no results".
    expect(screen.getByText("Close A")).toBeInTheDocument();
    expect(screen.getByText("Close B")).toBeInTheDocument();
    expect(screen.getByText("Close C")).toBeInTheDocument();
  });

  it("the one-tap action removes the restrictive filter and recovers results", async () => {
    mockOverFiltered();
    const user = userEvent.setup();
    renderSearchAt("/search?difficulty=hard&focus=throwing");

    await user.click(
      await screen.findByRole("button", { name: 'Remove "hard" to see more' })
    );

    expect(await screen.findByText("5 results")).toBeInTheDocument();
    expect(lastQuery().filters?.difficulty).toEqual([]);
    expect(lastQuery().filters?.focus).toEqual(["throwing"]);
    expect(
      screen.queryByRole("heading", { name: "No exact matches for these filters" })
    ).not.toBeInTheDocument();
  });

  it("query-only zero results offer clearing the search plus close matches", async () => {
    searchEntriesMock.mockImplementation(async (query: SearchQuery = {}) =>
      query.q ? resp([], 0) : resp([entry("Fresh Drill")], 1)
    );
    renderSearchAt("/search?q=zzzz");

    expect(
      await screen.findByRole("heading", { name: 'No results for "zzzz"' })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
    expect(screen.getByText("Fresh Drill")).toBeInTheDocument();
  });
});

describe("Search page — filter drawer disclosure", () => {
  it("toggles aria-expanded via keyboard and shows the active count", async () => {
    const user = userEvent.setup();
    renderSearchAt("/search?focus=throwing&skill_level=beginner");
    await screen.findByText("Huck Drill");

    const disclosure = screen.getByRole("button", { name: /Filters/ });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(disclosure).toHaveAttribute("aria-controls", "filter-panel-groups");
    expect(within(disclosure).getByText("2")).toBeInTheDocument();

    disclosure.focus();
    await user.keyboard("{Enter}");
    expect(disclosure).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Enter}");
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
  });
});

describe("Search page — error state", () => {
  it("shows an inline error with a working retry action", async () => {
    const user = userEvent.setup();
    searchEntriesMock.mockRejectedValueOnce(new Error("network down"));
    renderSearchAt("/search?q=huck");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong loading results"
    );

    searchEntriesMock.mockResolvedValue(resp([entry("Huck Drill")]));
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Huck Drill")).toBeInTheDocument();
  });
});
