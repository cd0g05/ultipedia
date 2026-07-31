import { describe, expect, it } from "vitest";
import { add, clampLen, dist, len, norm, scale, sub } from "../motion/vec";

describe("vec arithmetic", () => {
  it("adds, subtracts, and scales componentwise", () => {
    expect(add({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 });
    expect(sub({ x: 3, y: 4 }, { x: 1, y: 2 })).toEqual({ x: 2, y: 2 });
    expect(scale({ x: 2, y: -3 }, 2)).toEqual({ x: 4, y: -6 });
  });

  it("measures length and distance", () => {
    expect(len({ x: 3, y: 4 })).toBe(5);
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("normalises to unit length", () => {
    const n = norm({ x: 3, y: 4 });
    expect(len(n)).toBeCloseTo(1, 12);
    expect(n).toEqual({ x: 0.6, y: 0.8 });
  });

  it("normalises the zero vector to zero, not NaN", () => {
    // A mover exactly on its target, or a defender exactly on the disc, both
    // reach here legitimately. A NaN would propagate into a position and
    // blank the field.
    expect(norm({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it("clamps magnitude while preserving direction", () => {
    const c = clampLen({ x: 6, y: 8 }, 5);
    expect(len(c)).toBeCloseTo(5, 12);
    expect(c.x / c.y).toBeCloseTo(6 / 8, 12);
  });

  it("leaves a vector under the cap untouched", () => {
    const v = { x: 1, y: 1 };
    expect(clampLen(v, 5)).toBe(v);
  });

  it("returns new objects rather than mutating (purity)", () => {
    const a = { x: 1, y: 2 };
    const b = { x: 3, y: 4 };
    add(a, b);
    sub(a, b);
    scale(a, 3);
    expect(a).toEqual({ x: 1, y: 2 });
    expect(b).toEqual({ x: 3, y: 4 });
  });
});
