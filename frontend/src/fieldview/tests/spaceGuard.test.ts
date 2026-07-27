// Two source-scan guards for the space model:
// 1. ADR-1: space/ imports nothing from React, the DOM, or canvas.
// 2. ADR-5: no numeric constant from brief §4.4 appears outside
//    space/constants.ts — the constants file is the single source of truth.

import { describe, expect, it } from "vitest";

const spaceModules = import.meta.glob("../space/*.ts", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

describe("space/ import boundary (ADR-1)", () => {
  const FORBIDDEN = [
    /from ["']react["']/,
    /from ["']react-dom["']/,
    /from ["']\.\.\/render/,
    /from ["']\.\.\/ui/,
    /\bdocument\./,
    /\bwindow\./,
    /HTMLCanvasElement|CanvasRenderingContext2D|OffscreenCanvas/,
  ];
  const entries = Object.entries(spaceModules);

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

describe("no brief-§4.4 constant outside space/constants.ts (ADR-5)", () => {
  // The distinctive numeric literals of brief §4.3/§4.4. Any of these
  // appearing in a space/ file other than constants.ts means a constant was
  // inlined instead of imported.
  const FORBIDDEN_NUMBERS = [
    /0\.92/, // coverage cap
    /2\.2/, // lane radius
    /0\.55/, // lane strength / beat upper edge
    /0\.35/, // cov sigmoid edge
    /0\.15/, // beat sigmoid edge
    /1\.6/, // huck hang coefficient
    /0\.06/, // lane t lower bound
    /0\.94/, // lane t upper bound
    /0\.25/, // head default
    /(?<![\d.])0\.8(?![\d])/, // markStr default / react range edge
    /(?<![\d.])0\.4(?![\d])/, // react default / flight base
    /(?<![\d.])0\.6(?![\d])/, // comp depth / head range edge
    /(?<![\d.])0\.3(?![\d])/, // value floor
    /(?<![\d.])0\.7(?![\d])/, // value span / display gamma
    /0\.42/, // amber ramp stop
    /0\.68/, // green ramp stop
    /(?<![\d.])38(?![\d])/, // mark half-width degrees
    /(?<![\d.])75(?![\d])/, // completion-decay range
    /(?<![\d.])55(?![\d])/, // value gain scale
    /(?<![\d.])70(?![\d])/, // flight hang scale
    /(?<![\d.])20(?![\d])/, // flight linear scale
    /(?<![\d.])15(?![\d])/, // comp near / value gain offset
    /(?<![\d.])10(?![\d])/, // mark ramp far edge
  ];

  // ADR-5 also mandates the brief's formulas as comments — so the scan
  // strips comments and checks only executable code.
  function stripComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  }

  const files = Object.entries(spaceModules).filter(([path]) => !path.endsWith("constants.ts"));

  for (const [path, source] of files) {
    it(`${path} inlines no §4.4 constant`, () => {
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
