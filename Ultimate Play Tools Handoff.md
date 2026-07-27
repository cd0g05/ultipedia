# Ultipedia play tools — handoff brief

**From:** Carter (client/architect) via Claude
**To:** Claude Code (implementing agent)
**Covers:** The play-design toolset for Ultipedia — coaching whiteboard, play designer/animator, and the strong/weak space visualizer, including the fully validated space model.

**How to read this document:** Sections 4 (the space model) and 8 (acceptance checks) are *validated requirements* — they were calibrated by feel through three working prototype iterations with the client, who is an experienced college captain and club-level ultimate player. Implement the model exactly as specified before proposing changes. Sections 5–6 are product requirements with some latitude in execution. All technology choices (framework, rendering approach, state management, file layout) are yours; Section 9 records what the prototype proved feasible so you don't have to re-derive it. When a requirement here conflicts with an implementation convenience, the requirement wins; when something is genuinely ambiguous, ask the client rather than guessing.

---

## 1. Project context

Ultipedia is a public encyclopedia and practice-planning site for ultimate frisbee coaches and captains — aimed especially at newer teams, less-experienced teams, and teams without a dedicated coach. The broader site (separate spec) includes a browsable database of drills, strategies, formations, plays, and skills; tag-driven search and filtering; an automatic practice planner with PDF export; accounts and favorites; community submissions with moderation; and a drill visualizer with both a manual drag-and-drop editor and AI-generated animations as a differentiator.

It deploys on a subdomain of the client's personal site (`ultipedia.cartercripe.com`), independent of the main site's Vercel deployment.

The single guiding design principle for everything on the site: **intuitive and easy to use above all else.** A coach should land with zero onboarding and get what they need in a couple of clicks. Every UX decision in this brief inherits that principle.

This brief covers the play-design toolset within that site. It is deliberately not a technical spec — it is the idea, the rationale, the domain model, and the validated math. The engineering is yours.

## 2. One product, three modes

Do not build three separate tools. Build one shared scene model and expose it through three modes:

The **scene model** is the core: a field (regulation, see §4.2), a set of players each with a team (offense/defense) and role (thrower, mark, cutter, defender), and the disc (attached to the thrower). Everything below is a view or a function of this scene.

**Mode 1 — Whiteboard.** Freeform: drag players and the disc around a field while talking through concepts. No timeline, no save required to be useful. This is the foundation and should be built first.

**Mode 2 — Play designer / animator.** The whiteboard plus a keyframe timeline. A play is an ordered list of keyframed scenes with timestamps; playback tweens player and disc positions between keyframes. Needs: add/delete/reorder keyframes, scrub, play/pause, and per-play metadata (name, description). The serialized play format (JSON: entities + keyframes + interpolation) should be designed as a shared format — it doubles as the storage format for the encyclopedia's drill visualizer and as the *target* format for the planned AI-generated animation pipeline (an AI drafts a play file from a drill's written description; a coach reviews and tweaks it in this same editor before publishing).

**Mode 3 — Space visualizer.** A heatmap overlay that paints every point of the field from red (closed) through yellow (open but low value) to green (strong space), computed as a pure function of the current scene. Because it is a pure function of scene state, it drops into both other modes as a toggle: live on the whiteboard while dragging, and (phase 2) repainting frame-by-frame during play animation.

**Build order: whiteboard → keyframes → heatmap overlay.** This sequencing was an explicit architectural decision: it makes the ambitious feature (the space model) a layer on a working product rather than a standalone gamble.

## 3. Rationale: strong and weak space

This is the domain concept the whole toolset exists to teach, and the reason the space visualizer is the differentiating feature.

When a defense sets up against a thrower, the mark (the defender on the thrower) positions their body to "force" throws in a chosen direction — the side they concede is the **open (live) side**, the side they contest is the **break side**. With a force on, the thrower's realistic options are: (a) throw to the open side with little contest from the mark, (b) throw a short negative-yardage reset to the break side, or (c) attempt a higher-difficulty break throw around or inside the mark. Downfield defenders exploit this by shading toward the open side of their assignments, trusting the mark to disincentivize break throws.

