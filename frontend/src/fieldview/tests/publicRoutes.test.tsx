import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useRoutes } from "react-router-dom";
import { fieldViewOnlyRoutes } from "../../router";

function Probe() {
  const element = useRoutes(fieldViewOnlyRoutes);
  const { pathname } = useLocation();
  return (
    <>
      <output data-testid="path">{pathname}</output>
      {element}
    </>
  );
}

describe("field-view-only public routes", () => {
  it.each(["/", "/search", "/about", "/contribute/x", "/field-view", "/rules/some-entry"])(
    "redirects %s to /fieldview/explore",
    async (path) => {
      render(
        <MemoryRouter initialEntries={[path]}>
          <Probe />
        </MemoryRouter>,
      );
      expect((await screen.findByTestId("path")).textContent).toBe("/fieldview/explore");
    },
  );
});
