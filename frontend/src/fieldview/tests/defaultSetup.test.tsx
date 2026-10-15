// Vertical Stack 1 is the default layout everywhere the app starts: the first
// setup in Explore, the scene the app opens on, and a new play in Build.

import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { routes } from "../../router";
import { library } from "../play/library";
import { BUILTIN_SETUPS, DEFAULT_SETUP_NAME, defaultSetup } from "../play/plays";
import { newPlay, resolve } from "../play/model";
import { yardToPixel } from "../render/coords";

function AppRoutes() {
  return useRoutes(routes);
}
const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  for (const e of library.list().slice()) library.remove(e.id);
});

describe("the default layout is Vertical Stack Flow 1", () => {
  it("is the first built-in play's opening frame", () => {
    expect(DEFAULT_SETUP_NAME).toBe("Vertical Stack Flow 1");
    expect(defaultSetup().name).toBe("Vertical Stack Flow 1");
    expect(BUILTIN_SETUPS[0].name).toBe("Vertical Stack Flow 1");
  });

  it("a new play starts from its exact positions and holder, with a play name of its own", () => {
    const play = newPlay();
    const setup = defaultSetup();
    expect(play.frames).toHaveLength(1);
    expect(resolve(play, 0)).toEqual(resolve(setup, 0));
    expect(play.name).toBe("Untitled play");
    expect(play.description).toBeUndefined();
    // A copy, not the frozen built-in itself.
    expect(Object.isFrozen(play)).toBe(false);
    expect(play.frames[0]).not.toBe(setup.frames[0]);
  });

  it("Explore opens on it", () => {
    renderAt("/fieldview/explore");
    expect(screen.getByRole("button", { name: "Choose a setup" })).toHaveTextContent("Vertical Stack Flow 1");
    const o2 = resolve(defaultSetup(), 0).positions.o2;
    const at = yardToPixel(o2);
    expect(screen.getByRole("button", { name: "Offense 2" }).getAttribute("transform")).toBe(`translate(${at.x}, ${at.y})`);
  });

  it("the site root lands on Explore with it", () => {
    renderAt("/fieldview");
    expect(screen.getByRole("button", { name: "Choose a setup" })).toHaveTextContent("Vertical Stack Flow 1");
  });

  it("Build opens a new play on it", () => {
    renderAt("/fieldview/build");
    const o2 = resolve(defaultSetup(), 0).positions.o2;
    const at = yardToPixel(o2);
    expect(screen.getByRole("button", { name: "Offense 2" }).getAttribute("transform")).toBe(`translate(${at.x}, ${at.y})`);
  });
});
