// Automated accessibility audit (Partition 5, task 68): axe-core against the
// four representative pages — Home, a Section, EntryDetail, Search — rendered
// through the real route tree with mocked API data (the DB has no seeded
// content yet, so audits run on mocked renders per the partition brief).
//
// The color-contrast rule is disabled here because jsdom does not lay out or
// paint (axe cannot compute contrast without real rendering); contrast is
// covered exhaustively by contrast.test.ts, which checks the actual palette
// combinations mathematically.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import axe from "axe-core";
import { routes } from "../../router";
import { makeDetail, makeSummary } from "./fixtures";

vi.mock("../api/client");

const { searchEntriesMock } = vi.hoisted(() => ({ searchEntriesMock: vi.fn() }));
vi.mock("../api/search", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/search")>()),
  searchEntries: searchEntriesMock,
}));

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

async function expectNoViolations(container: Element) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  const summary = results.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help} → ${v.nodes
        .map((n) => n.target.join(" "))
        .join(", ")}`
  );
  expect(summary).toEqual([]);
}

const drill = makeDetail({
  type: "drill",
  slug: "give-and-go",
  title: "Give-and-Go Warmup",
  shortDescription: "A fast-paced passing warmup.",
  coachingPoints: ["Do not watch your throw."],
  commonMistakes: ["Watching the disc."],
  variations: ["Add a mark."],
  media: [
    { url: "/img/drill.png", type: "image", caption: "Setup", sortOrder: 0 },
  ],
  similar: [makeSummary({ type: "drill", title: "Break Mark Ladder" })],
});

beforeEach(() => {
  vi.clearAllMocks();
  fetchEntries.mockImplementation(async (type) => [
    makeSummary({ type, title: `Example ${type}` }),
  ]);
  fetchEntry.mockResolvedValue(drill);
  searchEntriesMock.mockResolvedValue({
    results: [
      makeSummary({ type: "drill", title: "Huck Drill" }),
      makeSummary({ type: "strategy", title: "Vertical Stack" }),
    ],
    total: 2,
    page: 1,
    pageSize: 24,
  });
});

describe("axe-core audit (mocked data renders)", () => {
  it("Home has no violations", async () => {
    const { container } = renderAt("/");
    await screen.findAllByTestId("entry-card");
    await expectNoViolations(container);
  }, 30_000);

  it("Section page has no violations", async () => {
    const { container } = renderAt("/drills");
    await screen.findAllByTestId("entry-card");
    await expectNoViolations(container);
  }, 30_000);

  it("Entry detail page has no violations", async () => {
    const { container } = renderAt("/drills/give-and-go");
    await screen.findByRole("heading", { level: 1, name: "Give-and-Go Warmup" });
    await expectNoViolations(container);
  }, 30_000);

  it("Search page has no violations", async () => {
    const { container } = renderAt("/search?q=huck");
    await screen.findByText("Huck Drill");
    await expectNoViolations(container);
  }, 30_000);
});
