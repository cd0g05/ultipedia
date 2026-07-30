// Per-section accent colors — each intake type gets a slightly different warm
// hue so section boundaries read clearly (UX Visual Design Direction). Values
// are inline styles (not dynamic Tailwind classes) so nothing gets purged.

import type { SubmissionType } from "../types";

export interface Accent {
  tint: string; // subtle section background
  bar: string; // accent bar / border
  text: string; // heading color
}

export const SECTION_ACCENT: Record<SubmissionType, Accent> = {
  drill: { tint: "#fdf3ec", bar: "#c96f4a", text: "#a5502f" },
  "strategy.formation": { tint: "#fbf1e6", bar: "#e0a458", text: "#a9741f" },
  "strategy.play": { tint: "#fcefe9", bar: "#e07a5f", text: "#b1503a" },
  "strategy.concept": { tint: "#f6f1ea", bar: "#b08968", text: "#7f6248" },
  other: { tint: "#f3f4ef", bar: "#8a8f7a", text: "#5f6551" },
};
