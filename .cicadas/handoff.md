---
boundary: "initiative-complete"
initiative: "fieldview-build"
---

# Handoff: fieldview-build — all partitions merged into `initiative/fieldview-build`

## Just completed
P0 clean-up, P1 model, P2 disc/titles/sizes, P3 Build UI, P4 library/sharing and P5 QA are merged into `initiative/fieldview-build` (local `tsc -b`, 1007 tests / 67 files, `test:perf` 27 tests, `vite build` all green). **Not yet merged to `main`:** the Builder approves that, after the `fieldview-ui-rework` PR (#6) — this initiative is stacked on it.

## Approved/authoritative state
- `docs/fieldview-build-functional-spec.md` — what Build does and the data model (still accurate; see deviations below)
- `.cicadas/active/fieldview-build/tech-design.md` → `## Architecture Decisions (ADRs)` (ADR-36 … ADR-43) and its Reflect notes in `tasks.md` per partition
- `design/fieldview-build-mockup.html` — the approved UI
- `docs/fieldview-placeholders.md` (rows 1–5, 20–23 open; 21, 22 tune), `docs/fieldview-device-qa.md` (Build section), `docs/fieldview-backlog.md` ("Status after fieldview-build")

## Next action
1. Builder: run the real-device pass (`docs/fieldview-device-qa.md`, "Build, titles, piece sizes and sharing"); apply tuning (piece scale, holder colour, `TRANSITION_SECONDS`); supply real setups/plays/copy.
2. Builder approves: merge `fieldview-ui-rework` (PR #6) to `main`, then `initiative/fieldview-build` to `main`.
3. Then (Agent): canon synthesis on `main` using the notes below, archive `.cicadas/active/fieldview-build`.

## Reload list
- `.cicadas/active/fieldview-build/tech-design.md` (ADRs), `tasks.md` (Reflect notes P0–P5), `approach.md`
- `.cicadas/canon/*` (to be updated), `docs/fieldview-build-functional-spec.md`

## Carry forward — canon notes
**New ADRs to carry into canon (36–43):** 36 frames inherit, resolved only in `play/model.ts`; 37 format v3 clean break (no v1/v2, no backfill); 38 the mark is geometry (closest defender within `MARK_RADIUS_YD` = 10/3 yd, else none); 39 per-frame holder, the pass is the existing airborne-disc mechanism; 40 `BuildSession` owns the document, the store is a view, one gesture = one placement = one undo step; 41 piece scale per device is one CSS variable on a scaled body; 42 sharing: the whole play in the URL fragment (fflate + base64url, bounded inflate); 43 one library, setups are one-frame plays.

**Supersedes:** the matchup-driven mark (canon ADR-18/19) → ADR-38 (`Scene.matchups` remains only as derived data for the deferred motion engine; `autoAssign` builds it); the single piece radius → radius × `--fv-piece-scale` (grab radius unchanged); the play formats v1/v2, `backfill`, continuous `tween`, `serialize`/`FilePlayStore`, `modeHandoff`, the Whiteboard/Designer/shell UI and user presets (all deleted; last present at commit `085621f`); "thrower-role heavy ring" → green holder ring (heavy ring is the mark only); accessible names `offense cutter 1` → `Offense 2` (+ `aria-description`).

**Deviations from the specs (all recorded in tasks.md Reflect notes):** accessible state is `aria-description`, not part of the name; `deleteFrame(0)` resolves the next frame into the new frame 0; `FORCE_PRESETS.flat.inside` 3.5 → 3.25 yd to stay inside the mark radius; gesture ids = dragged ∪ moved (carried mark included); the library's examples open only as copies; Explore's card edits are live-only; the save pill has a "new" state.

**Module facts:** pure model `play/{format,model,history,validate,interpolate,share,library,plays}.ts`; session `ui/build/*`; guards `inheritanceGuard`, `frameGuard` (extended to `ui/build`), `placeholderAudit` (both markers); no module outside `play/` reads `frame.moved` (use `placedIds` / `discChangedIn`).

**Open for the Builder:** real content and copy (placeholder rows), piece sizes and holder colour on devices, whether 1.2 s per transition feels right, restarting the dev server (the `desktop` Tailwind screen). **Deferred (backlog):** automatic defense / defense-following, realistic timing, branching plays, frame reordering, Advanced settings, accounts, offline/PWA, faint 10 ft circle, compact Explore selected-player card.
