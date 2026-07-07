// Per-page document head management (ADR-3: client-rendered SEO for MVP).
// react-helmet-async injects a unique <title> and <meta name="description">
// per page, plus optional JSON-LD structured data. The HelmetProvider lives
// in Layout.tsx so every encyclopedia page (and every test driving the
// exported route tree) gets the context without per-test wiring.
//
// The build-time complement is frontend/scripts/generate-sitemap.mjs.

import { Helmet } from "react-helmet-async";
import type { EntryDetail } from "../types";
import { instructionSteps, sectionByType } from "../types";

export const SITE_NAME = "Ultipedia";

/** Compose "Page — Ultipedia" titles consistently. */
export function pageTitle(...parts: string[]): string {
  return [...parts, SITE_NAME].join(" — ");
}

export function Seo({
  title,
  description,
  jsonLd,
}: {
  title: string;
  description: string;
  /** Serialized into a <script type="application/ld+json"> block. */
  jsonLd?: Record<string, unknown> | null;
}) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  );
}

// --- JSON-LD builders --------------------------------------------------------

/** "10 min" / "10-20-min" / "under 10 min" → ISO-8601 duration ("PT10M"), or
 * null when no minute count is recognizable. Best-effort only. */
function isoDuration(label: string): string | null {
  const match = /(\d+)\s*[- ]?min/i.exec(label);
  return match ? `PT${match[1]}M` : null;
}

/**
 * schema.org `HowTo` structured data for DRILL entries (PRD FR-5.3).
 * Steps come from the same body-line parsing the visible numbered
 * instructions use, so the markup always mirrors the rendered page.
 * Returns null for non-drill entries and for drills with no parseable steps
 * (a HowTo without steps is invalid markup — better to emit nothing).
 */
export function howToJsonLd(entry: EntryDetail): Record<string, unknown> | null {
  if (entry.type !== "drill") return null;
  const steps = instructionSteps(entry.body);
  if (steps.length === 0) return null;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: entry.title,
    description: entry.shortDescription,
    step: steps.map((text, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      text,
    })),
  };

  const duration = entry.tags.find((t) => t.category === "duration");
  const totalTime = duration ? isoDuration(duration.name) : null;
  if (totalTime) jsonLd.totalTime = totalTime;

  const equipment = entry.tags
    .filter((t) => t.category === "equipment" && t.name.toLowerCase() !== "none")
    .map((t) => ({ "@type": "HowToSupply", name: t.name }));
  if (equipment.length > 0) jsonLd.supply = equipment;

  const image = entry.media.find((m) => m.type === "image");
  if (image) jsonLd.image = image.url;

  return jsonLd;
}

/** Meta description for an entry page: the short description when present,
 * else the first instruction line, else a typed fallback. Clamped to ~160
 * chars per meta-description convention. */
export function entryDescription(entry: EntryDetail): string {
  const raw =
    entry.shortDescription ||
    instructionSteps(entry.body)[0] ||
    `${entry.title} — an ultimate frisbee ${entry.type} on ${SITE_NAME}.`;
  return raw.length > 160 ? `${raw.slice(0, 157)}…` : raw;
}

/** Unique per-entry title: "{Title} — {Section} — Ultipedia". */
export function entryTitle(entry: EntryDetail): string {
  return pageTitle(entry.title, sectionByType(entry.type).label);
}
