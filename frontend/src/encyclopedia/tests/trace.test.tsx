// Task 42 — ≤2-clicks reachability trace, verified at the router level with a
// mocked api/client (there is no live entry data yet; content seeding is out
// of initiative scope). For every entry type: "/" → section nav link (click 1)
// → entry card (click 2) → entry detail resolves. Plus the 1-click path via a
// homepage Popular Resources card. The live manual trace against real data is
// deferred (see Reflect notes in tasks.md).

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { routes } from "../../router";
import type { EntryType } from "../types";
import { SECTIONS } from "../types";
import { makeDetail, makeSummary } from "./fixtures";

vi.mock("../api/client");

import * as client from "../api/client";

const fetchEntries = vi.mocked(client.fetchEntries);
const fetchEntry = vi.mocked(client.fetchEntry);

function AppRoutes() {
  return useRoutes(routes);
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

// One example entry per type, discoverable via its section page.
function exampleFor(type: EntryType) {
  return makeSummary({
    type,
    slug: `example-${type}`,
    title: `Example ${type} entry`,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchEntries.mockImplementation(async (type) => [exampleFor(type)]);
  fetchEntry.mockImplementation(async (type, slug) =>
    slug === `example-${type}`
      ? makeDetail({ ...exampleFor(type), body: "Only step." })
      : null
  );
});

describe("≤2-clicks reachability from /", () => {
  it.each(SECTIONS.map((s) => [s.type, s.path, s.label] as const))(
    "reaches an example %s entry from / in 2 clicks (nav → card)",
    async (type, _path, label) => {
      const user = userEvent.setup();
      renderHome();

      // Click 1: section link in the persistent header nav.
      await user.click(screen.getAllByRole("link", { name: label })[0]);
      await screen.findByRole("heading", { level: 1, name: label });

      // Click 2: the entry card in the section grid.
      await user.click(
        await screen.findByRole("link", { name: new RegExp(`Example ${type} entry`) })
      );

      // The entry detail template resolves.
      expect(
        await screen.findByRole("heading", {
          level: 1,
          name: `Example ${type} entry`,
        })
      ).toBeInTheDocument();
      expect(fetchEntry).toHaveBeenCalledWith(type, `example-${type}`);
    }
  );

  it("reaches an entry from / in 1 click via a Popular Resources card", async () => {
    const user = userEvent.setup();
    renderHome();

    const grid = await screen.findByRole("region", { name: "Popular Resources" });
    const firstCard = grid.querySelector('a[data-testid="entry-card"]');
    expect(firstCard).not.toBeNull();

    await user.click(firstCard!);

    expect(
      await screen.findByRole("heading", { level: 1, name: /Example .* entry/ })
    ).toBeInTheDocument();
  });

  it("features a cross-type sample on the homepage so every type is near the root", async () => {
    renderHome();

    const grid = await screen.findByRole("region", { name: "Popular Resources" });
    for (const section of SECTIONS) {
      expect(grid).toHaveTextContent(`Example ${section.type} entry`);
    }
  });
});
