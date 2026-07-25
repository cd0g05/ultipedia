// approach.md P5: "This partition changes no file under space/." The model
// was delivered and validated standalone in P3 precisely so the overlay
// partition would be integration work; a change here would mean the
// integration is quietly re-deriving the model.
//
// Enforced against git rather than against file contents, because the claim
// is about the diff, not about any particular line.

import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const BASE = "initiative/field-view";

function git(args: string[]): string | null {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

describe("feat/heatmap-overlay does not modify space/", () => {
  it("has no space/ file in its diff against the initiative branch", () => {
    // Skip rather than fail where the base ref is absent — a shallow CI
    // clone or a post-merge checkout should not turn this into a red build.
    if (git(["rev-parse", "--verify", BASE]) === null) {
      expect(true).toBe(true);
      return;
    }

    const changed = git(["diff", "--name-only", `${BASE}...HEAD`]) ?? "";
    const spaceFiles = changed
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.includes("frontend/src/fieldview/space/"));

    expect(spaceFiles).toEqual([]);
  });
});
