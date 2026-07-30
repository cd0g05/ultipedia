# Module: fieldview

Play-design toolset at `/fieldview` and `/fieldview/designer` (renamed from `/field-view`, which
still redirects — the client has the old URLs). One shared scene model exposed
three ways: a coaching whiteboard, a keyframed play designer, and a live strong/weak space
heatmap implementing the client's validated space model. Entirely client-side — no backend
calls, no new dependencies. Lives under `frontend/src/fieldview/`; see
[`modules/frontend.md`](frontend.md) for the surrounding SPA.

## Layout

- `scene/` — the shared model. `types.ts` (Team/Role/Vec2/Scene), `field.ts` (geometry,
  clamping), `scene.ts` (pure ops), `store.ts` (mutable subscribe-store, rAF-coalesced),
  `presets.ts` + `presetRegistry.ts` + `presetFormat.ts` (built-ins and user presets on one path).
- `space/` — the headless model, framework-free and UI-free. `constants.ts` (tunables,
  `RAMP_STOPS`, `GAMMA`), `math.ts`, `layers.ts` (the five layer functions), `score.ts`
  (`computeGrid`), `explain.ts` (`explainCell`), `palette.ts`, `types.ts`.
- `render/` — `tokens.ts` (**every** piece and field visual), `fieldLayer.tsx`, `pieceLayer.tsx`,
  `heatmap.ts` (canvas painter), `coords.ts`, `exportImage.ts` (PNG, composites heatmap under SVG).
- `play/` — `format.ts` (the versioned `PlayFile` contract, owns `PlayEntity`), `validate.ts`
  (boundary guard), `serialize.ts` (`PlayStore` seam + `FilePlayStore`), `tween.ts` (linear
  interpolation, pairs entities by stable id), `modeHandoff.ts` (whiteboard→designer scene stash).
- `ui/` — `FieldCanvas.tsx` (shared stage, owns the frame loop), `OverlayRail.tsx`,
  `TuningPanel.tsx`, `CellReadout.tsx`, `Timeline.tsx`, `PlayMeta.tsx`, `PresetMenu.tsx`,
  `SmallScreenNotice.tsx`, `prefs.ts` (localStorage overlay prefs).
- `pages/` — `Whiteboard.tsx`, `Designer.tsx`, `FieldStage.tsx`.

## Key decisions

- **ADR-1** — the space model is a pure, framework-free library. No React, no DOM, no canvas.
  Testable as mathematics.
- **ADR-2** — mutable subscribe-store + rAF loop; **React is never in the drag path**. A
  `Profiler` test records 0 React commits across 25 pointer moves during a drag. Extended by the
  designer (keyframes in a ref) and the overlay (imperative hover readout via
  `useImperativeHandle`). This is the load-bearing performance decision — do not "fix" a
  component here by lifting drag state into React.
- **ADR-3** — canvas heatmap *under* an SVG piece layer, so the model repaints without touching
  the piece tree.
- **ADR-4** — `GRID_STEP = 0.5` yd is a tunable; the renderer reads dimensions from the returned
  buffer rather than recomputing them.
- **ADR-5 / ADR-6** — the model is transcribed from the brief, not re-derived, and layer identity
  is preserved in code. Lens (offense on/off) is a coverage-layer parameter, not a second model.
- **ADR-7** — the play format is versioned and validated at the boundary. `validate.ts` **drops
  unknown keys rather than rejecting them**; that property is the forward-compatibility
  guarantee that lets `annotations` (a confirmed future need, name reserved in `format.ts`) be
  added additively instead of via a `formatVersion` bump.
- **ADR-8** — play persistence is storage-agnostic behind a `PlayStore` interface.
- **ADR-9 / ADR-10** — presets are data behind one registry (a preset is a one-keyframe
  `PlayFile`); all piece and field visuals live in `render/tokens.ts`. Both exist so visual
  feedback costs a token edit, not a component sweep.

## Conventions

- Buffers in the paint path are reused across frames, never retained by callers.
- Repaints are driven by `store.onFrame` (scene mutations only), not a free-running rAF;
  `paint()` early-returns while the overlay is off.
- Entities are paired by stable `id`, never array index.
- Responsive is CSS-only — no resize listener, no hydration flash. Sub-768 shows a notice
  (`md:hidden`); the rail is a horizontal bar until `xl` (1280), a 320 px column above it.
- Scene state is deliberately **not** persisted; overlay prefs are (`fieldview.overlayPrefs`,
  validated and clamped on read since localStorage is untrusted).
- Colour is never the sole carrier of meaning — the readout speaks the verdict too.

## Testing

229 tests across 21 files (of 336 frontend total). Notable:

- `space-model.test.ts` / `acceptance.test.ts` — brief §8 model properties (1, 2, 3, 4, 6, 7, 8)
  and the FR-3.2 no-receiver-gate regression, as executable checks.
- `spaceGuard.test.ts`, `tokensGuard.test.ts` — architectural guards.
- `responsive.test.tsx` — asserts the responsive **class contract**, and is explicit that jsdom
  cannot verify computed layout.
- **Perf assertions are quarantined**: `npm run test:perf` runs the timing files with
  `--no-file-parallelism`, because the same code measures 2–3× slower under a parallel suite.
  Isolated budgets — grid < 12 ms, frame < 16 ms. The everyday suite keeps a loose ceiling that
  still catches an order-of-magnitude regression.

**jsdom limitations that have bitten this module**: no `PointerEvent`, no `Blob.text()` (hence
the `FileReader` fallback in `serialize.ts`, which also fixes older Safari), no 2d canvas
context, and `toBeVisible()` reads only the `hidden` attribute — that last one let a visibly
broken idle readout pass the entire suite, since `hidden` loses on specificity to a Tailwind
`flex` class on the same element. Visibility here is set via inline style for that reason.

## Outstanding

The **client visual review is not done** — piece visuals, field markings, the four built-in
presets, the heatmap ramp, and copy. It was deferred from P2 to the initiative end, then past
the merge to a deployed preview by Builder decision, along with the two by-eye acceptance checks
(§8.5 live-during-drag, §8.9 frame budget on the client's hardware). Built-in preset coordinates
were always understood to be a first pass, not a calibration. Expect a follow-up `tweak/` branch
touching `render/tokens.ts`, `scene/presets.ts`, and possibly `space/constants.ts`.

**Known model tension, documented not defective**: brief §8.1 and §8.4's first clause cannot
both hold on a single scene by the model's own design, so §8.4 uses the Flat Mark preset as its
no-deep-defender baseline.
