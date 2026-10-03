// The curated plays registry (FR-5.1, ADR-34): the toy plays load and validate,
// an invalid file is skipped and reported rather than crashing, and the optional
// keyframe label is additive.

import { describe, expect, it } from "vitest";
import { BUILTIN_PLAYS, BUILTIN_PLAY_PROBLEMS, loadPlays } from "../play/plays";
import { validatePlayFile } from "../play/validate";
import { MAX_KEYFRAME_LABEL_LENGTH } from "../play/format";

describe("built-in plays", () => {
  it("loads at least three, one of them with five or more frames", () => {
    expect(BUILTIN_PLAYS.length).toBeGreaterThanOrEqual(3);
    expect(BUILTIN_PLAYS.some((p) => p.keyframes.length >= 5)).toBe(true);
    expect(BUILTIN_PLAY_PROBLEMS).toEqual([]);
  });

  it("gives every play a name, a description and labelled frames", () => {
    for (const play of BUILTIN_PLAYS) {
      expect(play.name.length).toBeGreaterThan(0);
      expect(play.keyframes.length).toBeGreaterThan(1);
      for (const kf of play.keyframes) expect(kf.label).toBeTruthy();
    }
  });

  it("is deep-frozen", () => {
    const p = BUILTIN_PLAYS[0];
    expect(() => {
      (p.keyframes[0].positions.o1 as { x: number }).x = 5;
    }).toThrow();
  });
});

describe("loadPlays", () => {
  const good = JSON.parse(JSON.stringify(BUILTIN_PLAYS[0]));

  it("skips an invalid file and reports it instead of throwing", () => {
    const { plays, problems } = loadPlays({
      "./builtin/02-good.json": good,
      "./builtin/01-broken.json": { formatVersion: 2, name: "x" },
      "./builtin/03-not-a-play.json": 42,
    });
    expect(plays).toHaveLength(1);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain("01-broken.json");
  });

  it("orders plays by file name so a numeric prefix sets the list order", () => {
    const a = { ...good, name: "A" };
    const b = { ...good, name: "B" };
    const { plays } = loadPlays({ "./builtin/02-b.json": b, "./builtin/01-a.json": a });
    expect(plays.map((p) => p.name)).toEqual(["A", "B"]);
  });
});

describe("keyframe label (additive)", () => {
  const base = JSON.parse(JSON.stringify(BUILTIN_PLAYS[0]));

  it("is kept, length-capped when valid", () => {
    base.keyframes[0].label = "x".repeat(MAX_KEYFRAME_LABEL_LENGTH + 10);
    const file = validatePlayFile(base);
    expect(file.keyframes[0].label).toHaveLength(MAX_KEYFRAME_LABEL_LENGTH);
  });

  it("is dropped, not rejected, when it is not a string; a file without labels still validates", () => {
    const copy = JSON.parse(JSON.stringify(BUILTIN_PLAYS[0]));
    copy.keyframes[0].label = 7;
    delete copy.keyframes[1].label;
    const file = validatePlayFile(copy);
    expect(file.keyframes[0].label).toBeUndefined();
    expect(file.keyframes[1].label).toBeUndefined();
  });
});
