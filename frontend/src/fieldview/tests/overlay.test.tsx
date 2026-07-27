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

describe("overlay rail", () => {
  it("shows only the Space toggle until the overlay is on", () => {
    renderWhiteboard();
    expect(screen.getByRole("button", { name: "Space" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("radio", { name: /Offense/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Coverage" })).not.toBeInTheDocument();
    expect(screen.queryByText("Closed")).not.toBeInTheDocument();
  });

  it("reveals lens, layers, legend and tuning when toggled on", () => {
    renderWhiteboard();
    turnOverlayOn();

    expect(screen.getByRole("button", { name: "Space" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("radio", { name: /Offense/ })).toBeChecked();
    expect(screen.getByText("Counts whether a cutter could get there first.")).toBeInTheDocument();
    expect(screen.getByText("Ignores the cutters — pure defensive shape.")).toBeInTheDocument();

    for (const layer of ["Mark / force", "Coverage", "Throwing lanes", "Field value"]) {
      expect(screen.getByRole("checkbox", { name: layer })).toBeChecked();
    }

    // Three-swatch legend, meaning carried by words not hue.
    expect(screen.getByText("Closed")).toBeInTheDocument();
    expect(screen.getByText("Open, low value")).toBeInTheDocument();
    expect(screen.getByText("Strong space")).toBeInTheDocument();

    // Tuning is collapsed by default.
    expect(screen.getByRole("button", { name: /Tuning/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("switches the lens", () => {
    renderWhiteboard();
    turnOverlayOn();
    fireEvent.click(screen.getByRole("radio", { name: /Defense only/ }));
    expect(screen.getByRole("radio", { name: /Defense only/ })).toBeChecked();
  });

  it("toggles a layer off", () => {
    renderWhiteboard();
    turnOverlayOn();
    fireEvent.click(screen.getByRole("checkbox", { name: "Coverage" }));
    expect(screen.getByRole("checkbox", { name: "Coverage" })).not.toBeChecked();
  });
});

describe("tuning panel", () => {
  it("expands to six sliders with live numeric values and a reset", () => {
    renderWhiteboard();
    turnOverlayOn();
    fireEvent.click(screen.getByRole("button", { name: /Tuning/ }));

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
    fireEvent.click(screen.getByRole("button", { name: /Tuning/ }));

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
    fireEvent.click(screen.getByRole("button", { name: /Tuning/ }));

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
      fireEvent.click(screen.getByRole("radio", { name: /Defense only/ }));

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
  it("commits zero React renders across a burst of pointer moves during a drag", () => {
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
      fireEvent.pointerDown(cutter, { pointerId: 1, clientX: 400, clientY: 160 });

      commits = 0; // count only the drag itself
      for (let i = 0; i < 25; i += 1) {
        fireEvent.pointerMove(cutter, { pointerId: 1, clientX: 400 + i * 4, clientY: 160 });
      }

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

      fireEvent.pointerDown(mark, { pointerId: 1, clientX: 400, clientY: 180 });
      fireEvent.pointerMove(mark, { pointerId: 1, clientX: 480, clientY: 180 });

      // A frame lands while the pointer is still down: the repaint is driven
      // by pointermove, not by pointerup. (Releasing first would make this
      // assertion true either way, which is why it comes before.)
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

      const midDrag = mark.getAttribute("transform");
      expect(midDrag).not.toBe(atRest);

      fireEvent.pointerMove(mark, { pointerId: 1, clientX: 560, clientY: 180 });
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
    fireEvent.click(screen.getByRole("radio", { name: /Defense only/ }));
    fireEvent.click(screen.getByRole("button", { name: /Tuning/ }));
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
    expect(screen.getByRole("radio", { name: /Defense only/ })).toBeChecked();
    expect(screen.getByRole("button", { name: /Tuning/ })).toHaveAttribute("aria-expanded", "true");
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
    expect(screen.getByRole("radio", { name: /Defense only/ })).toBeInTheDocument();
  });
});
