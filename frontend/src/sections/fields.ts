// Field definitions per submission type (from the plan's per-type lists).
// All optional; a freeform catch-all is rendered separately on every type.

import type { SubmissionType } from "../types";

export interface FieldDef {
  key: string;
  label: string;
  tooltip?: string;
}

const TAGS_TOOLTIP =
  "Treat these like tags — short, comma-separated (e.g. agility, throwing, warmup).";

export const FIELD_SETS: Record<SubmissionType, FieldDef[]> = {
  drill: [
    { key: "name", label: "Drill name" },
    { key: "overview", label: "Overview", tooltip: "A 1–2 sentence summary, if you can." },
    { key: "concepts", label: "Concepts / focus", tooltip: TAGS_TOOLTIP },
    { key: "setup", label: "Setup", tooltip: "How do you set the drill up?" },
    { key: "walkthrough", label: "How it runs" },
    { key: "focuses", label: "Coaching focuses", tooltip: "What to encourage, watch for, or aim at." },
  ],
  "strategy.formation": [
    { key: "name", label: "Formation name" },
    { key: "focus", label: "What to focus on", tooltip: "What should teams think about running this?" },
    { key: "common_mistakes", label: "Common mistakes", tooltip: "Where do teams go wrong most often?" },
    { key: "best_situations", label: "Best situations" },
    { key: "other", label: "Other wisdom" },
  ],
  "strategy.play": [
    { key: "name", label: "Play name" },
    { key: "formation", label: "Formation to run it from" },
    { key: "setup", label: "How to set it up" },
    { key: "run", label: "How to run it", tooltip: "Where people go, where the throw goes, etc." },
    { key: "goals", label: "Goals", tooltip: "What does it accomplish ideally?" },
    { key: "cautions", label: "Watch out for" },
    { key: "other", label: "Other info" },
  ],
  "strategy.concept": [
    { key: "name", label: "Concept name" },
    { key: "notes", label: "What should people know?" },
  ],
  other: [],
};

export const TYPE_LABELS: Record<SubmissionType, string> = {
  drill: "Drill",
  "strategy.formation": "Formation",
  "strategy.play": "Play design",
  "strategy.concept": "Concept",
  other: "Other",
};
