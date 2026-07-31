// Play format, boundary validation, serialization round-trip, and tween
// correctness (approach.md Partition 4 acceptance criteria).

import { describe, expect, it } from "vitest";
import { PLAY_FORMAT_VERSION } from "../play/format";
import type { PlayFile } from "../play/format";
import { PlayValidationError, validatePlayFile } from "../play/validate";
import { entitiesOf, fromPlayFile, keyframeOf, toPlayFile } from "../play/serialize";
import { playDuration, sampleAt, samplePositions } from "../play/tween";
import { getPreset } from "../scene/presets";
import { FIELD } from "../scene/field";

function samplePlay(): PlayFile {
  const scene = getPreset("vertStackForceSide");
  const entities = entitiesOf(scene);
  const shifted = {
    ...scene,
    players: scene.players.map((p) => ({ ...p, pos: { x: p.pos.x + 5, y: p.pos.y } })),
  };
  return toPlayFile({
    name: "Test play",
    description: "Two frames.",
    entities,
    keyframes: [keyframeOf(scene, 0), keyframeOf(shifted, 2)],
  });
}

describe("play format + serialization", () => {
  it("exports a file carrying formatVersion, entities, sorted keyframes and an explicit field", () => {
    const play = samplePlay();
    expect(play.formatVersion).toBe(PLAY_FORMAT_VERSION);
    expect(play.interpolation).toBe("linear");
    expect(play.field).toEqual({ length: FIELD.length, width: FIELD.width, endzone: FIELD.endzone });
    expect(play.entities).toHaveLength(14);
    expect(play.keyframes.map((kf) => kf.t)).toEqual([0, 2]);
  });

  it("sorts keyframes on export even when handed them out of order", () => {
    const scene = getPreset("flatMark");
    const play = toPlayFile({
      name: "Out of order",
      entities: entitiesOf(scene),
      keyframes: [keyframeOf(scene, 3), keyframeOf(scene, 0), keyframeOf(scene, 1.5)],
    });
    expect(play.keyframes.map((kf) => kf.t)).toEqual([0, 1.5, 3]);
  });

  it("round-trips export -> import to an identical scene sequence", () => {
    const play = samplePlay();
    const reimported = validatePlayFile(JSON.parse(JSON.stringify(play)));
    expect(fromPlayFile(reimported)).toEqual(fromPlayFile(play));
    expect(sampleAt(reimported, 1)).toEqual(sampleAt(play, 1));
  });
});

