// The play document (fieldview-build ADR-36): resolution, every operation, and
// the properties that make them safe — operations never mutate their (frozen)
// input, every frame stays resolvable, undo restores the exact document.

import { describe, expect, it } from "vitest";
import {
  addFrame,
  cleanTitle,
  deleteFrame,
  duplicateFrame,
  giveDisc,
  newPlay,
  placePlayers,
  playFromScene,
  renamePlay,
  resetFrame,
  resetPlayer,
  resolve,
  resolveAll,
  setFrameLabel,
  setTitle,
  toScene,
} from "../play/model";
import { MAX_FRAMES, PLAYER_COUNT } from "../play/format";
import type { Play } from "../play/format";
import { createHistory, push, redo, undo } from "../play/history";
import { getPreset } from "../scene/presets";

function deepFreeze<T>(v: T): T {
  if (v && typeof v === "object" && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const c of Object.values(v as Record<string, unknown>)) deepFreeze(c);
  }
  return v;
}

const base = (): Play => deepFreeze(newPlay());
const at = (x: number, y: number) => ({ x, y });

describe("resolve", () => {
  it("frame 0 is fully explicit and names a holder", () => {
    const p = base();
    expect(Object.keys(p.frames[0].moved)).toHaveLength(PLAYER_COUNT);
    const r = resolve(p, 0);
    expect(r.holder).toBe(p.frames[0].holder);
    expect(Object.keys(r.positions)).toHaveLength(PLAYER_COUNT);
  });

  it("a new frame inherits everything from the one before", () => {
    const p = addFrame(base(), 0);
    expect(resolve(p, 1).positions).toEqual(resolve(p, 0).positions);
    expect(resolve(p, 1).holder).toBe(resolve(p, 0).holder);
  });

  it("moved wins; the inherit chain runs through several frames", () => {
    let p = addFrame(addFrame(base(), 0), 1);
    p = placePlayers(p, 1, { o2: at(60, 10) });
    expect(resolve(p, 1).positions.o2).toEqual(at(60, 10));
    expect(resolve(p, 2).positions.o2).toEqual(at(60, 10)); // inherited two deep
    p = placePlayers(p, 2, { o2: at(70, 12) });
    expect(resolve(p, 2).positions.o2).toEqual(at(70, 12));
    expect(resolve(p, 1).positions.o2).toEqual(at(60, 10)); // earlier frame untouched
  });

  it("the holder inherits until a later frame gives the disc", () => {
    let p = addFrame(addFrame(base(), 0), 1);
    p = giveDisc(p, 1, "o3");
    expect(resolve(p, 0).holder).toBe("o1");
    expect(resolve(p, 1).holder).toBe("o3");
    expect(resolve(p, 2).holder).toBe("o3");
  });

  it("editing frame 0 moves everyone who inherits, but not a player placed later", () => {
    let p = addFrame(addFrame(base(), 0), 1);
    p = placePlayers(p, 2, { o4: at(80, 5) });
    p = placePlayers(p, 0, { o4: at(41, 41), o5: at(45, 15) });
    expect(resolve(p, 1).positions.o5).toEqual(at(45, 15)); // flows through
    expect(resolve(p, 2).positions.o5).toEqual(at(45, 15));
    expect(resolve(p, 2).positions.o4).toEqual(at(80, 5)); // placed in frame 2: unchanged
    expect(resolve(p, 1).positions.o4.y).toBe(40); // clamped to the field
  });

  it("dropping a player back on the same spot still counts as placed", () => {
    let p = addFrame(base(), 0);
    const here = resolve(p, 0).positions.o2;
    p = placePlayers(p, 1, { o2: here });
    expect(p.frames[1].moved.o2).toEqual(here);
  });

  it("clamps out-of-range indices instead of throwing", () => {
    const p = addFrame(base(), 0);
    expect(resolve(p, 99)).toEqual(resolve(p, 1));
    expect(resolve(p, -3)).toEqual(resolve(p, 0));
  });
});

