// PNG frame export. Serializes the live SVG (field + pieces) to a data URL,
// draws it into an offscreen canvas, and triggers a download. If browser SVG
// -> canvas compositing quirks surface later, the fallback is to draw each
// piece to the canvas directly from scene data instead of rasterizing the SVG.

import { EXPORT_TOKENS } from "./tokens";

function getSvgDimensions(svg: SVGSVGElement): { width: number; height: number } {
  // Parsed from the viewBox attribute directly rather than svg.viewBox.baseVal
  // — jsdom does not implement SVGAnimatedRect, and attribute parsing works
  // identically in real browsers for the markup we generate ourselves.
  const viewBoxAttr = svg.getAttribute("viewBox");
  if (viewBoxAttr) {
    const parts = viewBoxAttr.trim().split(/\s+/).map(Number);
    if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
      return { width: parts[2], height: parts[3] };
    }
  }
  return { width: svg.clientWidth, height: svg.clientHeight };
}

export interface ExportOverlay {
  // The live heatmap canvas, and where it sits inside the SVG's viewBox —
  // the export has to reproduce the stacking, or the PNG shows a field with
  // the map missing while the screen shows it painted.
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  width: number;
  height: number;
  alpha: number;
}

export async function exportFrameAsPng(
  svg: SVGSVGElement,
  filename = "field-view.png",
  overlay?: ExportOverlay,
): Promise<void> {
  const { width, height } = getSvgDimensions(svg);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to rasterize the field for export."));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context is unavailable.");
    ctx.fillStyle = EXPORT_TOKENS.background;
    ctx.fillRect(0, 0, width, height);

    // Same order as the screen: heatmap first, then the SVG (whose field
    // markings and pieces are drawn over it).
    if (overlay && overlay.canvas.width > 0 && overlay.canvas.height > 0) {
      ctx.globalAlpha = overlay.alpha;
      ctx.drawImage(overlay.canvas, overlay.x, overlay.y, overlay.width, overlay.height);
      ctx.globalAlpha = 1;
    }

    ctx.drawImage(image, 0, 0, width, height);

    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = filename;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
