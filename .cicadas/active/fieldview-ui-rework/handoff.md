---
boundary: partition-complete
initiative: fieldview-ui-rework
---

# Handoff: all five partitions complete — ready for Builder review

## Just completed

P1 render → P2 frame → P3 explore → P4 watch → P5 touch/QA, each merged into
`initiative/fieldview-ui-rework` with no PRs. Suite: whole `src` **69 files / 991 tests**
(fieldview alone 55 / 884, from 46 / 666 on clean `main`), `tsc -b` clean, `test:perf` within
budget. Not merged to `main`; that and canon/archival are Builder-approval steps.

## For canon synthesis (do on `main`, after Builder approval)

- **Added ADRs:** 28 (horizontal field, orientation only in `coords.ts`), 29 (own full-viewport
  shell outside `Layout`; site header only in the desktop frame), 30 (one content set, one
  `FieldViewFrame` with CSS-switched compact/desktop parts, one canvas), 31 (mode = route; layout
  route owns store/driver/prefs), 32 (heat always on via `FieldHost`; palette is a painter
  parameter; legend from the same stops), **33 reserved/deferred** (defense-follows behaviour),
  34 (Watch: plays are validated frozen `PlayFile`s, imperative playback controller), 35 (touch
  lift baked into the grab offset — amended from the first draft).
- **Superseded:** ADR-11's vertical choice (principle kept), ADR-13 and ADR-14's panel-registry
  half (nothing registers panels now; the old registry/shell are **kept dormant, unrouted**),
  ADR-15's `lg` breakpoint (now the `desktop` screen: ≥1280×640), ADR-16's two-accent split
  (one accent, `#be185d`).
- Canon "Outstanding" should carry: the real-device pass (`docs/fieldview-device-qa.md`) is not
  done; defense-following behaviour and Advanced settings are deferred; setups/plays/copy are toy
  content (`docs/fieldview-placeholders.md`, enforced by `tests/placeholderAudit.test.ts`).

## Open for the Builder

1. Real-device pass (task 105) and any tuning it implies (task 106).
2. Replace the toy content (placeholder register — 19 rows, #19 deferred).
3. **Decision made on my own judgement during P3:** the old shell, `Whiteboard.tsx` and
   `PresetMenu` were NOT deleted (they are unrouted, compiled and tested) so the unsurfaced
   features have a reference UI. Delete them if you would rather (task 107).
4. **Restart your dev server** — `tailwind.config.js` gained the `desktop` screen.
5. Approve merge to `main` → canon synthesis → archive.

## Reload list

- `canon/summary.md`; `active/fieldview-ui-rework/tasks.md` Reflect notes (P1–P5); `tech-design.md` ADR-28…35
- `docs/fieldview-placeholders.md`, `docs/fieldview-device-qa.md`, `docs/fieldview-backlog.md`
