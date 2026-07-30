// Mode 3 integration: the rail, tuning, readout, the live-repaint
// invariants (§8.5 / FR-2.1), the frame budget (§8.9), and the ADR-2
// guarantee that React never enters the drag path.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Profiler } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Whiteboard } from "../pages/Whiteboard";
import { Designer } from "../pages/Designer";
import { createHeatmapPainter } from "../render/heatmap";
import { getStageViewBox } from "../render/coords";
import { FIELD_PX_HEIGHT, FIELD_PX_WIDTH } from "../render/fieldLayer";
import { computeGrid } from "../space/score";
import { ALL_LAYERS, DEFAULT_PARAMS, GRID_STEP } from "../space/constants";
import { getPreset } from "../scene/presets";
import { FIELD } from "../scene/field";
import { DEFAULT_PREFS, parsePrefs } from "../ui/prefs";

const viewBox = getStageViewBox(FIELD_PX_WIDTH, FIELD_PX_HEIGHT);

// Set by `npm run test:perf` — see the §8.9 block below.
const PERF_RUN = process.env.PERF === "1";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

function renderWhiteboard() {
  return render(
    <MemoryRouter>
      <Whiteboard />
    </MemoryRouter>,
  );
}

function turnOverlayOn() {
  fireEvent.click(screen.getByRole("button", { name: "Space" }));
}

// The lens, the layer flags, and the six sliders all live behind one
// disclosure now — reaching any of them means opening it first.
function openAdvanced() {
  fireEvent.click(screen.getByRole("button", { name: /Advanced settings/ }));
}

function lensCheckbox() {
  return screen.getByRole("checkbox", { name: /Include offense in space calculations/ });
}

