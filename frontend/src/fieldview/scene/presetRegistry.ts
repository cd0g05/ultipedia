// Built-ins and localStorage user presets load through one path (ADR-9).
// There is no privileged code path for built-ins: both are PresetFile
// objects, and the only difference the UI sees is `builtin: true`, which
// suppresses rename/delete in ui/PresetMenu.tsx.

import { PRESET_LABELS, PRESET_NAMES, getPreset } from "./presets";
import { sceneToPreset, validatePresetFile, PresetValidationError } from "./presetFormat";
import type { PresetFile } from "./presetFormat";
import type { Scene } from "./types";

const STORAGE_KEY = "fieldview.userPresets";
const MAX_NAME_LENGTH = 60;

export interface PresetRegistry {
  list(): PresetFile[];
  save(name: string, scene: Scene): PresetFile;
  rename(id: string, name: string): void;
  remove(id: string): void;
  importFile(raw: unknown): PresetFile;
  export(id: string): PresetFile;
  // Not part of ADR-9's interface — supports the 5s Undo toast in
  // ui/PresetMenu.tsx by re-inserting a just-removed user preset.
  restoreRemoved(preset: PresetFile): void;
}

function builtinPresets(): PresetFile[] {
  return PRESET_NAMES.map((name) => ({
    ...sceneToPreset(getPreset(name), name, PRESET_LABELS[name]),
    builtin: true,
  }));
}

function readUserPresets(onNotice?: (message: string) => void): PresetFile[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    onNotice?.("Your saved presets could not be read and were reset.");
    return [];
  }
  if (!Array.isArray(parsed)) {
    onNotice?.("Your saved presets could not be read and were reset.");
    return [];
  }

  const valid: PresetFile[] = [];
  for (const entry of parsed) {
    try {
      // Re-validate on every read: a hand-edited or version-skewed
      // localStorage entry is untrusted input just like an imported file.
      valid.push(validatePresetFile(entry));
    } catch {
      onNotice?.("One of your saved presets was invalid and was dropped.");
    }
  }
  return valid;
}

function writeUserPresets(presets: PresetFile[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function createPresetRegistry(onNotice?: (message: string) => void): PresetRegistry {
  function userPresetId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  return {
    list() {
      return [...builtinPresets(), ...readUserPresets(onNotice)];
    },

    save(name, scene) {
      const preset = sceneToPreset(scene, userPresetId(), name.slice(0, MAX_NAME_LENGTH));
      const presets = readUserPresets(onNotice);
      presets.push(preset);
      writeUserPresets(presets);
      return preset;
    },

    rename(id, name) {
      const presets = readUserPresets(onNotice);
      const preset = presets.find((p) => p.id === id);
      if (!preset) throw new PresetValidationError("Preset not found.");
      preset.name = name.slice(0, MAX_NAME_LENGTH);
      writeUserPresets(presets);
    },

    remove(id) {
      // Built-in ids never live in localStorage, so this is a no-op for
      // them — they expose no delete path in the UI, but the registry
      // itself refuses too.
      const presets = readUserPresets(onNotice);
      writeUserPresets(presets.filter((p) => p.id !== id));
    },

    importFile(raw) {
      const preset = validatePresetFile(raw);
      const presets = readUserPresets(onNotice);
      presets.push(preset);
      writeUserPresets(presets);
      return preset;
    },

    export(id) {
      const preset = this.list().find((p) => p.id === id);
      if (!preset) throw new PresetValidationError("Preset not found.");
      return preset;
    },

    restoreRemoved(preset) {
      const presets = readUserPresets(onNotice);
      presets.push(preset);
      writeUserPresets(presets);
    },
  };
}
