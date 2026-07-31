// Two source-scan guards for the motion model, mirroring spaceGuard.test.ts:
// 1. ADR-1: motion/ imports nothing from React, the DOM, or canvas.
// 2. ADR-3: motion/ does not redeclare vmax, react, or a disc flight time —
//    those are the space model's answers, and the heatmap the coach is
//    looking at is computed from them. A second answer here means the
//    animation and the heatmap can disagree about how fast a player runs.
//
// Scanning for ASSIGNMENT rather than for the identifier is deliberate:
// motion/ must be free to *read* sp.vmax and to annotate `vmax: number`
// parameters — using the space model's number is the entire point. What it
// may not do is state a value of its own.

import { describe, expect, it } from "vitest";

const motionModules = import.meta.glob("../motion/*.ts", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("motion/ import boundary (ADR-1)", () => {
  const FORBIDDEN = [
    /from ["']react["']/,
    /from ["']react-dom["']/,
    /from ["']\.\.\/render/,
    /from ["']\.\.\/ui/,
    /\bdocument\./,
    /\bwindow\./,
    /\brequestAnimationFrame\b/,
    /HTMLCanvasElement|CanvasRenderingContext2D|OffscreenCanvas/,
  ];
  const entries = Object.entries(motionModules);

  for (const [path, source] of entries) {
    it(`${path} imports nothing from React, the DOM, or canvas`, () => {
      for (const pattern of FORBIDDEN) {
        expect(source).not.toMatch(pattern);
      }
    });
  }

  it("found at least one file to check", () => {
    expect(entries.length).toBeGreaterThan(0);
  });
});

describe("motion/ is deterministic (PRD Determinism)", () => {
  // Initiative D replays plays. A simulation that consults a random source or
  // the wall clock is not replayable, so neither may appear in motion/ — the
  // driver is the only place in fieldview/ that reads real time (ADR-5).
  const FORBIDDEN = [/Math\.random/, /Date\.now/, /new Date\b/, /performance\.now/];

  for (const [path, source] of Object.entries(motionModules)) {
    it(`${path} reads no random source and no wall clock`, () => {
      const code = stripComments(source);
      for (const pattern of FORBIDDEN) {
        expect(code).not.toMatch(pattern);
      }
    });
  }
});

describe("no space-model constant redeclared in motion/ (ADR-3)", () => {
  // `vmax: 7.0` or `const react = 0.4` — a value being stated. Type
  // annotations (`vmax: number`) and property reads (`sp.react`) are fine and
  // are what motion/ is supposed to do.
  const ASSIGNS_SPACE_PARAM = /\b(vmax|react)\s*[:=]\s*[\d.]/;

  // Importing flightTime from space/ is correct (disc.ts does exactly that).
  // Defining one here is not.
  const DEFINES_FLIGHT_TIME = /(?:function|const|let|var)\s+flightTime\b/;

  for (const [path, source] of Object.entries(motionModules)) {
    it(`${path} states no value for vmax, react, or flight time`, () => {
      const code = stripComments(source);
      expect(code).not.toMatch(ASSIGNS_SPACE_PARAM);
      expect(code).not.toMatch(DEFINES_FLIGHT_TIME);
    });
  }
});

describe("no motion constant inlined outside motion/constants.ts (ADR-3)", () => {
  // The distinctive literals of constants.ts. Any of these in another motion/
  // file means a tunable was inlined instead of imported — which is how a
  // slider silently stops controlling half the model.
  const FORBIDDEN_NUMBERS = [
    /(?<![\d.])6\.0(?![\d])/, // accel default
    /(?<![\d.])9\.0(?![\d])/, // decel default
    /(?<![\d.])3\.0(?![\d])/, // cushion default
    /(?<![\d.])0\.05(?![\d])/, // settle speed
    /(?<![\d.])0\.25(?![\d])/, // max frame seconds
    /(?<![\d.])120(?![\d])/, // fixed step denominator
    /(?<![\d.])30(?![\d])/, // sim ceiling
  ];

  const files = Object.entries(motionModules).filter(([p]) => !p.endsWith("constants.ts"));

  for (const [path, source] of files) {
    it(`${path} inlines no motion constant`, () => {
      const code = stripComments(source);
      for (const pattern of FORBIDDEN_NUMBERS) {
        expect(code).not.toMatch(pattern);
      }
    });
  }

  it("found at least one file to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });
});
