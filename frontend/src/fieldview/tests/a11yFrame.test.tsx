// axe-core audit and keyboard reachability for the new Field View frame
// (fieldview-ui-rework P5). color-contrast is off for the same reason as the
// other audits here: jsdom does not paint.

import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { routes } from "../../router";

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

beforeEach(() => {
  localStorage.clear();
});

async function expectNoViolations(container: Element) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
  expect(summary).toEqual([]);
}

describe("axe-core audit of the new frame", () => {
  for (const mode of ["explore", "watch", "build"]) {
    it(`/fieldview/${mode} has no violations`, async () => {
      const { container } = renderAt(`/fieldview/${mode}`);
      await expectNoViolations(container);
    });
  }

  it("Explore has no violations with the menu drawer open", async () => {
    const { container } = renderAt("/fieldview/explore");
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    await expectNoViolations(container);
  });

  it("Explore has no violations with the colour guide open", async () => {
    const { container } = renderAt("/fieldview/explore");
    fireEvent.click(screen.getByRole("button", { name: /colour guide/i }));
    await expectNoViolations(container);
  });

  it("Explore has no violations with the setup slide-over open", async () => {
    const { container } = renderAt("/fieldview/explore");
    fireEvent.click(screen.getByRole("button", { name: "Choose a setup" }));
    await expectNoViolations(container);
  });

  it("Watch has no violations with the play slide-over open and colour-blind mode on", async () => {
    const { container } = renderAt("/fieldview/watch");
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("switch", { name: /colour-blind mode/i }));
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Choose a play" }));
    await expectNoViolations(container);
  });
});

describe("keyboard reachability", () => {
  it("every control in the compact bar is a real focusable button or link", () => {
    renderAt("/fieldview/watch");
    for (const name of ["Menu", "Choose a play", "Previous frame", "Play", "Next frame"]) {
      const el = screen.getAllByRole("button", { name, hidden: true })[0];
      expect(el.tabIndex).toBeGreaterThanOrEqual(0);
    }
  });

  it("the desktop mode tabs are links", () => {
    renderAt("/fieldview/explore");
    const tabs = screen.getByRole("navigation", { name: "Mode" });
    expect(within(tabs).getAllByRole("link", { hidden: true })).toHaveLength(3);
  });

  it("dialogs are modal and labelled", () => {
    renderAt("/fieldview/explore");
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const dialog = screen.getByRole("dialog", { name: /field view menu/i });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });
});
