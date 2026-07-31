// Force geometry (tech-design.md ADR-3). The contract under test is that a
// force is nothing but the mark's offset from the thrower: snapping writes a
// position, reading recovers the name from that position, and no stored
// value exists in between.

import { describe, expect, it } from "vitest";
import {
  FORCE_ANGLES,
  FORCE_PRESETS,
  FORCE_SIDES,
  FORCE_TOLERANCE_YD,
  markPosFor,
  readForce,
  type ForceAngle,
  type ForceSide,
} from "../scene/force";
import { getPreset } from "../scene/presets";
import { movePlayer } from "../scene/scene";
import { yardToPixel } from "../render/coords";
import type { Scene, Vec2 } from "../scene/types";

function scene(): Scene {
  return getPreset("vertStackForceSide");
}

function thrower(s: Scene) {
  return s.players.find((p) => p.role === "thrower")!;
}

function mark(s: Scene) {
  return s.players.find((p) => p.role === "mark")!;
}

// Snap the scene's mark to a named force, the way the Mark panel will.
function snap(s: Scene, side: ForceSide, angle: ForceAngle): void {
  movePlayer(s, mark(s).id, markPosFor(side, angle, thrower(s).pos));
}

const ALL: Array<{ side: ForceSide; angle: ForceAngle }> = FORCE_SIDES.flatMap((side) =>
  FORCE_ANGLES.map((angle) => ({ side, angle })),
);

function offsetOf(side: ForceSide, angle: ForceAngle): Vec2 {
  return FORCE_PRESETS[side][angle];
}

// Push a mark away from a preset along the direction pointing away from the
// thrower. Every preset's neighbours lie inward or across, so displacing
// radially outward is the one direction guaranteed not to wander into a
// different preset's tolerance disc.
function displacedOutward(offset: Vec2, byYards: number): Vec2 {
  const len = Math.hypot(offset.x, offset.y);
  return {
    x: offset.x + (offset.x / len) * byYards,
    y: offset.y + (offset.y / len) * byYards,
  };
}

describe("FORCE_PRESETS", () => {
  it("covers all 9 side x angle combinations", () => {
    expect(ALL).toHaveLength(9);
    for (const { side, angle } of ALL) {
      expect(offsetOf(side, angle)).toBeDefined();
    }
  });

  it("places the mark a plausible marking distance from the thrower", () => {
    for (const { side, angle } of ALL) {
      const o = offsetOf(side, angle);
      const r = Math.hypot(o.x, o.y);
      expect(r).toBeGreaterThan(0.5);
      expect(r).toBeLessThan(4);
    }
  });

  it("always places the mark downfield of the thrower, never behind", () => {
    for (const { side, angle } of ALL) {
      expect(offsetOf(side, angle).x).toBeGreaterThan(0);
    }
  });

  // Standard force semantics: the mark stands on the side it takes away.
  it("puts the mark on the side the force removes", () => {
    for (const angle of FORCE_ANGLES) {
      // Force flick takes away the backhand, so the mark sits backhand side (-y).
      expect(offsetOf("flick", angle).y).toBeLessThan(0);
      // Force backhand takes away the flick, so the mark sits flick side (+y).
      expect(offsetOf("backhand", angle).y).toBeGreaterThan(0);
      // Flat concedes neither: it stays essentially straight-on.
      expect(Math.abs(offsetOf("flat", angle).y)).toBeLessThan(1);
    }
  });

  it("mirrors flick and backhand across the lateral axis", () => {
    for (const angle of FORCE_ANGLES) {
      const f = offsetOf("flick", angle);
      const b = offsetOf("backhand", angle);
      expect(b.x).toBeCloseTo(f.x);
      expect(b.y).toBeCloseTo(-f.y);
    }
  });

  // The nine forces must also be nine distinct *forces*, not just nine
  // distinct points: the space model reads only bearing(thrower -> mark), so
  // two presets sharing a bearing would draw the same force shadow.
  it("gives every combination a distinct force shadow bearing", () => {
    const bearings = ALL.map(({ side, angle }) => {
      const o = offsetOf(side, angle);
      return Math.atan2(o.y, o.x);
    });
    for (let i = 0; i < bearings.length; i++) {
      for (let j = i + 1; j < bearings.length; j++) {
        expect(Math.abs(bearings[i] - bearings[j])).toBeGreaterThan(1e-6);
      }
    }
  });
});

