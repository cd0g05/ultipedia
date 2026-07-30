// The heatmap painter (ADR-3). One offscreen ImageData at *grid* resolution
// (220 x 80), blitted once and upscaled by the canvas with smoothing on —
// so the browser's bilinear filter does the interpolation for free and the
// per-frame JS work is exactly one pass over the cells.
//
// Deliberately knows nothing about the space model: it takes a ScoreGrid and
// a colour function. That is what let it be built and measured against a
// synthetic grid before the real model was wired in (approach.md P5 risk
// mitigation), and it keeps this file honest about ADR-4 — grid dimensions
// are read from the buffer, never assumed.

import type { ScoreGrid } from "../space/types";
import { scoreToRgba } from "../space/palette";
import { PIXELS_PER_YARD } from "./coords";

export interface HeatmapPainter {
  paint(grid: ScoreGrid): void;
  resize(fieldPxWidth: number, fieldPxHeight: number): void;
  dispose(): void;
}

export interface HeatmapPainterOptions {
  // Overridable so tests can paint a known ramp, and so a future lens or
  // colour-blind palette is a parameter rather than a fork of the painter.
  colorize?: (score: number, out: Uint8ClampedArray, offset: number) => void;
}

// The overlay sits under the pieces and must not bury the field markings;
// the brief's prototype used a partly transparent map.
export const HEATMAP_ALPHA = 0.78;

export function createHeatmapPainter(
  canvas: HTMLCanvasElement,
  options: HeatmapPainterOptions = {},
): HeatmapPainter {
  const colorize = options.colorize ?? scoreToRgba;
  const ctx = canvas.getContext("2d");

  // Kept across frames and only reallocated when the grid's dimensions
  // change — the drag loop must not allocate (ADR-2, §8.9).
  let image: ImageData | null = null;
  let scratch: HTMLCanvasElement | null = null;
  let scratchCtx: CanvasRenderingContext2D | null = null;

  function ensureBuffers(cols: number, rows: number): boolean {
    if (!ctx) return false;
    if (image && image.width === cols && image.height === rows) return true;

    // createImageData over `new ImageData(...)` — the constructor is missing
    // in some test environments, and the context always has the factory.
    image = ctx.createImageData(cols, rows);
    scratch = document.createElement("canvas");
    scratch.width = cols;
    scratch.height = rows;
    scratchCtx = scratch.getContext("2d");
    return scratchCtx !== null;
  }

  return {
    paint(grid) {
      if (!ctx) return;
      if (!ensureBuffers(grid.cols, grid.rows)) return;
      const data = image!.data;
      const values = grid.values;

      for (let i = 0, offset = 0; i < values.length; i += 1, offset += 4) {
        colorize(values[i], data, offset);
      }

      // ImageData ignores drawImage scaling, so it goes to a grid-sized
      // scratch canvas first and *that* is what gets upscaled.
      scratchCtx!.putImageData(image!, 0, 0);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = HEATMAP_ALPHA;
      ctx.drawImage(scratch!, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    },

    resize(fieldPxWidth, fieldPxHeight) {
      canvas.width = Math.round(fieldPxWidth);
      canvas.height = Math.round(fieldPxHeight);
    },

    dispose() {
      image = null;
      scratch = null;
      scratchCtx = null;
    },
  };
}

// The canvas covers the field itself, not the stage margin, so it lines up
// with the SVG's field rect exactly. Screen width/height, not yard-axis
// order — the field renders vertically (coords.ts ADR-2), so the *lateral*
// yards become the pixel width and the *downfield* yards become the pixel
// height, matching fieldLayer.tsx's FIELD_PX_WIDTH/FIELD_PX_HEIGHT.
export function fieldPixelSize(fieldLengthYards: number, fieldWidthYards: number) {
  return {
    width: fieldWidthYards * PIXELS_PER_YARD,
    height: fieldLengthYards * PIXELS_PER_YARD,
  };
}
