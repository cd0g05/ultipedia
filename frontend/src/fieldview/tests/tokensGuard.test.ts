// ADR-10: every piece/field visual literal lives in render/tokens.ts. This
// guard scans the other render/ and pages/ components for hex color
// literals — the one hard signal of a smuggled-in visual value — and
// asserts there are none outside tokens.ts itself.

import { describe, expect, it } from "vitest";
import { FIELD_TOKENS, PIECE_TOKENS, SHELL_TOKENS } from "../render/tokens";

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

// fieldview-shell ADR-6: a new SHELL_TOKENS export carries the "Light Film
// Room" shell-chrome palette; PIECE_TOKENS/FIELD_TOKENS (the game-entity
// accent, #EF4B8A) must be byte-for-byte unmodified by that partition. A
// reviewer should be able to see from this test alone that the two systems
// were kept separate, without diffing render/tokens.ts by hand.
describe("SHELL_TOKENS (ADR-6)", () => {
  it("exports the shell-chrome palette specified in ADR-6", () => {
    expect(SHELL_TOKENS).toEqual({
      accent: "#be185d",
      ground: {
        base: "#ffffff",
        panel: "#f4f4f5",
      },
      border: "#d4d4d8",
    });
  });

  it("does not reuse the piece/field accent color (#EF4B8A)", () => {
    expect(SHELL_TOKENS.accent).not.toBe(PIECE_TOKENS.focusRing.stroke);
  });
});

describe("FIELD_TOKENS/PIECE_TOKENS are untouched by the tokens partition (ADR-6)", () => {
  it("FIELD_TOKENS still uses the #EF4B8A game-entity accent", () => {
    expect(FIELD_TOKENS.attackArrowColor).toBe("#EF4B8A");
    expect(FIELD_TOKENS.attackLabel.fill).toBe("#EF4B8A");
    expect(FIELD_TOKENS.marquee.stroke).toBe("#EF4B8A");
    expect(FIELD_TOKENS.marquee.fill).toBe("#EF4B8A");
    expect(FIELD_TOKENS.lineColor).toBe("#a1a1aa");
    expect(FIELD_TOKENS.reticle.stroke).toBe("#ffffff");
  });

  it("PIECE_TOKENS still uses its existing colors and sizes", () => {
    expect(PIECE_TOKENS.offense.fill).toBe("#4F941D");
    expect(PIECE_TOKENS.defense.fill).toBe("#D64B4A");
    expect(PIECE_TOKENS.disc.fill).toBe("#f4f4f5");
    expect(PIECE_TOKENS.disc.stroke).toBe("#18181b");
    expect(PIECE_TOKENS.markDirection.stroke).toBe("#18181b");
    expect(PIECE_TOKENS.label.fill).toBe("#ffffff");
    expect(PIECE_TOKENS.focusRing.stroke).toBe("#EF4B8A");
    expect(PIECE_TOKENS.offense.radius).toBe(7.5);
    expect(PIECE_TOKENS.defense.radius).toBe(7.5);
    expect(PIECE_TOKENS.special.radius).toBe(7.5);
  });
});
