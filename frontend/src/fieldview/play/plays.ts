// The curated content, as validated v3 JSON: the Builder's authored plays in
// play/builtin/ (Watch, and the examples in Build) and the one-frame SETUPS in
// play/builtin/setups/ (Explore's presets, the default layout, the start of a
// new play). A setup is just a one-frame play (fieldview-build ADR-43).
//
// Every file goes through the same boundary validator as an imported play
// (ADR-7). A file that fails is SKIPPED and reported, never thrown — one bad
// file must not take the whole mode down. Loaded plays are deep-frozen so
// nothing can mutate them (a write throws in strict mode); the pure operations
// in model.ts return new plays instead.
//
// PLACEHOLDER(fieldview-build): the setups' order and takeaway sentences (the
// `description` of each file under play/builtin/setups/) are still stand-ins
// (docs/fieldview-placeholders.md #1–#2). The setups themselves and the Flow
// plays are authored.

import { PlayValidationError, validatePlay } from "./validate";
import type { Play } from "./format";

export interface LoadedPlays {
  plays: Play[];
  // One human-readable line per file that was skipped.
  problems: string[];
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export function isSetup(play: Play): boolean {
  return play.frames.length === 1;
}

// Takes already-parsed JSON keyed by file name; sorted by name so a numeric
// prefix (01-, 02-) sets the order in the list.
export function loadPlays(files: Record<string, unknown>): LoadedPlays {
  const plays: Play[] = [];
  const problems: string[] = [];
  for (const path of Object.keys(files).sort()) {
    try {
      plays.push(deepFreeze(validatePlay(files[path])));
    } catch (error) {
      const why = error instanceof PlayValidationError ? error.message : "could not be read";
      problems.push(`${path}: ${why}`);
    }
  }
  return { plays, problems };
}

const playFiles = import.meta.glob("./builtin/*.json", { eager: true, import: "default" }) as Record<
  string,
  unknown
>;

const setupFiles = import.meta.glob("./builtin/setups/*.json", { eager: true, import: "default" }) as Record<
  string,
  unknown
>;

const loadedPlays = loadPlays(playFiles);
const loadedSetups = loadPlays(setupFiles);
const problems = [...loadedPlays.problems, ...loadedSetups.problems];
if (problems.length > 0 && typeof console !== "undefined") {
  console.warn("Field View: skipped invalid built-in plays:\n" + problems.join("\n"));
}

export const BUILTIN_PLAYS: readonly Play[] = loadedPlays.plays;
export const BUILTIN_SETUPS: readonly Play[] = loadedSetups.plays;

// The layout the app starts on everywhere: opening the site, Explore, a new
// play in Build. Vertical Stack 1 (the first built-in setup).
export const DEFAULT_SETUP_NAME = "Vertical Stack 1";
export function defaultSetup(): Play {
  return BUILTIN_SETUPS.find((p) => p.name === DEFAULT_SETUP_NAME) ?? BUILTIN_SETUPS[0];
}

export const BUILTIN_PLAY_PROBLEMS: readonly string[] = problems;
