// Watch (fieldview-ui-rework P4) through the real routes: transport, dots,
// filmstrip, play list, trails, read-only field, and ADR-2 during playback.

import { Profiler } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { routes } from "../../router";
import { BUILTIN_PLAYS } from "../play/plays";

function AppRoutes() {
  return useRoutes(routes);
}

function renderWatch() {
  return render(
    <MemoryRouter initialEntries={["/fieldview/watch"]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

const first = BUILTIN_PLAYS[0];
const sidebar = () => screen.getByRole("complementary", { name: "Sidebar", hidden: true });
// Both transports exist (compact bar, desktop dock); CSS shows one.
const counters = () => screen.getAllByTestId("frame-counter");

beforeEach(() => {
  localStorage.clear();
});

describe("transport and progress", () => {
  it("opens on frame 1 of the first play", () => {
    renderWatch();
    expect(screen.getByTestId("mode-label")).toHaveTextContent("Watch");
    expect(counters()[0]).toHaveTextContent(`1 / ${first.keyframes.length}`);
    expect(screen.getByRole("button", { name: "Choose a play" })).toHaveTextContent(first.name);
  });

  it("Previous is disabled on the first frame; Next steps and updates the dots at once", () => {
    renderWatch();
    for (const prev of screen.getAllByRole("button", { name: "Previous frame", hidden: true })) {
      expect(prev).toBeDisabled();
    }
    fireEvent.click(screen.getAllByRole("button", { name: "Next frame", hidden: true })[0]);
    expect(counters()[0]).toHaveTextContent(`2 / ${first.keyframes.length}`);
    const dots = within(screen.getAllByRole("list", { name: "Frames", hidden: true })[0]).getAllByRole("button", {
      hidden: true,
    });
    expect(dots).toHaveLength(first.keyframes.length);
    expect(dots[1]).toHaveAttribute("aria-current", "step");
  });

  it("a dot jumps straight to its frame", () => {
    renderWatch();
    fireEvent.click(screen.getAllByRole("button", { name: "Go to frame 4", hidden: true })[0]);
    expect(counters()[0]).toHaveTextContent(`4 / ${first.keyframes.length}`);
  });

  it("Play toggles to Pause and back", () => {
    renderWatch();
    const play = screen.getAllByRole("button", { name: "Play", hidden: true })[0];
    fireEvent.click(play);
    expect(screen.getAllByRole("button", { name: "Pause", hidden: true })[0]).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Pause", hidden: true })[0]);
    expect(screen.getAllByRole("button", { name: "Play", hidden: true })[0]).toBeInTheDocument();
  });
});

describe("filmstrip (desktop)", () => {
  it("shows one button per frame, four across, scrolling sideways", () => {
    renderWatch();
    const strip = screen.getByTestId("filmstrip");
    expect(strip.className).toMatch(/overflow-x-auto/);
    const frames = within(strip).getAllByRole("button", { hidden: true });
    expect(frames).toHaveLength(first.keyframes.length);
    expect(first.keyframes.length).toBeGreaterThan(4); // so there is something to scroll to
    // Four across: a quarter of the strip less three 1rem gaps (jsdom may
    // normalise the calc() spelling, so match its parts).
    for (const f of frames) {
      const flex = (f as HTMLElement).style.flex;
      expect(flex).toMatch(/^0 0 calc\(/);
      expect(flex).toContain("3rem");
      expect(flex).toMatch(/0\.25|\/ 4/);
    }
    expect(frames[0]).toHaveAccessibleName(/frame 1: set/i);
  });

  it("clicking a frame jumps to it and marks it current", () => {
    renderWatch();
    const strip = screen.getByTestId("filmstrip");
    fireEvent.click(within(strip).getByRole("button", { name: /frame 3/i, hidden: true }));
    expect(counters()[0]).toHaveTextContent(`3 / ${first.keyframes.length}`);
    expect(within(strip).getByRole("button", { name: /frame 3/i, hidden: true })).toHaveAttribute(
      "aria-current",
      "step",
    );
  });
});

describe("play list", () => {
  it("lists every play, five rows showing and the rest scrolling", () => {
    renderWatch();
    const list = within(sidebar()).getByTestId("play-list");
    for (const p of BUILTIN_PLAYS) expect(within(list).getByText(p.name)).toBeInTheDocument();
    const rows = within(list).getAllByRole("button", { hidden: true });
    const rowPx = Number.parseInt((rows[0] as HTMLElement).style.height, 10);
    expect(Number.parseInt((list as HTMLElement).style.maxHeight, 10)).toBe(rowPx * 5);
    expect(BUILTIN_PLAYS.length).toBeGreaterThan(5);
  });

  it("picking a play from the sidebar loads it at frame 1", () => {
    renderWatch();
    fireEvent.click(screen.getAllByRole("button", { name: "Next frame", hidden: true })[0]);
    const second = BUILTIN_PLAYS[1];
    fireEvent.click(
      within(within(sidebar()).getByTestId("play-list")).getByRole("button", { name: new RegExp(second.name, "i"), hidden: true }),
    );
    expect(counters()[0]).toHaveTextContent(`1 / ${second.keyframes.length}`);
    expect(screen.getByRole("button", { name: "Choose a play" })).toHaveTextContent(second.name);
  });

  it("the compact play selector opens a slide-over and Escape closes it", () => {
    renderWatch();
    fireEvent.click(screen.getByRole("button", { name: "Choose a play" }));
    const dialog = screen.getByRole("dialog", { name: "Plays" });
    fireEvent.click(within(dialog).getByRole("button", { name: new RegExp(BUILTIN_PLAYS[2].name, "i") }));
    expect(screen.queryByRole("dialog", { name: "Plays" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose a play" })).toHaveTextContent(BUILTIN_PLAYS[2].name);
    fireEvent.click(screen.getByRole("button", { name: "Choose a play" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Plays" })).not.toBeInTheDocument();
  });
});

describe("playback options", () => {
  it("speed is a pressed-state group; Loop and trails are switches", () => {
    renderWatch();
    const speed = within(sidebar()).getByRole("group", { name: "Speed", hidden: true });
    const buttons = within(speed).getAllByRole("button", { hidden: true });
    expect(buttons.map((b) => b.textContent)).toEqual(["0.5×", "1×", "2×"]);
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(buttons[2]);
    expect(buttons[2]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "false");

    const loop = within(sidebar()).getByRole("switch", { name: /loop/i, hidden: true });
    expect(loop).toHaveAttribute("aria-checked", "false");
    fireEvent.click(loop);
    expect(loop).toHaveAttribute("aria-checked", "true");
  });

  it("trails show for the moves into the current frame, and the switch hides them", () => {
    renderWatch();
    expect(screen.queryByTestId("trails")).not.toBeInTheDocument(); // frame 1: nothing led here
    fireEvent.click(screen.getAllByRole("button", { name: "Next frame", hidden: true })[0]);
    expect(screen.getByTestId("trails")).toBeInTheDocument();
    fireEvent.click(within(sidebar()).getByRole("switch", { name: /show trails/i, hidden: true }));
    expect(screen.queryByTestId("trails")).not.toBeInTheDocument();
  });

  it("has the options in the compact menu too", () => {
    renderWatch();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const menu = screen.getByRole("dialog", { name: /field view menu/i });
    expect(within(menu).getByRole("switch", { name: /loop/i })).toBeInTheDocument();
  });
});

describe("Watch is read-only", () => {
  it("disables every piece", () => {
    renderWatch();
    const piece = screen.getByRole("button", { name: "offense cutter 1" });
    expect(piece).toHaveAttribute("aria-disabled", "true");
  });

  it("a nudge key cannot move a piece", () => {
    renderWatch();
    const piece = screen.getByRole("button", { name: "offense cutter 1" });
    const before = piece.getAttribute("transform");
    fireEvent.keyDown(piece, { key: "ArrowRight" });
    expect(piece.getAttribute("transform")).toBe(before);
  });
});

describe("ADR-2: playback keeps React out of the animation frame", () => {
  it("commits zero React renders while a transition animates", async () => {
    let commits = 0;
    render(
      <MemoryRouter initialEntries={["/fieldview/watch"]}>
        <Profiler id="watch" onRender={() => (commits += 1)}>
          <AppRoutes />
        </Profiler>
      </MemoryRouter>,
    );
    const cutterBefore = screen.getByRole("button", { name: "offense cutter 1" }).getAttribute("transform");
    fireEvent.click(screen.getAllByRole("button", { name: "Next frame", hidden: true })[0]); // one structural commit
    commits = 0;
    // ~25 real animation frames, well inside the 1.2 s transition.
    await new Promise((resolve) => setTimeout(resolve, 400));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "offense cutter 1" }).getAttribute("transform")).not.toBe(cutterBefore),
    );
    expect(commits).toBe(0);
  });
});
