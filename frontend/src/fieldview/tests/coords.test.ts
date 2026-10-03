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

  // The field renders horizontally, offense attacking to the right
  // (fieldview-ui-rework ADR-28): +x yards (downfield, attacking) increases
  // pixel-x.
  it("maps increasing downfield yards to increasing screen pixel-x", () => {
    const near = yardToPixel({ x: 10, y: 0 });
    const far = yardToPixel({ x: 20, y: 0 });
    expect(far.x).toBeGreaterThan(near.x);
    expect(far.x - near.x).toBeCloseTo((20 - 10) * PIXELS_PER_YARD);
    expect(far.y).toBeCloseTo(near.y);
  });

  it("maps lateral yards to screen pixel-y", () => {
    const top = yardToPixel({ x: 0, y: 5 });
    const bottom = yardToPixel({ x: 0, y: 15 });
    expect(bottom.y).toBeGreaterThan(top.y);
    expect(bottom.y - top.y).toBeCloseTo((15 - 5) * PIXELS_PER_YARD);
    expect(bottom.x).toBeCloseTo(top.x);
  });

  it("keeps the on-field pixel range non-negative: (0,0) and (FIELD.length, FIELD.width)", () => {
    const backCorner = yardToPixel({ x: 0, y: 0 });
    const attackingCorner = yardToPixel({ x: FIELD.length, y: FIELD.width });
    expect(backCorner).toEqual({ x: 0, y: 0 });
    expect(attackingCorner.x).toBeGreaterThanOrEqual(0);
    expect(attackingCorner.y).toBeGreaterThanOrEqual(0);
    // The attacking (downfield-most) corner is at the right of the screen.
    expect(attackingCorner.x).toBeGreaterThan(backCorner.x);
  });

  it("places the defending back corner at the field's left-top", () => {
    const corner = yardToPixel({ x: 0, y: 0 });
    expect(corner.x).toBeCloseTo(0);
    expect(corner.y).toBeCloseTo(0);
  });

  it("places the attacking-most corner at the field's right-bottom pixel extent", () => {
    const corner = yardToPixel({ x: FIELD.length, y: FIELD.width });
    expect(corner.x).toBeCloseTo(FIELD_PX_WIDTH);
    expect(corner.y).toBeCloseTo(FIELD_PX_HEIGHT);
  });
});

describe("getStageViewBox", () => {
  it("wraps the field's pixel size in the stage margin", () => {
    // FIELD_PX_WIDTH is the downfield span and FIELD_PX_HEIGHT the lateral
    // span (horizontal field); getStageViewBox itself doesn't need to know
    // that — it just wraps whatever it's given in the stage margin.
    const viewBox = getStageViewBox(FIELD_PX_WIDTH, FIELD_PX_HEIGHT);
    expect(FIELD_PX_WIDTH).toBeCloseTo(FIELD.length * PIXELS_PER_YARD);
    expect(FIELD_PX_HEIGHT).toBeCloseTo(FIELD.width * PIXELS_PER_YARD);
    expect(FIELD_PX_WIDTH).toBeGreaterThan(FIELD_PX_HEIGHT);
    expect(viewBox.width).toBeGreaterThan(FIELD_PX_WIDTH);
    expect(viewBox.height).toBeGreaterThan(FIELD_PX_HEIGHT);
  });
});