// The SVG has no layout in jsdom; give it the stage's real aspect so
// clientToYard produces meaningful field coordinates.
function stubStageRect() {
  return vi.spyOn(SVGSVGElement.prototype, "getBoundingClientRect").mockReturnValue({
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
}

// Where to press to grab a given piece. Grabbing is nearest-within-radius
// (render/pick.ts), so a drag has to start near the piece — pressing on the
// element is not, by itself, a grab.
function grabPointFor(piece: Element) {
  const match = piece.getAttribute("transform")!.match(/translate\(([-\d.]+), ([-\d.]+)\)/)!;
  return { clientX: Number(match[1]) - viewBox.x, clientY: Number(match[2]) - viewBox.y };
}

describe("overlay rail", () => {
  it("shows only the visibility toggles and the Space button until the overlay is on", () => {
    renderWhiteboard();
    expect(screen.getByRole("button", { name: "Space" })).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.queryByRole("checkbox", { name: /Include offense in space calculations/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Coverage" })).not.toBeInTheDocument();
    expect(screen.queryByText("Closed")).not.toBeInTheDocument();

    // ...but the two show/hide checkboxes are diagram controls, not overlay
    // controls, so they are reachable with the map off.
    expect(screen.getByRole("checkbox", { name: "Offense" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Defense" })).toBeChecked();
  });

  it("reveals the legend and a collapsed Advanced settings when toggled on", () => {
    renderWhiteboard();
    turnOverlayOn();

    expect(screen.getByRole("button", { name: "Space" })).toHaveAttribute("aria-pressed", "true");

    // Three-swatch legend, meaning carried by words not hue — and by the same
    // words the readout uses, so "contested" means one thing in this UI.
    expect(screen.getByText("Closed")).toBeInTheDocument();
    expect(screen.getByText("Contested")).toBeInTheDocument();
    expect(screen.getByText("Strong space")).toBeInTheDocument();

    // The model's settings are stowed by default; the map is the product.
    expect(screen.getByRole("button", { name: /Advanced settings/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("checkbox", { name: "Coverage" })).not.toBeInTheDocument();

    openAdvanced();
    expect(lensCheckbox()).toBeChecked();
    expect(screen.getByText("Counts whether a cutter could get there first.")).toBeInTheDocument();
    for (const layer of ["Mark / force", "Coverage", "Throwing lanes", "Field value"]) {
      expect(screen.getByRole("checkbox", { name: layer })).toBeChecked();
    }
  });

  it("switches the lens", () => {
    renderWhiteboard();
    turnOverlayOn();
    openAdvanced();
    fireEvent.click(lensCheckbox());
    expect(lensCheckbox()).not.toBeChecked();
    expect(screen.getByText("Ignores the cutters — pure defensive shape.")).toBeInTheDocument();
  });

  it("toggles a layer off", () => {
    renderWhiteboard();
    turnOverlayOn();
    openAdvanced();
    fireEvent.click(screen.getByRole("checkbox", { name: "Coverage" }));
    expect(screen.getByRole("checkbox", { name: "Coverage" })).not.toBeChecked();
  });
});

describe("team visibility", () => {
  it("hides a team's pieces from the diagram without touching the model", () => {
    renderWhiteboard();
    expect(screen.getByRole("button", { name: "defense mark M" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Defense" }));

    expect(screen.queryByRole("button", { name: "defense mark M" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "defense defender 1" })).not.toBeInTheDocument();
    // The offense is untouched...
    expect(screen.getByRole("button", { name: "offense thrower T" })).toBeInTheDocument();
    // ...and so is the scene the model reads. Hiding is a display choice; the
    // separate lens toggle is what changes what the map counts.
    expect(screen.getByRole("checkbox", { name: "Defense" })).not.toBeChecked();

    // The mark's force indicator goes with it — an arrow left hanging in
    // space under a mark that is not there reads as a rendering bug. The
    // disc belongs to the thrower, so it stays.
    expect(screen.queryByTestId("mark-direction")).not.toBeInTheDocument();
    expect(screen.getByTestId("disc")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Offense" }));
    expect(screen.queryByTestId("disc")).not.toBeInTheDocument();
  });

  it("will not let a hidden piece be grabbed", () => {
    const rect = stubStageRect();
    try {
      renderWhiteboard();
      const mark = screen.getByRole("button", { name: "defense mark M" });
      const at = grabPointFor(mark);
      fireEvent.click(screen.getByRole("checkbox", { name: "Defense" }));

      const stage = screen.getByRole("group", { name: /Ultimate field/i });
      const thrower = screen.getByRole("button", { name: "offense thrower T" });
      const before = thrower.getAttribute("transform");

      // Press exactly where the mark used to be. Nothing there is grabbable,
      // so this begins a marquee rather than dragging the invisible piece.
      fireEvent.pointerDown(stage, { ...at, pointerId: 1 });
      fireEvent.pointerMove(stage, { clientX: at.clientX + 200, clientY: at.clientY, pointerId: 1 });
      fireEvent.pointerUp(stage, { pointerId: 1 });

      expect(thrower.getAttribute("transform")).toBe(before);
    } finally {
      rect.mockRestore();
    }
  });
});

describe("advanced settings panel", () => {
  it("expands to six sliders with live numeric values and a reset", () => {
    renderWhiteboard();
    turnOverlayOn();
    openAdvanced();

    for (const label of [
      "Top speed",
      "Reaction time",
      "Cutter head start",
      "Huck hang",
      "Mark strength",
      "Mark width",
    ]) {
      expect(screen.getByRole("slider", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Reset to defaults" })).toBeInTheDocument();
    expect(screen.getByText("7.0yd/s")).toBeInTheDocument();
  });

  it("marks the header as modified when a slider leaves its default, and clears it on reset", () => {
    renderWhiteboard();
    turnOverlayOn();
    openAdvanced();

    expect(screen.queryByText("• modified")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("slider", { name: "Mark strength" }), { target: { value: "0.4" } });
    expect(screen.getByText("• modified")).toBeInTheDocument();
    expect(screen.getByText("0.40")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset to defaults" }));
    expect(screen.queryByText("• modified")).not.toBeInTheDocument();
  });

  it("converts mark width between stored radians and displayed degrees", () => {
    renderWhiteboard();
    turnOverlayOn();
    openAdvanced();

    const slider = screen.getByRole("slider", { name: "Mark width" });
    // Stored in radians, shown in degrees — the round trip is what matters,
    // not the exact float that degToRad produced.
    expect(screen.getByText("38°")).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: "50" } });
    expect(screen.getByText("50°")).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: "15" } });
    expect(screen.getByText("15°")).toBeInTheDocument();
  });
});

describe("hover readout", () => {
  it("starts idle and populates on hover with the overlay on", () => {
    const rect = stubStageRect();
    try {
      renderWhiteboard();
      expect(screen.getByText(/Hover the field to see why/)).toBeVisible();

      turnOverlayOn();
      const stage = screen.getByRole("group", { name: /Ultimate field/i });
      fireEvent.pointerMove(stage, { clientX: 400, clientY: 200 });

      expect(screen.getByText("Distance")).toBeVisible();
      expect(screen.getByText("Nearest defender arrives")).toBeVisible();
      expect(screen.getByText("Best cutter arrives")).toBeVisible();
      expect(screen.getByText("Verdict")).toBeVisible();
    } finally {
      rect.mockRestore();
    }
  });

  it("hides the idle skeleton by inline style, not the hidden attribute", () => {
    // Regression: the readout body carries `flex`, and a Tailwind display
    // utility beats `[hidden]` on specificity — so the skeleton ("Distance —,
    // Flight time —, ...") stayed on screen in a real browser while jsdom's
    // toBeVisible(), which only reads the attribute, called it hidden.
    // Asserting the inline style is what makes this test able to fail.
    renderWhiteboard();
    const body = screen.getByText("Distance").closest("dl")!;
    expect(body.style.display).toBe("none");
    expect(body.hasAttribute("hidden")).toBe(false);
  });

  it("drops the cutter row under the defense-only lens, so its absence reads as the lens", () => {
    const rect = stubStageRect();
    try {
      renderWhiteboard();
      turnOverlayOn();
      openAdvanced();
      fireEvent.click(lensCheckbox());

      const stage = screen.getByRole("group", { name: /Ultimate field/i });
      fireEvent.pointerMove(stage, { clientX: 400, clientY: 200 });

      expect(screen.getByText("Distance")).toBeVisible();
      expect(screen.getByText("Best cutter arrives")).not.toBeVisible();
    } finally {
      rect.mockRestore();
    }
  });

  it("returns to idle when the overlay is switched off mid-hover", () => {
    const rect = stubStageRect();
    try {
      renderWhiteboard();
      turnOverlayOn();
      const stage = screen.getByRole("group", { name: /Ultimate field/i });
      fireEvent.pointerMove(stage, { clientX: 400, clientY: 200 });
      expect(screen.getByText("Distance")).toBeVisible();

      // Otherwise the last sampled cell freezes on screen, describing a map
      // that is no longer painted.
      fireEvent.click(screen.getByRole("button", { name: "Space" }));
      expect(screen.getByText(/Hover the field to see why/)).toBeVisible();
      expect(screen.getByText("Distance")).not.toBeVisible();
    } finally {
      rect.mockRestore();
    }
  });

  it("returns to idle when the pointer leaves the field", () => {
    const rect = stubStageRect();
    try {
      renderWhiteboard();
      turnOverlayOn();
      const stage = screen.getByRole("group", { name: /Ultimate field/i });
      fireEvent.pointerMove(stage, { clientX: 400, clientY: 200 });
      expect(screen.getByText("Distance")).toBeVisible();

      fireEvent.pointerLeave(stage);
      expect(screen.getByText(/Hover the field to see why/)).toBeVisible();
      expect(screen.getByText("Distance")).not.toBeVisible();
    } finally {
      rect.mockRestore();
    }
  });
});

describe("ADR-2: React is not in the drag path", () => {
  it("commits zero React renders across a burst of pointer moves during a drag", async () => {
    const rect = stubStageRect();
    try {
      let commits = 0;
      render(
        <MemoryRouter>
          <Profiler id="whiteboard" onRender={() => (commits += 1)}>
            <Whiteboard />
          </Profiler>
        </MemoryRouter>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Space" }));

      const cutter = screen.getByRole("button", { name: "offense cutter 1" });
      const grab = grabPointFor(cutter);
      const atRest = cutter.getAttribute("transform");
      fireEvent.pointerDown(cutter, { pointerId: 1, ...grab });

      commits = 0; // count only the drag itself
      for (let i = 0; i < 25; i += 1) {
        fireEvent.pointerMove(cutter, {
          pointerId: 1,
          clientX: grab.clientX + i * 4,
          clientY: grab.clientY,
        });
      }

      expect(commits).toBe(0);
      // Zero commits is only meaningful if the drag actually happened —
      // a grab that missed would satisfy the assertion for the wrong reason.
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      expect(cutter.getAttribute("transform")).not.toBe(atRest);
      expect(commits).toBe(0);
    } finally {
      rect.mockRestore();
    }
  });

  it("commits zero React renders while drawing a marquee and dragging the group", async () => {
    const rect = stubStageRect();
    // The same client coordinates the drag tests use: 1 px per SVG unit,
    // 8 SVG units per yard, offset by the stage margin.
    const at = (x: number, y: number) => ({
      clientX: x * 8 - viewBox.x,
      clientY: y * 8 - viewBox.y,
    });
    try {
      let commits = 0;
      render(
        <MemoryRouter>
          <Profiler id="whiteboard" onRender={() => (commits += 1)}>
            <Whiteboard />
          </Profiler>
        </MemoryRouter>,
      );

      const stage = screen.getByRole("group", { name: /Ultimate field/i });
      const cutter = screen.getByRole("button", { name: "offense cutter 6" });
      const atRest = cutter.getAttribute("transform");

      commits = 0; // count the marquee and the group drag, nothing before them
      fireEvent.pointerDown(stage, { pointerId: 2, ...at(75, 35) });
      for (let i = 0; i < 10; i += 1) {
        fireEvent.pointerMove(stage, { pointerId: 2, ...at(75 - i * 2, 35 - i * 2) });
      }
      fireEvent.pointerUp(stage, { pointerId: 2, ...at(57, 18) });

      // Selecting four pieces is a DOM attribute write, not a render.
      expect(stage.querySelectorAll('[data-selected="true"]')).toHaveLength(4);
      expect(commits).toBe(0);

      fireEvent.pointerDown(stage, { pointerId: 2, ...at(60, 20) });
      for (let i = 1; i <= 25; i += 1) {
        fireEvent.pointerMove(stage, { pointerId: 2, ...at(60 + i * 0.2, 20) });
      }

      expect(commits).toBe(0);
      // Again, zero commits only means something if the group actually moved.
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      expect(cutter.getAttribute("transform")).not.toBe(atRest);
      expect(commits).toBe(0);
    } finally {
      rect.mockRestore();
    }
  });

  it("repaints during the drag, not on release (FR-2.1)", async () => {
    const rect = stubStageRect();
    try {
      renderWhiteboard();
      turnOverlayOn();

      const mark = screen.getByRole("button", { name: "defense mark M" });
      const atRest = mark.getAttribute("transform");
      const grab = grabPointFor(mark);

      fireEvent.pointerDown(mark, { pointerId: 1, ...grab });
      fireEvent.pointerMove(mark, { pointerId: 1, clientX: grab.clientX + 80, clientY: grab.clientY });

      // A frame lands while the pointer is still down: the repaint is driven
      // by pointermove, not by pointerup. (Releasing first would make this
      // assertion true either way, which is why it comes before.)
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

      const midDrag = mark.getAttribute("transform");
      expect(midDrag).not.toBe(atRest);

      fireEvent.pointerMove(mark, { pointerId: 1, clientX: grab.clientX + 160, clientY: grab.clientY });
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      expect(mark.getAttribute("transform")).not.toBe(midDrag);

      fireEvent.pointerUp(mark, { pointerId: 1 });
    } finally {
      rect.mockRestore();
    }
  });
});

describe("§8.5 — the map follows the mark and the thrower", () => {
  function sideAverages(scene: ReturnType<typeof getPreset>) {
    const grid = computeGrid(scene, DEFAULT_PARAMS, ALL_LAYERS, "offense");
    let low = 0;
    let lowCount = 0;
    let high = 0;
    let highCount = 0;
    const thrower = scene.players.find((p) => p.role === "thrower")!;

    for (let row = 0; row < grid.rows; row += 1) {
      const y = row * grid.step + grid.step / 2;
      for (let col = 0; col < grid.cols; col += 1) {
        const x = col * grid.step + grid.step / 2;
        // Only the band just upfield of the thrower, where the force bites.
        if (x < thrower.pos.x + 3 || x > thrower.pos.x + 18) continue;
        const value = grid.values[row * grid.cols + col];
        if (y < thrower.pos.y - 3) {
          low += value;
          lowCount += 1;
        } else if (y > thrower.pos.y + 3) {
          high += value;
          highCount += 1;
        }
      }
    }
    return { low: low / lowCount, high: high / highCount };
  }

  it("moving the mark to the other shoulder swaps which side of the field is closed", () => {
    const scene = getPreset("vertStackForceSide");
    const thrower = scene.players.find((p) => p.role === "thrower")!;
    const mark = scene.players.find((p) => p.role === "mark")!;

    // The preset marks one shoulder; mirror it across the thrower.
    const forced = sideAverages(scene);
    mark.pos = { x: mark.pos.x, y: thrower.pos.y - (mark.pos.y - thrower.pos.y) };
    const mirrored = sideAverages(scene);

    // Whichever side was the cheaper one flips.
    expect(Math.sign(forced.high - forced.low)).toBe(-Math.sign(mirrored.high - mirrored.low));
  });

  it("swinging the thrower across the field moves the strong region with it", () => {
    const scene = getPreset("flatMark");
    const thrower = scene.players.find((p) => p.role === "thrower")!;
    const mark = scene.players.find((p) => p.role === "mark")!;
    const delta = { x: 0, y: 12 };

    const before = computeGrid(scene, DEFAULT_PARAMS, ALL_LAYERS, "offense");
    const beforeValues = Float32Array.from(before.values);

    thrower.pos = { x: thrower.pos.x, y: thrower.pos.y + delta.y };
    mark.pos = { x: mark.pos.x, y: mark.pos.y + delta.y };
    const after = computeGrid(scene, DEFAULT_PARAMS, ALL_LAYERS, "offense");

    let changed = 0;
    for (let i = 0; i < after.values.length; i += 1) {
      if (Math.abs(after.values[i] - beforeValues[i]) > 0.02) changed += 1;
    }
    // A meaningful fraction of the field re-scored — the map is a function
    // of the thrower's position, not a static picture.
    expect(changed / after.values.length).toBeGreaterThan(0.1);
  });
});

describe("§8.9 — frame budget", () => {
  it("computes and paints a full grid within the 16 ms frame", () => {
    const canvas = document.createElement("canvas");
    // Stub the 2d context; jsdom has none, and drawImage cost is the
    // browser's, not ours. What is measured here is our JS: the model pass
    // plus the colourise pass.
    const ctx = {
      createImageData: (w: number, h: number) => ({
        width: w,
        height: h,
        data: new Uint8ClampedArray(w * h * 4),
        colorSpace: "srgb" as PredefinedColorSpace,
      }),
      putImageData: () => {},
      clearRect: () => {},
      drawImage: () => {},
      imageSmoothingEnabled: false,
      globalAlpha: 1,
    };
    const spy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(ctx as unknown as CanvasRenderingContext2D);

    try {
      const painter = createHeatmapPainter(canvas);
      painter.resize(FIELD_PX_WIDTH, FIELD_PX_HEIGHT);
      const scene = getPreset("vertStackForceSide");

      const frame = () => {
        const grid = computeGrid(scene, DEFAULT_PARAMS, ALL_LAYERS, "offense");
        painter.paint(grid);
      };

      for (let i = 0; i < 3; i += 1) frame(); // warm up the JIT

      // Best-of-N, not mean: this suite runs across parallel workers, so any
      // single sample can be inflated by scheduling rather than by the code.
      // The minimum is the closest thing to an uncontended measurement that
      // is available from inside a shared-CPU test run.
      let best = Infinity;
      for (let i = 0; i < 40; i += 1) {
        const started = performance.now();
        frame();
        best = Math.min(best, performance.now() - started);
      }

      // The 16 ms frame is asserted under `npm run test:perf`, which runs the
      // timing files with --no-file-parallelism; the everyday parallel suite
      // measures 28–32 ms for the same code purely from CPU contention, so it
      // keeps a loose ceiling that still catches the regressions that matter
      // (a per-frame allocation, a dropped early-out, a second pass over the
      // grid — all multiples, not percent). Isolated reference: 10.18 ms.
      expect(best).toBeLessThan(PERF_RUN ? 16 : 60);
      // eslint-disable-next-line no-console
      console.log(`[§8.9] best frame: ${best.toFixed(2)} ms (isolated reference: 10.18 ms)`);
    } finally {
      spy.mockRestore();
    }
  });

  it("computes at the documented grid resolution", () => {
    const grid = computeGrid(getPreset("flatMark"), DEFAULT_PARAMS, ALL_LAYERS, "offense");
    expect(grid.step).toBe(GRID_STEP);
    expect(grid.cols).toBe(Math.round(FIELD.length / GRID_STEP));
    expect(grid.rows).toBe(Math.round(FIELD.width / GRID_STEP));
  });
});

describe("preferences", () => {
  it("persists the rail state across a remount but never the scene", async () => {
    const { unmount } = renderWhiteboard();
    turnOverlayOn();
    openAdvanced();
    fireEvent.click(lensCheckbox());
    fireEvent.change(screen.getByRole("slider", { name: "Mark strength" }), { target: { value: "0.3" } });

    // Move a piece — scene state that must NOT come back.
    const cutter = screen.getByRole("button", { name: "offense cutter 1" });
    const restingTransform = cutter.getAttribute("transform");
    fireEvent.keyDown(cutter, { key: "ArrowRight", shiftKey: true });
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    const movedTransform = cutter.getAttribute("transform");
    expect(movedTransform).not.toBe(restingTransform);
    unmount();

    renderWhiteboard();
    expect(screen.getByRole("button", { name: "Space" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Advanced settings/ })).toHaveAttribute("aria-expanded", "true");
    expect(lensCheckbox()).not.toBeChecked();
    expect(screen.getByText("0.30")).toBeInTheDocument();

    expect(localStorage.getItem("fieldview.overlayPrefs")).not.toContain("players");
    expect(screen.getByRole("button", { name: "offense cutter 1" }).getAttribute("transform")).not.toBe(
      movedTransform,
    );
  });

  it("falls back to defaults on a corrupt or hand-edited entry", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("nonsense")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs({ lens: "telescope", on: "yes" }).lens).toBe("offense");
    expect(parsePrefs({ lens: "telescope", on: "yes" }).on).toBe(false);
    // Both teams are shown unless storage says otherwise, and a hand-edited
    // non-boolean is not trusted into hiding half the diagram.
    expect(parsePrefs({ visible: { offense: "no" } }).visible).toEqual({
      offense: true,
      defense: true,
    });
    expect(parsePrefs({ visible: { defense: false } }).visible).toEqual({
      offense: true,
      defense: false,
    });
  });

  it("honours the pre-rename tuningExpanded key", () => {
    // The panel grew from "Tuning" to "Advanced settings"; a coach who had it
    // open should not find it shut after the upgrade.
    expect(parsePrefs({ tuningExpanded: true }).advancedExpanded).toBe(true);
    expect(parsePrefs({ advancedExpanded: false, tuningExpanded: true }).advancedExpanded).toBe(false);
  });

  it("clamps out-of-range slider values rather than trusting them", () => {
    const parsed = parsePrefs({ params: { vmax: 9999, react: -5, markStr: 0.5 } });
    expect(parsed.params.vmax).toBe(9);
    expect(parsed.params.react).toBe(0.1);
    expect(parsed.params.markStr).toBe(0.5);
  });
});

describe("prefers-reduced-motion", () => {
  it("gates the overlay fade behind motion-safe but never the repaint itself", () => {
    renderWhiteboard();
    const canvas = screen.getByTestId("heatmap-canvas");
    const className = canvas.className;

    // Every transition on the canvas is motion-safe-prefixed, so a reduced-
    // motion user gets the map appearing instantly rather than fading.
    const transitionClasses = className.split(/\s+/).filter((c) => c.includes("transition"));
    expect(transitionClasses.length).toBeGreaterThan(0);
    for (const cls of transitionClasses) expect(cls.startsWith("motion-safe:")).toBe(true);

    // The live repaint is a canvas draw, not a CSS animation — nothing about
    // it is suppressible by a motion preference, which is the point.
    turnOverlayOn();
    expect(canvas).toHaveStyle({ opacity: "1" });
  });
});

describe("the overlay is a toggle, not a route", () => {
  it("mounts in the Designer too", () => {
    render(
      <MemoryRouter>
        <Designer />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Space" })).toBeInTheDocument();
    expect(screen.getByTestId("heatmap-canvas")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Space" }));
    expect(screen.getByRole("button", { name: /Advanced settings/ })).toBeInTheDocument();
  });
});
