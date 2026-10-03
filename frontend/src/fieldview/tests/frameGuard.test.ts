// Structural guards for the new frame (fieldview-ui-rework P5), replacing the
// retired shell's `shellGuard`: the invariants a future edit could break
// without any single test noticing.
//  - the FieldCanvas is rendered exactly once, by FieldHost (ADR-30)
//  - exactly one MotionDriverProvider, in FieldViewApp (ADR-26/31)
//  - shared content never imports a frame/chrome component
//  - no hex colour literal in the new UI outside the token files
//  - orientation is encoded only in render/coords.ts (ADR-28)

import { describe, expect, it } from "vitest";

const sources = import.meta.glob(
  [
    "../ui/app/*.tsx",
    "../ui/app/*.ts",
    "../ui/content/*.tsx",
    "../ui/content/*.ts",
    "../ui/playback/*.ts",
    "../pages/Explore.tsx",
    "../pages/Watch.tsx",
    "../pages/Build.tsx",
    "../render/*.ts",
    "../render/*.tsx",
  ],
  { eager: true, query: "?raw", import: "default" },
) as Record<string, string>;

const entries = Object.entries(sources);
const under = (prefix: string) => entries.filter(([p]) => p.startsWith(prefix));

describe("one canvas, one driver", () => {
  it("renders <FieldCanvas exactly once across the new UI, in FieldHost", () => {
    const hits = entries.filter(([, src]) => /<FieldCanvas[\s>]/.test(src)).map(([p]) => p);
    expect(hits).toEqual(["../ui/app/FieldHost.tsx"]);
  });

  it("mounts exactly one MotionDriverProvider, in FieldViewApp", () => {
    const hits = entries.filter(([, src]) => /<MotionDriverProvider[\s>]/.test(src)).map(([p]) => p);
    expect(hits).toEqual(["../ui/app/FieldViewApp.tsx"]);
  });

  it("only FieldViewFrame renders <FieldHost", () => {
    const hits = entries.filter(([, src]) => /<FieldHost[\s>]/.test(src)).map(([p]) => p);
    expect(hits).toEqual(["../ui/app/FieldViewFrame.tsx"]);
  });
});

describe("content stays frame-agnostic", () => {
  for (const [path, src] of under("../ui/content/")) {
    it(`${path} imports no frame or chrome`, () => {
      expect(src).not.toMatch(/from\s+["']\.\.\/app\//);
      expect(src).not.toMatch(/FieldViewFrame|MenuDrawer|SettingsPopover/);
    });
  }
});

describe("no visual literal in the new UI", () => {
  const files = [...under("../ui/app/"), ...under("../ui/content/"), ...under("../ui/playback/"), ...under("../pages/")];
  for (const [path, src] of files) {
    it(`${path} has no hex colour literal`, () => {
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
  }
});

describe("orientation lives only in render/coords.ts (ADR-28)", () => {
  // The words that would mean a file is deciding which screen axis is which.
  const SMELLS = [/attacks? up\b/i, /up the screen/i, /screen-vertical/i, /rotate\(/];
  for (const [path, src] of entries.filter(([p]) => !p.endsWith("render/coords.ts"))) {
    it(`${path} does not encode an orientation`, () => {
      for (const smell of SMELLS) expect(src).not.toMatch(smell);
    });
  }
});
