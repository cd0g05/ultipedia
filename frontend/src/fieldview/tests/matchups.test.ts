import { describe, expect, it } from "vitest";
import { autoAssign, guardedBy, reassign } from "../scene/matchups";
import { getPreset, listPresetNames } from "../scene/presets";
import type { Scene } from "../scene/types";

function scene(): Scene {
  return getPreset("vertStackForceSide");
}

function defenderIds(s: Scene): string[] {
  return s.players.filter((p) => p.team === "defense").map((p) => p.id);
}

// The invariant ADR-2 exists to protect: matchups are a permutation — every
// non-null target is held by at most one defender, and no entry points at
// anything that is not an offensive player on the field.
function expectPermutation(s: Scene): void {
  const taken = new Set<string>();
  for (const d of defenderIds(s)) {
    const target = s.matchups[d];
    if (target === null || target === undefined) continue;
    expect(taken.has(target)).toBe(false);
    taken.add(target);
    expect(s.players.some((p) => p.id === target && p.team === "offense")).toBe(true);
  }
}

// A small deterministic PRNG so a failing sequence is reproducible; a random
// seed would make the permutation tests flaky-by-design.
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe("autoAssign", () => {
  it("assigns every defender a distinct target on a full preset", () => {
    const s = scene();
    s.matchups = {};
    autoAssign(s);
    expectPermutation(s);
    for (const d of defenderIds(s)) expect(s.matchups[d]).not.toBeNull();
  });

  it("is deterministic — the same scene assigns the same way twice", () => {
    const a = scene();
    const b = scene();
    autoAssign(a);
    autoAssign(b);
    expect(a.matchups).toEqual(b.matchups);
  });

  it("does not depend on player array order", () => {
    const a = scene();
    const b: Scene = { ...scene(), players: [...scene().players].reverse() };
    autoAssign(a);
    autoAssign(b);
    expect(b.matchups).toEqual(a.matchups);
  });

  it("pairs the obvious cases nearest-first", () => {
    const s = scene();
    // The mark sits next to the thrower and each defender near their cutter,
    // so nearest-available reproduces the preset's index pairing for d1.
    autoAssign(s);
    expect(s.matchups.d1).toBe("o1");
  });

  it("leaves surplus defenders on null rather than double-teaming", () => {
    const s = scene();
    // Four offensive players, seven defenders: three must end up unassigned.
    s.players = s.players.filter((p) => p.team === "defense" || ["o1", "o2", "o3", "o4"].includes(p.id));
    autoAssign(s);
    expectPermutation(s);
    const assigned = defenderIds(s).filter((d) => s.matchups[d] !== null);
    expect(assigned).toHaveLength(4);
  });

  it("runs on every built-in preset without breaking the permutation", () => {
    for (const name of listPresetNames()) {
      const s = getPreset(name);
      autoAssign(s);
      expectPermutation(s);
    }
  });
});

describe("guardedBy", () => {
  it("names the defender covering an offensive player", () => {
    expect(guardedBy(scene(), "o1")).toBe("d1");
    expect(guardedBy(scene(), "o4")).toBe("d4");
  });

  it("returns null when nobody is covering them", () => {
    const s = scene();
    reassign(s, "d3", null);
    expect(guardedBy(s, "o3")).toBeNull();
  });

  it("returns null for an unknown id", () => {
    expect(guardedBy(scene(), "ghost")).toBeNull();
  });
});

