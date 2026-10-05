// The axe pass for what fieldview-build added (the frame's own pass is in
// a11yFrame.test.tsx): the Build menu with the library, Watch with a shared link
// and with a bad one, Explore with a saved setup, and keyboard dismissal.
// color-contrast is off, as in the other audits: jsdom does not paint.

import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { routes } from "../../router";
import { library } from "../play/library";
import { BUILTIN_PLAYS, BUILTIN_SETUPS } from "../play/plays";
import { encodePlay } from "../play/share";

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
async function violations(container: Element) {
  const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  return results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

beforeEach(() => {
  localStorage.clear();
  for (const e of library.list().slice()) library.remove(e.id);
});

describe("axe — Build", () => {
  it("the compact menu with the play and the library open", async () => {
    library.save("a", { ...BUILTIN_PLAYS[0], name: "Saved one" });
    const { container } = renderAt("/fieldview/build/a");
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(await violations(container)).toEqual([]);
  });

  it("an empty library", async () => {
    const { container } = renderAt("/fieldview/build");
    expect(await violations(container)).toEqual([]);
  });

  it("the menu closes with Escape", () => {
    renderAt("/fieldview/build");
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("axe — Watch with links", () => {
  it("a shared play with its banner", async () => {
    const { container } = renderAt(`/fieldview/watch#p=${encodePlay({ ...BUILTIN_PLAYS[0], name: "From a friend" })}`);
    expect(await violations(container)).toEqual([]);
  });

  it("an invalid link", async () => {
    const { container } = renderAt("/fieldview/watch#p=not-a-play");
    expect(await violations(container)).toEqual([]);
  });

  it("the play list with library plays", async () => {
    library.save("m", { ...BUILTIN_PLAYS[1], name: "Mine" });
    const { container } = renderAt("/fieldview/watch");
    expect(await violations(container)).toEqual([]);
  });
});

describe("axe — Explore with a saved setup", () => {
  it("has no violations", async () => {
    library.save("s", { ...BUILTIN_SETUPS[0], name: "Mine" });
    const { container } = renderAt("/fieldview/explore");
    expect(await violations(container)).toEqual([]);
  });
});
