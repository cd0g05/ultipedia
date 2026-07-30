---
summary: "Field View roadmap: 1 tweak amendment + 4 sequential initiatives (shell, play model, motion, designer v2) derived from field-view-changes.md"
phase: "roadmap"
when_to_load:
  - "Before kicking off any fieldview-* initiative"
  - "When deciding what fieldview work comes next"
depends_on:
  - ".cicadas/canon/modules/fieldview.md"
  - "field-view-changes.md (Builder's raw wishlist — source input)"
modules:
  - "frontend/src/fieldview"
index:
  baseline: "## Baseline: what already exists"
  tweak: "## Tweak (in flight): fieldview polish"
  initiative_a: "## Initiative A — fieldview-shell"
  initiative_b: "## Initiative B — fieldview-play-model"
  initiative_c: "## Initiative C — fieldview-motion"
  initiative_d: "## Initiative D — fieldview-designer-v2"
  risks: "## Cross-cutting risks & open questions"
next_section: "## Initiative A — fieldview-shell"
---

# Field View Roadmap

Source input: `field-view-changes.md` (repo root) — the Builder's raw wishlist, written across
several sittings, containing self-superseding ideas (mobile orientation was revised twice) plus a
structured `Field-View Layout & Functionality Architecture` section that is the authoritative
target for the UI overhaul.

**Partitioning decision (2026-07-29):** four **sequential initiatives**, not one mega-initiative.
Each is independently shippable, each substantially rewrites the fieldview canon, and Initiative A
alone is already ~6 partitions. Accepted cost: four rounds of PRD/UX/Tech drafting.

**Status: planned, not kicked off.** None of the four are registered in `registry.json` yet — this
file is their only record. Registration happens at kickoff, one initiative at a time
(`cicadas.py kickoff fieldview-shell ...`), which promotes a `drafts/{name}/` folder to `active/`.
This roadmap is a loose file at the drafts root precisely so kickoff does not try to promote it.

## Baseline: what already exists

Most of this wishlist is **overhaul + extend**, not greenfield. Before drafting any spec, know:

- `pages/Whiteboard.tsx` (mode 1) and `pages/Designer.tsx` (mode 2) both ship. The Designer is
  already keyframe-based with a **continuous tween** timeline (`play/tween.ts`), a versioned JSON
  play format (`play/format.ts`), validation (`play/validate.ts`), and file export/import.
- `scene/types.ts`: exactly 14 players, horizontal field (`+x = attacking`, origin at the back of
  the defending endzone). **The disc is not an entity** — it is derived as "with the thrower",
  deliberately, so it cannot disagree with itself. Roles are a closed union
  (`thrower | cutter | mark | defender`).
- No selection model beyond drag. No matchup assignments. No motion model at all.
- `space/` is a pure, framework-free library with zero UI imports — the precedent to copy for the
  motion library in Initiative C.
- Single choke points: all visuals in `render/tokens.ts`, all yard→pixel in `render/coords.ts`
  (`PIXELS_PER_YARD`, `getStageViewBox`). Going vertical is a transform in `coords.ts`, not a
  rewrite — but `render/pick.ts`, `render/heatmap.ts`, and `render/exportImage.ts` all consume it.
- ADR-1/ADR-2 invariant: a mutable subscribe-store + rAF loop keeps React **out of the drag path**
  (proven by a Profiler test). Do not lift drag or per-frame state into React in any initiative.

## Tweak (in flight): fieldview polish

Folded into the already-open `tweak/field-view-ux` branch, which touches exactly these files:

- Player icons slightly smaller — the field should not feel cramped by oversized pieces.
- `/field-view` → `/fieldview` route rename, **with a redirect from the old path**
  (`router.tsx:27-28`, link in `encyclopedia/components/Layout.tsx`). Branding stays "Field View".

⚠️ **Tension to resolve on the preview, not in spec:** `tweak/field-view-ux` exists *because* the
client's first review said icons were **too small** and the field too cramped. "Slightly smaller"
is a recalibration of a change the client has not yet re-reviewed. Verify against the deployed
preview before treating the sizing as settled.

## Initiative A — fieldview-shell

*Layout, design system, and mobile. Ships first because every feature below plugs into these panes;
building B–D first means building each feature's UI twice.*

- **Vertical field orientation** — offense attacks upward. One orientation transform in
  `coords.ts`; `pick.ts`, `heatmap.ts`, `exportImage.ts` follow. Scene stays in yards and stays
  orientation-agnostic.
- **"Light Film Room" design system** — zero border-radius everywhere; white `#ffffff` / zinc
  `#f4f4f5` grounds separated by crisp 1px `#d4d4d8` borders; dark pink `#be185d` as the sole
  accent; monospace (JetBrains Mono) for UI/data, bold geometric sans for headers. Executed as a
  `render/tokens.ts` + Tailwind theme pass.
- **Three-pane shell** — persistent left sidebar, central canvas, collapsible right sidebar slot
  (the slot Initiative D fills).
- **Selection model in the store** — new state the left sidebar listens to. Prerequisite for the
  contextual sidebar and for marquee-selection to mean anything beyond drag.
- **Left sidebar as a context registry** — fixed top 2×2 tool ribbon (marquee select, throw to
  player, advanced-stats toggle, space-view toggle); a middle section that swaps on selection state
  (none/multi → offense+defense visibility toggles; offensive player; defensive player; the mark);
  bottom system menus (advanced settings sliding up, play designer button). B/C/D **register their
  own panels** into this registry rather than A hardcoding their contents.
