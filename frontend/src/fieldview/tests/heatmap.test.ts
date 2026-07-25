// The painter is built and measured against a SYNTHETIC grid before the real
// model is wired in (approach.md P5, task 100) — so a frame-budget problem
// surfaces as a painter problem, not as an ambiguous "the overlay is slow".

import { describe, expect, it, vi } from "vitest";
import { createHeatmapPainter, fieldPixelSize } from "../render/heatmap";
import { GRID_STEP } from "../space/constants";
import type { ScoreGrid } from "../space/types";
import { FIELD } from "../scene/field";

const COLS = Math.round(FIELD.length / GRID_STEP); // 220
const ROWS = Math.round(FIELD.width / GRID_STEP); // 80

function syntheticGrid(fill: (col: number, row: number) => number): ScoreGrid {
  const values = new Float32Array(COLS * ROWS);
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) values[row * COLS + col] = fill(col, row);
  }
  return { cols: COLS, rows: ROWS, step: GRID_STEP, values };
}

interface FakeContext {
  createImageData: (w: number, h: number) => ImageData;
  putImageData: ReturnType<typeof vi.fn>;
  clearRect: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  imageSmoothingEnabled: boolean;
  globalAlpha: number;
}

function fakeContext(): FakeContext {
  return {
    createImageData: (w: number, h: number) => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4),
      colorSpace: "srgb" as PredefinedColorSpace,
    }),
    putImageData: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    imageSmoothingEnabled: false,
    globalAlpha: 1,
  };
}

// jsdom has no 2d context; stub every canvas the painter creates.
function withCanvas(): {
  canvas: HTMLCanvasElement;
  ctx: FakeContext;
  scratches: FakeContext[];
  restore: () => void;
} {
  const ctx = fakeContext();
  const contexts: FakeContext[] = [];
  const spy = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(function (this: HTMLCanvasElement) {
      if (this.dataset.role === "main") return ctx as unknown as CanvasRenderingContext2D;
      const scratch = fakeContext();
      contexts.push(scratch);
      return scratch as unknown as CanvasRenderingContext2D;
    });

  const canvas = document.createElement("canvas");
  canvas.dataset.role = "main";
  return { canvas, ctx, scratches: contexts, restore: () => spy.mockRestore() };
}

describe("heatmap painter", () => {
  it("paints one ImageData at grid resolution and upscales it in a single drawImage", () => {
    const { canvas, ctx, scratches, restore } = withCanvas();
    try {
      const painter = createHeatmapPainter(canvas);
      const size = fieldPixelSize(FIELD.length, FIELD.width);
      painter.resize(size.width, size.height);
      painter.paint(syntheticGrid(() => 0.5));

      // The ImageData lands on the grid-sized scratch canvas; the main
      // context only ever sees the single upscaling drawImage.
      expect(scratches).toHaveLength(1);
      expect(scratches[0].putImageData).toHaveBeenCalledTimes(1);
      expect(ctx.drawImage).toHaveBeenCalledTimes(1);
      // Upscaled to the canvas, not drawn 1:1 at grid size.
      const [, , , width, height] = ctx.drawImage.mock.calls[0];
      expect(width).toBe(canvas.width);
      expect(height).toBe(canvas.height);
      expect(ctx.imageSmoothingEnabled).toBe(true);
    } finally {
      restore();
    }
  });

  it("reads its dimensions from the grid buffer rather than assuming them (ADR-4)", () => {
    const { canvas, restore } = withCanvas();
    try {
      const painter = createHeatmapPainter(canvas);
      painter.resize(880, 320);

      // A coarser grid — as GRID_STEP would produce if it were raised for
      // weak hardware — must paint without the painter noticing.
      const coarse: ScoreGrid = {
        cols: 110,
        rows: 40,
        step: 1,
        values: new Float32Array(110 * 40).fill(0.7),
      };
      expect(() => painter.paint(coarse)).not.toThrow();
    } finally {
      restore();
    }
  });

  it("maps low scores to the closed end of the ramp and high scores to the strong end", () => {
    const { canvas, restore } = withCanvas();
    try {
      const seen: number[] = [];
      const painter = createHeatmapPainter(canvas, {
        colorize: (score, out, offset) => {
          seen.push(score);
          out[offset] = 0;
          out[offset + 1] = 0;
          out[offset + 2] = 0;
          out[offset + 3] = 255;
        },
      });
      painter.resize(880, 320);
      // A left-to-right ramp: every cell's own score reaches the colouriser
      // in row-major order.
      painter.paint(syntheticGrid((col) => col / (COLS - 1)));

      expect(seen).toHaveLength(COLS * ROWS);
      expect(seen[0]).toBeCloseTo(0, 5);
      expect(seen[COLS - 1]).toBeCloseTo(1, 5);
    } finally {
      restore();
    }
  });

  it("does not reallocate its buffers across repeated paints of the same grid size", () => {
    const { canvas, ctx, restore } = withCanvas();
    try {
      const createImageData = vi.spyOn(ctx, "createImageData");
      const painter = createHeatmapPainter(canvas);
      painter.resize(880, 320);
      const grid = syntheticGrid(() => 0.4);

      for (let i = 0; i < 30; i += 1) painter.paint(grid);

      // One allocation for 30 frames — the drag loop must not allocate.
      expect(createImageData).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });

  it("stays inside the paint half of the frame budget on a synthetic 220x80 grid", () => {
    const { canvas, restore } = withCanvas();
    try {
      const painter = createHeatmapPainter(canvas);
      painter.resize(880, 320);
      const grid = syntheticGrid((col, row) => ((col + row) % 50) / 50);

      painter.paint(grid); // warm up
      const runs = 20;
      let best = Infinity;
      for (let i = 0; i < runs; i += 1) {
        const started = performance.now();
        painter.paint(grid);
        best = Math.min(best, performance.now() - started);
      }

      // The model measured ~10 ms/grid in P3, leaving ~6 ms of a 16 ms frame.
      // The colourise pass is the painter's only real JS cost here (drawImage
      // is stubbed), so this guards the part that is ours to regress.
      expect(best).toBeLessThan(6);
    } finally {
      restore();
    }
  });
});
