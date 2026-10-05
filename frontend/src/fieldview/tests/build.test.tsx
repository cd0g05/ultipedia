// The Build page end to end in jsdom: drag → placement → inheritance, badges,
// ghosts, one undo step per gesture, Give disc, Reset player/frame, delete, the
// preview, and the keyboard. Pointer drags use the same stubbed SVG rect as
// drag.test.tsx.

import { Profiler } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import axe from "axe-core";
import { routes } from "../../router";
import { getStageViewBox, yardToPixel } from "../render/coords";
import { FIELD_PX_HEIGHT, FIELD_PX_WIDTH } from "../render/fieldLayer";

const viewBox = getStageViewBox(FIELD_PX_WIDTH, FIELD_PX_HEIGHT);
const rAF = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

function AppRoutes() {
  return useRoutes(routes);
}

function renderBuild(wrap?: (children: React.ReactNode) => React.ReactNode) {
  const tree = (
    <MemoryRouter initialEntries={["/fieldview/build"]}>
      <AppRoutes />
    </MemoryRouter>
  );
  const out = render(<>{wrap ? wrap(tree) : tree}</>);
  const svg = screen.getByRole("group", { name: /ultimate field/i }) as unknown as SVGSVGElement;
  vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: viewBox.width,
    height: viewBox.height,
    right: viewBox.width,
    bottom: viewBox.height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return { ...out, svg };
}

function clientFor(yard: { x: number; y: number }) {
  const px = yardToPixel(yard);
  return { clientX: px.x - viewBox.x, clientY: px.y - viewBox.y };
}

const tf = (yard: { x: number; y: number }) => {
  const px = yardToPixel(yard);
  return `translate(${px.x}, ${px.y})`;
};

const piece = (name: string) => screen.getByRole("button", { name });
const transformOf = (name: string) => piece(name).getAttribute("transform");

// The compact and desktop trees are both in the DOM (the breakpoint is CSS
// only), so controls that exist in both are queried as "the first one".
const first = (name: string | RegExp) => screen.getAllByRole("button", { name })[0];
const click = (name: string | RegExp) => fireEvent.click(first(name));

