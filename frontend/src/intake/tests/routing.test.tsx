// Regression tests for the route relocation: the intake app now lives at
// /contribute/* and the root serves the placeholder encyclopedia shell.
// Uses MemoryRouter + useRoutes over the same exported `routes` tree that
// production mounts via createBrowserRouter in router.tsx.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { routes } from "../../router";

function AppRoutes() {
  return useRoutes(routes);
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

beforeEach(() => {
  // Analytics/queue calls hit fetch — stub to a harmless 204.
  vi.stubGlobal("fetch", vi.fn(async () => ({ status: 204, json: async () => ({}) }) as Response));
  // jsdom doesn't implement scrollTo; framer-motion touches it during unmount animations.
  vi.stubGlobal("scrollTo", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("routing", () => {
  it("renders the intake flow's first screen at /contribute", () => {
    renderAt("/contribute");

    // The tutorial is the intake app's entry screen.
    expect(screen.getByRole("button", { name: "Begin" })).toBeInTheDocument();
  });

  it("renders the placeholder encyclopedia shell at /", () => {
    renderAt("/");

    expect(screen.getByRole("heading", { name: "Ulti-pedia" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Share a drill or strategy" })
    ).toHaveAttribute("href", "/contribute");
  });

  it("navigates from the root placeholder into the intake flow", async () => {
    const user = userEvent.setup();
    renderAt("/");

    await user.click(screen.getByRole("link", { name: "Share a drill or strategy" }));

    expect(screen.getByRole("button", { name: "Begin" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ulti-pedia" })).not.toBeInTheDocument();
  });

  it("restores a persisted draft when loading /contribute directly (refresh survival)", () => {
    // Simulate a previously autosaved draft, then a hard load at /contribute.
    localStorage.setItem(
      "ulti.draft.v1",
      JSON.stringify({
        type: "drill",
        fields: { name: "Endzone reps" },
        raw_freeform: "",
      })
    );

    renderAt("/contribute");

    // The intake app skips the tutorial and restores straight into the form.
    expect(screen.getByRole("heading", { name: "Drill" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Endzone reps")).toBeInTheDocument();
  });
});
