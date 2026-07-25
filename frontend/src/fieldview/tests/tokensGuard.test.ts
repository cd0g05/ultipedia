// ADR-10: every piece/field visual literal lives in render/tokens.ts. This
// guard scans the other render/ and pages/ components for hex color
// literals — the one hard signal of a smuggled-in visual value — and
// asserts there are none outside tokens.ts itself.

import { describe, expect, it } from "vitest";

const modules = import.meta.glob(["../render/*.ts", "../render/*.tsx", "../pages/*.tsx"], {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;

describe("no visual literal outside tokens.ts", () => {
  const files = Object.entries(modules).filter(([path]) => !path.endsWith("tokens.ts"));

  for (const [path, source] of files) {
    it(`${path} has no hex colour literal`, () => {
      expect(source).not.toMatch(HEX_COLOR);
    });
  }

  it("found at least one file to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });
});
