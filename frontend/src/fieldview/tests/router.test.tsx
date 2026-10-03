// Router-level regression: /fieldview/{explore,watch,build} and the unlinked
// /fieldview/designer resolve to their pages, the shipped /field-view URLs still land there via redirect,
// and none of the four shadow the /:section dynamic route or any other
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

  it("/fieldview/designer renders the Designer shell", () => {
    renderAt("/fieldview/designer");
    expect(screen.getByRole("heading", { name: /field view.*designer/i })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /ultimate field/i })).toBeInTheDocument();
  });

  // The client has the old URLs. Losing them to the /:section 404 would be a
  // silent regression, so both are asserted rather than assumed.
  it("/field-view redirects to Explore", () => {
    renderAt("/field-view");
    expect(screen.getByTestId("mode-label")).toHaveTextContent("Explore");
    expect(screen.getByRole("group", { name: /ultimate field/i })).toBeInTheDocument();
  });

  it("/field-view/designer redirects to the Designer", () => {
    renderAt("/field-view/designer");
    expect(screen.getByRole("heading", { name: /field view.*designer/i })).toBeInTheDocument();
  });

  it("does not shadow the /:section dynamic route", async () => {
    renderAt("/drills");
    expect(await screen.findByRole("heading", { name: /drills/i })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /ultimate field/i })).not.toBeInTheDocument();
  });
});
