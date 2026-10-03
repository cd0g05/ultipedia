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

// fieldview-shell ADR-6 introduced SHELL_TOKENS (the "Light Film Room" chrome
// palette) beside PIECE_TOKENS/FIELD_TOKENS. The UI rework (ADR-28 et al.)
// unified the accent on #be185d, so the token groups now agree on colour while
// staying separate groups.

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

  it("shares one accent with the piece/field layer (ADR-16 superseded by the UI rework)", () => {
    expect(SHELL_TOKENS.accent).toBe(PIECE_TOKENS.focusRing.stroke);
    expect(SHELL_TOKENS.accent).toBe(FIELD_TOKENS.marquee.stroke);
  });
});

describe("FIELD_TOKENS/PIECE_TOKENS follow the Light Film Room system (fieldview-ui-rework)", () => {
  it("FIELD_TOKENS use the style-guide pink and zinc line colour", () => {
    expect(FIELD_TOKENS.attackLabel.fill).toBe("#be185d");
    expect(FIELD_TOKENS.attackLabel.text).toBe("ATTACKING →");
    expect(FIELD_TOKENS.marquee.stroke).toBe("#be185d");
    expect(FIELD_TOKENS.marquee.fill).toBe("#be185d");
    expect(FIELD_TOKENS.lineColor).toBe("#a1a1aa");
    expect(FIELD_TOKENS.reticle.stroke).toBe("#ffffff");
  });

  it("team identity does not rest on hue: offense is a filled dark disc, defense a white disc with a ring", () => {
    expect(PIECE_TOKENS.offense.fill).toBe("#18181b");
    expect(PIECE_TOKENS.offense.labelFill).toBe("#ffffff");
    expect(PIECE_TOKENS.defense.fill).toBe("#ffffff");
    expect(PIECE_TOKENS.defense.stroke).toBe("#18181b");
    expect(PIECE_TOKENS.defense.labelFill).toBe("#18181b");
  });

  it("pieces are sized for a huddle and all share one radius", () => {
    // PLACEHOLDER(fieldview-ui-rework): the radius itself is a first guess
    // (docs/fieldview-placeholders.md #12); what must hold is that thrower and
    // mark are not bigger than anyone else.
    expect(PIECE_TOKENS.offense.radius).toBeGreaterThanOrEqual(10);
    expect(PIECE_TOKENS.defense.radius).toBe(PIECE_TOKENS.offense.radius);
    expect(PIECE_TOKENS.special.radius).toBe(PIECE_TOKENS.offense.radius);
  });

  it("the focus ring and disc use the system colours", () => {
    expect(PIECE_TOKENS.focusRing.stroke).toBe("#be185d");
    expect(PIECE_TOKENS.disc.stroke).toBe("#18181b");
    expect(PIECE_TOKENS.markDirection.stroke).toBe("#18181b");
  });
});
