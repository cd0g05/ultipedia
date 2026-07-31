// The guard for tech-design ADR-1.
//
// Canon's original rule was that the disc is derived from the thrower role
// "so it cannot disagree with itself". This initiative inverts that
// derivation — possession is stored, roles are computed — which is only safe
// while normalize() is the sole author of `thrower` and `mark`. If any code
// path can set a role directly, or any mutation can return without
// normalizing, the two facts can drift apart and the original bug is back.
//
// This file is what proves they cannot: a behavioural half that hammers every
// public op and re-checks the invariant after each one, and a static half
// that asserts possession.ts is still the only module that writes a role.

import { describe, expect, it } from "vitest";
import { movePlayer, moveThrower } from "../scene/scene";
import { normalize, throwTo } from "../scene/possession";
import { autoAssign, reassign } from "../scene/matchups";
import { getPreset, listPresetNames } from "../scene/presets";
import { presetToScene, sceneToPreset } from "../scene/presetFormat";
import { sampleAt } from "../play/tween";
import { entitiesOf, keyframeOf, toPlayFile } from "../play/serialize";
import type { Scene } from "../scene/types";

// THE invariant. Everything else in this file exists to reach states that
// might violate it.
function expectRolesAgreeWithPossession(s: Scene, context: string): void {
  const throwers = s.players.filter((p) => p.role === "thrower");
  const marks = s.players.filter((p) => p.role === "mark");

  if (s.possession === null) {
    expect(throwers, `${context}: loose disc must have no thrower`).toHaveLength(0);
    expect(marks, `${context}: loose disc must have no mark`).toHaveLength(0);
    return;
  }

  // Exactly one thrower, and it is the possessor — never a second, never
  // somebody else, never zero while somebody holds the disc.
  expect(throwers.map((p) => p.id), `${context}: thrower must be the possessor`).toEqual([
    s.possession,
  ]);
  // The possessor is always an offensive player on the field.
  const possessor = s.players.find((p) => p.id === s.possession);
  expect(possessor?.team, `${context}: possessor must be on offense`).toBe("offense");
  // At most one mark, always on the defence.
  expect(marks.length, `${context}: at most one mark`).toBeLessThanOrEqual(1);
  for (const m of marks) expect(m.team, `${context}: the mark is a defender`).toBe("defense");
}

function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe("ADR-1 guard — no public op leaves a thrower who is not the possessor", () => {
  it("holds on every built-in preset as constructed", () => {
    for (const name of listPresetNames()) {
      expectRolesAgreeWithPossession(getPreset(name), `preset ${name}`);
    }
  });

  // The full public surface of the model partition. Anything added to
  // scene/, possession.ts or matchups.ts belongs in this list.
  const ops: Array<{ name: string; run: (s: Scene, rand: () => number) => void }> = [
    {
      name: "movePlayer",
      run: (s, rand) => {
        const p = s.players[Math.floor(rand() * s.players.length)];
        movePlayer(s, p.id, { x: rand() * 130 - 10, y: rand() * 50 - 5 });
      },
    },
    {
      name: "moveThrower",
      run: (s, rand) => moveThrower(s, { x: rand() * 130 - 10, y: rand() * 50 - 5 }),
    },
    {
      name: "throwTo",
      run: (s, rand) => {
        const p = s.players[Math.floor(rand() * s.players.length)];
        throwTo(s, p.id); // deliberately includes defenders and the holder
      },
    },
    { name: "throwTo(ghost)", run: (s) => throwTo(s, "ghost") },
    { name: "autoAssign", run: (s) => autoAssign(s) },
    {
      name: "reassign",
      run: (s, rand) => {
        const d = s.players[Math.floor(rand() * s.players.length)];
        const o = s.players[Math.floor(rand() * s.players.length)];
        reassign(s, d.id, rand() < 0.25 ? null : o.id);
      },
    },
    { name: "normalize", run: (s) => normalize(s) },
  ];

  for (const op of ops) {
    it(`holds after ${op.name} alone`, () => {
      const rand = lcg(11);
      for (let i = 0; i < 50; i += 1) {
        const s = getPreset("vertStackForceSide");
        op.run(s, rand);
        expectRolesAgreeWithPossession(s, op.name);
      }
    });
  }

  for (const seed of [3, 17, 99, 2718, 31415]) {
    it(`holds after every step of a 300-op random sequence (seed ${seed})`, () => {
      const rand = lcg(seed);
      const s = getPreset("horizontalStack");
      for (let i = 0; i < 300; i += 1) {
        const op = ops[Math.floor(rand() * ops.length)];
        op.run(s, rand);
        expectRolesAgreeWithPossession(s, `${op.name} at step ${i}`);
      }
    });
  }

  it("holds once possession has been driven to null and ops keep running", () => {
    const rand = lcg(555);
    const s = getPreset("deepHelp");
    // Remove the holder entirely — the harshest way to reach a loose disc.
    s.players = s.players.filter((p) => p.id !== "o1");
    normalize(s);
    expect(s.possession).toBeNull();

    for (let i = 0; i < 200; i += 1) {
      const op = ops[Math.floor(rand() * ops.length)];
      op.run(s, rand);
      expectRolesAgreeWithPossession(s, `post-removal ${op.name}`);
    }
  });

  it("holds across a preset and play-format round trip", () => {
    const s = getPreset("flatMark");
    expectRolesAgreeWithPossession(presetToScene(sceneToPreset(s, "p1", "P")), "preset round trip");

    const play = toPlayFile({
      name: "Guard play",
      description: "",
      entities: entitiesOf(s),
      keyframes: [keyframeOf(s, 0)],
    });
    expectRolesAgreeWithPossession(sampleAt(play, 0), "play round trip");
  });
});

describe("ADR-1 guard — normalize() is the only writer of Player.role", () => {
  // Static counterpart to the behavioural tests above, in the spirit of
  // imports.test.ts: a new mutation that sets a role by hand would pass every
  // behavioural test that does not happen to call it, but fails here.
  const sources = import.meta.glob("../{scene,play,render,ui,pages}/**/*.{ts,tsx}", {
    eager: true,
    query: "?raw",
    import: "default",
  }) as Record<string, string>;

  const entries = Object.entries(sources);

  it("found the source files to check", () => {
    expect(entries.length).toBeGreaterThan(10);
  });

  for (const [path, source] of entries) {
    if (path.endsWith("scene/possession.ts")) continue;
    it(`${path} does not assign Player.role directly`, () => {
      // `.role = ` on anything, excluding `dataset.role` (a DOM attribute,
      // nothing to do with the scene model) and `===` comparisons.
      const assignments = source.match(/(?<!dataset)\.role\s*=(?!=)/g);
      expect(assignments).toBeNull();
    });
  }
});
