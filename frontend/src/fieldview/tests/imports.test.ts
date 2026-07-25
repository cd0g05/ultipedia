import { describe, expect, it } from "vitest";

const sceneModules = import.meta.glob("../scene/*.ts", { eager: true, query: "?raw", import: "default" }) as Record<
  string,
  string
>;

const FORBIDDEN = [/from ["']react["']/, /from ["']react-dom["']/, /from ["']\.\.\/render/];

describe("scene/ import boundary", () => {
  const entries = Object.entries(sceneModules).filter(([path]) => !path.endsWith(".test.ts"));

  for (const [path, source] of entries) {
    it(`${path} imports nothing from React, the DOM, or render/`, () => {
      for (const pattern of FORBIDDEN) {
        expect(source).not.toMatch(pattern);
      }
    });
  }

  it("found at least one file to check", () => {
    expect(entries.length).toBeGreaterThan(0);
  });
});
