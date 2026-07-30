import { describe, expect, it } from "vitest";
import {
  PIXELS_PER_YARD,
  getStageViewBox,
  pixelToYard,
  yardToPixel,
} from "../render/coords";
import { FIELD } from "../scene/field";
import { FIELD_PX_HEIGHT, FIELD_PX_WIDTH } from "../render/fieldLayer";

describe("yardToPixel / pixelToYard", () => {
  it("round-trips an arbitrary yard position", () => {
    const yard = { x: 62.5, y: 17.25 };
    expect(pixelToYard(yardToPixel(yard))).toEqual(yard);
  });

  it("round-trips a pixel position", () => {
    const px = { x: 123.4, y: 456.7 };
    expect(yardToPixel(pixelToYard(px))).toEqual(px);
  });

  // The field renders vertically, offense attacking up the screen
  // (tech-design.md ADR-2): +x yards (downfield, attacking) decreases pixel-y.
  it("maps increasing downfield yards to decreasing screen pixel-y", () => {
    const near = yardToPixel({ x: 10, y: 0 });
    const far = yardToPixel({ x: 20, y: 0 });
    expect(far.y).toBeLessThan(near.y);
  });

  it("maps lateral yards to screen pixel-x, unrotated", () => {
    const left = yardToPixel({ x: 0, y: 5 });
    const right = yardToPixel({ x: 0, y: 15 });
    expect(right.x).toBeGreaterThan(left.x);
    expect(right.x - left.x).toBeCloseTo((15 - 5) * PIXELS_PER_YARD);
  });

  it("keeps the on-field pixel range non-negative: (0,0) and (FIELD.length, FIELD.width)", () => {
    const backCorner = yardToPixel({ x: 0, y: 0 });
    const attackingCorner = yardToPixel({ x: FIELD.length, y: FIELD.width });
    expect(backCorner.x).toBeGreaterThanOrEqual(0);
    expect(backCorner.y).toBeGreaterThanOrEqual(0);
    expect(attackingCorner.x).toBeGreaterThanOrEqual(0);
    expect(attackingCorner.y).toBeGreaterThanOrEqual(0);
    // The attacking (downfield-most) corner is at the top of the screen.
    expect(attackingCorner.y).toBeLessThan(backCorner.y);
  });

  it("places the defending back corner at the bottom of the field's pixel span", () => {
    const corner = yardToPixel({ x: 0, y: 0 });
    expect(corner.y).toBeCloseTo(FIELD.length * PIXELS_PER_YARD);
  });

  it("places the attacking goal-line-most point at pixel-y 0", () => {
    const corner = yardToPixel({ x: FIELD.length, y: 0 });
    expect(corner.y).toBeCloseTo(0);
  });
});

describe("getStageViewBox", () => {
  it("is generic over which yard axis maps to which screen dimension", () => {
    // FIELD_PX_WIDTH/HEIGHT already reflect the vertical orientation
    // (width = lateral span, height = downfield span) — getStageViewBox
    // itself doesn't need to know that; it just wraps whatever it's given
    // in the stage margin.
    const viewBox = getStageViewBox(FIELD_PX_WIDTH, FIELD_PX_HEIGHT);
    expect(FIELD_PX_WIDTH).toBeCloseTo(FIELD.width * PIXELS_PER_YARD);
    expect(FIELD_PX_HEIGHT).toBeCloseTo(FIELD.length * PIXELS_PER_YARD);
    expect(viewBox.width).toBeGreaterThan(FIELD_PX_WIDTH);
    expect(viewBox.height).toBeGreaterThan(FIELD_PX_HEIGHT);
  });
});