describe("operations", () => {
  it("addFrame inserts an empty frame after the index and respects MAX_FRAMES", () => {
    let p = base();
    p = addFrame(p, 0);
    expect(p.frames).toHaveLength(2);
    expect(p.frames[1].moved).toEqual({});
    while (p.frames.length < MAX_FRAMES) p = addFrame(p, 0);
    expect(addFrame(p, 0)).toBe(p);
  });

  it("duplicateFrame is an empty frame after it (identical when resolved)", () => {
    let p = addFrame(base(), 0);
    p = placePlayers(p, 1, { o2: at(60, 10) });
    const d = duplicateFrame(p, 1);
    expect(d.frames).toHaveLength(3);
    expect(resolve(d, 2)).toEqual(resolve(d, 1));
  });

  it("deleteFrame refuses the only frame; later frames inherit from what precedes", () => {
    const one = base();
    expect(deleteFrame(one, 0)).toBe(one);
    let p = addFrame(addFrame(one, 0), 1);
    p = placePlayers(p, 1, { o2: at(60, 10) });
    p = deleteFrame(p, 1);
    expect(p.frames).toHaveLength(2);
    expect(resolve(p, 1).positions.o2).toEqual(resolve(p, 0).positions.o2); // its change is gone
  });

  it("deleting frame 0 keeps the play complete by resolving the next frame into it", () => {
    let p = addFrame(base(), 0);
    p = placePlayers(p, 1, { o2: at(60, 10) });
    p = giveDisc(p, 1, "o3");
    const expected = resolve(p, 1);
    p = deleteFrame(p, 0);
    expect(p.frames).toHaveLength(1);
    expect(Object.keys(p.frames[0].moved)).toHaveLength(PLAYER_COUNT);
    expect(resolve(p, 0)).toEqual(expected);
  });

  it("resetFrame clears moved and holder (keeps the label) and is a no-op on frame 0", () => {
    let p = addFrame(base(), 0);
    p = setFrameLabel(p, 1, "Cut");
    p = placePlayers(p, 1, { o2: at(60, 10) });
    p = giveDisc(p, 1, "o3");
    const r = resetFrame(p, 1);
    expect(r.frames[1]).toEqual({ moved: {}, label: "Cut" });
    expect(resetFrame(p, 0)).toBe(p);
  });

  it("resetPlayer makes that player inherit again, and is a no-op on frame 0", () => {
    let p = addFrame(base(), 0);
    p = placePlayers(p, 1, { o2: at(60, 10), o3: at(61, 11) });
    const r = resetPlayer(p, 1, "o2");
    expect(r.frames[1].moved).toEqual({ o3: at(61, 11) });
    expect(resolve(r, 1).positions.o2).toEqual(resolve(r, 0).positions.o2);
    expect(resetPlayer(p, 0, "o2")).toBe(p);
  });

  it("giveDisc is offense only", () => {
    const p = base();
    expect(giveDisc(p, 0, "d2")).toBe(p);
    expect(giveDisc(p, 0, "nobody")).toBe(p);
    expect(giveDisc(p, 0, "o4").frames[0].holder).toBe("o4");
  });

  it("setTitle trims, uppercases and keeps at most two characters; empty clears", () => {
    const p = base();
    expect(cleanTitle("  ab  ")).toBe("AB");
    expect(setTitle(p, "o2", " xyz ").players.find((q) => q.id === "o2")!.title).toBe("XY");
    const named = setTitle(p, "o2", "k");
    expect(setTitle(named, "o2", "  ").players.find((q) => q.id === "o2")!.title).toBeUndefined();
    expect(setTitle(p, "ghost", "A")).toBe(p);
  });

  it("titles are identity: they never change with frames", () => {
    let p = setTitle(base(), "o2", "A");
    p = addFrame(p, 0);
    expect(toScene(p, 1).players.find((q) => q.id === "o2")!.label).toBe("A");
  });

  it("setFrameLabel and renamePlay sanitise", () => {
    let p = addFrame(base(), 0);
    p = setFrameLabel(p, 1, "x".repeat(60));
    expect(p.frames[1].label).toHaveLength(24);
    expect(setFrameLabel(p, 1, " ").frames[1].label).toBeUndefined();
    expect(renamePlay(p, "  My play ", "desc").name).toBe("My play");
    expect(renamePlay(p, "   ").name).toBe(p.name);
  });

  it("ignores an out-of-range frame index", () => {
    const p = base();
    expect(placePlayers(p, 5, { o2: at(1, 1) })).toBe(p);
    expect(giveDisc(p, 5, "o2")).toBe(p);
    expect(setFrameLabel(p, 5, "x")).toBe(p);
  });
});

