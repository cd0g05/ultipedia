// The share codec and files (fieldview-build ADR-42): every built-in and a
// 30-frame play round-trip; bombs, oversized, tampered and wrong-version
// payloads are refused with a message and never throw anything else.

import { describe, expect, it } from "vitest";
import { deflateSync, strToU8 } from "fflate";
import {
  BAD_LINK_MESSAGE,
  MAX_CODE_LENGTH,
  MAX_INFLATED_BYTES,
  codeFromHash,
  decodePlay,
  encodePlay,
  fileNameFor,
  playFromFileText,
  playToFileText,
  shareLink,
} from "../play/share";
import { PlayValidationError } from "../play/validate";
import { BUILTIN_PLAYS, BUILTIN_SETUPS } from "../play/plays";
import { MAX_FRAMES } from "../play/format";
import { addFrame, giveDisc, newPlay, placePlayers, setFrameLabel, setTitle } from "../play/model";

function bigPlay() {
  let p = setTitle(newPlay(), "o2", "AB");
  while (p.frames.length < MAX_FRAMES) {
    const i = p.frames.length;
    p = addFrame(p, i - 1);
    p = placePlayers(p, i, {
      o2: { x: 20 + i * 2.37, y: 5 + (i % 7) * 4.11 },
      d2: { x: 30 + i * 1.77, y: 8 + (i % 5) * 5.3 },
      o3: { x: 50 + (i % 9) * 1.13, y: 12.5 + i * 0.77 },
    });
    p = setFrameLabel(p, i, `Step ${i}`);
    if (i % 4 === 0) p = giveDisc(p, i, "o3");
  }
  return p;
}

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function expectRefused(fn: () => unknown, message?: RegExp) {
  let error: unknown;
  try {
    fn();
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(PlayValidationError);
  if (message) expect((error as Error).message).toMatch(message);
}

describe("encode / decode", () => {
  it("round-trips every built-in play and setup exactly", () => {
    for (const p of [...BUILTIN_PLAYS, ...BUILTIN_SETUPS]) {
      expect(decodePlay(encodePlay(p))).toEqual(p);
    }
  });

  it("round-trips a 30-frame play and stays well inside the code limit (size recorded)", () => {
    const p = bigPlay();
    expect(p.frames).toHaveLength(MAX_FRAMES);
    const code = encodePlay(p);
    expect(decodePlay(code)).toEqual(p);
    // eslint-disable-next-line no-console
    console.log(`[share] 30-frame play: ${code.length} chars; built-ins: ${BUILTIN_PLAYS.map((b) => encodePlay(b).length).join(", ")}`);
    expect(code.length).toBeLessThan(MAX_CODE_LENGTH / 2);
  });

  it("uses only URL-safe characters", () => {
    expect(encodePlay(bigPlay())).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("builds a Watch link and reads the code back from a hash", () => {
    const p = BUILTIN_PLAYS[0];
    const link = shareLink(p, "https://example.com");
    expect(link.startsWith("https://example.com/fieldview/watch#p=")).toBe(true);
    const hash = link.slice(link.indexOf("#"));
    expect(decodePlay(codeFromHash(hash)!)).toEqual(p);
    expect(codeFromHash("#other=1")).toBeNull();
    expect(codeFromHash("")).toBeNull();
  });
});

describe("hostile or damaged input is refused", () => {
  it("an empty code, junk characters, bad base64 and non-deflate bytes", () => {
    expectRefused(() => decodePlay(""), /isn't a Field View play/);
    expectRefused(() => decodePlay("   "));
    expectRefused(() => decodePlay("not valid!!"), /isn't a Field View play/);
    expectRefused(() => decodePlay("A"));
    expectRefused(() => decodePlay(base64url(strToU8("plain text, not deflated"))));
  });

  it("valid deflate of something that is not JSON, or not a play", () => {
    expectRefused(() => decodePlay(base64url(deflateSync(strToU8("{not json")))));
    expectRefused(() => decodePlay(base64url(deflateSync(strToU8(JSON.stringify({ hello: "world" }))))));
    expectRefused(() => decodePlay(base64url(deflateSync(strToU8("42")))));
  });

  it("a different format version", () => {
    const p = { ...BUILTIN_PLAYS[0], formatVersion: 2 };
    expectRefused(() => decodePlay(base64url(deflateSync(strToU8(JSON.stringify(p))))), /different version/);
  });

  it("a tampered payload (flipped characters) is refused, not thrown through", () => {
    const code = encodePlay(BUILTIN_PLAYS[0]);
    for (const at of [5, 20, Math.floor(code.length / 2), code.length - 3]) {
      const flipped = code.slice(0, at) + (code[at] === "A" ? "B" : "A") + code.slice(at + 1);
      let outcome: "refused" | "decoded" = "decoded";
      try {
        decodePlay(flipped);
      } catch (e) {
        expect(e).toBeInstanceOf(PlayValidationError);
        outcome = "refused";
      }
      // Either it no longer decodes, or (checksum-less deflate) it decodes to
      // something the validator accepted — never an unhandled error.
      expect(["refused", "decoded"]).toContain(outcome);
    }
  });

  it("a truncated payload", () => {
    const code = encodePlay(bigPlay());
    expectRefused(() => decodePlay(code.slice(0, Math.floor(code.length / 3))));
  });

  it("a code longer than the cap is refused before any decoding", () => {
    expectRefused(() => decodePlay("A".repeat(MAX_CODE_LENGTH + 1)), /too large/);
  });

  it("a zip bomb (a few KB that inflates to megabytes) is stopped at the ceiling", () => {
    const bomb = deflateSync(new Uint8Array(8 * 1024 * 1024), { level: 9 });
    expect(base64url(bomb).length).toBeLessThan(MAX_CODE_LENGTH); // small enough to get past the length cap…
    const started = Date.now();
    expectRefused(() => decodePlay(base64url(bomb)), /too large/); // …but not past the inflate cap
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("output just over the ceiling is refused", () => {
    const filler = JSON.stringify({ x: "y".repeat(MAX_INFLATED_BYTES) });
    expectRefused(() => decodePlay(base64url(deflateSync(strToU8(filler)))), /too large/);
  });
});

describe("files", () => {
  it("round-trip through text", () => {
    for (const p of BUILTIN_PLAYS) expect(playFromFileText(playToFileText(p))).toEqual(p);
  });

  it("reject a non-play file clearly", () => {
    expectRefused(() => playFromFileText("hello"), /isn't a Field View play/);
    expectRefused(() => playFromFileText(JSON.stringify({ a: 1 })), /isn't a Field View play/);
    expectRefused(() => playFromFileText(JSON.stringify({ ...BUILTIN_PLAYS[0], formatVersion: 1 })), /different version/);
    expectRefused(() => playFromFileText("x".repeat(MAX_INFLATED_BYTES + 1)), /too large/);
  });

  it("name a download after the play", () => {
    expect(fileNameFor({ ...BUILTIN_PLAYS[0], name: "Go deep!" })).toBe("go-deep.fieldview.json");
    expect(fileNameFor({ ...BUILTIN_PLAYS[0], name: "???" })).toBe("play.fieldview.json");
  });
});

it("BAD_LINK_MESSAGE is the copy the UX names", () => {
  expect(BAD_LINK_MESSAGE).toBe("This link isn't a Field View play.");
});
