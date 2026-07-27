import { describe, expect, it, vi } from "vitest";
import { createPresetRegistry } from "../scene/presetRegistry";
import { getPreset, PRESET_NAMES } from "../scene/presets";
import { sceneToPreset, validatePresetFile } from "../scene/presetFormat";

describe("PresetRegistry", () => {
  it("lists built-ins first, then user presets", () => {
    const registry = createPresetRegistry();
    registry.save("My Setup", getPreset("flatMark"));
    const list = registry.list();
    expect(list.slice(0, PRESET_NAMES.length).every((p) => p.builtin)).toBe(true);
    expect(list.slice(PRESET_NAMES.length).every((p) => !p.builtin)).toBe(true);
    expect(list).toHaveLength(PRESET_NAMES.length + 1);
  });

  it("save -> reload -> load round-trips through localStorage", () => {
    const registryA = createPresetRegistry();
    const saved = registryA.save("My Setup", getPreset("deepHelp"));

    // Simulate a fresh page load: a new registry instance reading the same storage.
    const registryB = createPresetRegistry();
    const found = registryB.list().find((p) => p.id === saved.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe("My Setup");
    expect(found?.positions).toEqual(saved.positions);
  });

  it("rename updates a user preset but leaves built-ins untouched", () => {
    const registry = createPresetRegistry();
    const saved = registry.save("Original", getPreset("flatMark"));
    registry.rename(saved.id, "Renamed");
    const found = registry.list().find((p) => p.id === saved.id);
    expect(found?.name).toBe("Renamed");
  });

  it("built-ins are undeletable — remove() on a built-in id is a no-op", () => {
    const registry = createPresetRegistry();
    const before = registry.list().length;
    registry.remove("vertStackForceSide");
    expect(registry.list().length).toBe(before);
    expect(registry.list().some((p) => p.id === "vertStackForceSide")).toBe(true);
  });

  it("remove + restoreRemoved supports the 5s Undo flow", () => {
    const registry = createPresetRegistry();
    const saved = registry.save("Temp", getPreset("flatMark"));
    registry.remove(saved.id);
    expect(registry.list().some((p) => p.id === saved.id)).toBe(false);
    registry.restoreRemoved(saved);
    expect(registry.list().some((p) => p.id === saved.id)).toBe(true);
  });

  it("export/import round-trips a preset's positions and entities", () => {
    const registry = createPresetRegistry();
    const saved = registry.save("Exportable", getPreset("horizontalStack"));
    const exported = registry.export(saved.id);

    // A second registry (simulating a different browser) imports the file.
    const registry2 = createPresetRegistry();
    const imported = registry2.importFile(exported);
    expect(imported.positions).toEqual(exported.positions);
    expect(imported.entities).toEqual(exported.entities);
  });

  it("importFile strips a builtin flag on the incoming file", () => {
    const registry = createPresetRegistry();
    const fake = { ...sceneToPreset(getPreset("flatMark"), "spoofed", "Spoofed"), builtin: true };
    const imported = registry.importFile(fake);
    expect(imported.builtin).toBeUndefined();
  });

  it("drops a corrupt localStorage entry with a notice, keeping valid ones", () => {
    const onNotice = vi.fn();
    localStorage.setItem(
      "fieldview.userPresets",
      JSON.stringify([{ not: "a valid preset" }, sceneToPreset(getPreset("flatMark"), "good", "Good")]),
    );
    const registry = createPresetRegistry(onNotice);
    const list = registry.list();
    expect(list.some((p) => p.id === "good")).toBe(true);
    expect(onNotice).toHaveBeenCalled();
  });

  it("resets entirely and notices on unparseable localStorage JSON", () => {
    const onNotice = vi.fn();
    localStorage.setItem("fieldview.userPresets", "{not json");
    const registry = createPresetRegistry(onNotice);
    expect(registry.list()).toHaveLength(PRESET_NAMES.length);
    expect(onNotice).toHaveBeenCalled();
  });

  it("validatePresetFile is exercised on read, not just on import", () => {
    // A hand-edited localStorage entry with an out-of-range position should
    // be clamped rather than crashing the menu.
    const preset = sceneToPreset(getPreset("flatMark"), "edited", "Edited");
    const firstId = preset.entities[0].id;
    preset.positions[firstId] = { x: 99999, y: -99999 };
    localStorage.setItem("fieldview.userPresets", JSON.stringify([preset]));
    const registry = createPresetRegistry();
    const found = registry.list().find((p) => p.id === "edited");
    expect(found).toBeDefined();
    expect(() => validatePresetFile(found)).not.toThrow();
  });
});
