// Autosave/restore for the in-progress entry, plus the contributor info that is
// captured once and prefilled on later submissions (PRD FR-2.1/2.2, FR-3.3).

import { emptyDraft, type Contributor, type Draft } from "../types";

const DRAFT_KEY = "ulti.draft.v1";
const CONTRIB_KEY = "ulti.contributor.v1";

export function saveDraft(draft: Draft): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadDraft(): Draft | null {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Draft;
    // Merge over a fresh draft so missing keys are tolerated across versions.
    return { ...emptyDraft(), ...parsed };
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}

export function draftHasContent(draft: Draft): boolean {
  if (draft.raw_freeform.trim()) return true;
  return Object.values(draft.fields).some((v) => v.trim());
}

export function saveContributor(c: Contributor): void {
  localStorage.setItem(CONTRIB_KEY, JSON.stringify(c));
}

export function loadContributor(): Contributor {
  const raw = localStorage.getItem(CONTRIB_KEY);
  if (!raw) return { consent_to_credit: false };
  try {
    return JSON.parse(raw) as Contributor;
  } catch {
    return { consent_to_credit: false };
  }
}

// Debounce helper for autosave-on-type.
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number
): (...args: A) => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