describe("markPosFor", () => {
  it("produces a distinct position for each of the 9 combinations", () => {
    const at: Vec2 = { x: 40, y: 20 };
    const seen = ALL.map(({ side, angle }) => markPosFor(side, angle, at));
    for (let i = 0; i < seen.length; i++) {
      for (let j = i + 1; j < seen.length; j++) {
        const d = Math.hypot(seen[i].x - seen[j].x, seen[i].y - seen[j].y);
        expect(d).toBeGreaterThan(0);
      }
    }
  });

  // The tolerance is only meaningful if no point can satisfy two named
  // forces. This is the invariant a future tuning pass to FORCE_PRESETS must
  // not break, which is why it is asserted rather than assumed.
  it("keeps every pair of presets more than 2x the tolerance apart", () => {
    for (let i = 0; i < ALL.length; i++) {
      for (let j = i + 1; j < ALL.length; j++) {
        const a = offsetOf(ALL[i].side, ALL[i].angle);
        const b = offsetOf(ALL[j].side, ALL[j].angle);
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        expect(d).toBeGreaterThan(2 * FORCE_TOLERANCE_YD);
      }
    }
  });

  it("offsets from the thrower rather than returning an absolute position", () => {
    const a = markPosFor("flick", "default", { x: 40, y: 20 });
    const b = markPosFor("flick", "default", { x: 70, y: 12 });
    expect(b.x - a.x).toBeCloseTo(30);
    expect(b.y - a.y).toBeCloseTo(-8);
  });

  it("does not mutate the preset table", () => {
    const before = { ...FORCE_PRESETS.flick.default };
    markPosFor("flick", "default", { x: 40, y: 20 });
    expect(FORCE_PRESETS.flick.default).toEqual(before);
  });
});

describe("readForce round-trip", () => {
  it("reads back every force it snapped to", () => {
    for (const { side, angle } of ALL) {
      const s = scene();
      snap(s, side, angle);
      expect(readForce(s)).toEqual({ side, angle });
    }
  });

  // Force is not stored, so it has to survive the thrower moving. moveThrower
  // carries the mark, and readForce compares offsets, so the force is
  // unchanged wherever the play sits on the field.
  it("is invariant under moving the whole matchup around the field", () => {
    const spots: Vec2[] = [
      { x: 25, y: 20 },
      { x: 70, y: 4 },
      { x: 95, y: 33 },
    ];
    for (const spot of spots) {
      const s = scene();
      movePlayer(s, thrower(s).id, spot);
      snap(s, "backhand", "around");
      expect(readForce(s)).toEqual({ side: "backhand", angle: "around" });
    }
  });

  it("reads custom when the mark sits on the thrower", () => {
    const s = scene();
    movePlayer(s, mark(s).id, thrower(s).pos);
    expect(readForce(s)).toBe("custom");
  });

  it("reads custom with no thrower or no mark", () => {
    const noThrower = scene();
    noThrower.players = noThrower.players.filter((p) => p.role !== "thrower");
    expect(readForce(noThrower)).toBe("custom");

    const noMark = scene();
    noMark.players = noMark.players.filter((p) => p.role !== "mark");
    expect(readForce(noMark)).toBe("custom");
  });
});

