// WCAG AA contrast verification (Partition 5, task 69) for every
// text-on-background combination the encyclopedia UI uses — the film-*
// accent tokens, the difficulty badge palette, and the zinc neutrals.
// jsdom cannot compute contrast (no layout/paint), so this checks the actual
// hex pairs mathematically per the WCAG 2.1 relative-luminance formula.
//
// All checked text is smaller than the WCAG "large text" threshold
// (18.66px bold / 24px regular) somewhere in the UI (mono micro-copy is
// 10–14px), so every pair is held to the full 4.5:1 normal-text minimum —
// deliberately stricter than splitting hairs about which usage is "large".

import { describe, expect, it } from "vitest";

// Tailwind v3 palette values + film-* tokens (tailwind.config.js).
const C = {
  white: "#ffffff",
  "zinc-50": "#fafafa",
  "film-panel (zinc-100)": "#f4f4f5",
  "zinc-500": "#71717a",
  "zinc-600": "#52525b",
  "zinc-700": "#3f3f46",
  "zinc-800": "#27272a",
  "zinc-900": "#18181b",
  "film-accentPink (pink-700)": "#be185d",
  "film-accentPinkDark (pink-800)": "#9d174d",
  "film-accentGreen (emerald-700)": "#047857",
  "emerald-50": "#ecfdf5",
  "emerald-800": "#065f46",
  "yellow-50": "#fefce8",
  "yellow-800": "#854d0e",
  "red-50": "#fef2f2",
  "red-700": "#b91c1c",
  "red-800": "#991b1b",
} as const;

type ColorName = keyof typeof C;

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(fg: string, bg: string): number {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** [foreground, background, where it is used] */
const PAIRS: [ColorName, ColorName, string][] = [
  // Neutral text
  ["zinc-900", "white", "headings, titles, body emphasis"],
  ["zinc-700", "white", "body text, instructions"],
  ["zinc-600", "white", "secondary text, breadcrumbs, nav links"],
  ["zinc-800", "white", "breadcrumb current page"],
  ["zinc-500", "white", "search input placeholder"],
  ["zinc-600", "film-panel (zinc-100)", "footer links/copyright on panel"],
  ["zinc-700", "film-panel (zinc-100)", "coaching point text on panel"],
  ["zinc-900", "film-panel (zinc-100)", "drawer/panel headings"],
  // Pink accent (film-accentPink)
  ["white", "film-accentPink (pink-700)", "primary CTAs, retry, chips hover"],
  ["film-accentPink (pink-700)", "white", "outline buttons, chips, links"],
  ["white", "film-accentPinkDark (pink-800)", "primary CTA hover state"],
  // Green accent (film-accentGreen)
  ["film-accentGreen (emerald-700)", "white", "tag/meta text"],
  ["film-accentGreen (emerald-700)", "zinc-50", "tag chips on zinc-50"],
  // Difficulty/skill badge palette (always paired with its text label)
  ["emerald-800", "emerald-50", "beginner badge"],
  ["yellow-800", "yellow-50", "intermediate badge"],
  ["red-800", "red-50", "advanced badge"],
  ["zinc-700", "zinc-50", "unknown-skill fallback badge"],
  // Inverse chips
  ["white", "zinc-900", "entry-type label chips"],
  // Common-mistakes marker (decorative, but held to AA anyway)
  ["red-700", "white", "common-mistake ✕ marker"],
];

describe("WCAG AA contrast (4.5:1) on all encyclopedia color combinations", () => {
  it.each(PAIRS)("%s on %s (%s)", (fg, bg, _where) => {
    const ratio = contrast(C[fg], C[bg]);
    expect(
      ratio,
      `${fg} on ${bg}: ${ratio.toFixed(2)}:1 — below AA 4.5:1`
    ).toBeGreaterThanOrEqual(4.5);
  });
});