describe("toScene and playFromScene", () => {
  it("builds a normalized scene: one thrower, mark by geometry, 14 players", () => {
    const s = toScene(base(), 0);
    expect(s.players).toHaveLength(PLAYER_COUNT);
    expect(s.possession).toBe("o1");
    expect(s.players.filter((p) => p.role === "thrower").map((p) => p.id)).toEqual(["o1"]);
    expect(s.players.filter((p) => p.role === "mark").length).toBeLessThanOrEqual(1);
  });

  it("playFromScene round-trips a preset's positions and holder", () => {
    const scene = getPreset("hoStack");
    const play = playFromScene(scene, "Ho");
    const back = toScene(play, 0);
    for (const p of scene.players) {
      expect(back.players.find((q) => q.id === p.id)!.pos).toEqual(p.pos);
    }
    expect(back.possession).toBe(scene.possession);
  });

  it("an unnamed play has no titles", () => {
    expect(newPlay().players.every((p) => p.title === undefined)).toBe(true);
  });
});

// Deterministic pseudo-random op sequences.
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0x100000000);
}

describe("properties", () => {
  const ids = base().players.map((p) => p.id);
  const offense = base().players.filter((p) => p.team === "offense").map((p) => p.id);

  function randomOp(p: Play, rand: () => number): Play {
    const i = Math.floor(rand() * p.frames.length);
    const id = ids[Math.floor(rand() * ids.length)];
    switch (Math.floor(rand() * 9)) {
      case 0: return addFrame(p, i);
      case 1: return duplicateFrame(p, i);
      case 2: return deleteFrame(p, i);
      case 3: return resetFrame(p, i);
      case 4: return resetPlayer(p, i, id);
      case 5: return giveDisc(p, i, offense[Math.floor(rand() * offense.length)]);
      case 6: return setTitle(p, id, String.fromCharCode(65 + Math.floor(rand() * 26)));
      case 7: return setFrameLabel(p, i, `f${i}`);
      default: return placePlayers(p, i, { [id]: at(rand() * 110, rand() * 40) });
    }
  }

  it("random op sequences never mutate frozen input and keep every frame resolvable", () => {
    for (const seed of [1, 7, 42, 1234]) {
      const rand = lcg(seed);
      let p = base();
      for (let n = 0; n < 150; n += 1) {
        p = deepFreeze(randomOp(p, rand)); // a write to the input would throw
        expect(p.frames.length).toBeGreaterThanOrEqual(1);
        expect(p.frames.length).toBeLessThanOrEqual(MAX_FRAMES);
        const all = resolveAll(p);
        expect(all).toHaveLength(p.frames.length);
        for (const r of all) {
          expect(Object.keys(r.positions)).toHaveLength(PLAYER_COUNT);
          expect(offense).toContain(r.holder);
          for (const pos of Object.values(r.positions)) {
            expect(pos.x).toBeGreaterThanOrEqual(0);
            expect(pos.y).toBeLessThanOrEqual(40);
          }
        }
      }
    }
  });

  it("undo of any op restores the exact previous document; redo restores the result", () => {
    const rand = lcg(99);
    let h = createHistory(base());
    for (let n = 0; n < 60; n += 1) {
      const before = h.present;
      const next = deepFreeze(randomOp(before, rand));
      h = push(h, next);
      if (next !== before) {
        expect(undo(h).present).toBe(before);
        expect(redo(undo(h)).present).toBe(next);
      }
    }
  });
});
