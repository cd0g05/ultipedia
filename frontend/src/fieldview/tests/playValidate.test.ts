import { describe, expect, it } from "vitest";
import { PlayValidationError, validatePlay } from "../play/validate";
import { addFrame, newPlay, placePlayers, giveDisc } from "../play/model";
import { MAX_FRAMES, PLAY_FORMAT_VERSION } from "../play/format";

const good = () => JSON.parse(JSON.stringify(giveDisc(placePlayers(addFrame(newPlay(), 0), 1, { o2: { x: 50, y: 10 } }), 1, "o3")));

function bad(mutate: (p: any) => void, message?: RegExp) {
  const p = good();
  mutate(p);
  expect(() => validatePlay(p)).toThrow(PlayValidationError);
  if (message) expect(() => validatePlay(p)).toThrow(message);
}

describe("validatePlay — rejections", () => {
  it("accepts a good play and returns an equal, fresh copy", () => {
    const raw = good();
    const out = validatePlay(raw);
    expect(out).toEqual(raw);
    expect(out).not.toBe(raw);
  });

  it("refuses any other version", () => {
    for (const v of [1, 2, 4, "3", undefined]) bad((p) => (p.formatVersion = v), /version/);
  });

  it("refuses non-objects, missing names and wrong player counts", () => {
    for (const raw of [null, 42, "x", []]) expect(() => validatePlay(raw)).toThrow(PlayValidationError);
    bad((p) => (p.name = "  "));
    bad((p) => p.players.pop(), /14/);
    bad((p) => p.players.push({ id: "zz", team: "offense" }), /14/);
  });

  it("refuses duplicate ids, bad teams and a roster with no offense", () => {
    bad((p) => (p.players[1].id = p.players[0].id), /share an id/);
    bad((p) => (p.players[0].team = "referee"));
    bad((p) => p.players.forEach((q: any) => (q.team = "defense")));
  });

  it("refuses no frames, too many frames, and malformed frames", () => {
    bad((p) => (p.frames = []));
    bad((p) => (p.frames = Array.from({ length: MAX_FRAMES + 1 }, () => ({ moved: {} }))), /at most/);
    bad((p) => (p.frames[1] = 5));
    bad((p) => delete p.frames[1].moved);
  });

  it("refuses an incomplete frame 0 and a missing or defensive holder", () => {
    bad((p) => delete p.frames[0].moved.o2, /first frame must place/);
    bad((p) => delete p.frames[0].holder, /disc/);
    bad((p) => (p.frames[0].holder = "d1"));
    bad((p) => (p.frames[1].holder = "d1"));
    bad((p) => (p.frames[1].holder = 7));
  });

  it("refuses moved keys that are not players and non-finite positions", () => {
    bad((p) => (p.frames[1].moved.ghost = { x: 1, y: 1 }), /unknown player/);
    bad((p) => (p.frames[1].moved.o2 = { x: "a", y: 1 }));
    bad((p) => (p.frames[1].moved.o2 = { x: NaN, y: 1 }));
    bad((p) => (p.frames[1].moved.o2 = null));
  });
});

describe("validatePlay — sanitising", () => {
  it("drops unknown keys at every level", () => {
    const p = good();
    p.extra = 1;
    p.players[0].role = "thrower";
    p.frames[0].matchups = {};
    const out: any = validatePlay(p);
    expect(out.extra).toBeUndefined();
    expect(out.players[0].role).toBeUndefined();
    expect(out.frames[0].matchups).toBeUndefined();
    expect(out.formatVersion).toBe(PLAY_FORMAT_VERSION);
  });

  it("clamps positions to the field", () => {
    const p = good();
    p.frames[1].moved.o2 = { x: 500, y: -9 };
    expect(validatePlay(p).frames[1].moved.o2).toEqual({ x: 110, y: 0 });
  });

  it("trims, uppercases and caps titles to two characters; drops non-strings", () => {
    const p = good();
    p.players[0].title = " abc ";
    p.players[1].title = 5;
    p.players[2].title = "   ";
    const out = validatePlay(p);
    expect(out.players[0].title).toBe("AB");
    expect(out.players[1].title).toBeUndefined();
    expect(out.players[2].title).toBeUndefined();
  });

  it("caps names, descriptions and frame labels; drops blank or non-string ones", () => {
    const p = good();
    p.name = "n".repeat(200);
    p.description = "d".repeat(900);
    p.frames[0].label = "l".repeat(80);
    p.frames[1].label = 3;
    const out = validatePlay(p);
    expect(out.name).toHaveLength(80);
    expect(out.description).toHaveLength(500);
    expect(out.frames[0].label).toHaveLength(24);
    expect(out.frames[1].label).toBeUndefined();
  });

  it("refuses a __proto__ key and never pollutes the prototype", () => {
    const p = JSON.parse(JSON.stringify(good()).replace('"moved":{', '"moved":{"__proto__":{"x":1,"y":1},'));
    expect(() => validatePlay(p)).toThrow(PlayValidationError);
    expect(({} as any).x).toBeUndefined();
  });
});
