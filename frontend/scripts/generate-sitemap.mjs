#!/usr/bin/env node
// Build-time sitemap generation (ADR-3: client-rendered SEO — the sitemap is
// produced at build/deploy time, not at runtime). Runs automatically after
// `npm run build` (postbuild) and can be run standalone:
//
//   node scripts/generate-sitemap.mjs
//
// Environment:
//   SITE_URL          public origin for <loc> URLs   (default: https://ultipedia.app)
//   SITEMAP_API_BASE  API to enumerate entries from  (default: http://localhost:8000)
//
// Behavior:
//   - Calls GET /api/entries?type={type} once per entry type (the `type`
//     param is REQUIRED by the API; wire format is snake_case).
//   - With zero published entries (current state: the DB is migrated but
//     empty) it still emits a valid sitemap of the static URLs (home, the
//     five sections, /search).
//   - Fails SOFT if the API is unreachable or errors: warns on stderr, emits
//     the static URLs, exits 0 — a missing backend must never break a build.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = (process.env.SITE_URL ?? "https://ultipedia.app").replace(/\/+$/, "");
const API_BASE = (process.env.SITEMAP_API_BASE ?? "http://localhost:8000").replace(/\/+$/, "");

// Mirrors SECTIONS in src/encyclopedia/types.ts (singular API type ↔ plural
// URL segment). Kept inline: this script runs in plain Node at build time,
// outside the TS/Vite pipeline.
const SECTIONS = [
  { type: "drill", path: "drills" },
  { type: "strategy", path: "strategies" },
  { type: "formation", path: "formations" },
  { type: "play", path: "plays" },
  { type: "skill", path: "skills" },
];

const STATIC_PATHS = ["/", "/search", ...SECTIONS.map((s) => `/${s.path}`)];

async function fetchEntrySlugs(section) {
  const url = `${API_BASE}/api/entries?type=${encodeURIComponent(section.type)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  const entries = await res.json(); // plain array of snake_case EntrySummary
  return entries
    .map((entry) => entry.slug)
    .filter((slug) => typeof slug === "string" && slug.length > 0)
    .map((slug) => `/${section.path}/${encodeURIComponent(slug)}`);
}

function xmlEscape(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("'", "&apos;")
    .replaceAll('"', "&quot;");
}

function buildXml(paths) {
  const urls = paths
    .map((p) => `  <url>\n    <loc>${xmlEscape(`${SITE_URL}${p}`)}</loc>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function main() {
  const entryPaths = [];
  for (const section of SECTIONS) {
    try {
      entryPaths.push(...(await fetchEntrySlugs(section)));
    } catch (error) {
      // Fail soft: a build without a reachable API still gets the static map.
      console.warn(
        `[sitemap] warning: could not list ${section.type} entries (${error.message ?? error}); continuing without them`
      );
    }
  }

  const paths = [...STATIC_PATHS, ...entryPaths];
  const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
  await mkdir(distDir, { recursive: true });
  const outFile = path.join(distDir, "sitemap.xml");
  await writeFile(outFile, buildXml(paths), "utf8");
  console.log(
    `[sitemap] wrote ${outFile}: ${STATIC_PATHS.length} static + ${entryPaths.length} entry URL(s)`
  );
}

main().catch((error) => {
  // Only an unwritable dist/ (or similar local failure) lands here.
  console.error(`[sitemap] error: ${error.message ?? error}`);
  process.exit(1);
});
