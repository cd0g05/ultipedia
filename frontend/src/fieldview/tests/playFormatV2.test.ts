// Play format v2 and the load-time backfill (tech-design ADR-4).
//
// The stake here is data the user already has. Every play saved before this
// initiative, and every built-in preset, is v1 with no possession and no
// matchups. If one of those throws on load, or loads with the disc in nobody's
// hands, the user opens a play they saved last week and finds it broken —
// which is data loss whatever the file on disk still says. The v1 fixture
// below is deliberately a frozen literal rather than something generated from
// today's code: it is a copy of what a v1 writer actually produced, and it
// must keep loading unchanged no matter what the current model does.
//
// The other half is the ADR-7 rule this extends: malformed OPTIONAL fields are
// dropped like unknown keys, never grounds for rejecting a file whose players
// and positions are intact.

import { describe, expect, it } from "vitest";
import { PLAY_FORMAT_VERSION } from "../play/format";
import type { PlayFile } from "../play/format";
import { validatePlayFile } from "../play/validate";
import { backfillScene, entitiesOf, keyframeOf, playModelOf, toPlayFile } from "../play/serialize";
import { sampleAt } from "../play/tween";
import { getPreset, listPresetNames } from "../scene/presets";
import { presetToScene, sceneToPreset } from "../scene/presetFormat";
import type { Scene } from "../scene/types";

// A v1 file, exactly as the pre-initiative writer emitted one: formatVersion
// 1, no possession, no matchups, the disc recorded only by o1's `thrower`
// role. Do not regenerate this from toPlayFile() — the point is that it is
// frozen.
const V1_FIXTURE = {
  formatVersion: 1,
  name: "Saved last week",
  description: "A v1 play from before the play model existed.",
  field: { length: 110, width: 40, endzone: 20 },
  entities: [
    { id: "o1", team: "offense", role: "thrower", label: "T" },
    { id: "o2", team: "offense", role: "cutter", label: "1" },
    { id: "o3", team: "offense", role: "cutter", label: "2" },
    { id: "d1", team: "defense", role: "mark", label: "M" },
    { id: "d2", team: "defense", role: "defender", label: "1" },
    { id: "d3", team: "defense", role: "defender", label: "2" },
  ],
  keyframes: [
    {
      t: 0,
      positions: {
        o1: { x: 40, y: 20 },
        o2: { x: 55, y: 10 },
        o3: { x: 55, y: 30 },
        d1: { x: 39, y: 20 },
        d2: { x: 53, y: 11 },
        d3: { x: 53, y: 29 },
      },
    },
    {
      t: 2,
      positions: {
        o1: { x: 40, y: 20 },
        o2: { x: 65, y: 14 },
        o3: { x: 50, y: 26 },
        d1: { x: 39, y: 20 },
        d2: { x: 63, y: 15 },
        d3: { x: 48, y: 25 },
      },
    },
  ],
  interpolation: "linear",
};

function throwerOf(scene: Scene) {
  return scene.players.filter((p) => p.role === "thrower");
}

describe("v1 regression — a play saved before the play model still loads (ADR-4)", () => {
  it("accepts a formatVersion 1 file without the v2 fields", () => {
    expect(() => validatePlayFile(V1_FIXTURE)).not.toThrow();
  });

  it("leaves the v2 keys absent on validation rather than inventing a loose disc", () => {
    const imported = validatePlayFile(V1_FIXTURE);
    // "Absent" and "explicitly null" are different facts: only absence may
    // trigger the backfill, so the validator must not collapse them.
    expect(imported.possession).toBeUndefined();
    expect(imported.matchups).toBeUndefined();
  });

  it("backfills possession so the v1 thrower is still holding the disc", () => {
    const scene = sampleAt(validatePlayFile(V1_FIXTURE), 0);
    // The load-bearing assertion of this whole partition: not merely that
    // possession is non-null, but that it names the player the file said was
    // throwing, and that normalize() did not clear it back out afterwards.
    expect(scene.possession).toBe("o1");
    expect(throwerOf(scene).map((p) => p.id)).toEqual(["o1"]);
  });

  it("reproduces every stored role exactly — the scene renders as it did before", () => {
    const scene = sampleAt(validatePlayFile(V1_FIXTURE), 0);
    for (const entity of V1_FIXTURE.entities) {
      const player = scene.players.find((p) => p.id === entity.id);
      expect(player?.role, `role of ${entity.id}`).toBe(entity.role);
      expect(player?.team).toBe(entity.team);
      expect(player?.label).toBe(entity.label);
    }
  });

  it("backfills matchups as a permutation covering every defender", () => {
    const scene = sampleAt(validatePlayFile(V1_FIXTURE), 0);
    expect(Object.keys(scene.matchups).sort()).toEqual(["d1", "d2", "d3"]);
    // The mark must be assigned to the thrower, or the derived mark role above
    // would be coming from a proximity fallback rather than a real matchup.
    expect(scene.matchups.d1).toBe("o1");
    const targets = Object.values(scene.matchups).filter((t) => t !== null);
    expect(new Set(targets).size).toBe(targets.length);
  });

  it("holds through tweening — a mid-play sample still has the same possession", () => {
    const imported = validatePlayFile(V1_FIXTURE);
    const mid = sampleAt(imported, 1);
    expect(mid.possession).toBe("o1");
    expect(throwerOf(mid).map((p) => p.id)).toEqual(["o1"]);
    expect(mid.players.find((p) => p.id === "o2")?.pos).toEqual({ x: 60, y: 12 });
  });

  it("does not rewrite the file on disk — the fixture object is untouched by loading", () => {
    const before = JSON.stringify(V1_FIXTURE);
    validatePlayFile(V1_FIXTURE);
    sampleAt(validatePlayFile(V1_FIXTURE), 0);
    // A user who never re-saves keeps a valid v1 file forever; the backfill is
    // a reading, not a migration.
    expect(JSON.stringify(V1_FIXTURE)).toBe(before);
    expect(V1_FIXTURE.formatVersion).toBe(1);
  });
});

