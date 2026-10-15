// The curated content (FR-5.1, ADR-43): the toy plays and setups load and
// validate, an invalid file is skipped and reported rather than crashing, and
// the lists split cleanly into one-frame setups and multi-frame plays.

import { describe, expect, it } from "vitest";
import { BUILTIN_PLAYS, BUILTIN_PLAY_PROBLEMS, BUILTIN_SETUPS, isSetup, loadPlays } from "../play/plays";

describe("built-in plays", () => {
  it("loads the authored plays, Vertical Stack Flow 1 first", () => {
    expect(BUILTIN_PLAYS.map((p) => p.name)).toEqual(["Vertical Stack Flow 1", "Horizontal Stack Flow 1"]);
    expect(BUILTIN_PLAY_PROBLEMS).toEqual([]);
  });

  it("gives every play a name and a description, and none is a setup", () => {
    for (const play of BUILTIN_PLAYS) {
      expect(play.name.length).toBeGreaterThan(0);
      expect(play.description).toBeTruthy();
      expect(isSetup(play)).toBe(false);
    }
  });

  it("is deep-frozen", () => {
    const p = BUILTIN_PLAYS[0];
    expect(() => {
      (p.frames[0].moved.o1 as { x: number }).x = 5;
    }).toThrow();
  });
});

describe("built-in setups", () => {
  it("are the opening frame of each built-in play, one-frame and unnamed", () => {
    expect(BUILTIN_SETUPS.map((s) => s.name)).toEqual(BUILTIN_PLAYS.map((p) => p.name));
    BUILTIN_SETUPS.forEach((s, i) => {
      expect(isSetup(s)).toBe(true);
      expect(s.frames[0].moved).toEqual(BUILTIN_PLAYS[i].frames[0].moved);
      expect(s.frames[0].holder).toBe(BUILTIN_PLAYS[i].frames[0].holder);
      expect(s.players.every((p) => p.title === undefined)).toBe(true);
    });
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
