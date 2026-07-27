// Router-level regression: /field-view and /field-view/designer resolve to
// their shells, and adding them does not shadow the /:section dynamic route
// or any other existing static route.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { routes } from "../../router";

vi.mock("../../encyclopedia/api/client");

import * as client from "../../encyclopedia/api/client";

vi.mocked(client.fetchEntries).mockResolvedValue([]);

function AppRoutes() {
  return useRoutes(routes);
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("field-view routes", () => {
  it("/field-view renders the Whiteboard shell", () => {
    renderAt("/field-view");
    // Exact: the sub-768px notice carries its own h1, and only one of the
    // two is ever displayed.
    expect(screen.getByRole("heading", { name: "Field View" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /ultimate field/i })).toBeInTheDocument();
  });

  it("/field-view/designer renders the Designer shell", () => {
    renderAt("/field-view/designer");
    expect(screen.getByRole("heading", { name: /field view.*designer/i })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /ultimate field/i })).toBeInTheDocument();
  });

  it("does not shadow the /:section dynamic route", async () => {
    renderAt("/drills");
    expect(await screen.findByRole("heading", { name: /drills/i })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /ultimate field/i })).not.toBeInTheDocument();
  });
});
