// Seo.tsx wiring tests (Partition 5, tasks 60–62): each page sets a unique
// <title> and <meta name="description">, and drill entry pages emit a
// schema.org HowTo JSON-LD block. Driven through the real route tree (Layout
// provides the HelmetProvider) with api/client mocked.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { routes } from "../../router";
import { howToJsonLd } from "../seo/Seo";
import { makeDetail } from "./fixtures";

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

function metaDescription(): string | null {
  return (
    document
      .querySelector('meta[name="description"]')
      ?.getAttribute("content") ?? null
  );
}

function jsonLdBlocks(): Record<string, unknown>[] {
  return Array.from(
    document.querySelectorAll('script[type="application/ld+json"]')
  ).map((el) => JSON.parse(el.textContent ?? "{}"));
}

const drill = makeDetail({
  type: "drill",
  slug: "give-and-go",
  title: "Give-and-Go Warmup",
  shortDescription: "A fast-paced passing warmup.",
  body: "Form two lines.\nThrow a forehand.\nSprint to the cone.",
  tags: [
    { name: "10 min", category: "duration" },
    { name: "cones", category: "equipment" },
    { name: "none", category: "equipment" },
  ],
});

beforeEach(() => {
  vi.clearAllMocks();
  fetchEntries.mockResolvedValue([]);
  fetchEntry.mockResolvedValue(drill);
});

describe("Seo wiring", () => {
  it("sets a unique title and description on entry detail pages", async () => {
    renderAt("/drills/give-and-go");
    await screen.findByRole("heading", { level: 1, name: "Give-and-Go Warmup" });

    await waitFor(() => {
      expect(document.title).toBe("Give-and-Go Warmup — Drills — Ultipedia");
    });
    expect(metaDescription()).toBe("A fast-paced passing warmup.");
  });

  it("sets per-section titles on section pages", async () => {
    renderAt("/strategies");
    await screen.findByRole("heading", { level: 1, name: "Strategies" });

    await waitFor(() => {
      expect(document.title).toBe("Strategies — Ultipedia");
    });
    expect(metaDescription()).toContain("strategies");
  });

  it("sets the homepage title and description", async () => {
    renderAt("/");
    await screen.findByRole("heading", { level: 1 });

    await waitFor(() => {
      expect(document.title).toBe(
        "The Ultimate Frisbee Encyclopedia — Ultipedia"
      );
    });
    expect(metaDescription()).toContain("encyclopedia");
  });

  it("includes the query in the search page title", async () => {
    renderAt("/search?q=zone");
    await screen.findByRole("heading", { level: 1, name: "Search" });

    await waitFor(() => {
      expect(document.title).toBe("Search: zone — Ultipedia");
    });
  });

  it("emits HowTo JSON-LD on drill entry pages", async () => {
    renderAt("/drills/give-and-go");
    await screen.findByRole("heading", { level: 1, name: "Give-and-Go Warmup" });

    await waitFor(() => {
      expect(jsonLdBlocks()).toHaveLength(1);
    });
    const howTo = jsonLdBlocks()[0];
    expect(howTo["@context"]).toBe("https://schema.org");
    expect(howTo["@type"]).toBe("HowTo");
    expect(howTo.name).toBe("Give-and-Go Warmup");
    expect(howTo.step).toEqual([
      { "@type": "HowToStep", position: 1, text: "Form two lines." },
      { "@type": "HowToStep", position: 2, text: "Throw a forehand." },
      { "@type": "HowToStep", position: 3, text: "Sprint to the cone." },
    ]);
    // duration tag → ISO-8601 totalTime; "none" equipment is skipped.
    expect(howTo.totalTime).toBe("PT10M");
    expect(howTo.supply).toEqual([{ "@type": "HowToSupply", name: "cones" }]);
  });

  it("does not emit HowTo JSON-LD on non-drill entry pages", async () => {
    fetchEntry.mockResolvedValue(
      makeDetail({ type: "strategy", slug: "vert", title: "Vertical Stack" })
    );
    renderAt("/strategies/vert");
    await screen.findByRole("heading", { level: 1, name: "Vertical Stack" });

    await waitFor(() => {
      expect(document.title).toBe("Vertical Stack — Strategies — Ultipedia");
    });
    expect(jsonLdBlocks()).toHaveLength(0);
  });
});

describe("howToJsonLd", () => {
  it("returns null for drills with no parseable steps", () => {
    expect(
      howToJsonLd(makeDetail({ type: "drill", body: "" }))
    ).toBeNull();
  });

  it("returns null for non-drill entries", () => {
    expect(
      howToJsonLd(makeDetail({ type: "skill", body: "Step one." }))
    ).toBeNull();
  });
});