describe("v2 round-trip", () => {
  function v2Play(): PlayFile {
    const scene = getPreset("horizontalStack");
    return toPlayFile({
      name: "With a play model",
      entities: entitiesOf(scene),
      keyframes: [keyframeOf(scene, 0)],
      ...playModelOf(scene),
    });
  }

  it("writes the current format version", () => {
    expect(PLAY_FORMAT_VERSION).toBe(2);
    expect(v2Play().formatVersion).toBe(2);
  });

  it("round-trips possession and matchups exactly through JSON", () => {
    const play = v2Play();
    const reimported = validatePlayFile(JSON.parse(JSON.stringify(play)));
    expect(reimported.possession).toEqual(play.possession);
    expect(reimported.matchups).toEqual(play.matchups);
  });

  it("preserves a stored matchup the geometry would not have guessed", () => {
    // Explicitly cross-assign two defenders, which is exactly the state
    // autoAssign() would destroy on load if stored matchups were ignored.
    const scene = getPreset("horizontalStack");
    const crossed = { ...scene.matchups, d2: "o3", d3: "o2" };
    const play = toPlayFile({
      name: "Switched",
      entities: entitiesOf(scene),
      keyframes: [keyframeOf(scene, 0)],
      possession: scene.possession,
      matchups: crossed,
    });
    const loaded = sampleAt(validatePlayFile(JSON.parse(JSON.stringify(play))), 0);
    expect(loaded.matchups.d2).toBe("o3");
    expect(loaded.matchups.d3).toBe("o2");
  });

  it("round-trips a loose disc as a loose disc, not as a backfilled thrower", () => {
    const scene = getPreset("flatMark");
    const loose: Scene = { ...scene, possession: null };
    const play = toPlayFile({
      name: "Nobody has it",
      entities: entitiesOf(loose),
      keyframes: [keyframeOf(loose, 0)],
      ...playModelOf(loose),
    });
    const loaded = sampleAt(validatePlayFile(JSON.parse(JSON.stringify(play))), 0);
    expect(loaded.possession).toBeNull();
    expect(throwerOf(loaded)).toHaveLength(0);
  });

  it("still drops unknown keys, with the v2 fields present (ADR-7)", () => {
    const play = { ...v2Play(), annotations: [{ kind: "arrow" }], whatever: 1 };
    const imported = validatePlayFile(play);
    expect(imported).not.toHaveProperty("annotations");
    expect(imported).not.toHaveProperty("whatever");
    expect(imported.possession).toBe("o1");
  });
});

