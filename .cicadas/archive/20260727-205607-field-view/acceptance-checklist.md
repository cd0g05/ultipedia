---
summary: "The nine brief §8 acceptance checks mapped to their automated test or manual script. Seven are automated as model properties (P3); two are drag/repaint behaviours verified partly automatically and partly by eye (P5). Also carries the client's end-of-initiative visuals/presets/UI review (task 131)."
phase: "tasks"
when_to_load:
  - "When running the acceptance pass with the client."
  - "When checking whether a §8 check is automated or needs a human."
depends_on:
  - "prd.md"
  - "approach.md"
  - "tasks.md"
modules:
  - "frontend/src/fieldview/tests"
index:
  how_to_run: "## How to run"
  checks: "## The nine §8 checks"
  known_tension: "## One known tension"
  visual_review: "## Client visual review (task 131)"
  signoff: "## Sign-off"
next_section: "## Sign-off"
---

# Acceptance Checklist: Field View

Nine checks from brief §8. **Seven are properties of the model** and are executable tests
(`frontend/src/fieldview/tests/acceptance.test.ts`, written in P3). **Two are drag-and-repaint
behaviours** — the parts that can be asserted are, but each also wants thirty seconds of a human
looking at the screen, because "the map follows the mark" is a claim about what a coach sees.

## How to run

```
cd frontend
npm test                        # everything, including all automated §8 checks
npx vitest run src/fieldview    # Field View only
npm run dev                     # then walk the manual checks at localhost:5173/field-view
```

For the frame-budget check, open `http://localhost:5173/field-view?perf=1` — the readout in the
top-right prints grid-compute and paint milliseconds per frame.

---

## The nine §8 checks

| # | Check | Status | Where |
|---|-------|--------|-------|
| 8.1 | On the vert/force-side preset, the open-side lane 5–15 yd upfield of the thrower is the highest-scoring region on the field | **Automated** | `acceptance.test.ts` → "§8.1 — vert/force-side: the open-side lane is the greenest region" (2 tests: global argmax, and outscores dump/break/deep) |
| 8.2 | The break side behind the mark's shadow scores lowest near the force bearing and rises with angular distance; short break-side reset space escapes the shadow | **Automated** | `acceptance.test.ts` → "§8.2 — the mark's shadow" (2 tests) |
| 8.3 | Wide-open dump/reset space scores above the "closed" threshold — yellow, never red | **Automated** | `acceptance.test.ts` → "§8.3 — wide-open dump/reset space reads yellow, never red" |
| 8.4 | With no deep defender the deep third scores mid-range; the *deep help* preset lowers it; adding a cutter deep raises it again | **Automated** | `acceptance.test.ts` → "§8.4 — deep space" (3 tests). See the tension below. |
| 8.5 | Dragging the mark from a side force to flat rotates which side of the field is closed; swinging the thrower across the field flips strong space — **live during the drag** | **Automated + manual** | Model property: `overlay.test.tsx` → "§8.5 — the map follows the mark and the thrower" (2 tests). Live-during-drag: `overlay.test.tsx` → "repaints during the drag, not on release". **Manual: confirm by eye that the map moves under the pointer, not on release.** |
| 8.6 | A cutter adjacent to its matched defender produces mid-range (contested) scores around the pair, not high scores, with no special-casing in the code | **Automated** | `acceptance.test.ts` → "§8.6 — a cutter beside their matched defender yields contested, not green" |
| 8.7 | A defender parked in a throwing lane lowers scores behind it even at cells it cannot beat the disc to | **Automated** | `acceptance.test.ts` → "§8.7 — a defender parked in a throwing lane shades the space behind them" |
| 8.8 | Each of the 6 sliders and each of the 4 layer toggles produces a non-zero score delta on the default presets | **Automated** | `acceptance.test.ts` → "§8.8 — every slider and every layer toggle produces a visible change" (10 generated tests) |
| 8.9 | Grid recompute + paint stays within the frame budget while dragging on ordinary hardware | **Automated + manual** | `overlay.test.tsx` → "§8.9 — frame budget" asserts < 16 ms. Measured: **grid 9.42 ms + paint 0.70 ms = 10.18 ms** (best-of-30, 220 × 80 × 14, M-series laptop). **Manual: drag a piece with `?perf=1` on the client's own machine and confirm the numbers hold.** |

