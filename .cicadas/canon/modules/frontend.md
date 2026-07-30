# Module: frontend

React 18 + Vite + TypeScript + Tailwind + Framer Motion + react-router-dom v6. Three verticals
under one router — see [`modules/encyclopedia.md`](encyclopedia.md) for the browse/search half
and [`modules/fieldview.md`](fieldview.md) for the play-design toolset.

## Layout
- `main.tsx` → `router.tsx` — top-level route tree. Encyclopedia's `Layout` wraps `/`,
  `/:section`, `/:section/:slug`, `/search`, `/fieldview`, `/fieldview/designer`, `*` (404);
  intake mounts at `/contribute/*`. Static routes outrank the dynamic `/:section` segments.
- `fieldview/` — the play-design toolset (whiteboard, keyframed designer, space heatmap).
  Client-only; makes no API calls. See [`modules/fieldview.md`](fieldview.md).
- `intake/App.tsx` — step state machine (tutorial · learnmore · path · form · interview ·
  contributor · thankyou); `mode` = form | interview; animated via `MotionStep`. (Relocated
  here from root `App.tsx`, which no longer exists, during the encyclopedia routing partition —
  internals unchanged; root-path audit found zero coupling, no logic changes needed.)
- `intake/sections/` — Tutorial, PathSelect, FormSection (per-type fields via `fields.ts` +
  freeform), ContributorSection, ThankYou, LearnMore, `theme.ts` (per-section accents).
- `intake/ui/` — tap `Tooltip`, `Toast`, `ConfirmDialog`, `Field`, `motion.tsx` (MotionStep/Collapsible).
- `intake/state/draft.ts` — debounced localStorage autosave/restore, manual Save, contributor prefill.
- `intake/api/client.ts` — posts to backend only; offline retry queue + `flushQueue`; funnel events.
- `intake/api/analytics.ts` — Plausible loader (no-op unless `VITE_PLAUSIBLE_DOMAIN`).
- `intake/interview/` — `InterviewChat.tsx` + `api.ts` (start/turn/submit); escape-hatch to form.

## Conventions
- Tooltips open on tap, not hover. `prefers-reduced-motion` respected.
- All fields optional; submit enabled after first word. Switch-away warns on unsaved input.
- localStorage keys and API paths are origin-scoped constants, not root-path-dependent —
  verified safe when intake moved from `/` to `/contribute`.
- 22 intake/routing + 85 encyclopedia + 229 fieldview = **336 frontend tests** (Vitest + RTL +
  axe-core). Guard DOM APIs missing in jsdom (e.g. `scrollIntoView?.`, `PointerEvent`,
  `Blob.text()`, 2d canvas context). Note that `toBeVisible()` reads only the `hidden`
  attribute — it will pass on an element that a CSS display utility is keeping on screen.
- Timing assertions do not belong in the parallel suite: `npm run test:perf` runs them with
  `--no-file-parallelism` (see [`modules/fieldview.md`](fieldview.md)).

## Dev
- `npm run dev` (proxies `/api`→:8000), `npm test`, `npm run build` (also runs the sitemap
  script as a `postbuild` step — see `modules/encyclopedia.md`).