This defensive shape carves the field into **strong space** — upfield of the thrower on the open side, the most immediately threatening area for a shot — and **weak space** — the break side and the area behind the play. Offenses are built around attacking strong space and clearing through weak space. Recognizing strong/weak space in real time is a prerequisite skill for cut timing, offensive flow, and defensive positioning — and it is one of the hardest concepts to teach to newer players from a static diagram, because **strong space moves**: every swing of the disc, every shift of the force, every repositioned deep defender relocates it.

That is the product thesis: a static diagram cannot show that the space moves, and a live-repainting map *is* the lesson. Drag the mark from a side force to flat and watch which side of the field dies. Swing the disc and watch strong space flip sides. Slide the deep defender two yards and watch the deep third open behind them. No existing platform does this — TacticalPad, Sportplan, planet.training, Flik, and RiseUP all stop at static or hand-animated diagrams — while adjacent, vetted math exists in soccer analytics ("pitch control": Will Spearman's work, Fernández & Bornn's *Wide Open Spaces*, Laurie Shaw's open-source Friends of Tracking implementation, Karun Singh's expected threat for field value). Consult those for extensions; the ultimate-specific adaptation below is already done and validated.

## 4. The space model (validated — implement as specified)

### 4.1 Design lessons — do not regress these

The model went through three prototype iterations, and each transition encodes a lesson that must survive into production:

1. **v1 (defender-only coverage)** scored a cell red if any defender could beat the disc there. Verdict: technically accurate but overwhelmingly red — a single midfield defender paints an enormous area because disc flight time gives them seconds to react. Accurate to the question "could the defender get there," wrong to the question the tool is answering.
2. **v2 (full pitch-control race)** added offensive cutters and required, per cell, that a cutter could reach the spot by catch time *and* beat the nearest defender. Verdict: fixed the midfield, but broke space near the thrower — short throws have tiny flight times, so any cell not already occupied by a cutter went dead red. That space (a few yards upfield, open side) is *peak strong space*; it is exactly where offenses cut into. Gating openness on a receiver's current position is wrong.
3. **v3 (final): space is open by default; defenders close it; cutters contest defenders' claims — and openness never requires a receiver.** Each defender's coverage of a cell is discounted by whether the nearest cutter would beat *that defender* to it. If no defender can beat the disc somewhere, that cell is open regardless of where the cutters stand.

Hard requirements distilled from this history: there must be **no receiver-reachability gate** anywhere in the score; red must mean *closed off*, never "no cutter nearby yet"; and near-thrower open-side space must render as the strongest space on a normal setup.

### 4.2 Coordinates and primitives

- Field: 110 × 40 yards — 70-yard central field plus two 20-yard endzones. Attacking direction is +x. Brick marks 20 yards from each goal line.
- Rosters: 7 offense (1 thrower + 6 cutters), 7 defense (1 mark + 6 defenders). The disc sits with the thrower.
- `ss(e0, e1, x)` below is the standard smoothstep (clamped Hermite) — all soft thresholds in the model use it; there are no hard cutoffs anywhere.
- Disc flight time (superlinear in distance because long throws hang — this is what gives deep defenders their outsized range):
  `t_f(d) = 0.4 + d/20 + hang · 1.6 · (d/70)²`
- Player arrival time at a cell:
  `τ(p) = react + max(0, dist(p, cell) − 1) / vmax`
- `τ_O` = minimum arrival over the six cutters (thrower excluded). `head` is the cutter head start — the initiative asymmetry: the cutter knows where the throw is going, the defender reacts to the release. This single parameter is what keeps the model honest without pretending defenders are slow.

### 4.3 Score pipeline

Per cell, the score is a product of independent, individually toggleable layers:

```
score(cell) = comp(d) · mark(cell) · Π_defenders coverage_i(cell) · Π_defenders lane_i(cell) · value(cell)

comp(d)      = 1 − 0.6 · ss(15, 75, d)                    # throw-range completion decay

mark(cell):                                                # the mark's position IS the force
  θ_shadow   = bearing(thrower → mark)
  Δ          = |wrap(bearing(thrower → cell) − θ_shadow)|
  bump       = max(0, 1 − (Δ/W)²)²                         # W = shadow half-width, radians
  mark       = 1 − markStr · bump · ss(2, 10, d)           # distance ramp: short break resets escape

coverage_i(cell):                                          # includes the mark as a defender
  cov        = ss(−0.35, 0.35, t_f(d) − τ_i)               # can defender i beat the disc here
  if offense on:
    beat     = ss(−0.15, 0.55, τ_i − τ_O + head)           # would the best cutter beat THIS defender
    cov      = cov · (1 − beat)                            # contested coverage is voided coverage
  coverage_i = 1 − 0.92 · cov

lane_i(cell):                                              # poaches shade everything behind them
  project defender i onto segment thrower→cell; keep if projection t ∈ (0.06, 0.94)
  bump       = max(0, 1 − (d⊥ / 2.2)²)²                    # d⊥ = distance to the segment, yards
  lane_i     = 1 − 0.55 · bump

value(cell):                                               # what separates strong from merely open
  gain       = cell.x − thrower.x
  value      = 0.3 + 0.7 · clamp((gain + 15) / 55, 0, 1)
  value      = 1.0 inside the attacking endzone
```

Display: `score^0.7` gamma, mapped red → amber → green (anchor stops used in the prototype: `#D64B4A` at 0, `#EF9F27` at 0.42, `#97C459` at 0.68, `#4F941D` at 1). The value floor of 0.3 is deliberate: a wide-open reset must read yellow (open, low value), never red (closed). Red = closed, yellow = open but not advancing, green = strong — this maps one-to-one onto the thrower's three options in §3.

### 4.4 Constants

Ship these as defaults; expose the first six as user-tunable sliders (ranges given). They were calibrated by feel and are considered correct until the client says otherwise.

| Parameter | Default | Slider range | Meaning |
|---|---|---|---|
| `vmax` | 7.0 yd/s | 5–9 | player top speed |
| `react` | 0.4 s | 0.1–0.8 | reaction time |
| `head` | 0.25 s | 0–0.6 | cutter head start (offense initiative) |
| `hang` | 1.0 | 0.5–1.6 | huck hang factor in `t_f` |
| `markStr` | 0.8 | 0–1 | mark shadow strength (never 1.0 — breaks exist) |
| `W` (markW) | 38° | 15–60° | mark shadow half-width |
| lane radius | 2.2 yd | fixed | poach lane influence radius |
| lane strength | 0.55 | fixed | max lane penalty |
| coverage cap | 0.92 | fixed | max single-defender coverage penalty |
| range | 75 yd | fixed | completion-decay scale in `comp` |
| sigmoid widths | as written | fixed | softness of all thresholds |

### 4.5 Two lenses and layer toggles

The offense toggle is not a convenience — it switches between two legitimate coaching questions. **Offense on:** "given this offensive setup, where can we attack right now?" **Offense off:** "where is this defense structurally weak, regardless of our spacing?" (pure v1 coverage). Keep both, label them as views, and keep the four layer toggles (mark force, defender coverage, throwing lanes, field value) — isolating layers is itself a teaching feature: coverage-only is raw pitch control; the full product is strong/weak space.

## 5. Product and UX requirements

**Interaction.** Everything on the field is draggable, and the map repaints live during the drag — this is non-negotiable; the repaint-while-dragging moment is the product. Dragging the thrower carries the mark along (relative offset preserved), since the mark stays on the thrower in reality; the mark is also independently draggable. There is **no separate "force" control**: the force is derived from the mark's bearing off the thrower. Where the mark stands is the force — this was a deliberate, validated UX decision.

**Transparency.** A hover readout shows the per-cell math in plain terms: distance out, flight time, closest defender's arrival vs. (offense on) the best cutter's effective arrival, and the score with a verbal label (strong / contested / closed). This builds trust in the map and quietly teaches the mechanism. A three-swatch legend (closed / open, low value / strong) is always visible.

**Presets.** Ship at least these four field setups as one-click presets:
1. *Vert stack, force side* — thrower off-center, mark forcing one sideline, dump behind, five-person stack up the middle, defenders matched and shading open/under.
2. *Horizontal stack* (client-specified): three handlers back with the thrower central; open-side reset positioned 45° behind the thrower; break-side reset slightly positive (slightly upfield, break side); four downfield cutters spread across the width ~18 yards out; defense matched, shading toward the open side downfield.
3. *Flat mark* — centered disc, mark directly upfield, symmetric defense.
4. *Deep help* — the vert setup with one defender pulled off their assignment into deep-poach position.

**Tuning panel.** The six tunable sliders from §4.4, collapsed by default. Defaults ship as calibrated.

