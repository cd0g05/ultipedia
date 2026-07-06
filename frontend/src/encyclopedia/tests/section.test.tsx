// Section.tsx component tests — one Template Method component parameterized
// by the :section route param. api/client.ts is mocked (intake convention:
// mock at the client boundary).

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { routes } from "../../router";
import { SECTIONS } from "../types";
import { makeSummary } from "./fixtures";

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

beforeEach(() => {
  vi.clearAllMocks();
  fetchEntries.mockResolvedValue([]);
  fetchEntry.mockResolvedValue(null);
});

describe("Section", () => {
  it("renders a card grid of entries for the section's type", async () => {
    fetchEntries.mockResolvedValue([
      makeSummary({ type: "drill", title: "Give-and-Go Warmup" }),
      makeSummary({ type: "drill", title: "Break Mark Ladder" }),
    ]);

    renderAt("/drills");

    expect(
      await screen.findByRole("link", { name: /Give-and-Go Warmup/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Break Mark Ladder/ })
    ).toBeInTheDocument();
    expect(fetchEntries).toHaveBeenCalledWith("drill");
  });

  it.each(SECTIONS.map((s) => [s.path, s.type, s.label] as const))(
    "parameterizes /%s by type %s (Template Method — one component, five sections)",
    async (path, type, label) => {
      renderAt(`/${path}`);

      expect(
        await screen.findByRole("heading", { level: 1, name: label })
      ).toBeInTheDocument();
      expect(fetchEntries).toHaveBeenCalledWith(type);
    }
  );

  it("renders breadcrumbs Home / {Section}", async () => {
    renderAt("/strategies");

    const breadcrumbs = await screen.findByRole("navigation", {
      name: "Breadcrumb",
    });
    expect(breadcrumbs).toHaveTextContent("Home");
    expect(breadcrumbs).toHaveTextContent("Strategies");
  });

  it("shows the section empty state when nothing is published", async () => {
    fetchEntries.mockResolvedValue([]);

    renderAt("/plays");

    expect(
      await screen.findByText("Nothing published in Plays yet — check back soon")
    ).toBeInTheDocument();
  });

  it("shows an inline error message when the fetch fails", async () => {
    fetchEntries.mockRejectedValue(new client.ApiError("boom", 500));

    renderAt("/skills");

    expect(
      await screen.findByText("Something went wrong loading results")
    ).toBeInTheDocument();
  });

  it("renders the 404 page for an unknown section segment", async () => {
    renderAt("/not-a-section");

    expect(
      await screen.findByRole("heading", { name: /couldn't find that entry/i })
    ).toBeInTheDocument();
    expect(fetchEntries).not.toHaveBeenCalled();
  });

  it("links each card to /{section}/{slug}", async () => {
    fetchEntries.mockResolvedValue([
      makeSummary({
        type: "formation",
        title: "Horizontal Stack",
        slug: "horizontal-stack",
      }),
    ]);

    renderAt("/formations");

    expect(
      await screen.findByRole("link", { name: /Horizontal Stack/ })
    ).toHaveAttribute("href", "/formations/horizontal-stack");
  });
});
