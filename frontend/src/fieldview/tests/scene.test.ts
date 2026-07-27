import { describe, expect, it } from "vitest";
import { movePlayer, moveThrower } from "../scene/scene";
import { FIELD } from "../scene/field";
import { getPreset, listPresetNames } from "../scene/presets";
import type { Scene } from "../scene/types";

function scene(): Scene {
  return getPreset("vertStackForceSide");
}

describe("movePlayer", () => {
  it("moves the named player to the given position", () => {
    const s = scene();
    movePlayer(s, "o2", { x: 60, y: 25 });
    const cutter = s.players.find((p) => p.id === "o2");
    expect(cutter?.pos).toEqual({ x: 60, y: 25 });
  });

  it("clamps a position outside field bounds", () => {
    const s = scene();
    movePlayer(s, "o2", { x: -10, y: 200 });
    const cutter = s.players.find((p) => p.id === "o2");
    expect(cutter?.pos).toEqual({ x: 0, y: FIELD.width });
  });

  it("is a no-op for an unknown id", () => {
    const s = scene();
    expect(() => movePlayer(s, "nonexistent", { x: 1, y: 1 })).not.toThrow();
  });
});

describe("moveThrower", () => {
  it("carries the mark by the same delta, preserving relative offset", () => {
    const s = scene();
    const thrower = s.players.find((p) => p.role === "thrower")!;
    const mark = s.players.find((p) => p.role === "mark")!;
    const startOffset = { x: mark.pos.x - thrower.pos.x, y: mark.pos.y - thrower.pos.y };

    moveThrower(s, { x: thrower.pos.x + 5, y: thrower.pos.y - 3 });

    const movedThrower = s.players.find((p) => p.role === "thrower")!;
    const movedMark = s.players.find((p) => p.role === "mark")!;
    const endOffset = {
      x: movedMark.pos.x - movedThrower.pos.x,
      y: movedMark.pos.y - movedThrower.pos.y,
    };
    expect(endOffset.x).toBeCloseTo(startOffset.x);
    expect(endOffset.y).toBeCloseTo(startOffset.y);
  });

  it("clamps the thrower at the field boundary", () => {
    const s = scene();
    moveThrower(s, { x: 500, y: -500 });
    const thrower = s.players.find((p) => p.role === "thrower")!;
    expect(thrower.pos).toEqual({ x: FIELD.length, y: 0 });
  });
});

describe("presets", () => {
  for (const name of listPresetNames()) {
    it(`${name} has exactly 14 pieces, all in bounds`, () => {
      const s = getPreset(name);
      expect(s.players).toHaveLength(14);
      expect(s.players.filter((p) => p.role === "thrower")).toHaveLength(1);
      expect(s.players.filter((p) => p.role === "cutter")).toHaveLength(6);
      expect(s.players.filter((p) => p.role === "mark")).toHaveLength(1);
      expect(s.players.filter((p) => p.role === "defender")).toHaveLength(6);
      for (const p of s.players) {
        expect(p.pos.x).toBeGreaterThanOrEqual(0);
        expect(p.pos.x).toBeLessThanOrEqual(FIELD.length);
        expect(p.pos.y).toBeGreaterThanOrEqual(0);
        expect(p.pos.y).toBeLessThanOrEqual(FIELD.width);
      }
    });
  }

  it("returns independent copies on each call", () => {
    const a = getPreset("vertStackForceSide");
    const b = getPreset("vertStackForceSide");
    a.players[0].pos.x = 999;
    expect(b.players[0].pos.x).not.toBe(999);
  });
});