describe("reassign — 1-to-1 swap", () => {
  it("hands the caller's previous target to the displaced defender", () => {
    const s = scene();
    // d2 guards o2, d3 guards o3. Point d2 at o3.
    reassign(s, "d2", "o3");
    expect(s.matchups.d2).toBe("o3");
    expect(s.matchups.d3).toBe("o2"); // displaced defender inherits the swap
    expectPermutation(s);
  });

  it("gives the displaced defender null when the caller had no target", () => {
    const s = scene();
    reassign(s, "d2", null); // d2 now free-roams
    reassign(s, "d2", "o3"); // and picks up o3, displacing d3
    expect(s.matchups.d2).toBe("o3");
    expect(s.matchups.d3).toBeNull();
    expectPermutation(s);
  });

  it("takes an unguarded target without displacing anybody", () => {
    const s = scene();
    reassign(s, "d3", null); // o3 is now unguarded
    reassign(s, "d5", "o3"); // d5 picks up o3; nobody to swap with
    expect(s.matchups.d5).toBe("o3");
    expect(s.matchups.d3).toBeNull();
    expect(s.matchups.d2).toBe("o2"); // untouched
    expectPermutation(s);
  });

  it("null clears only that defender and cascades nothing", () => {
    const s = scene();
    const before = { ...s.matchups };
    reassign(s, "d4", null);
    expect(s.matchups.d4).toBeNull();
    for (const d of defenderIds(s)) {
      if (d === "d4") continue;
      expect(s.matchups[d]).toBe(before[d]);
    }
    expectPermutation(s);
  });

  it("re-pointing a defender at their current target changes nothing", () => {
    const s = scene();
    const before = { ...s.matchups };
    reassign(s, "d2", "o2");
    expect(s.matchups).toEqual(before);
  });

  it("ignores an unknown defender", () => {
    const s = scene();
    const before = { ...s.matchups };
    reassign(s, "ghost", "o2");
    expect(s.matchups).toEqual(before);
  });

  it("ignores an offensive player who is not on the field", () => {
    const s = scene();
    const before = { ...s.matchups };
    reassign(s, "d2", "ghost");
    expect(s.matchups).toEqual(before);
  });

  it("ignores a target on the defence", () => {
    const s = scene();
    const before = { ...s.matchups };
    reassign(s, "d2", "d3");
    expect(s.matchups).toEqual(before);
  });
});

describe("reassign — permutation property over sequences", () => {
  // Single reassignments are easy to get right; the failure mode ADR-2 warns
  // about is coverage degrading after MANY swaps, so these drive long random
  // sequences and check the invariant after every single step.
  const offenseIds = ["o1", "o2", "o3", "o4", "o5", "o6", "o7"];

  for (const seed of [1, 7, 42, 1337, 90210]) {
    it(`stays a permutation across 200 arbitrary reassignments (seed ${seed})`, () => {
      const rand = lcg(seed);
      const s = scene();
      const defenders = defenderIds(s);

      for (let i = 0; i < 200; i += 1) {
        const d = defenders[Math.floor(rand() * defenders.length)];
        // Roughly one in five clears, so free-roam entries are exercised in
        // the middle of the sequence rather than only at the end.
        const target = rand() < 0.2 ? null : offenseIds[Math.floor(rand() * offenseIds.length)];
        reassign(s, d, target);
        expectPermutation(s);
      }
    });
  }

  it("never loses coverage it did not deliberately clear", () => {
    // A pure swap sequence (no nulls) must keep exactly seven targets covered
    // forever: swapping conserves the number of assignments.
    const rand = lcg(2024);
    const s = scene();
    const defenders = defenderIds(s);
    const covered = () => defenders.filter((d) => s.matchups[d] !== null).length;
    expect(covered()).toBe(7);

    for (let i = 0; i < 300; i += 1) {
      reassign(
        s,
        defenders[Math.floor(rand() * defenders.length)],
        offenseIds[Math.floor(rand() * offenseIds.length)],
      );
      expect(covered()).toBe(7);
      expectPermutation(s);
    }
  });

  it("a swap is its own inverse", () => {
    const s = scene();
    const before = { ...s.matchups };
    reassign(s, "d2", "o5"); // d2 <-> d5 exchange targets
    expect(s.matchups).not.toEqual(before);
    reassign(s, "d2", "o2"); // swap back
    expect(s.matchups).toEqual(before);
  });
});
