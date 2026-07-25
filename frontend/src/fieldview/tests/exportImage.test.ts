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
});
