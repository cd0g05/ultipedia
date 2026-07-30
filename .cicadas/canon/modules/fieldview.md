# Module: fieldview

Play-design toolset at `/fieldview` and `/fieldview/designer` (renamed from `/field-view`, which
still redirects — the client has the old URLs). One shared scene model exposed
three ways: a coaching whiteboard, a keyframed play designer, and a live strong/weak space
heatmap implementing the client's validated space model. Entirely client-side — no backend
calls, no new dependencies. Lives under `frontend/src/fieldview/`; see
[`modules/frontend.md`](frontend.md) for the surrounding SPA.

The field renders **vertically, offense attacking up the screen**, inside a three-pane
"Light Film Room" shell (`ui/shell/`) on desktop and a bottom sheet on phones. **There is no
minimum viewport** — mobile-at-practice is a primary use case, not a blocked one.

## Layout

- `scene/` — the shared model. `types.ts` (Team/Role/Vec2/Scene), `field.ts` (geometry,
  clamping), `scene.ts` (pure ops), `selection.ts` (`SelectionState` union + pure transitions),
  `store.ts` (mutable subscribe-store, rAF-coalesced, **plus a selection field on its own
  subscriber set**), `presets.ts` + `presetRegistry.ts` + `presetFormat.ts` (built-ins and user
  presets on one path).
- `space/` — the headless model, framework-free and UI-free. `constants.ts` (tunables,
  `RAMP_STOPS`, `GAMMA`), `math.ts`, `layers.ts` (the five layer functions), `score.ts`
  (`computeGrid`), `explain.ts` (`explainCell`), `palette.ts`, `types.ts`.
- `render/` — `tokens.ts` (**every** piece and field visual, plus `SHELL_TOKENS` for shell
  chrome), `fieldLayer.tsx`, `pieceLayer.tsx`, `heatmap.ts` (canvas painter), `coords.ts` (**the
  only place orientation lives**), `exportImage.ts` (PNG, composites heatmap under SVG).
- `play/` — `format.ts` (the versioned `PlayFile` contract, owns `PlayEntity`), `validate.ts`
  (boundary guard), `serialize.ts` (`PlayStore` seam + `FilePlayStore`), `tween.ts` (linear
  interpolation, pairs entities by stable id), `modeHandoff.ts` (whiteboard→designer scene stash).
- `ui/` — `FieldCanvas.tsx` (shared stage, owns the frame loop; also writes selection to the
  store), `CellReadout.tsx`, `Timeline.tsx`, `PlayMeta.tsx`, `PresetMenu.tsx`, `prefs.ts`
  (localStorage overlay prefs, **a shared external store** — see Conventions).
  `OverlayRail.tsx` / `TuningPanel.tsx` / `AdvancedPanel.tsx` survive **only for
  `Designer.tsx`**, which still composes the pre-shell layout; the whiteboard no longer uses
  them. `SmallScreenNotice.tsx` is gone.
- `ui/shell/` — the Light Film Room chrome. `ShellLayout.tsx` (three-pane desktop grid /
  mobile sheet, CSS-only switch at `lg` = 1024 px), `LeftSidebar.tsx`, `RightSidebarSlot.tsx`
  (Play Designer placeholder), `ToolRibbon.tsx` (shared row of 4, desktop + mobile),
  `BottomSheet.tsx` (mobile), `panelRegistry.ts`, `useSelection.ts`, and `panels/`
  (`DefaultVisibilityPanel`, `AdvancedSettingsPanel`, and three `PENDING` placeholders).
- `pages/` — `Whiteboard.tsx` (composes `ShellLayout`), `Designer.tsx` (**not** shell-composed
  yet), `FieldStage.tsx`.

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

### Shell ADRs (fieldview-shell, 2026-07-30)

- **ADR-11 — orientation lives only in `render/coords.ts`.** `yardToPixel`/`pixelToYard` rotate
  downfield yards onto the screen's vertical axis (`FIELD.length - x`, so pixel-y stays
  non-negative). `scene/` stays orientation-agnostic: `+x = attacking` remains a *model* fact,
  never a screen fact. `fieldLayer.tsx`'s `FIELD_PX_WIDTH`/`HEIGHT` are **screen** dimensions and
  are therefore swapped relative to the yard axes; `pick.ts` needed no change at all (pure
  yard-space), and `exportImage.ts` needed none either (it reads the live `viewBox`).
- **ADR-12 — selection lives in the `SceneStore`, never React state.** A `selection` field with
  its **own** subscriber set (separate from `subscribers`/`frameSubscribers`, so a click doesn't
  wake every scene subscriber), read through `useSelection()` → `useSyncExternalStore`. This is
  ADR-2 extended to a second kind of state: `FieldCanvas`'s pointer handlers write selection
  imperatively, and the Profiler test still records 0 React commits during a drag.