Plus one regression check that is not from §8 but is the reason the v2 model was rejected:

| # | Check | Status | Where |
|---|-------|--------|-------|
| FR-3.2 | With all six cutters removed, far open-side space still scores as open — there is no receiver-reachability gate anywhere | **Automated** | `acceptance.test.ts` → "FR-3.2 regression — openness never requires a receiver" |

---

## One known tension

**§8.1 and §8.4-clause-1 cannot both hold on the same scene**, and this is a property of the
model as the brief specifies it, not a defect.

§8.4's first clause ("with no deep defender the deep third scores mid-range") needs a scene with
no last back. The vert/force-side preset §8.1 is calibrated against *has* a last back, because a
real vert defense does. So §8.4 uses the **Flat Mark** preset as its no-deep-defender baseline.

If the manual run checks §8.4 on the vert preset and sees the deep third scoring low, that is
the last back doing its job — not a failure. Worth knowing before the run rather than during it.

---

## Client visual review (task 131)

The review deferred from Partition 2 to the end. The compensating design decision was ADR-10:
every piece and field visual lives in `render/tokens.ts`, so feedback here should cost a token
edit rather than a component sweep.

Walk both routes and note anything to change:

- [ ] **Piece visuals** — offense vs. defense distinction, thrower and mark identifiability, the mark's direction indicator, the disc, labels, sizes (`render/tokens.ts`)
- [ ] **Field markings** — sidelines, goal lines, brick marks, the attacking-direction indicator (`render/tokens.ts`, `render/fieldLayer.tsx`)
- [ ] **The four built-in presets** — these were explicitly a first pass, not a calibration exercise; the client always intended to author correct ones (`scene/presets.ts`). Note that the vert/force-side preset was recalibrated in P3 to satisfy §8.1.
- [ ] **Heatmap ramp** — the four colour stops and the gamma (`space/constants.ts` → `RAMP_STOPS`, `GAMMA`). The legend reads from the same stops, so it follows automatically.
- [ ] **Rail, tuning panel, readout, timeline** — labels, wording, grouping, defaults
- [ ] **Copy** — every user-facing string across both routes

---

## Where the manual review happens

**Decision (2026-07-27, Builder):** the manual half of this checklist runs against a **deployed
preview**, not localhost, and the initiative merges to `main` before that review rather than
after. The reasoning is that a deploy is the better venue for exactly the checks jsdom cannot
make — the `md:` sub-768 notice and the `xl:` rail reflow can be exercised on real phones and
tablets, and `?perf=1` reads a production build instead of a dev server.

The consequence is recorded plainly: **Field View merges to `main` with its client visual review
outstanding.** That is a deliberate sequencing choice, not a passed check. Adjustments coming out
of the review land as a follow-up `tweak/` branch off `main` via the Cicadas lightweight path —
which is the right shape for the work regardless, since ADR-9 and ADR-10 confine it to
`render/tokens.ts`, `scene/presets.ts`, and `space/constants.ts`.

## Sign-off

| Item | Who | Date | Outcome |
|------|-----|------|---------|
| Automated §8 checks (1, 2, 3, 4, 6, 7, 8 + FR-3.2) | agent | 2026-07-27 | Passing — full suite green (336/336) |
| Browser smoke at 1440 px (paint, prefs, readout, `?perf=1`) | agent | 2026-07-27 | Passing — grid 3.1 ms · paint 0.5 ms · total 3.6 ms |
| §8.5 live-during-drag, by eye | client | — | _pending — deferred to deployed preview_ |
| §8.9 frame budget on the client's hardware (`?perf=1`) | client | — | _pending — deferred to deployed preview_ |
| Visuals / presets / UI review (task 131) | client | — | _pending — deferred to deployed preview_ |
