import { describe, expect, it } from "vitest";
import {
  clearDraft,
  draftHasContent,
  loadContributor,
  loadDraft,
  saveContributor,
  saveDraft,
} from "../state/draft";
import { emptyDraft } from "../types";

describe("draft autosave/restore", () => {
  it("round-trips a draft through localStorage", () => {
    const d = { ...emptyDraft(), type: "drill" as const, raw_freeform: "4 lines" };
    saveDraft(d);
    expect(loadDraft()).toEqual(d);
  });

  it("returns null when nothing is saved", () => {
    expect(loadDraft()).toBeNull();
  });

  it("clears a draft", () => {
    saveDraft({ ...emptyDraft(), type: "other", raw_freeform: "x" });
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it("detects content vs empty/whitespace", () => {
    expect(draftHasContent(emptyDraft())).toBe(false);
    expect(draftHasContent({ ...emptyDraft(), raw_freeform: "   " })).toBe(false);
    expect(draftHasContent({ ...emptyDraft(), fields: { a: " hi " } })).toBe(true);
  });
});

describe("contributor prefill", () => {
  it("persists and restores contributor info for the next submission", () => {
    saveContributor({ name: "Maya", email: "m@x.com", consent_to_credit: true });
    const c = loadContributor();
    expect(c.name).toBe("Maya");
    expect(c.consent_to_credit).toBe(true);
  });

  it("defaults to no-consent when nothing stored", () => {
    expect(loadContributor()).toEqual({ consent_to_credit: false });
  });
});