**Field rendering.** Regulation proportions, goal lines, brick marks, an unambiguous attacking-direction indicator, and a consistent visual language for pieces (offense vs. defense clearly distinct; thrower and mark individually identifiable; disc shown with the thrower). Whatever visual language is chosen here should become the site-wide standard for all drill/play diagrams.

**Play designer specifics.** Keyframe timeline with scrub and tweened playback; export of any frame as an image and of plays in the shared JSON format; PDF/printable export can ride on the site's existing practice-plan export work rather than being bespoke.

**Accounts.** Saving plays to a user account is part of the broader site spec; for v1 of this toolset, local state plus file export is acceptable, but design the play format so account persistence is a storage swap, not a rewrite.

## 6. Phase 2 — specced but explicitly deferred

- **Velocity-aware influence.** The static-snapshot model treats a player as controlling a circle; a player at speed controls a cone ahead of their momentum and almost nothing behind. The published approach is velocity-oriented influence regions (Fernández & Bornn). Product shape: a draggable velocity arrow on each player. This is the single highest-value model upgrade.
- **Asymmetric mark shadow.** The current shadow is symmetric about the force bearing; real marks concede the inside and around differently. Requires splitting the angular bump into two half-widths.
- **Heatmap through time.** Run the overlay during play animation so a designed play shows the space it creates as it unfolds — likely the strongest teaching artifact the site will produce.
- **Encyclopedia integration.** Link plays and setups to related drill entries ("this drill trains attacking this space"), and feed the AI-animation pipeline described in §2.
- **Colorblind-safe alternate palette** for the heatmap (red–green is the domain convention and the default, but ~8% of male users will need an alternative).

## 7. Out of scope for v1

Accounts/auth integration (see §5), community submission of plays, mobile-first layout (must be usable on a phone sideline eventually, but desktop/tablet is the v1 target), AI generation of plays, and any model changes beyond §4 as written.

## 8. Acceptance checks — "does it feel right"

These encode the client's calibration. On default constants, all of the following must hold:

1. *Vert, force side preset:* the open-side lane roughly 5–15 yards upfield of the thrower is the greenest region on the field. If it isn't, the model is wrong somewhere.
2. The break side behind the mark's shadow is red near the force bearing, fading with angular distance (break throws are discounted, not erased), and short break-side reset space escapes the shadow (distance ramp working).
3. The wide-open dump/reset space reads yellow, never red.
4. With no deep defender, the deep third reads yellow-green ("live if we send someone"); switching to the *deep help* preset shuts it; dragging a cutter deep to challenge the poach visibly pries it back open.
5. Dragging the mark from a side force to flat rotates which side of the field dies; swinging the thrower across the field flips strong space to the other side, live during the drag.
6. A cutter standing directly beside their matched defender produces contested yellow around the pair, not green — separation emerges from the race margin with no special-casing.
7. A defender parked in a throwing lane shades the space behind them (from the disc's perspective) even where they can't beat the disc to the endpoint.
8. Every slider and every layer toggle produces a visible change on the default presets.
9. The map repaints smoothly (perceptually 60 fps) while dragging on ordinary hardware.

## 9. Implementation notes from the prototype (advisory, not binding)

The chat prototype proved the following feasible, offered so you don't re-derive it: the model is a closed-form evaluation per cell (no timestep simulation), so a 0.5-yard grid (220 × 80 ≈ 17,600 cells × 14 players) recomputes comfortably within a frame in plain JavaScript with polynomial falloffs (smoothstep-family, no transcendental-heavy math in the inner loop). Rendering the score grid into a small offscreen canvas and drawing it upscaled with image smoothing produces a clean interpolated heatmap with no shader work. A canvas heatmap layer underneath a DOM/SVG piece layer (for drag ergonomics) worked well. None of this constrains your stack — meet the acceptance checks however you prefer.

## 10. Questions worth asking the client, and ones that aren't

Ask Carter about: play JSON schema details once drafted (it becomes a site-wide contract); any preset roster/positioning adjustments; visual language for pieces before it propagates site-wide; where this toolset lives in the site's navigation. Decide yourself: framework, rendering tech, state management, testing approach, file structure, and anything §9 covers. Do not relitigate the model in §4 or the UX decisions marked as validated — propose changes only with a demonstrated failure of an acceptance check.
