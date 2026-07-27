import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportFrameAsPng } from "../render/exportImage";

function makeFakeSvg(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg") as SVGSVGElement;
  svg.setAttribute("viewBox", "0 0 100 50");
  document.body.appendChild(svg);
  return svg;
}

describe("exportFrameAsPng", () => {
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clickSpy = vi.fn();
    HTMLAnchorElement.prototype.click = clickSpy;

    // jsdom has no real canvas 2D backend or Image decode pipeline; stub
    // just enough of the browser surface for the export path to run.
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      fillStyle: "",
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,fake");

    URL.createObjectURL = vi.fn().mockReturnValue("blob:fake");
    URL.revokeObjectURL = vi.fn();

    Object.defineProperty(window.Image.prototype, "src", {
      set() {
        // Simulate the image finishing "load" on the next microtask.
        queueMicrotask(() => this.onload?.());
      },
    });
  });

  it("triggers a PNG download of the current field", async () => {
    const svg = makeFakeSvg();
    await exportFrameAsPng(svg, "test.png");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith("image/png");
  });

  it("composites the heatmap beneath the SVG so the PNG matches the screen", async () => {
    const svg = makeFakeSvg();
    const heatmap = document.createElement("canvas");
    heatmap.width = 880;
    heatmap.height = 320;

    await exportFrameAsPng(svg, "test.png", {
      canvas: heatmap,
      x: 20,
      y: 30,
      width: 880,
      height: 320,
      alpha: 0.78,
    });

    const ctx = (HTMLCanvasElement.prototype.getContext as ReturnType<typeof vi.fn>).mock.results[0]
      .value as { drawImage: ReturnType<typeof vi.fn> };
    // Heatmap first, SVG second — same stacking as ADR-3's live layers.
    expect(ctx.drawImage).toHaveBeenCalledTimes(2);
    expect(ctx.drawImage.mock.calls[0][0]).toBe(heatmap);
  });

  it("omits the heatmap when the overlay is off", async () => {
    const svg = makeFakeSvg();
    await exportFrameAsPng(svg, "test.png");

    const ctx = (HTMLCanvasElement.prototype.getContext as ReturnType<typeof vi.fn>).mock.results[0]
      .value as { drawImage: ReturnType<typeof vi.fn> };
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
  });
});
