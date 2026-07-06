// Shared test fixtures: canonical EntrySummary/EntryDetail builders matching
// the camelCase types produced by api/client.ts (which tests mock).

import type { EntryDetail, EntrySummary, EntryType } from "../types";

let counter = 0;

export function makeSummary(
  overrides: Partial<EntrySummary> & { type: EntryType }
): EntrySummary {
  counter += 1;
  return {
    id: `id-${counter}`,
    slug: `entry-${counter}`,
    title: `Entry ${counter}`,
    shortDescription: "A short description.",
    skillLevel: "beginner",
    attributes: {},
    tags: [{ name: "Throwing", category: "focus" }],
    ...overrides,
  };
}

export function makeDetail(
  overrides: Partial<EntryDetail> & { type: EntryType }
): EntryDetail {
  return {
    ...makeSummary({ type: overrides.type }),
    body: "Step one.\nStep two.\nStep three.",
    coachingPoints: [],
    commonMistakes: [],
    variations: [],
    media: [],
    similar: [],
    ...overrides,
  };
}
