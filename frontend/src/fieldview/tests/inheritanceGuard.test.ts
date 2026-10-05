// Frame inheritance lives in exactly one place (fieldview-build ADR-36):
// play/model.ts `resolve`. Anything else that wants a player's position in a
// frame asks for a ResolvedFrame; it never walks `frame.moved` itself, because a
// second implementation of "inherit from the frame before" is how two views of
// the same play come to disagree. Reading a frame's own `moved` set is allowed
// only where it is the point (play/ for the document itself).

import { describe, expect, it } from "vitest";

const sources = import.meta.glob("../{scene,render,space,motion,pages,ui}/**/*.{ts,tsx}", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

describe("inheritance guard", () => {
  const entries = Object.entries(sources);

  it("found sources to check", () => {
    expect(entries.length).toBeGreaterThan(20);
  });

  for (const [path, source] of entries) {
    it(`${path} does not read frame.moved`, () => {
      expect(source.match(/\.moved\b/g)).toBeNull();
    });
  }
});
