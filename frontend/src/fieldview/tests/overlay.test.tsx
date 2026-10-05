// Mode 3 integration: the rail, tuning, readout, the live-repaint
// invariants (§8.5 / FR-2.1), the frame budget (§8.9), and the ADR-2
// guarantee that React never enters the drag path.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Profiler } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { FieldHarness } from "./fieldHarness";
import { createHeatmapPainter } from "../render/heatmap";
import { getStageViewBox, yardToPixel } from "../render/coords";
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

function renderField(overlayOn = false) {
  return render(<FieldHarness overlayOn={overlayOn} />);
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

// A client point for a given on-field yard position, via the real
// yard->pixel transform (coords.ts) rather than a hardcoded pixel literal —
// stays correct regardless of the field's on-screen orientation (ADR-2).
function clientForYard(yard: { x: number; y: number }) {
  const px = yardToPixel(yard);
  return { clientX: px.x - viewBox.x, clientY: px.y - viewBox.y };
}

describe("hover readout", () => {
  it("starts idle and populates on hover with the overlay on", () => {
    const rect = stubStageRect();
    try {
      const { rerender } = renderField();
      expect(screen.getByText(/Hover the field to see why/)).toBeVisible();

      rerender(<FieldHarness overlayOn />);
      const stage = screen.getByRole("group", { name: /Ultimate field/i });
      fireEvent.pointerMove(stage, clientForYard({ x: 60, y: 20 }));

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
    renderField();
    const body = screen.getByText("Distance").closest("dl")!;
    expect(body.style.display).toBe("none");
    expect(body.hasAttribute("hidden")).toBe(false);
  });

  it("drops the cutter row under the defense-only lens, so its absence reads as the lens", () => {
    const rect = stubStageRect();
    try {
      render(<FieldHarness overlayOn lens="defense-only" />);

      const stage = screen.getByRole("group", { name: /Ultimate field/i });
      fireEvent.pointerMove(stage, clientForYard({ x: 60, y: 20 }));

      expect(screen.getByText("Distance")).toBeVisible();
      expect(screen.getByText("Best cutter arrives")).not.toBeVisible();
    } finally {
      rect.mockRestore();
    }
  });

  it("returns to idle when the overlay is switched off mid-hover", () => {
    const rect = stubStageRect();
    try {
      const { rerender } = renderField(true);
      const stage = screen.getByRole("group", { name: /Ultimate field/i });
      fireEvent.pointerMove(stage, clientForYard({ x: 60, y: 20 }));
      expect(screen.getByText("Distance")).toBeVisible();

      // Otherwise the last sampled cell freezes on screen, describing a map
      // that is no longer painted.
      rerender(<FieldHarness overlayOn={false} />);
      expect(screen.getByText(/Hover the field to see why/)).toBeVisible();
      expect(screen.getByText("Distance")).not.toBeVisible();
    } finally {
      rect.mockRestore();
    }
  });

  it("returns to idle when the pointer leaves the field", () => {
    const rect = stubStageRect();
    try {
      renderField(true);
      const stage = screen.getByRole("group", { name: /Ultimate field/i });
      fireEvent.pointerMove(stage, clientForYard({ x: 60, y: 20 }));
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
        <Profiler id="field" onRender={() => (commits += 1)}>
            <FieldHarness overlayOn />
          </Profiler>,
      );

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
    // through the real yard->pixel transform (coords.ts) so this stays
    // correct regardless of the field's on-screen orientation (ADR-2),
    // offset by the stage margin.
    const at = (x: number, y: number) => {
      const px = yardToPixel({ x, y });
      return { clientX: px.x - viewBox.x, clientY: px.y - viewBox.y };
    };
    try {
      let commits = 0;
      render(
        <Profiler id="field" onRender={() => (commits += 1)}>
            <FieldHarness overlayOn />
          </Profiler>,
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

      // Selecting four pieces is a DOM attribute write, not a render — but
      // the marquee's *release* is also the moment `FieldCanvas` calls
      // `store.setSelection()` (ADR-1), which the shell's `LeftSidebar`
      // subscribes to (`useSelection`/`useSyncExternalStore`) so its panel
      // can update. That is exactly one legitimate, intentional commit — the
      // discrete selection transition, not the drag itself — so this is not
      // a regression of ADR-2's "no React in the drag path": the invariant
      // under test from here on is that the *drag that follows* stays
      // commit-free, not that a selection change is free too.
      expect(stage.querySelectorAll('[data-selected="true"]')).toHaveLength(4);
      expect(commits).toBe(1);
      commits = 0; // isolate the group drag that follows

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
      renderField(true);

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

  // tasks.md id 67 (Integration partition): Foundation's original Profiler
  // test only proved a drag alone, and a selection change alone, each cost 0
  // React commits during their own per-frame pointer moves — never *both
  // together*, since nothing wired FieldCanvas's pointer handlers to
  // `store.setSelection()` until this partition did (ADR-1's whole point,
  // finally load-bearing: the shell's `LeftSidebar` really does re-render on
  // selection change now). This test drags one piece, releases, then selects
  // a *different* piece and immediately drags it — the selection transition
  // still costs exactly one legitimate commit (the shell's panel swap), but
  // the pointer-move bursts on either side of it must stay at 0, proving a
  // selection change occurring in the same interaction as a drag never
  // reintroduces React into the drag path itself.
  it("commits zero React renders across pointer moves on both sides of a selection change mid-interaction", async () => {
    const rect = stubStageRect();
    try {
      let commits = 0;
      render(
        <Profiler id="field" onRender={() => (commits += 1)}>
            <FieldHarness overlayOn />
          </Profiler>,
      );

      const cutter1 = screen.getByRole("button", { name: "offense cutter 1" });
      const cutter2 = screen.getByRole("button", { name: "offense cutter 2" });
      const grab1 = grabPointFor(cutter1);
      const rest1 = cutter1.getAttribute("transform");

      // Grabbing cutter 1 from a clean `none` selection is itself a selection
      // transition (ADR-1) — one legitimate commit, same as the marquee
      // test's release. Reset the counter after it so the assertions below
      // isolate the pointer-move bursts, not this discrete transition.
      commits = 0;
      fireEvent.pointerDown(cutter1, { pointerId: 1, ...grab1 });
      expect(commits).toBe(1);
      commits = 0;

      for (let i = 0; i < 10; i += 1) {
        fireEvent.pointerMove(cutter1, { pointerId: 1, clientX: grab1.clientX + i * 4, clientY: grab1.clientY });
      }
      fireEvent.pointerUp(cutter1, { pointerId: 1 });
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      expect(cutter1.getAttribute("transform")).not.toBe(rest1);
      expect(commits).toBe(0);

      // Grabbing cutter 2 is a *new* single-piece selection (ADR-1): exactly
      // one commit, for the shell's `LeftSidebar` panel swap.
      const grab2 = grabPointFor(cutter2);
      const rest2 = cutter2.getAttribute("transform");
      fireEvent.pointerDown(cutter2, { pointerId: 2, ...grab2 });
      expect(commits).toBe(1);
      commits = 0; // isolate the drag that follows the selection change

      for (let i = 0; i < 25; i += 1) {
        fireEvent.pointerMove(cutter2, { pointerId: 2, clientX: grab2.clientX + i * 4, clientY: grab2.clientY });
      }
      expect(commits).toBe(0);
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      expect(cutter2.getAttribute("transform")).not.toBe(rest2);
      expect(commits).toBe(0);

      fireEvent.pointerUp(cutter2, { pointerId: 2 });
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
    renderField(true);
    const canvas = screen.getByTestId("heatmap-canvas");
    const className = canvas.className;

    // Every transition on the canvas is motion-safe-prefixed, so a reduced-
    // motion user gets the map appearing instantly rather than fading.
    const transitionClasses = className.split(/\s+/).filter((c) => c.includes("transition"));
    expect(transitionClasses.length).toBeGreaterThan(0);
    for (const cls of transitionClasses) expect(cls.startsWith("motion-safe:")).toBe(true);

    // The live repaint is a canvas draw, not a CSS animation — nothing about
    // it is suppressible by a motion preference, which is the point.
    expect(canvas).toHaveStyle({ opacity: "1" });
  });
});

