---
boundary: kickoff
initiative: fieldview-shell
---

# Handoff: fieldview-shell kickoff → first partitions

## Just completed

- Drafted and Builder-approved `prd.md`, `ux.md` (+ 2 HTML mockups), `tech-design.md`,
  `approach.md`, `tasks.md` for `fieldview-shell` (Initiative A of the Field View roadmap).
- Two tweaks applied post-review: tool ribbon is a single row of 4 side-by-side buttons (not a
  2×2 grid), and the field fills most of the canvas's vertical space in the desktop mockup.
- Ran `kickoff fieldview-shell` — promoted specs to `.cicadas/active/fieldview-shell/`, created
  and pushed `initiative/fieldview-shell`.
- Registered the two parallel, no-dependency partitions via `branch.py`, each auto-provisioned a
  worktree:
  - `feat/fieldview-shell-foundation` → `/Users/cartercripe/dev/code/projects/ulti-pedia-feat-fieldview-shell-foundation`
  - `feat/fieldview-shell-tokens` → `/Users/cartercripe/dev/code/projects/ulti-pedia-feat-fieldview-shell-tokens`

## Approved/authoritative state

- `.cicadas/active/fieldview-shell/prd.md`, `ux.md`, `tech-design.md`, `approach.md`, `tasks.md`
  are all authoritative. Read `tech-design.md` ADR-1 (selection in SceneStore, not React state),
  ADR-2 (orientation confined to `coords.ts`), ADR-6 (`#be185d` for shell chrome only) before
  touching either partition's files.
- `.cicadas/active/fieldview-shell/lifecycle.json`: all `pr_boundaries` are `false` — every merge
  in this initiative is direct, no PRs, per Builder preference.
- `.cicadas/active/fieldview-shell/tasks.md` — Foundation is ids 1–10, Tokens is ids 20–24.

## Next action

Implement the two registered partitions (each in its own worktree, in parallel — they touch
disjoint files and have no dependency on each other per `approach.md`'s DAG):

1. **feat/fieldview-shell-foundation** (tasks.md ids 1–10): `scene/selection.ts` (new,
   `SelectionState` union + pure transition helpers), `SceneStore` selection field +
   `subscribeSelection`, orientation rotation in `render/coords.ts` + `getStageViewBox` update.
2. **feat/fieldview-shell-tokens** (tasks.md ids 20–24): `SHELL_TOKENS` in `render/tokens.ts`,
   Tailwind theme extension, confirm `FIELD_TOKENS`/`PIECE_TOKENS` untouched, extend
   `tokensGuard.test.ts`.

Follow `implementation.md` rules: work only within each branch's declared modules, run Reflect
(update `tasks.md` checkboxes) before every commit, run the full existing fieldview test suite to
confirm no regressions, emit `task.complete`/`partition.complete` events, push every commit. Do
NOT open a PR at any boundary (lifecycle has none enabled) — when a partition's tasks are all
complete, stop and report back rather than merging into the initiative branch; the orchestrator
merges after reviewing.

## Reload list

- `.cicadas/active/fieldview-shell/tech-design.md` (ADR-1, ADR-2, ADR-6, Data Models, Testing
  Pattern sections)
- `.cicadas/active/fieldview-shell/tasks.md` (Foundation and Tokens partition sections)
- `.cicadas/active/fieldview-shell/approach.md` (Partition 1 and Partition 2 acceptance criteria)
- Existing `frontend/src/fieldview/scene/store.ts`, `scene/types.ts`, `render/coords.ts`,
  `render/tokens.ts` — read before editing, to match existing conventions (comments-as-rationale
  style, ADR references, existing test file naming like `tokensGuard.test.ts`).

## Carry forward

- Tech-design flags `pages/FieldStage.tsx` as possibly containing orientation-dependent chrome not
  yet inventoried — out of scope for Foundation/Tokens, but worth noting for whoever picks up
  Integration later.
- The 1024px shell breakpoint is UX's proposal, unvalidated against a real tablet — not relevant
  to these two partitions (no shell UI yet), but will matter for Desktop/Mobile partitions next.