describe("malformed v2 fields are ignored, never grounds for rejection", () => {
  function withFields(extra: Record<string, unknown>): unknown {
    return { ...V1_FIXTURE, ...extra };
  }

  it("ignores a wrong-typed possession and falls back to the thrower role", () => {
    for (const bad of [42, true, {}, ["o1"]]) {
      const imported = validatePlayFile(withFields({ possession: bad }));
      expect(imported.possession).toBeUndefined();
      expect(sampleAt(imported, 0).possession).toBe("o1");
    }
  });

  it("ignores a possession naming nobody, rather than emptying the disc", () => {
    const imported = validatePlayFile(withFields({ possession: "ghost" }));
    expect(imported.possession).toBeUndefined();
    expect(sampleAt(imported, 0).possession).toBe("o1");
  });

  it("accepts an explicit null possession as a real statement", () => {
    const imported = validatePlayFile(withFields({ possession: null }));
    expect(imported.possession).toBeNull();
    expect(sampleAt(imported, 0).possession).toBeNull();
  });

  it("ignores a non-object matchups and backfills instead", () => {
    for (const bad of ["nope", 7, ["d1", "o1"], null]) {
      const imported = validatePlayFile(withFields({ matchups: bad }));
      expect(imported.matchups).toBeUndefined();
      expect(sampleAt(imported, 0).matchups.d1).toBe("o1");
    }
  });

  it("sanitises bad entries inside an otherwise usable matchups map", () => {
    const imported = validatePlayFile(
      withFields({
        matchups: {
          d1: "o1",
          d2: 99, // wrong type
          d3: "nobody", // dangling id
          o2: "o3", // key is not a defender
          ghost: "o1", // key is not on the field
        },
      }),
    );
    expect(imported.matchups).toEqual({ d1: "o1", d2: null, d3: null });
    // The file still loads, and the parts that were legible survived.
    const scene = sampleAt(imported, 0);
    expect(scene.possession).toBe("o1");
    expect(scene.players.find((p) => p.id === "d1")?.role).toBe("mark");
  });

  it("breaks a duplicated target so the permutation invariant holds on arrival (ADR-2)", () => {
    const imported = validatePlayFile(
      withFields({ matchups: { d1: "o2", d2: "o2", d3: "o2" } }),
    );
    const targets = Object.values(imported.matchups ?? {}).filter((t) => t !== null);
    expect(targets).toEqual(["o2"]);
    expect(imported.matchups).toEqual({ d1: "o2", d2: null, d3: null });
  });

  it("rejects nothing it did not reject before — structural errors still throw", () => {
    // The forgiving treatment above is scoped to the optional fields; a file
    // missing a position is still a broken file.
    const positions = { ...V1_FIXTURE.keyframes[0].positions } as Record<string, unknown>;
    delete positions.d2;
    expect(() =>
      validatePlayFile(withFields({ keyframes: [{ t: 0, positions }] })),
    ).toThrow(/missing a position/);
  });
});

describe("built-in presets load with a thrower and sensible matchups", () => {
  for (const name of listPresetNames()) {
    it(`${name}: the thrower holds the disc and every defender has a distinct target`, () => {
      const scene = getPreset(name);
      expect(scene.possession).toBe("o1");
      expect(throwerOf(scene).map((p) => p.id)).toEqual(["o1"]);

      const defenders = scene.players.filter((p) => p.team === "defense");
      expect(Object.keys(scene.matchups).sort()).toEqual(defenders.map((d) => d.id).sort());
      const targets = Object.values(scene.matchups).filter((t) => t !== null);
      expect(new Set(targets).size).toBe(targets.length);
      // Exactly one mark, and it is the defender assigned to the thrower.
      const marks = scene.players.filter((p) => p.role === "mark");
      expect(marks).toHaveLength(1);
      expect(scene.matchups[marks[0].id]).toBe("o1");
    });

    it(`${name}: keeps its explicit index pairing rather than being re-paired by geometry`, () => {
      // The vert preset's sagging help defenders sit closer to other cutters,
      // so this is the assertion that catches a "simplification" of the
      // built-ins into autoAssign().
      const scene = getPreset(name);
      for (const p of scene.players) {
        if (p.team !== "defense") continue;
        expect(scene.matchups[p.id], `${name} ${p.id}`).toBe(`o${p.id.slice(1)}`);
      }
    });

    it(`${name}: survives the preset format round-trip with the disc intact`, () => {
      // A preset file stores neither field, so this is the same backfill path
      // as a v1 play — and the built-in's own thrower/mark must come back.
      const restored = presetToScene(sceneToPreset(getPreset(name), "p", "P"));
      expect(restored.possession).toBe("o1");
      expect(throwerOf(restored).map((p) => p.id)).toEqual(["o1"]);
      expect(restored.players.filter((p) => p.role === "mark")).toHaveLength(1);
    });
  }
});

describe("backfillScene ordering", () => {
  it("clears a possession that survived into a roster that no longer has it", () => {
    // normalize() runs last on purpose: a hand-edited file naming a departed
    // player becomes a loose disc, not a phantom thrower.
    const players = getPreset("flatMark").players.filter((p) => p.id !== "o1");
    const scene = backfillScene(players, { possession: "o1", matchups: {} });
    expect(scene.possession).toBeNull();
    expect(throwerOf(scene)).toHaveLength(0);
  });

  it("clears a possession naming a defender", () => {
    const scene = backfillScene(getPreset("flatMark").players, { possession: "d2" });
    expect(scene.possession).toBeNull();
  });

  it("is idempotent — backfilling an already-backfilled scene changes nothing", () => {
    const once = backfillScene(getPreset("deepHelp").players);
    const twice = backfillScene(once.players, playModelOf(once));
    expect(twice.possession).toBe(once.possession);
    expect(twice.matchups).toEqual(once.matchups);
    expect(twice.players.map((p) => p.role)).toEqual(once.players.map((p) => p.role));
  });
});
