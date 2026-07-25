// Whiteboard -> Designer scene handoff. The two modes are separate routes
// with separate scene stores, so "entering Designer carries the current
// scene in as keyframe 1" needs somewhere to put it. sessionStorage rather
// than a module singleton: it survives the full page load a router
// navigation may trigger, and it expires with the tab — the scene is
// explicitly not persisted across sessions (prefs are, the scene is not).

import type { Scene } from "../scene/types";

const HANDOFF_KEY = "fieldview.modeHandoff.scene";

export function stashScene(scene: Scene): void {
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(scene));
  } catch {
    // A full or unavailable sessionStorage costs the handoff, not the mode
    // switch — Designer falls back to the default preset.
  }
}

export function takeScene(): Scene | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(HANDOFF_KEY);
    sessionStorage.removeItem(HANDOFF_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as Scene).players) ||
      (parsed as Scene).players.length === 0
    ) {
      return null;
    }
    return parsed as Scene;
  } catch {
    return null;
  }
}
