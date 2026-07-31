---
boundary: kickoff
initiative: fieldview-motion
---

# Handoff: fieldview-motion kickoff

## Just completed

Five specs drafted and Builder-approved; `kickoff fieldview-motion` run. `initiative/fieldview-motion`
created and pushed; specs promoted to `.cicadas/active/fieldview-motion/`. No peer feature branches
registered — no intent conflict.

(This file replaced a stale `fieldview-shell` kickoff handoff left behind from Initiative A.)

## Approved/authoritative state

- `.cicadas/active/fieldview-motion/prd.md` — FR-1..FR-7. Growth scope resolved at kickoff:
  multi-waypoint cuts **in**, disc flight **in**, best-positioned defender **deferred**.
- `.cicadas/active/fieldview-motion/tech-design.md` — ADR-1 one stepper (live + headless agree);
  ADR-2 cushion pursuit on a reaction delay; ADR-3 no duplicate `vmax`/`react`/flight-time;
  ADR-4 transient state, no `Scene`/format change; ADR-5 fixed-timestep accumulator (`DT = 1/120`);
  ADR-6 reduced-motion JS exception.
- `.cicadas/active/fieldview-motion/approach.md` — 5 partitions, DAG 1→2→3, then 4 ∥ 5.
- `.cicadas/active/fieldview-motion/tasks.md` — 60 partition tasks + 7 boundary. **No `Open PR:`
  tasks**; `lifecycle.json` has every `pr_boundaries` false. All merges direct.
- Canon `.cicadas/canon/modules/fieldview.md` — ADR-1..ADR-21 still binding. Most at risk here:
  **ADR-2** (React never in the frame path) and **ADR-17** (`normalize()` is the only writer of
  `Player.role`).

## Next action

Partition 1 — `feat/fieldview-motion-core`, tasks 1–13: `motion/types.ts`, `constants.ts`, `vec.ts`,
`kinematics.ts`, `route.ts`, plus `motionGuard.test.ts` (purity + no-duplicate-constants, both halves
mutation-tested). Pure math only — no clock, no store, no React.

## Reload list

- `canon/summary.md`
- `active/fieldview-motion/approach.md` front matter + "Partition 1: Kinematics"
- `active/fieldview-motion/tasks.md` front matter + "Partition: feat/fieldview-motion-core"
- `active/fieldview-motion/tech-design.md` § ADR-1, ADR-3, "Data Models", "Implementation Patterns"
- `frontend/src/fieldview/space/constants.ts` and `space/types.ts` — the structural precedent to
  copy, and the source of `vmax`/`react` that motion must not redeclare.

## Carry forward

- **OPEN (Builder, affects Partition 4):** waypoint-marker dragging. `ux.md` Journey 2 has the coach
  dragging marker `1` shallower to re-run a tweaked cut, but Flow 2 specifies only `Clear`, and no FR
  or task covers marker drag. Either the journey overstates it (clear + re-click) or P4 gains a
  marker-drag task. **Does not block Partitions 1–3.**
- Partitions 4 and 5 both touch `ui/FieldCanvas.tsx` (disjoint regions). Signal on first merge;
  expect a hand-resolved conflict on the second.
- Defaults for `accel`/`decel`/`cushion` are a first pass flagged `NEEDS MANUAL REVIEW` — they want a
  coach's eye on the deployed preview, as `FORCE_PRESETS` did before them.
- Field View has now merged to `main` ahead of its client review twice (shell, play model). The
  roadmap warns this debt recurs each time.
