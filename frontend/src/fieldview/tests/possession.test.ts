import { describe, expect, it } from "vitest";
import { nearestDefender, normalize, throwTo } from "../scene/possession";
import { reassign } from "../scene/matchups";
import { getPreset } from "../scene/presets";
import type { Scene } from "../scene/types";

function scene(): Scene {
  return getPreset("vertStackForceSide");
}

function roleOf(s: Scene, id: string): string | undefined {
  return s.players.find((p) => p.id === id)?.role;
}

function idsWithRole(s: Scene, role: string): string[] {
  return s.players.filter((p) => p.role === role).map((p) => p.id);
}

describe("normalize — role derivation (ADR-1)", () => {
  it("makes the possessor the thrower", () => {
    const s = scene();
    s.possession = "o3";
    normalize(s);
    expect(idsWithRole(s, "thrower")).toEqual(["o3"]);
  });

  it("makes the possessor's assigned defender the mark", () => {
    const s = scene();
    s.possession = "o3"; // d3 guards o3 in every built-in
    normalize(s);
    expect(idsWithRole(s, "mark")).toEqual(["d3"]);
  });

  it("falls back to the nearest defender when the possessor is unassigned", () => {
    const s = scene();
    s.matchups = {}; // nobody assigned to anybody
    s.possession = "o1";
    normalize(s);
    expect(idsWithRole(s, "mark")).toEqual([nearestDefender(s, "o1")]);
  });

  it("gives every other offense player cutter and every other defender defender", () => {
    const s = scene();
    s.possession = "o4";
    normalize(s);
    for (const p of s.players) {
      if (p.id === "o4") continue;
      if (p.id === "d4") continue;
      expect(p.role).toBe(p.team === "offense" ? "cutter" : "defender");
    }
  });

  it("is idempotent — running it twice changes nothing", () => {
    const s = scene();
    normalize(s);
    const first = s.players.map((p) => p.role);
    normalize(s);
    expect(s.players.map((p) => p.role)).toEqual(first);
  });

  it("derives exactly one thrower and one mark", () => {
    const s = scene();
    normalize(s);
    expect(idsWithRole(s, "thrower")).toHaveLength(1);
    expect(idsWithRole(s, "mark")).toHaveLength(1);
  });

  it("moves the mark when the possessor's matchup is reassigned", () => {
    const s = scene();
    expect(idsWithRole(s, "mark")).toEqual(["d1"]); // d1 marks o1
    reassign(s, "d5", "o1"); // d5 takes the thrower; d1 is displaced
    expect(idsWithRole(s, "mark")).toEqual(["d5"]);
    expect(roleOf(s, "d1")).toBe("defender");
  });
});

describe("normalize — possession: null (loose disc)", () => {
  it("yields no thrower and no mark, and does not throw", () => {
    const s = scene();
    s.possession = null;
    expect(() => normalize(s)).not.toThrow();
    expect(idsWithRole(s, "thrower")).toEqual([]);
    expect(idsWithRole(s, "mark")).toEqual([]);
  });

  it("leaves every player on their team's default role", () => {
    const s = scene();
    s.possession = null;
    normalize(s);
    for (const p of s.players) {
      expect(p.role).toBe(p.team === "offense" ? "cutter" : "defender");
    }
  });

  it("clears possession that names a player who is not on the field", () => {
    const s = scene();
    s.possession = "ghost";
    normalize(s);
    expect(s.possession).toBeNull();
    expect(idsWithRole(s, "thrower")).toEqual([]);
  });

  it("clears possession that names a defence player", () => {
    const s = scene();
    s.possession = "d2";
    normalize(s);
    expect(s.possession).toBeNull();
    expect(roleOf(s, "d2")).toBe("defender");
  });

  it("recovers a thrower once possession is handed to somebody", () => {
    const s = scene();
    s.possession = null;
    normalize(s);
    throwTo(s, "o2");
    expect(idsWithRole(s, "thrower")).toEqual(["o2"]);
  });
});

describe("nearestDefender", () => {
  it("returns the closest defence player to the target", () => {
    const s = scene();
    // Park d6 right on top of o2; d2's preset offset is further away.
    s.players.find((p) => p.id === "d6")!.pos = { ...s.players.find((p) => p.id === "o2")!.pos };
    expect(nearestDefender(s, "o2")).toBe("d6");
  });

  it("breaks ties on id so array order cannot change the answer", () => {
    const s = scene();
    const target = s.players.find((p) => p.id === "o2")!.pos;
    // Both land exactly 0.5 yd away — closer than any preset defender — so
    // the only thing separating them is the id tie-break.
    for (const id of ["d6", "d4"]) {
      s.players.find((p) => p.id === id)!.pos = { x: target.x + 0.5, y: target.y };
    }
    expect(nearestDefender(s, "o2")).toBe("d4");

    const reversed: Scene = { ...s, players: [...s.players].reverse() };
    expect(nearestDefender(reversed, "o2")).toBe("d4");
  });

  it("returns null for an unknown target", () => {
    expect(nearestDefender(scene(), "ghost")).toBeNull();
  });

  it("returns null when there are no defenders", () => {
    const s = scene();
    s.players = s.players.filter((p) => p.team === "offense");
    expect(nearestDefender(s, "o1")).toBeNull();
  });
});

describe("throwTo — role handoff", () => {
  it("moves possession, swaps the roles, and moves the mark in one call", () => {
    const s = scene();
    expect(idsWithRole(s, "thrower")).toEqual(["o1"]);
    expect(idsWithRole(s, "mark")).toEqual(["d1"]);

    throwTo(s, "o5");

    expect(s.possession).toBe("o5");
    expect(idsWithRole(s, "thrower")).toEqual(["o5"]);
    expect(roleOf(s, "o1")).toBe("cutter"); // the old thrower is now a cutter
    expect(idsWithRole(s, "mark")).toEqual(["d5"]); // d5 guards o5
    expect(roleOf(s, "d1")).toBe("defender"); // the old mark is now a plain defender
  });

  it("throwing to the current holder is a no-op", () => {
    const s = scene();
    const before = s.players.map((p) => `${p.id}:${p.role}`);
    throwTo(s, "o1");
    expect(s.possession).toBe("o1");
    expect(s.players.map((p) => `${p.id}:${p.role}`)).toEqual(before);
  });

  it("ignores a receiver who is not on the field", () => {
    const s = scene();
    throwTo(s, "ghost");
    expect(s.possession).toBe("o1");
  });

  it("ignores a receiver on the defence", () => {
    const s = scene();
    throwTo(s, "d3");
    expect(s.possession).toBe("o1");
    expect(idsWithRole(s, "thrower")).toEqual(["o1"]);
  });

  it("chains — a sequence of throws always leaves one thrower", () => {
    const s = scene();
    for (const id of ["o2", "o7", "o3", "o1", "o6"]) {
      throwTo(s, id);
      expect(s.possession).toBe(id);
      expect(idsWithRole(s, "thrower")).toEqual([id]);
      expect(idsWithRole(s, "mark")).toHaveLength(1);
    }
  });
});