- **ADR-13 — the left sidebar's middle section is a typed panel registry.**
  `Record<SelectionStateKind, ComponentType<PanelProps>>` keyed by a closed union, plus
  `registerPanel()`. Downstream initiatives (play model, motion, designer v2) add real panels by
  registering them — **never by editing a shell layout file**. A missing kind is a compile error,
  and `shellGuard.test.ts` asserts the registry starts complete.
- **ADR-14 — one registry, two presentational shells.** `LeftSidebar` (desktop) and `BottomSheet`
  (mobile) read the *same* `panelRegistry` + `useSelection()`; they differ only in chrome. The one
  sanctioned divergence is the mobile SELECTION tab's empty-state copy. Do not grow a second path
  to panel content — drift between the two shells is exactly what this prevents.
- **ADR-15 — the breakpoint switch is CSS-only** (`lg` = 1024 px), continuing the module's
  no-resize-listener rule. Both trees are in the DOM; CSS picks one. Critically, `children`
  (the `FieldCanvas`) renders **exactly once** and is never nested inside a branch that goes
  `display:none` — mounting it twice would make the two instances fight over the single shared
  `svgRef`/`canvasRef`/`stageRef` objects.
- **ADR-16 — shell chrome and canvas keep separate accents.** `SHELL_TOKENS.accent` is `#be185d`
  (matching the `film.*` Tailwind palette the encyclopedia shell already ships); `PIECE_TOKENS`/
  `FIELD_TOKENS` keep `#EF4B8A`. Chrome and game entities mean different things, and the canvas
  palette is still awaiting its own client review — recolouring it here would have pre-empted that.

## Conventions

- Buffers in the paint path are reused across frames, never retained by callers.
- Repaints are driven by `store.onFrame` (scene mutations only), not a free-running rAF;
  `paint()` early-returns while the overlay is off.
- Entities are paired by stable `id`, never array index.
- Responsive is CSS-only — no resize listener, no hydration flash. The shell switches at `lg`
  (1024 px): three-pane grid above, bottom sheet below. **No viewport is blocked.** (`Designer.tsx`
  still carries the old pre-shell rail, which is a horizontal bar until `xl`.)
- Reduced motion is handled with Tailwind `motion-safe:` variants, not a JS `matchMedia` listener
  — same reasoning as the breakpoint.
- Scene state is deliberately **not** persisted; overlay prefs are (`fieldview.overlayPrefs`,
  validated and clamped on read since localStorage is untrusted).
- `useOverlayState()` is a **module-level external store**, not per-instance `useState`. The shell
  mounts several consumers at once (`Whiteboard`, `ToolRibbon`, the panels); per-instance state
  meant each held a snapshot from its own mount, so toggling Space View in the ribbon updated
  localStorage but never re-rendered the copy actually driving `FieldCanvas`. If you add a
  consumer, read it through this hook — do not reintroduce a local copy.
- Colour is never the sole carrier of meaning — the readout speaks the verdict too.

## Testing

327 tests across 29 files (of 434 frontend total). Notable:

- `space-model.test.ts` / `acceptance.test.ts` — brief §8 model properties (1, 2, 3, 4, 6, 7, 8)
  and the FR-3.2 no-receiver-gate regression, as executable checks.
- `spaceGuard.test.ts`, `tokensGuard.test.ts`, `shellGuard.test.ts` — architectural guards.
  `tokensGuard` also pins `FIELD_TOKENS`/`PIECE_TOKENS` against accidental recolouring (ADR-16);
  `shellGuard` pins registry completeness (ADR-13).
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
**The shell merged to `main` ahead of its own review too** (Builder decision, 2026-07-30) — the
same debt the roadmap warned recurs.

Carried out of fieldview-shell specifically:

- **The 1024 px breakpoint is unvalidated on a real tablet.** It was reasoned from the fixed pane
  widths (280 + 320), not measured. A portrait tablet currently gets the bottom sheet.
- **`Designer.tsx` is not shell-composed.** It still renders `OverlayRail` + `AdvancedPanel`
  directly, which is why those files still exist. Initiative D (`fieldview-designer-v2`) replaces
  that page wholesale; until then the two pages look different, deliberately.
- **Three ribbon buttons are inert by design** — Throw to Player and Advanced Stats are
  `aria-disabled` with a "Ships in a future update." tooltip, and the Play Designer slot holds a
  placeholder. Initiatives B and D fill them.
- **The overlay legend (Closed / Contested / Strong space) was dropped** when the whiteboard
  stopped composing `OverlayRail` — the shell IA has no slot for it. That is an upstream scope
  consequence, not an oversight; if the client wants it back it needs a home in the sidebar.
- **`prefs.ts` re-seeds from localStorage during render** when no consumer is subscribed (a test-
  isolation affordance). It converges and the suite is green, but it is a mutation-during-render
  that a future refactor should replace with an explicit test-reset export.

**Known model tension, documented not defective**: brief §8.1 and §8.4's first clause cannot
both hold on a single scene by the model's own design, so §8.4 uses the Flat Mark preset as its
no-deep-defender baseline.
