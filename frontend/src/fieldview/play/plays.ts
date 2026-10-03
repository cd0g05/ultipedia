// The curated plays Watch offers: validated JSON files in play/builtin/.
//
// Every file goes through the same boundary validator as an imported play
// (ADR-7). A file that fails is SKIPPED and reported, never thrown — one bad
// play must not take the whole mode down. The loaded plays are deep-frozen so
// playback provably cannot mutate them (a write throws in strict mode).
//
// PLACEHOLDER(fieldview-ui-rework): every file under play/builtin/ is a toy
// play carrying `"_placeholder": true` (the validator drops that key; it is
// there for the audit). The Builder replaces them with real plays authored in
// the unlinked /fieldview/designer (docs/fieldview-placeholders.md #3–#5).

import { PlayValidationError, validatePlayFile } from "./validate";
import type { PlayFile } from "./format";

export interface LoadedPlays {
  plays: PlayFile[];
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

// Takes already-parsed JSON keyed by file name; sorted by name so a numeric
// prefix (01-, 02-) sets the order in the list.
export function loadPlays(files: Record<string, unknown>): LoadedPlays {
  const plays: PlayFile[] = [];
  const problems: string[] = [];
  for (const path of Object.keys(files).sort()) {
    try {
      plays.push(deepFreeze(validatePlayFile(files[path])));
    } catch (error) {
      const why = error instanceof PlayValidationError ? error.message : "could not be read";
      problems.push(`${path}: ${why}`);
    }
  }
  return { plays, problems };
}

const modules = import.meta.glob("./builtin/*.json", { eager: true, import: "default" }) as Record<
  string,
  unknown
>;

const loaded = loadPlays(modules);
if (loaded.problems.length > 0 && typeof console !== "undefined") {
  console.warn("Field View: skipped invalid built-in plays:\n" + loaded.problems.join("\n"));
}

export const BUILTIN_PLAYS: readonly PlayFile[] = loaded.plays;
export const BUILTIN_PLAY_PROBLEMS: readonly string[] = loaded.problems;
