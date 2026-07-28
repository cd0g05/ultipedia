import { describe, expect, it } from "vitest";
import { HIT_RADIUS_YD, pickNearest } from "../render/pick";
import type { Player } from "../scene/types";

function player(id: string, x: number, y: number): Player {
  return { id, team: "offense", role: "cutter", pos: { x, y } };
}

describe("pickNearest", () => {
  it("returns the nearest player within the radius", () => {
    const players = [player("a", 10, 10), player("b", 12, 10), player("c", 40, 20)];
    expect(pickNearest({ x: 10.4, y: 10 }, players)?.id).toBe("a");
    expect(pickNearest({ x: 11.6, y: 10 }, players)?.id).toBe("b");
  });

  it("returns null when the pointer is in open space", () => {
    const players = [player("a", 10, 10)];
    expect(pickNearest({ x: 60, y: 30 }, players)).toBeNull();
    expect(pickNearest({ x: 10, y: 10 }, [])).toBeNull();
  });

  it("treats the radius as exclusive at its edge", () => {
    const players = [player("a", 0, 0)];
    expect(pickNearest({ x: HIT_RADIUS_YD - 0.01, y: 0 }, players)?.id).toBe("a");
    expect(pickNearest({ x: HIT_RADIUS_YD, y: 0 }, players)).toBeNull();
  });

  it("breaks an exact tie in favour of the earlier player", () => {
    const players = [player("first", 0, 0), player("second", 2, 0)];
    expect(pickNearest({ x: 1, y: 0 }, players)?.id).toBe("first");
  });

  // The regression this module exists for. Two pieces 2 yd apart both fall
  // inside a 3 yd grab radius, so both would have been hit by the old
  // invisible r=22 (2.75 yd) circles — and SVG hit-testing would have handed
  // the pointer to whichever was rendered last, i.e. the *further* one.
  it("picks the closer piece even when a later-rendered piece is also in range", () => {
    const players = [player("near", 50, 20), player("far", 52, 20)];
    expect(pickNearest({ x: 50.5, y: 20 }, players)?.id).toBe("near");
  });

  it("respects an explicit radius override", () => {
    const players = [player("a", 5, 0)];
    expect(pickNearest({ x: 0, y: 0 }, players)).toBeNull();
    expect(pickNearest({ x: 0, y: 0 }, players, 6)?.id).toBe("a");
  });

  it("measures in two dimensions, not per-axis", () => {
    const players = [player("a", 2, 2)]; // 2.83 yd away, inside 3
    expect(pickNearest({ x: 0, y: 0 }, players)?.id).toBe("a");
    const far = [player("b", 2.5, 2.5)]; // 3.54 yd away, outside
    expect(pickNearest({ x: 0, y: 0 }, far)).toBeNull();
  });
});
