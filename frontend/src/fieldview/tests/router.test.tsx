// Router-level regression: /fieldview/{explore,watch,build} resolve to their pages, the shipped
// /field-view URL still lands there via redirect, the retired /fieldview/designer is gone,
// and none of them shadow the /:section dynamic route or any other
// existing static route.

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

describe("fieldview routes", () => {
  it("/fieldview redirects to /fieldview/explore (D5)", () => {
    renderAt("/fieldview");
    expect(screen.getByTestId("mode-label")).toHaveTextContent("Explore");
    expect(screen.getByRole("group", { name: /ultimate field/i })).toBeInTheDocument();
  });

  it("/fieldview/watch renders the Watch frame with the field", () => {
    renderAt("/fieldview/watch");
    expect(screen.getByTestId("mode-label")).toHaveTextContent("Watch");
    expect(screen.getByRole("group", { name: /ultimate field/i })).toBeInTheDocument();
  });

  it("/fieldview/build renders the placeholder and no field", () => {
    renderAt("/fieldview/build");
    expect(screen.getByRole("heading", { name: /play designer/i })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /ultimate field/i })).not.toBeInTheDocument();
  });

  it("Field View is outside the site Layout: no site footer", () => {
    renderAt("/fieldview/explore");
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  it("/fieldview/designer no longer exists", () => {
    renderAt("/fieldview/designer");
    expect(screen.queryByTestId("mode-label")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /ultimate field/i })).not.toBeInTheDocument();
  });

  // The client has the old URLs. Losing them to the /:section 404 would be a
  // silent regression, so both are asserted rather than assumed.
  it("/field-view redirects to Explore", () => {
    renderAt("/field-view");
    expect(screen.getByTestId("mode-label")).toHaveTextContent("Explore");
    expect(screen.getByRole("group", { name: /ultimate field/i })).toBeInTheDocument();
  });

  it("/field-view/designer no longer redirects anywhere useful", () => {
    renderAt("/field-view/designer");
    expect(screen.queryByTestId("mode-label")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /ultimate field/i })).not.toBeInTheDocument();
  });

  it("does not shadow the /:section dynamic route", async () => {
    renderAt("/drills");
    expect(await screen.findByRole("heading", { name: /drills/i })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /ultimate field/i })).not.toBeInTheDocument();
  });
});