- **Mobile layout** — the Builder's final answer supersedes the earlier landscape-mode idea: with a
  vertical field, the field fills the viewport and controls live in a bottom sheet / drawer. No
  landscape prompt. Retires the `<768px` SmallScreenNotice, which currently blocks phones by design
  — and mobile-at-practice is a primary use case.
- Existing `OverlayRail` / `AdvancedPanel` / `PresetMenu` content migrates into the new shell.

## Initiative B — fieldview-play-model

*Disc, throws, matchups, force. Second because both the motion AI (C) and the frame designer (D)
record actions against this model.*

- **Promote the disc to first-class possession state**, retiring the derived-disc invariant. This is
  a deliberate reversal of a documented design decision — the tech-design must say why.
- **Throw-to-player tool** — enter throwing state, click an offensive receiver: disc moves there,
  receiver becomes thrower, assigned (or nearest) defender becomes the mark. Growth: animate disc
  flight.
- **Matchup assignment model** — defender → offensive player, defaulting to an auto-assignment.
  Reassigning triggers a **1-to-1 swap** (the displaced defender inherits the original's mark).
  Plus **no assignment / free roam** for fully manual field setup.
- **Mark controls** — force sides (flat / flick / backhand) × force angles (inside / around /
  default), surfaced in the mark's sidebar context.
- Play-format version bump, **additively** — `validate.ts` already drops unknown keys, so older
  play files must keep loading.

## Initiative C — fieldview-motion

*Physics and defensive tracking. Highest technical risk and the most self-contained; put it behind
an interface so D can consume it while tuning continues.*

- **Pure motion library**, no UI imports, mirroring `space/` — acceleration, top speed,
  deceleration.
- Click an offensive player, click a destination: physics-accurate movement. Growth: **multi-waypoint
  cuts** so a cutter can set up a defender (point A, then point B).
- **Assigned-defender auto-tracking** with reaction time, accel/decel lag, and response to offensive
  direction changes.
- **Non-naive pursuit** — a defender 10 yards deep does not beeline at an approaching cutter; it
  lets the gap close, begins accelerating deep to carry the cut, and matches horizontal movement.
  Cushion and leverage, not shortest path.
- Growth: pick the **best-positioned** defender for a cut, not merely the nearest (the underneath
  defender takes the under cut even if a deeper one is closer).
- Tuning sliders land in Initiative A's advanced settings panel. Existing game-AI pathfinding
  literature is fair game here rather than inventing from scratch.

## Initiative D — fieldview-designer-v2

*Frame-based play designer, replacing the current continuous-tween timeline.*

- **Frame-based state** — each new frame is a full snapshot copy of the previous field state; the
  user repositions, then commits the next frame.
- **Simultaneous resolution** — all actions recorded in a frame play out together on playback,
  independent of the real-time order the Builder dragged them. This is a genuine behavioral change
  from today's single continuous tween.
- **Photoshop-layers right sidebar** — vertical frame list; select (populates canvas), create, lock
  (prevents edits), delete; per-frame expandable **action list** ("cutter #4 a → b", "disc thrown to
  #5") with per-action delete.
- **Playback** — play / next frame / previous frame; frame actions resolve, then a brief pause to
  show the end state, then the next frame. Explicitly *not* one unbroken movement.
- **Save & export** — view saved plays as animation or as stills; JSON export/import (extend the
  existing format) to fully repopulate state; **multi-page PDF** of frames as stills.
- Growth: on-canvas SVG arrows/paths showing movement between the current frame and the next. Canon
  already reserves an `annotations` key for exactly this, and `validate.ts` drops unknown keys, so it
  stays additive.

## Cross-cutting risks & open questions

- ~~**Druk font licensing**~~ — **CLOSED 2026-07-29**, ahead of Initiative A. The heading face is
  **Archivo Black** (SIL OFL 1.1), self-hosted at `frontend/public/fonts/` with its OFL text.
  Druk trial builds were removed (they were committed *and* served from production, which a trial
  license does not permit) and Arena was rejected (personal-use only, forbids web distribution).
  Shipped in `tweak/field-view-ux` → PR #4. **Initiative A therefore inherits a decided typography
  tier**, and its design-system partition covers colour/shape/scale only. The standing rule — a
  display face must be self-hostable under a license permitting web embedding — lives in
  `style-guide/design.md` § Typography.
  Consequence to carry into A: Archivo Black is single-weight, so `font-bold` is gone from every
  `font-heading` element. Do not reintroduce it.
- **Concurrent initiative** — `ulti-pedia-form` is still active with 6 open feature branches. Module
  scopes are disjoint from `frontend/src/fieldview`, so real conflict risk is low, but the registry
  will hold two live initiatives and the signal board is shared per-initiative.
- **A ↔ B parallelism** — B's pure model layer (disc, matchups) has no UI dependency and *could* run
  alongside A's shell work. Kept sequential by default; revisit if A runs long.
- **Client review cadence** — Field View's original client visual review was deferred past its merge
  to `main` by explicit decision, and the current tweak is the first carrying of it. Each initiative
  here should end at a deployed preview the client actually reviews, or the same debt recurs.
- **`Field View UI Ideas - Gemini.html`** — untracked design exploration in the repo root. Decide
  whether it is an Initiative A input worth keeping or should be gitignored/removed.
- **Not in this roadmap** — server-side play storage / URL sharing (the `PlayStore` seam exists but
  everything above stays client-only), and any connection between Field View and the intake or
  encyclopedia products.
