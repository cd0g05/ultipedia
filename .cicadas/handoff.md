---
boundary: kickoff
initiative: fieldview-ui-rework
---

# Handoff: fieldview-ui-rework kickoff

## Just completed

All five specs drafted and Builder-approved (2026-10-03); `kickoff fieldview-ui-rework` run.
`initiative/fieldview-ui-rework` created and pushed; specs promoted to `.cicadas/active/fieldview-ui-rework/`.
`fieldview-motion` was archived first (stale registration, five branches, one worktree removed).
The vertical-tuning WIP is parked on `checkpoint/fieldview-vertical-tuning` (`d2e4836`), not a dependency.
No PR boundaries (`lifecycle.json`): all merges direct.

## Approved/authoritative state

- `.cicadas/active/fieldview-ui-rework/{prd,ux,tech-design,approach,tasks}.md`
- Decisions D1–D12: `docs/fieldview-ui-rework-plan.md` §5. Visual spec: `design/fieldview-watch-explore-mockup.html`, `design/fieldview-desktop-mockup.html`.
- **Deferred by Builder (do NOT build):** defense-following *behaviour* (toggle + pref stub only, "coming soon"; ADR-33 reserved), Advanced settings UI, Present/fullscreen, saved-preset UI, throw/cuts/force/matchup/marquee UI.
- **Placeholders are allowed** (toy setups, plays, copy). Every one must carry `// PLACEHOLDER(fieldview-ui-rework): …` (or `"_placeholder": true`) **and** a row in `docs/fieldview-placeholders.md`; P5 audits.
- Builder preferences: doc-sourced, review-at-end, no PRs; ask before merge to main / canon commit / archive.

## Next action

Partition 1 — `feat/fieldview-ui-render` (tasks 1–13): re-measure baseline on clean `main`
(expected 46 files / 671 tests), audit coords consumers, then horizontal `coords.ts` →
`fieldLayer` → `heatmap` (delete the quarter-turn) → piece language/tokens → `FieldCanvas` sizing,
with a corner-registration test. Start it with `cicadas.py branch feat/fieldview-ui-render --initiative fieldview-ui-rework …`
(Semantic Intent Check first; no peer feature branches are registered).

## Reload list

- `canon/summary.md`
- `active/fieldview-ui-rework/approach.md` front matter + "Partition 1: Render"
- `active/fieldview-ui-rework/tasks.md` front matter + "Partition: feat/fieldview-ui-render"
- `active/fieldview-ui-rework/tech-design.md` § ADR-28, "Brownfield Notes", "Implementation Patterns"
- `frontend/src/fieldview/render/{coords,fieldLayer,heatmap,pieceLayer,tokens}.ts(x)`; canon ADR-2, ADR-10, ADR-11

## Carry forward

- `main`'s `coords.ts` is the **committed vertical** version (no `LATERAL_STRETCH`, `STAGE_MARGIN` top 36).
- Subagent partitions: do **not** use `isolation:"worktree"`; follow memory `cicadas-subagent-worktrees`
  (create the worktree via `cicadas.py branch`, `cd` into it, verify branch, symlink `frontend/node_modules`,
  give the absolute path to `.cicadas/active/` for Reflect).
- Footer-omitted and dismissible-rotate-message assumptions were confirmed by the Builder.
- Open design detail for P2: shared field cell via CSS grid areas vs. portalling (one-canvas invariant is what matters).
- Untracked, deliberately uncommitted: `Field View UI Ideas - Gemini.html`, `fonts/Arena Font/`, `fonts/Druk_Collection/` (licensing).