// o2 (the first cutter) in the default play stands at (50, 20) — see newPlay().
async function drag(svg: SVGSVGElement, from: { x: number; y: number }, to: { x: number; y: number }, steps = 6) {
  fireEvent.pointerDown(svg, { pointerId: 1, ...clientFor(from) });
  for (let i = 1; i <= steps; i += 1) {
    fireEvent.pointerMove(svg, {
      pointerId: 1,
      ...clientFor({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }),
    });
  }
  fireEvent.pointerUp(svg, { pointerId: 1, ...clientFor(to) });
  await act(async () => {
    await rAF();
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe("Build — frames and inheritance", () => {
  it("starts with one frame, nothing to undo, and the default play", () => {
    renderBuild();
    expect(screen.getByTestId("mode-label")).toHaveTextContent("Build");
    expect(screen.getAllByTestId("frame-strip")[0].querySelectorAll("[data-frame]")).toHaveLength(1);
    expect(first("Undo")).toBeDisabled();
    expect(first("Redo")).toBeDisabled();
    expect(screen.getAllByRole("button", { name: /^Offense \d$/ })).toHaveLength(7);
  });

  it("a dragged player is placed in this frame only: badge, ghost, corner mark; frame 1 is unchanged", async () => {
    const { svg } = renderBuild();
    const home = transformOf("Offense 2");
    click("Add frame");
    expect(screen.getAllByTestId("frame-chip")[0]).toHaveTextContent("2 / 2");

    await drag(svg, { x: 50, y: 20 }, { x: 60, y: 8 });
    expect(transformOf("Offense 2")).toBe(tf({ x: 60, y: 8 }));
    expect(screen.getAllByTestId("frame-badge")[0]).toHaveTextContent("1 placed");
    expect(screen.getByTestId("ghosts").querySelector('[data-ghost-for="o2"]')).not.toBeNull();
    expect(within(piece("Offense 2")).getByTestId("placed-mark")).toBeInTheDocument();
    expect(screen.getAllByTestId("placed-mark")).toHaveLength(1);

    click("Frame 1");
    await act(async () => {
      await rAF();
    });
    expect(transformOf("Offense 2")).toBe(home);
    expect(screen.queryByTestId("ghosts")).toBeNull(); // frame 1 changes nothing
  });

  it("editing an earlier frame moves everyone who inherits; a player placed later keeps their spot", async () => {
    const { svg } = renderBuild();
    click("Add frame");
    await drag(svg, { x: 50, y: 20 }, { x: 60, y: 8 }); // o2 placed in frame 2
    click("Frame 1");
    await act(async () => {
      await rAF();
    });
    // o3 (52, 20) is not placed in frame 2: moving it in frame 1 carries to frame 2.
    await drag(svg, { x: 52, y: 20 }, { x: 52, y: 33 });
    click("Frame 2");
    await act(async () => {
      await rAF();
    });
    expect(transformOf("Offense 3")).toBe(tf({ x: 52, y: 33 }));
    expect(transformOf("Offense 2")).toBe(tf({ x: 60, y: 8 }));
  });

  it("a whole drag is one undo step; redo brings it back", async () => {
    const { svg } = renderBuild();
    const home = transformOf("Offense 2");
    await drag(svg, { x: 50, y: 20 }, { x: 70, y: 30 }, 12);
    expect(transformOf("Offense 2")).toBe(tf({ x: 70, y: 30 }));
    click("Undo");
    await act(async () => {
      await rAF();
    });
    expect(transformOf("Offense 2")).toBe(home);
    expect(first("Undo")).toBeDisabled();
    click("Redo");
    await act(async () => {
      await rAF();
    });
    expect(transformOf("Offense 2")).toBe(tf({ x: 70, y: 30 }));
  });

  it("a tap that selects without travelling places nothing", async () => {
    const { svg } = renderBuild();
    fireEvent.pointerDown(svg, { pointerId: 2, ...clientFor({ x: 50, y: 20 }) });
    fireEvent.pointerUp(svg, { pointerId: 2, ...clientFor({ x: 50, y: 20 }) });
    expect(first("Undo")).toBeDisabled();
  });

  it("Duplicate adds an identical frame; Delete removes the current one; Reset frame clears its changes", async () => {
    const { svg } = renderBuild();
    click("Add frame");
    await drag(svg, { x: 50, y: 20 }, { x: 60, y: 8 });
    expect(screen.getAllByTestId("frame-badge")[0]).toHaveTextContent("1 placed");

    click("Reset frame");
    await act(async () => {
      await rAF();
    });
    expect(screen.queryAllByTestId("frame-badge")).toHaveLength(0);
    expect(transformOf("Offense 2")).toBe(tf({ x: 50, y: 20 }));

    click("Duplicate");
    expect(screen.getAllByTestId("frame-strip")[0].querySelectorAll("[data-frame]")).toHaveLength(3);
    click("Delete");
    expect(screen.getAllByTestId("frame-strip")[0].querySelectorAll("[data-frame]")).toHaveLength(2);
    click("Undo");
    expect(screen.getAllByTestId("frame-strip")[0].querySelectorAll("[data-frame]")).toHaveLength(3);
  });
});

describe("Build — the disc, titles and the selected player", () => {
  async function select(svg: SVGSVGElement, at: { x: number; y: number }) {
    fireEvent.pointerDown(svg, { pointerId: 3, ...clientFor(at) });
    fireEvent.pointerUp(svg, { pointerId: 3, ...clientFor(at) });
    await act(async () => {
      await rAF();
    });
  }

  it("shows a hint until a player is selected", () => {
    renderBuild();
    expect(screen.getAllByTestId("build-player")[0]).toHaveTextContent(/select a player/i);
  });

  it("Give disc in a later frame puts the holder ring on the new player and badges the frame", async () => {
    const { svg } = renderBuild();
    click("Add frame");
    await select(svg, { x: 50, y: 20 });
    expect(screen.getAllByTestId("build-player")[0]).toHaveTextContent("Offense 2");
    click("Give disc");
    await act(async () => {
      await rAF();
    });
    expect(piece("Offense 2")).toHaveAttribute("aria-description", "Has the disc");
    expect(screen.getAllByTestId("frame-badge")[0]).toHaveTextContent("disc");
    click("Frame 1");
    await act(async () => {
      await rAF();
    });
    expect(piece("Offense 1")).toHaveAttribute("aria-description", "Has the disc");
  });

  it("Give disc is disabled for a defender", async () => {
    const { svg } = renderBuild();
    await select(svg, { x: 54, y: 30 }); // Defense 4, on its own
    const card = screen.getAllByTestId("build-player")[0];
    expect(card).toHaveTextContent(/defense/i);
    expect(within(card).getByRole("button", { name: /give disc/i })).toBeDisabled();
  });

  it("a title is typed once, shows on the piece, and is the same in every frame", async () => {
    const { svg } = renderBuild();
    click("Add frame");
    await select(svg, { x: 50, y: 20 });
    const input = within(screen.getAllByTestId("build-player")[0]).getByRole("textbox", { name: "Player title" });
    fireEvent.change(input, { target: { value: "hk" } });
    await act(async () => {
      await rAF();
    });
    expect(piece("Offense 2").querySelector(".fv-piece-title")!.textContent).toBe("HK");
    click("Frame 1");
    await act(async () => {
      await rAF();
    });
    expect(piece("Offense 2").querySelector(".fv-piece-title")!.textContent).toBe("HK");
  });

  it("Reset player puts one player back to inheriting", async () => {
    const { svg } = renderBuild();
    click("Add frame");
    await drag(svg, { x: 50, y: 20 }, { x: 60, y: 8 });
    await select(svg, { x: 60, y: 8 });
    expect(screen.getAllByTestId("build-player")[0]).toHaveTextContent(/placed in this frame/i);
    click("Reset player");
    await act(async () => {
      await rAF();
    });
    expect(transformOf("Offense 2")).toBe(tf({ x: 50, y: 20 }));
    expect(screen.queryAllByTestId("frame-badge")).toHaveLength(0);
  });
});

describe("Build — preview and keyboard", () => {
  it("Preview plays the frames with editing disabled and returns to the edited frame", async () => {
    const { svg } = renderBuild();
    click("Add frame");
    await drag(svg, { x: 50, y: 20 }, { x: 60, y: 8 });
    click("Frame 1");
    await act(async () => {
      await rAF();
    });
    click("Preview");
    expect(first("Stop")).toBeInTheDocument();
    // Editing is off: the strip and cards are inert, the field is disabled.
    expect(screen.getAllByTestId("frame-strip")[0].closest("[inert]")).not.toBeNull();
    expect(piece("Offense 2")).toHaveAttribute("aria-disabled", "true");
    click("Stop");
    expect(screen.queryAllByRole("button", { name: "Stop" })).toHaveLength(0);
    expect(piece("Offense 2")).not.toHaveAttribute("aria-disabled", "true");
    // Back on the frame being edited.
    await act(async () => {
      await rAF();
    });
    expect(transformOf("Offense 2")).toBe(tf({ x: 50, y: 20 }));
  });

  it("Ctrl/⌘-Z undoes and Shift-Ctrl/⌘-Z redoes, but not while typing in a field", async () => {
    const { svg } = renderBuild();
    await drag(svg, { x: 50, y: 20 }, { x: 70, y: 30 });
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    await act(async () => {
      await rAF();
    });
    expect(transformOf("Offense 2")).toBe(tf({ x: 50, y: 20 }));
    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    await act(async () => {
      await rAF();
    });
    expect(transformOf("Offense 2")).toBe(tf({ x: 70, y: 30 }));

    const name = screen.getAllByRole("textbox", { name: "Name" })[0];
    name.focus();
    fireEvent.keyDown(name, { key: "z", ctrlKey: true, bubbles: true });
    expect(transformOf("Offense 2")).toBe(tf({ x: 70, y: 30 }));
  });

  it("the frame strip: arrow keys move between frames, Delete removes the focused one", async () => {
    renderBuild();
    click("Add frame");
    click("Add frame");
    const strip = screen.getAllByTestId("frame-strip")[0];
    const frames = () => strip.querySelectorAll<HTMLElement>("[data-frame]");
    expect(frames()).toHaveLength(3);
    frames()[2].focus();
    fireEvent.keyDown(frames()[2], { key: "ArrowLeft" });
    expect(screen.getAllByTestId("frame-chip")[0]).toHaveTextContent("2 / 3");
    fireEvent.keyDown(document.activeElement!, { key: "Delete" });
    expect(frames()).toHaveLength(2);
  });
});

describe("Build — React stays out of the drag path (ADR-2)", () => {
  it("commits nothing across the pointer moves of a drag; only the end of the gesture commits", async () => {
    let commits = 0;
    const { svg } = renderBuild((tree) => (
      <Profiler id="build" onRender={() => (commits += 1)}>
        {tree}
      </Profiler>
    ));
    click("Add frame");
    await act(async () => {
      await rAF();
    });

    fireEvent.pointerDown(svg, { pointerId: 9, ...clientFor({ x: 50, y: 20 }) });
    commits = 0; // the press selects (one legitimate commit); count only the moves
    for (let i = 1; i <= 30; i += 1) {
      fireEvent.pointerMove(svg, { pointerId: 9, ...clientFor({ x: 50 + i * 0.5, y: 20 - i * 0.2 }) });
    }
    expect(commits).toBe(0);
    await act(async () => {
      await rAF();
    });
    expect(commits).toBe(0);
    fireEvent.pointerUp(svg, { pointerId: 9, ...clientFor({ x: 65, y: 14 }) });
    expect(commits).toBeGreaterThan(0); // the placement is one discrete commit
  });
});

describe("Build — accessibility", () => {
  async function violations(container: Element) {
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  }

  it("has no axe violations: a fresh play, a multi-frame play with a selection, and during a preview", async () => {
    const { container, svg } = renderBuild();
    expect(await violations(container)).toEqual([]);

    click("Add frame");
    click("Add frame");
    await drag(svg, { x: 50, y: 20 }, { x: 60, y: 8 });
    fireEvent.pointerDown(svg, { pointerId: 4, ...clientFor({ x: 60, y: 8 }) });
    fireEvent.pointerUp(svg, { pointerId: 4, ...clientFor({ x: 60, y: 8 }) });
    await act(async () => {
      await rAF();
    });
    click("Give disc");
    expect(await violations(container)).toEqual([]);

    click("Frame 1");
    click("Preview");
    expect(await violations(container)).toEqual([]);
    click("Stop");
  });

  it("every control is reachable and named: strip frames, add, actions, undo/redo, player controls", () => {
    renderBuild();
    for (const name of ["Frame 1", "Add frame", "Duplicate", "Delete", "Reset frame", "Undo", "Redo", "Preview"]) {
      expect(first(name)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("textbox", { name: "Label" })[0]).toBeInTheDocument();
  });
});
