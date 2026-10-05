// The placeholder audit (fieldview-ui-rework NFR-6): every placeholder in code
// carries a `PLACEHOLDER(fieldview-ui-rework)` marker, and every marker cites a
// row in docs/fieldview-placeholders.md. Rows that nothing in code carries must
// be on the explicit list of rows that are not code at all, so a placeholder can
// neither ship unrecorded nor sit in the register after it was resolved without
// someone noticing.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = resolve(__dirname, "../..");
const REGISTER = resolve(__dirname, "../../../../docs/fieldview-placeholders.md");
const TAILWIND = resolve(__dirname, "../../../tailwind.config.js");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|css|json)$/.test(name)) out.push(full);
  }
  return out;
}

// Rows that are deliberately not a marker in code: a deferred feature with no
// code behind it yet (#19 Advanced settings).
// #8 (the Build placeholder card) was resolved by the real Build page.
const NOT_IN_CODE = new Set([8, 19]);

const files = [...walk(SRC), TAILWIND].filter(
  (f) => !f.includes("/tests/") && !f.endsWith("placeholderAudit.test.ts"),
);

const markers: { file: string; text: string; cites: number[] }[] = [];
for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (!/PLACEHOLDER\(fieldview-(ui-rework|build)\)/.test(line)) return;
    // A marker may wrap onto the following comment lines; look there for #N or
    // a range like #3–#5.
    const window = lines.slice(i, i + 6).join(" ");
    const cites: number[] = [];
    for (const m of window.matchAll(/#(\d{1,2})(?:\s*[–-]\s*#?(\d{1,2}))?\b/g)) {
      const from = Number(m[1]);
      const to = m[2] ? Number(m[2]) : from;
      for (let n = from; n <= to; n += 1) cites.push(n);
    }
    markers.push({ file: file.replace(SRC, "src"), text: line.trim(), cites });
  });
}

const register = readFileSync(REGISTER, "utf8");
const rows = new Set(
  [...register.matchAll(/^\| (\d{1,2}) \|/gm)].map((m) => Number(m[1])),
);

describe("placeholder register", () => {
  it("found markers and register rows to compare", () => {
    expect(markers.length).toBeGreaterThan(10);
    expect(rows.size).toBeGreaterThan(10);
  });

  it("every marker cites a register row, and that row exists", () => {
    for (const m of markers) {
      expect(m.cites.length, `${m.file} has a marker with no #N: ${m.text}`).toBeGreaterThan(0);
      for (const n of m.cites) {
        // Only rows that look like register numbers (1..19 today).
        if (n >= 1 && n <= 40) expect(rows.has(n), `${m.file} cites #${n}, not in the register`).toBe(true);
      }
    }
  });

  it("every register row is carried by a marker, or is on the not-in-code list", () => {
    const cited = new Set(markers.flatMap((m) => m.cites));
    const orphans = [...rows].filter((n) => !cited.has(n) && !NOT_IN_CODE.has(n));
    expect(orphans, `register rows with no marker in code: ${orphans.join(", ")}`).toEqual([]);
  });

  it("the toy plays carry the _placeholder key the audit looks for", () => {
    const plays = files.filter((f) => f.includes("play/builtin/") && f.endsWith(".json"));
    expect(plays.length).toBeGreaterThanOrEqual(3);
    for (const f of plays) expect(JSON.parse(readFileSync(f, "utf8"))._placeholder, f).toBe(true);
  });
});