describe("the custom threshold", () => {
  it("still reads the named force at exactly FORCE_TOLERANCE_YD", () => {
    for (const { side, angle } of ALL) {
      const s = scene();
      const t = thrower(s).pos;
      const displaced = displacedOutward(offsetOf(side, angle), FORCE_TOLERANCE_YD);
      movePlayer(s, mark(s).id, { x: t.x + displaced.x, y: t.y + displaced.y });
      expect(readForce(s)).toEqual({ side, angle });
    }
  });

  it("reads custom just beyond FORCE_TOLERANCE_YD", () => {
    for (const { side, angle } of ALL) {
      const s = scene();
      const t = thrower(s).pos;
      const displaced = displacedOutward(offsetOf(side, angle), FORCE_TOLERANCE_YD + 0.3);
      movePlayer(s, mark(s).id, { x: t.x + displaced.x, y: t.y + displaced.y });
      expect(readForce(s)).toBe("custom");
    }
  });

  it("reads custom for a mark dragged well off any preset", () => {
    const s = scene();
    const t = thrower(s).pos;
    movePlayer(s, mark(s).id, { x: t.x + 9, y: t.y + 7 });
    expect(readForce(s)).toBe("custom");
  });
});

describe("orientation independence (canon ADR-11)", () => {
  // scene/ is yards with +x = attacking; render/coords.ts is the only place
  // that decides which screen axis that becomes. Reading the force in pixel
  // space would give a different answer -- which is the point: readForce
  // works in yards, so the vertical render cannot change what it reports.
  it("reads the same force regardless of how the stage draws the field", () => {
    for (const { side, angle } of ALL) {
      const s = scene();
      snap(s, side, angle);

      const yardOffset: Vec2 = {
        x: mark(s).pos.x - thrower(s).pos.x,
        y: mark(s).pos.y - thrower(s).pos.y,
      };
      const tPx = yardToPixel(thrower(s).pos);
      const mPx = yardToPixel(mark(s).pos);
      const pixelOffset: Vec2 = { x: mPx.x - tPx.x, y: mPx.y - tPx.y };

      // The render really does reorient the offset (axes swap and downfield
      // flips sign), so this is not a vacuous comparison...
      expect(pixelOffset).not.toEqual(yardOffset);
      // ...yet the force reads the same, because scene/ never sees pixels.
      expect(readForce(s)).toEqual({ side, angle });
    }
  });

  it("reads the same force for a play mirrored to the other sideline", () => {
    // Flipping lateral position on the field is a different play, not a
    // different orientation: the force follows the geometry and swaps sides.
    const s = scene();
    snap(s, "flick", "default");
    expect(readForce(s)).toEqual({ side: "flick", angle: "default" });

    const flipped = scene();
    const t = thrower(flipped).pos;
    const o = offsetOf("flick", "default");
    movePlayer(flipped, mark(flipped).id, { x: t.x + o.x, y: t.y - o.y });
    expect(readForce(flipped)).toEqual({ side: "backhand", angle: "default" });
  });
});

describe("ADR-3: force is never stored", () => {
  const spaceModules = import.meta.glob("../space/*.ts", {
    eager: true,
    query: "?raw",
    import: "default",
  }) as Record<string, string>;

  // The space model derives the force from mark geometry itself. If it ever
  // imports force.ts, there are two answers to one question.
  it("space/ does not import force.ts", () => {
    const entries = Object.entries(spaceModules);
    expect(entries.length).toBeGreaterThan(0);
    for (const [path, source] of entries) {
      // Import statements only -- space/ discusses the force in prose, which
      // is exactly right; what it must never do is read this module.
      expect(source, `${path} must not import force.ts`).not.toMatch(
        /(from|import)\s*\(?\s*["'][^"']*force["']/,
      );
    }
  });

  it("keeps no force state of its own between snap and read", () => {
    // Two independent scenes snapped to different forces do not leak into
    // each other, and re-reading the same scene twice is stable -- the module
    // holds nothing.
    const a = scene();
    const b = scene();
    snap(a, "flick", "around");
    snap(b, "backhand", "inside");
    expect(readForce(a)).toEqual({ side: "flick", angle: "around" });
    expect(readForce(b)).toEqual({ side: "backhand", angle: "inside" });
    expect(readForce(a)).toEqual(readForce(a));
  });
});
