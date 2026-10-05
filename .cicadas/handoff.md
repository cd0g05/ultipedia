---
boundary: kickoff
initiative: fieldview-build
---

# Handoff: fieldview-build kickoff

## Just completed
Specs for `fieldview-build` approved by the Builder and promoted to `.cicadas/active/fieldview-build/`; branch `initiative/fieldview-build` created from `initiative/fieldview-ui-rework` and pushed.

## Approved/authoritative state
- `.cicadas/active/fieldview-build/approach.md` → partitions P0–P5 (feat/fieldview-build-{cleanup,model,disc-titles,ui,share,qa})
- `.cicadas/active/fieldview-build/tasks.md` → per-partition tasks + boundary tasks
- `.cicadas/active/fieldview-build/tech-design.md` → ADRs 36–43
- `docs/fieldview-build-functional-spec.md` → authoritative Build functional spec
- `design/fieldview-build-mockup.html` → approved UI mockup
- `docs/fieldview-backlog.md`, `docs/fieldview-placeholders.md`

## Next action
Start Partition 0 (`feat/fieldview-build-cleanup`) — only when the Builder asks. Run the semantic intent check, then `cicadas.py branch`.

## Reload list
- `.cicadas/canon/summary.md`
- `.cicadas/active/fieldview-build/approach.md` (front matter + P0 section)
- `.cicadas/active/fieldview-build/tasks.md` (front matter + P0 tasks)

## Carry forward
- Stacked on unmerged PR #6 (`initiative/fieldview-ui-rework` → main); merge it first or rebase afterwards.
- Preferences: doc-sourced, pace all, no PRs, no LLM; Builder approves merge-to-main/canon/archive.
- Never use Agent `isolation:"worktree"` for partitions (forks a throwaway branch).
- Deferred: automatic defense, realistic timing, branching plays, frame reordering, Advanced settings, accounts, PWA.
- Placeholders: extend `tests/placeholderAudit.test.ts` and `docs/fieldview-placeholders.md` for any `PLACEHOLDER(fieldview-build)` marker.
- New deps: fflate, qrcode-generator.
- Local-only unpushed commits on rework branch/main: fdabaea, 834c37f, ef3818e, a540a15, abdd06b; main has eec46a6, 56847f2.