describe("import validation (ADR-7)", () => {
  it("rejects a non-object", () => {
    expect(() => validatePlayFile("nope")).toThrow(PlayValidationError);
    expect(() => validatePlayFile(null)).toThrow(/isn't a Field View play/);
  });

  it("rejects a newer formatVersion with a specific message", () => {
    const play = { ...samplePlay(), formatVersion: PLAY_FORMAT_VERSION + 1 };
    expect(() => validatePlayFile(play)).toThrow(/newer version/);
  });

  it("rejects a wrong-typed keyframe timestamp", () => {
    const play = samplePlay();
    const bad = { ...play, keyframes: [{ ...play.keyframes[0], t: "soon" }] };
    expect(() => validatePlayFile(bad)).toThrow(/timestamp/);
  });

  it("rejects a file whose keyframe is missing a declared entity's position", () => {
    const play = samplePlay();
    const positions = { ...play.keyframes[0].positions };
    delete positions[play.entities[3].id];
    const bad = { ...play, keyframes: [{ t: 0, positions }] };
    expect(() => validatePlayFile(bad)).toThrow(/missing a position/);
  });

  it("rejects duplicate entity ids and duplicate keyframe timestamps", () => {
    const play = samplePlay();
    expect(() =>
      validatePlayFile({ ...play, entities: [...play.entities, play.entities[0]] }),
    ).toThrow(/two players with the id/);
    expect(() =>
      validatePlayFile({ ...play, keyframes: [play.keyframes[0], { ...play.keyframes[0] }] }),
    ).toThrow(/two keyframes at/);
  });

  it("rejects an unknown interpolation mode", () => {
    expect(() => validatePlayFile({ ...samplePlay(), interpolation: "bezier" })).toThrow(
      /interpolation mode/,
    );
  });

  it("sorts out-of-order keyframes rather than rejecting them", () => {
    const play = samplePlay();
    const scrambled = { ...play, keyframes: [play.keyframes[1], play.keyframes[0]] };
    expect(validatePlayFile(scrambled).keyframes.map((kf) => kf.t)).toEqual([0, 2]);
  });

  it("clamps out-of-bounds positions instead of importing a piece off the field", () => {
    const play = samplePlay();
    const id = play.entities[0].id;
    const positions = { ...play.keyframes[0].positions, [id]: { x: 9999, y: -40 } };
    const imported = validatePlayFile({ ...play, keyframes: [{ t: 0, positions }] });
    expect(imported.keyframes[0].positions[id]).toEqual({ x: FIELD.length, y: 0 });
  });

  it("caps name, description, and entity label lengths", () => {
    const play = samplePlay();
    const imported = validatePlayFile({
      ...play,
      name: "n".repeat(500),
      description: "d".repeat(2000),
      entities: play.entities.map((e, i) => (i === 0 ? { ...e, label: "L".repeat(50) } : e)),
    });
    expect(imported.name).toHaveLength(80);
    expect(imported.description).toHaveLength(500);
    expect(imported.entities[0].label).toHaveLength(10);
  });

  it("drops unknown keys rather than rejecting them, so a future annotated play still loads", () => {
    const play = samplePlay();
    const future = {
      ...play,
      annotations: [{ kind: "arrow", from: { x: 10, y: 10 }, to: { x: 30, y: 20 } }],
      somethingElseEntirely: true,
    };
    const imported = validatePlayFile(future);
    expect(imported).not.toHaveProperty("annotations");
    expect(imported).not.toHaveProperty("somethingElseEntirely");
    expect(fromPlayFile(imported)).toEqual(fromPlayFile(play));
  });
});

describe("tween", () => {
  it("interpolates linearly between the bracketing keyframes", () => {
    const keyframes = [
      { t: 0, positions: { a: { x: 0, y: 0 } } },
      { t: 2, positions: { a: { x: 10, y: 20 } } },
    ];
    expect(samplePositions(keyframes, 1).a).toEqual({ x: 5, y: 10 });
    expect(samplePositions(keyframes, 0.5).a).toEqual({ x: 2.5, y: 5 });
  });

  it("holds the first and last pose outside the play's extent", () => {
    const keyframes = [
      { t: 1, positions: { a: { x: 3, y: 3 } } },
      { t: 2, positions: { a: { x: 9, y: 9 } } },
    ];
    expect(samplePositions(keyframes, 0).a).toEqual({ x: 3, y: 3 });
    expect(samplePositions(keyframes, 99).a).toEqual({ x: 9, y: 9 });
  });

  it("pairs entities by id, not array index — reordering does not teleport a piece", () => {
    const play = samplePlay();
    const reordered = {
      entities: [...play.entities].reverse(),
      keyframes: play.keyframes.map((kf) => ({
        t: kf.t,
        // Rebuild the position map in reverse insertion order too, so index
        // agreement is broken on both sides.
        positions: Object.fromEntries(Object.entries(kf.positions).reverse()),
      })),
    };

    const straight = sampleAt(play, 1);
    const shuffled = sampleAt(reordered, 1);
    for (const player of straight.players) {
      const other = shuffled.players.find((p) => p.id === player.id);
      expect(other?.pos).toEqual(player.pos);
    }
  });

  it("reports the duration as the last keyframe's timestamp", () => {
    expect(playDuration(samplePlay())).toBe(2);
    expect(playDuration({ keyframes: [] })).toBe(0);
  });
});
