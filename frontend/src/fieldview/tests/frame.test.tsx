// The app frame (fieldview-ui-rework P2): routes mount the right mode, the
// canvas and driver exist exactly once, the legend and the painter share their
// stops, colour-blind mode is a persisted pref that changes both, a stale
// `on:false` from the old Space View button cannot hide the heat, and the menu
// and colour guide behave as dialogs.

import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { routes } from "../../router";
import { rampStopsFor, scoreToRgba, scoreToRgbaColourBlind } from "../space/palette";
import { CB_RAMP_STOPS, RAMP_STOPS } from "../space/constants";
import { rampGradient } from "../ui/content/Legend";

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

describe("one canvas, one stage", () => {
  it("mounts exactly one field and one heatmap canvas in Explore", () => {
    renderAt("/fieldview/explore");
    expect(screen.getAllByRole("group", { name: /ultimate field/i })).toHaveLength(1);
    expect(screen.getAllByTestId("heatmap-canvas")).toHaveLength(1);
  });

  it("mounts exactly one field in Watch", () => {
    renderAt("/fieldview/watch");
    expect(screen.getAllByRole("group", { name: /ultimate field/i })).toHaveLength(1);
  });
});

describe("frame chrome (both parts in the DOM, CSS picks one — ADR-30)", () => {
  it("renders the compact menu button, the desktop mode tabs and the site header together", () => {
    renderAt("/fieldview/explore");
    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
    const tabs = screen.getByRole("navigation", { name: "Mode" });
    expect(within(tabs).getByRole("link", { name: /watch/i })).toBeInTheDocument();
    expect(within(tabs).getByRole("link", { name: /explore/i })).toBeInTheDocument();
    expect(within(tabs).getByRole("link", { name: /build/i })).toBeInTheDocument();
    // The site header (Ultipedia wordmark) is part of the desktop frame only.
    // Exactly one banner landmark (the site header); the app bar is a plain div.
    expect(screen.getAllByRole("banner", { hidden: true })).toHaveLength(1);
  });

  it("hides the compact menu button and the site header at the desktop screen via CSS classes", () => {
    renderAt("/fieldview/explore");
    expect(screen.getByRole("button", { name: "Menu" }).className).toMatch(/desktop:hidden/);
    const siteHeaderWrap = screen.getAllByRole("banner", { hidden: true })[0].parentElement;
    expect(siteHeaderWrap?.className).toMatch(/hidden/);
    expect(siteHeaderWrap?.className).toMatch(/desktop:block/);
  });
});

describe("colour guide and legend (decision D7: the model's own terms)", () => {
  it("names the states Closed / Contested / Strong space", () => {
    renderAt("/fieldview/explore");
    fireEvent.click(screen.getByRole("button", { name: /colour guide/i }));
    const dialog = screen.getByRole("dialog", { name: /how to read the colours/i });
    expect(within(dialog).getByText("Closed")).toBeInTheDocument();
    expect(within(dialog).getByText("Contested")).toBeInTheDocument();
    expect(within(dialog).getByText("Strong space")).toBeInTheDocument();
  });

  it("closes on Escape and on the close button, and returns focus to the legend", () => {
    renderAt("/fieldview/explore");
    const legend = screen.getByRole("button", { name: /colour guide/i });
    legend.focus();
    fireEvent.click(legend);
    expect(screen.getByRole("dialog", { name: /how to read the colours/i })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /how to read the colours/i })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(legend);

    fireEvent.click(legend);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: /how to read the colours/i })).not.toBeInTheDocument();
  });

  it("draws the legend from the same stops the painter uses (ADR-32)", () => {
    // Default ramp: gradient stops === RAMP_STOPS; colour-blind: === CB_RAMP_STOPS.
    expect(rampStopsFor(false)).toBe(RAMP_STOPS);
    expect(rampStopsFor(true)).toBe(CB_RAMP_STOPS);
    for (const stop of RAMP_STOPS) expect(rampGradient(false)).toContain(stop.hex);
    for (const stop of CB_RAMP_STOPS) expect(rampGradient(true)).toContain(stop.hex);
  });

  it("the painter's two colorizers hit their ramps' end stops exactly", () => {
    const out = new Uint8ClampedArray(4);
    scoreToRgba(0, out, 0);
    expect(Array.from(out.slice(0, 3))).toEqual([0xd6, 0x4b, 0x4a]);
    scoreToRgbaColourBlind(0, out, 0);
    expect(Array.from(out.slice(0, 3))).toEqual([0xe8, 0x73, 0x1a]);
    scoreToRgbaColourBlind(1, out, 0);
    expect(Array.from(out.slice(0, 3))).toEqual([0x2f, 0x7f, 0xd6]);
  });
});

describe("colour-blind mode", () => {
  it("is off by default, switchable from the menu, and changes the legend ramp", () => {
    renderAt("/fieldview/explore");
    const ramp = () => screen.getByTestId("legend-ramp").getAttribute("style") ?? "";
    // jsdom normalises hex to rgb(); compare the two states rather than text.
    const before = ramp();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const toggle = screen.getByRole("switch", { name: /colour-blind mode/i });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    expect(screen.getByRole("switch", { name: /colour-blind mode/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(ramp()).not.toBe(before);
  });

  it("persists across a reload", () => {
    const { unmount } = renderAt("/fieldview/explore");
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("switch", { name: /colour-blind mode/i }));
    unmount();
    renderAt("/fieldview/explore");
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("switch", { name: /colour-blind mode/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});

describe("heat is always on (ADR-32)", () => {
  it("shows the heat even when the old Space View pref was stored off", () => {
    localStorage.setItem("fieldview.overlayPrefs", JSON.stringify({ on: false }));
    renderAt("/fieldview/explore");
    const canvas = screen.getByTestId("heatmap-canvas") as HTMLCanvasElement;
    expect(canvas.style.opacity).toBe("1");
  });
});

describe("menu drawer", () => {
  it("opens with modes and a way back to the site, and Escape closes it and returns focus", () => {
    renderAt("/fieldview/explore");
    const opener = screen.getByRole("button", { name: "Menu" });
    opener.focus();
    fireEvent.click(opener);
    const menu = screen.getByRole("dialog", { name: /field view menu/i });
    expect(within(menu).getByRole("link", { name: /watch/i })).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: /build/i })).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: /back to ultipedia/i })).toHaveAttribute("href", "/");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /field view menu/i })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });

  it("has no Advanced settings entry (deferred)", () => {
    renderAt("/fieldview/explore");
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.queryByText(/advanced/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/more settings/i)).not.toBeInTheDocument();
  });
});

describe("rotate notice (decision D4)", () => {
  it("is present and dismissible, so no viewport is hard-blocked", () => {
    renderAt("/fieldview/explore");
    const notice = screen.getByTestId("rotate-notice");
    expect(notice).toHaveTextContent(/rotate your phone/i);
    // Shown only for a portrait narrow viewport — a CSS-only rule.
    expect(notice.className).toMatch(/orientation:portrait/);
    fireEvent.click(screen.getByRole("button", { name: /continue anyway/i }));
    expect(screen.queryByTestId("rotate-notice")).not.toBeInTheDocument();
  });
});
