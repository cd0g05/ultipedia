// Producing a PlayFile and *storing* one are separate concerns (ADR-8):
// serialization is pure, and the PlayStore seam means account-backed
// persistence later is a new implementation rather than a rewrite here.

import type { Scene } from "../scene/types";
import { PLAY_FORMAT_VERSION, currentPlayField } from "./format";
import type { PlayEntity, PlayFile, PlayKeyframe } from "./format";
import { PlayValidationError, validatePlayFile } from "./validate";

export interface PlayDraft {
  name: string;
  description?: string;
  entities: PlayEntity[];
  keyframes: PlayKeyframe[];
}

export function entitiesOf(scene: Scene): PlayEntity[] {
  return scene.players.map((p) => ({ id: p.id, team: p.team, role: p.role, label: p.label }));
}

export function keyframeOf(scene: Scene, t: number): PlayKeyframe {
  const positions: Record<string, { x: number; y: number }> = {};
  for (const p of scene.players) positions[p.id] = { x: p.pos.x, y: p.pos.y };
  return { t, positions };
}

export function toPlayFile(draft: PlayDraft): PlayFile {
  return {
    formatVersion: PLAY_FORMAT_VERSION,
    name: draft.name,
    description: draft.description,
    field: currentPlayField(),
    entities: draft.entities.map((e) => ({ ...e })),
    keyframes: [...draft.keyframes]
      .sort((a, b) => a.t - b.t)
      .map((kf) => ({ t: kf.t, positions: { ...kf.positions } })),
    interpolation: "linear",
  };
}

export function fromPlayFile(file: PlayFile): PlayDraft {
  return {
    name: file.name,
    description: file.description,
    entities: file.entities.map((e) => ({ ...e })),
    keyframes: file.keyframes.map((kf) => ({ t: kf.t, positions: { ...kf.positions } })),
  };
}

export interface PlayStore {
  save(play: PlayFile): Promise<void>;
  load(): Promise<PlayFile>;
}

function fileNameFor(play: PlayFile): string {
  const slug = play.name.trim().replace(/\s+/g, "-").toLowerCase().replace(/[^a-z0-9-]/g, "");
  return `${slug || "play"}.json`;
}

// v1 storage: the user's filesystem, via download and a file picker.
export class FilePlayStore implements PlayStore {
  async save(play: PlayFile): Promise<void> {
    const blob = new Blob([JSON.stringify(play, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileNameFor(play);
    link.click();
    URL.revokeObjectURL(url);
  }

  async load(): Promise<PlayFile> {
    const file = await pickFile();
    return this.loadFromFile(file);
  }

  // Split out so a page that already holds a File (drag-drop, an <input>
  // change event) does not have to open a second picker.
  async loadFromFile(file: File): Promise<PlayFile> {
    const text = await readFileText(file);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new PlayValidationError("This file isn't a Field View play.");
    }
    return validatePlayFile(parsed);
  }
}

// Blob.text() is missing on older Safari and in jsdom, and a failed read
// here would surface to the user as "this isn't a Field View play" — a
// wrong and unactionable message. FileReader is the universal path.
function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read that file."));
    reader.readAsText(file);
  });
}

function pickFile(): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) resolve(file);
      else reject(new Error("No file chosen."));
    };
    input.click();
  });
}
