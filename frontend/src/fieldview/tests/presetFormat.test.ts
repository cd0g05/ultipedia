import { describe, expect, it } from "vitest";
import { getPreset } from "../scene/presets";
import { PresetValidationError, presetToScene, sceneToPreset, validatePresetFile } from "../scene/presetFormat";

describe("sceneToPreset / presetToScene", () => {
  it("round-trips a scene through the preset format", () => {
    const scene = getPreset("vertStackForceSide");
    const preset = sceneToPreset(scene, "test-id", "Test Preset");
    const restored = presetToScene(preset);
    expect(restored.players).toHaveLength(scene.players.length);
    for (const p of scene.players) {
      const other = restored.players.find((q) => q.id === p.id);
      expect(other?.pos).toEqual(p.pos);
      expect(other?.team).toBe(p.team);
      expect(other?.role).toBe(p.role);
    }
  });
});

describe("validatePresetFile", () => {
  it("accepts a well-formed preset produced by sceneToPreset", () => {
    const preset = sceneToPreset(getPreset("flatMark"), "abc", "My Setup");
    expect(() => validatePresetFile(preset)).not.toThrow();
  });

  it("strips a `builtin` flag from imported/stored data", () => {
    const preset = { ...sceneToPreset(getPreset("flatMark"), "abc", "My Setup"), builtin: true };
    const validated = validatePresetFile(preset);
    expect(validated.builtin).toBeUndefined();
  });

  it("rejects a newer format version", () => {
    const preset = { ...sceneToPreset(getPreset("flatMark"), "abc", "x"), formatVersion: 999 };
    expect(() => validatePresetFile(preset)).toThrow(PresetValidationError);
  });

  it("rejects malformed input", () => {
    expect(() => validatePresetFile(null)).toThrow(PresetValidationError);
    expect(() => validatePresetFile("not an object")).toThrow(PresetValidationError);
    expect(() => validatePresetFile({})).toThrow(PresetValidationError);
  });

  it("rejects an entity with an invalid role", () => {
    const preset = sceneToPreset(getPreset("flatMark"), "abc", "x");
    // @ts-expect-error deliberately corrupting for the test
    preset.entities[0].role = "goalkeeper";
    expect(() => validatePresetFile(preset)).toThrow(PresetValidationError);
  });

  it("clamps an out-of-bounds position rather than rejecting it", () => {
    const preset = sceneToPreset(getPreset("flatMark"), "abc", "x");
    const firstId = preset.entities[0].id;
    preset.positions[firstId] = { x: -500, y: 9000 };
    const validated = validatePresetFile(preset);
    expect(validated.positions[firstId].x).toBe(0);
    expect(validated.positions[firstId].y).toBe(40);
  });

  it("length-caps an over-long name", () => {
    const preset = sceneToPreset(getPreset("flatMark"), "abc", "x".repeat(200));
    const validated = validatePresetFile(preset);
    expect(validated.name.length).toBeLessThanOrEqual(60);
  });
});
