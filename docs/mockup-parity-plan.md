# Encyclopedia Mockup Parity Plan

This document captures concrete gaps between the accepted design mockup (`design/landing-and-encyclopedia-mockup.html`) and the current implementation in `frontend/src/encyclopedia/`. It serves as a scoped roadmap for a future mockup-alignment initiative, prioritized and sequenced to minimize risk and maximize value per phase.

**Source**: Investigation from 2026-07-05 comparing mockup against real implementation (Home.tsx, Layout.tsx, EntryCard.tsx, Tailwind config).

---

## Summary of Major Gaps

| Category | Gap | Scope | Impact |
|----------|-----|-------|--------|
| **Hero** | Missing two-column layout + right-side visual placeholder | `Home.tsx:Hero()` | Mid-priority: improves visual hierarchy, no backend work needed |
| **Hero CTA** | Missing "Generate a Practice Plan" secondary button (disabled/coming soon) | `Home.tsx:Hero()` | Low: visual-only placeholder for future feature |
| **Value Props** | Entire 3-item left-column section missing (Searchable, Practice Plans, Community) | `Home.tsx` new section | High: core piece of mockup identity, establishes the "why" |
| **Practice Planner Teaser** | Entire section missing (copy + placeholder CTA + mock export visual) | `Home.tsx` new section | Low: visual-only stub for future feature |
| **Community Callout** | Missing green full-width CTA band ("Have a drill worth sharing?") | `Home.tsx` new section | High: reinforces contribution UX, can be wired to `/contribute` immediately |
| **EntryCard Media** | Missing media-placeholder block above content (intended for future images) | `EntryCard.tsx` | Mid: visual polish, stub-friendly |
| **EntryCard Tags** | Current skill-difficulty badge color scheme vs. mockup's uniform green pills | `EntryCard.tsx` | Low: design preference, current approach is more semantic |
| **Footer Links** | Missing About, Contact, Privacy links (currently only "Submit a Drill") | `Layout.tsx` | Mid: completeness + credibility; stub pages sufficient |
| **Global Hard Corners** | No systemic enforcement of `border-radius: 0` (mockup rule) | `tailwind.config.js` + `index.css` | Low: optional refinement, not blocking core UX |

---

## Detailed Breakdown & Implementation Guidance

### 1. Hero Section Expansion (Priority: High)

**What**: Add a two-column layout to the hero with a right-side visual placeholder.

**Current State** (line 38–67 in `Home.tsx`, `Hero()` function):
```jsx
// Single-column flex, gap-8. No lg:flex-row switch, no visual half.
<div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-6 py-16 lg:py-24">
  <h1 ...>Everything your team needs...</h1>
  <p ...>A free encyclopedia...</p>
  <div className="flex flex-col gap-4 sm:flex-row">
    <Link to="/drills">Browse...</Link>
    <Link to="/contribute">Submit a Drill</Link>
  </div>
</div>
```

**Mockup Reference** (design/landing-and-encyclopedia-mockup.html lines 107–136):
- Left column: title + description + two CTAs (Browse + Generate Practice Plan).
- Right column: `aspect-video` placeholder with graph-paper/tactical-timeline visual.
- Layout: `lg:flex-row`, left ~50%, right ~50%.

**Action**:
1. Convert the hero `<div>` from `flex-col` to `lg:flex-row` with appropriate width splits (e.g., `lg:w-1/2` on each side).
2. Keep all left-column copy + CTAs as-is.
3. Add a new right-column `<div>` with:
   - `aspect-video` to match mockup proportions.
   - Gradient or pattern background placeholder (e.g., `bg-gradient-to-br from-zinc-100 to-zinc-200` or a radial gradient).
   - Optional: a simple SVG or CSS grid pattern overlay for the "graph paper" feel.
   - Label: `aria-label="Tactical preview"` (accessibility, since it's decorative for now).

**Future work**: Replace the placeholder with a real image asset when available.

---

### 2. Hero Secondary CTA: "Generate a Practice Plan" (Priority: Low)

**What**: Add a second CTA button to the hero (currently only "Browse the Encyclopedia" and "Submit a Drill").

**Current State** (lines 50–63 in `Home.tsx`):
```jsx
<div className="flex flex-col gap-4 pt-2 sm:flex-row">
  <Link to="/drills" className="bg-film-accentPink ...">
    Browse the Encyclopedia
  </Link>
  <Link to="/contribute" className="border border-film-border ...">
    Submit a Drill
  </Link>
</div>
```

**Mockup Reference** (design/landing-and-encyclopedia-mockup.html line 125):
- "Generate a Practice Plan" button, styled as a bordered `film.panel` button (like the "Submit a Drill" button).

**Action**:
1. Add a third `<Link>` inside the CTA `<div>`, styled identically to "Submit a Drill" (border + panel background).
2. Point it to `/practice-plan` or `/coming-soon` (stub route, no backend implementation yet).
3. On the stub page or as a simple alert on click, display "Coming soon" copy.

**Note**: The "Generate a Practice Plan" feature itself is not built — this is a placeholder so coaches can see where it will live.

---

### 3. Value Propositions Column (Priority: High)

**What**: Add a 3-item left-column section paired with "Popular Resources" in a two-column split, matching the mockup's information architecture.

**Current State** (lines 128–151 in `Home.tsx`):
- "Popular Resources" is full-width, no paired left column.

**Mockup Reference** (design/landing-and-encyclopedia-mockup.html lines 139–181, `MOCKUP-NOTES.md:69`):
- Left column (~33% width): three stacked value props, each with an icon + heading + copy.
  - "Searchable Encyclopedia" — magnifying glass icon + "Instantly find drills, strategies, and formations."
  - "Automatic Practice Plans" — calendar icon + "Get a structured practice plan in seconds."
  - "Built by the Community" — people icon + "Coaches sharing what works on the field."
- Right column (~67% width): Popular Resources grid (existing 3-column card grid).
- Wrapper: a `film.panel` background on the left column, white on the right.

**Action**:
1. Wrap the entire "Popular Resources" section (lines 128–151) in a new two-column layout:
   ```jsx
   <section aria-label="Value and Resources" className="mx-auto max-w-[1400px] px-6 py-12 lg:flex lg:gap-12">
     {/* Left column: value props */}
     <aside className="lg:w-1/3 mb-8 lg:mb-0">
       <div className="bg-film-panel p-6 space-y-6">
         {/* Prop 1 */}
         {/* Prop 2 */}
         {/* Prop 3 */}
       </div>
     </aside>
     
     {/* Right column: Popular Resources */}
     <section aria-label="Popular Resources" className="lg:w-2/3">
       {/* Existing Popular Resources content */}
     </section>
   </section>
   ```

2. For each value prop, create a simple component or inline JSX with:
   - Icon: SVG icon (magnifying glass, calendar, people) or emoji placeholder.
   - Heading: `<h3 className="font-heading text-lg font-bold uppercase">Searchable Encyclopedia</h3>`.
   - Description: `<p className="text-sm text-zinc-600">Instantly find drills, strategies, and formations.</p>`.

3. Update the existing "Popular Resources" heading and grid to be relative to the right column (no top-level heading needed if it's nested inside the two-column).

**Future work**: Replace emoji/placeholder icons with proper SVG assets.

---

### 4. Practice Planner Teaser Section (Priority: Low)

**What**: Add a full teaser section for the "Generate a Practice Plan" feature (copy + disabled CTA + mock export visual).

**Mockup Reference** (design/landing-and-encyclopedia-mockup.html lines 220–249, `MOCKUP-NOTES.md:70`):
- Left column: heading + description + "Try the Planner" CTA (bordered button).
- Right column: mock PDF/export visual (a stylized document preview).
- Wrapper: no background color (white/transparent).

**Action**:
1. Add a new `<section>` after the value props + Popular Resources section in `Home.tsx`, before the community callout:
   ```jsx
   <section aria-label="Practice Planner (coming soon)" className="border-t border-film-border mx-auto max-w-[1400px] px-6 py-12 lg:flex lg:gap-12 lg:items-center">
     {/* Left: copy + CTA */}
     <div className="lg:w-1/2">
       <h2 className="font-heading text-3xl font-bold uppercase mb-4">Generate Practice Plans</h2>
       <p className="text-lg text-zinc-600 mb-6">Coming soon: AI-powered practice planning.</p>
       <button disabled className="border border-zinc-300 px-6 py-3 text-zinc-400 cursor-not-allowed">
         Try the Planner (Coming Soon)
       </button>
     </div>
     
     {/* Right: mock export visual */}
     <div className="lg:w-1/2 mt-8 lg:mt-0">
       <div className="aspect-video bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center rounded-none">
         <p className="text-zinc-500 text-center">Practice Plan Preview</p>
       </div>
     </div>
   </section>
   ```

2. Style the disabled button clearly so it's obvious it's not yet available.

**Future work**: Wire to a real practice planner page once the feature is built.

---

### 5. Community Callout Band (Priority: High)

**What**: Add a full-width green CTA band ("Have a drill worth sharing?") to reinforce the contribution call-to-action, positioned after the teaser sections.

**Mockup Reference** (design/landing-and-encyclopedia-mockup.html lines 251–260, `MOCKUP-NOTES.md:71`):
- Full-width `film.panel` (zinc-100) background with left padding.
- Left side: heading + description ("Have a drill worth sharing? We'd love to add it to the encyclopedia.").
- Right side: green (`film.accentGreen`, emerald-700) primary CTA button with a hard shadow accent (`shadow-[4px_4px_0_0_#064e3b]`).

**Action**:
1. Add a new `<section>` at the bottom of `Home.tsx` (after Popular Resources or the practice planner teaser):
   ```jsx
   <section aria-label="Community Contribution" className="border-t border-film-border bg-film-panel">
     <div className="mx-auto max-w-[1400px] px-6 py-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
       <div>
         <h2 className="font-heading text-2xl font-bold uppercase mb-2">Have a drill worth sharing?</h2>
         <p className="text-zinc-600">We'd love to add it to the encyclopedia.</p>
       </div>
       <Link
         to="/contribute"
         className="inline-flex items-center justify-center bg-film-accentGreen px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-white shadow-[4px_4px_0_0_#064e3b] transition-colors hover:bg-emerald-800"
       >
         Submit a Drill
       </Link>
     </div>
   </section>
   ```

2. This reuses the existing `/contribute` route (no new backend work).

3. The hard shadow (`shadow-[4px_4px_0_0_...]`) is a deliberate visual accent that matches the mockup's "tactical" style.

**Future work**: None — this is complete as-is and immediately functional.

---

### 6. EntryCard Media Placeholder (Priority: Mid)

**What**: Add a media-placeholder block above the EntryCard's content area (stub for future image/video support).

**Current State** (`frontend/src/encyclopedia/components/EntryCard.tsx`):
- Card structure: type badge at top, then title + description + tags in a single content block.

**Mockup Reference** (design/landing-and-encyclopedia-mockup.html lines 167–181):
- Each card has a media placeholder area (image/video) at the top with `aspect-video` or `aspect-square`.
- Type badge overlays the top-left corner of the media area (not a separate section).
- Below media: content block (title, description, tags).

**Action**:
1. Refactor `EntryCard` to add a top media section:
   ```jsx
   <div className="border border-film-border bg-white transition-colors hover:border-film-accentPink">
     {/* Media placeholder */}
     <div className="aspect-video bg-gradient-to-br from-zinc-100 to-zinc-200 relative">
       {/* Type badge overlaid on media */}
       <div className="absolute top-3 left-3">
         <span className="bg-zinc-900 px-2 py-1 font-mono text-[10px] font-bold uppercase text-white">
           {entry.type}
         </span>
       </div>
     </div>
     
     {/* Content block (existing) */}
     <div className="p-4">
       <h3 className="...">Title</h3>
       <p className="...">Description</p>
       {/* Tags */}
     </div>
   </div>
   ```

2. Remove the existing type badge from the content block (currently in the `film.panel` bar).

3. The placeholder background can be a simple gradient; no real images are loaded yet.

**Future work**: Replace gradient with real media (images, embed URLs, etc.) once a media-upload pipeline is available.

---

### 7. Footer Links (Priority: Mid)

**What**: Add About, Contact, and Privacy links to the footer alongside the existing "Submit a Drill" link.

**Current State** (`frontend/src/encyclopedia/components/Layout.tsx`, lines 120–135):
- Only "Submit a Drill" link in footer (actual footer content was cut off in earlier read, but canon notes confirm it's minimal).

**Mockup Reference** (design/landing-and-encyclopedia-mockup.html lines 476–496):
- Logo + slash-separated links: "About / Contact / Submit a Drill / Privacy" + copyright.

**Action**:
1. Create three stub pages:
   - `frontend/src/encyclopedia/pages/About.tsx`: basic "About Ultipedia" copy + back to home link.
   - `frontend/src/encyclopedia/pages/Contact.tsx`: basic "Contact us" copy + email/form placeholder + back to home link.
   - `frontend/src/encyclopedia/pages/Privacy.tsx`: basic privacy disclaimer + back to home link.
   
   Each can reuse the `Layout` shell and follow the same pattern as `NotFound.tsx` (centered, simple text).

2. Add routes to `frontend/src/router.tsx`:
   ```tsx
   {
     path: "/about",
     element: <About />,
   },
   {
     path: "/contact",
     element: <Contact />,
   },
   {
     path: "/privacy",
     element: <Privacy />,
   },
   ```

3. Update the footer in `Layout.tsx` to include these links:
   ```jsx
   <footer className="border-t border-film-border bg-film-panel">
     <div className="mx-auto max-w-[1400px] px-6 py-8">
       <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
         <Link to="/" className="text-sm font-bold uppercase text-zinc-900">
           Ultipedia
         </Link>
         <nav className="flex gap-4 sm:gap-8 text-xs uppercase tracking-wider text-zinc-600">
           <Link to="/about" className="hover:text-film-accentPink">About</Link>
           <span aria-hidden>/</span>
           <Link to="/contact" className="hover:text-film-accentPink">Contact</Link>
           <span aria-hidden>/</span>
           <Link to="/contribute" className="hover:text-film-accentPink">Submit a Drill</Link>
           <span aria-hidden>/</span>
           <Link to="/privacy" className="hover:text-film-accentPink">Privacy</Link>
         </nav>
       </div>
       <p className="mt-6 text-xs text-zinc-500">© 2026 Ultipedia. Built by coaches, for coaches.</p>
     </div>
   </footer>
   ```

**Future work**: Once real content is available (privacy policy, contact form backend), replace stub pages with full implementations.

---

### 8. Global Hard Corners (Priority: Low)

**What**: Enforce `border-radius: 0` across all components to match the mockup's "tactical whiteboard" visual rule.

**Mockup Reference** (design/landing-and-encyclopedia-mockup.html line 40):
```css
* { border-radius: 0 !important; }
```

**Current State**:
- No systemic override — components may use Tailwind's default `rounded-*` classes if not explicitly avoided.
- Most existing encyclopedia components use `rounded-none` or no rounding, so this is mostly a safeguard.

**Action**:
1. Add to `frontend/src/index.css` or `frontend/tailwind.config.js`:
   
   **Option A (CSS, simplest)**:
   ```css
   /* Global hard corners for "tactical whiteboard" feel */
   * {
     border-radius: 0 !important;
   }
   ```
   
   **Option B (Tailwind, more idiomatic)**:
   ```js
   // In tailwind.config.js, theme.extend:
   borderRadius: {
     DEFAULT: "0px",
     none: "0px",
     sm: "0px",
     md: "0px",
     lg: "0px",
     xl: "0px",
     "2xl": "0px",
     "3xl": "0px",
     full: "0px", // Even full circles become squares — intentional
   },
   ```

2. Verify no components are using `rounded-full` or other rounding utilities; if they are, they'll all become hard-cornered.

**Note**: This is a late-stage polish and is optional. If any component intentionally relies on rounding (e.g., circular avatars, soft buttons), this rule may need exceptions.

---

## Sequencing Recommendation

**Phase 1 (High Impact, Low Risk)**:
1. Value Propositions column (#3)
2. Community Callout band (#5)
3. Footer links (#7)

*Rationale*: These add key UX signaling and completeness without touching existing card structures or requiring new backend work. Can run tests to verify no regressions.

**Phase 2 (Medium Impact, Medium Risk)**:
4. Hero expansion (#1)
5. EntryCard media placeholder (#6)

*Rationale*: These refactor existing layouts and change card structure. Requires updating snapshot tests but no backend work. Test in isolation first.

**Phase 3 (Low Impact, Stub-Friendly)**:
6. Practice Planner teaser (#4)
7. Hero secondary CTA (#2)

*Rationale*: Visual-only stubs for future features. Can be added last and don't affect core functionality.

**Phase 4 (Optional Polish)**:
8. Global hard corners (#8)

*Rationale*: Nice-to-have visual consistency rule; defer until other work is stable.

---

## Testing Checkpoints

After each phase:
- Run `npm run dev` and visually compare `/` against `design/landing-and-encyclopedia-mockup.html` side by side.
- Run `npm test` and update snapshots for any changed component structures.
- Check axe-core contrast and accessibility on updated pages (automated `contrast.test.ts` + manual axe pass).
- Verify footer links reach stub pages without 404s.
- Spot-check on mobile (`md`, `lg`, `xl` breakpoints) to confirm responsive behavior didn't break.

---

## Out of Scope (Intentional Deviations)

These items diverge from the mockup but are deliberate design choices in the real app:

1. **Header CTA**: Mockup says "Sign In"; real app says "Submit a Drill." No auth system exists, so a fake Sign In button would mislead. Keeping "Submit a Drill" is correct.

2. **Mobile nav row**: The mockup is desktop-only; the real app adds a second nav row below `lg` for tablet/mobile. This is a responsive-design necessity, not a bug.

3. **EntryCard tag coloring**: Mockup uses uniform green (`film.accentGreen`) pills for all tags; real app uses color-coded skill-difficulty badges (green/yellow/red). Current approach is more semantic and accessible; no change needed.

4. **Search bar mobile treatment**: Mockup has no mobile search; real app adds a mobile search icon link. This is intentional responsive UX, not a gap.

---

## Related Documents

- `design/landing-and-encyclopedia-mockup.html` — Static HTML mockup (visual reference).
- `design/MOCKUP-NOTES.md` — Design intent and rationale.
- `.cicadas/canon/ux-overview.md` — UX goals and Key Flows.
- `frontend/src/encyclopedia/` — Current implementation (Home.tsx, Layout.tsx, EntryCard.tsx, pages/).

---

## Implementation status — 2026-07-07

Implemented in one pass (all frontend tests pass, verified visually in-browser against the mockup):

- ✅ #1 Hero expansion (two-column + graph-paper tactical visual)
- ✅ #2 Hero secondary CTA ("Generate a Practice Plan", disabled placeholder)
- ✅ #3 Value Propositions column (1/3 panel + 2/3 Popular Resources split)
- ✅ #4 Practice Planner teaser (copy + disabled CTA + export-module visual)
- ✅ #5 Community Callout band (green CTA + hard shadow → /contribute)
- ✅ #6 EntryCard media placeholder (also applied to Search's ResultCard)
- ✅ #7 Footer links (About/Contact/Privacy stub pages via `pages/InfoPages.tsx` + routes)
- ✅ #8 Hard corners — scoped as `.film-room * { border-radius: 0 }` on the encyclopedia Layout root (not global: /contribute keeps its rounded intake UI)
- ✅ #9 Fonts — JetBrains Mono self-hosted in `public/fonts/` + `@font-face`; `mono`/`sans` added to Tailwind config; Helvetica body voice scoped to `.film-room` (intake keeps Nunito)
- ✅ #11 (partial) — "+ Add to Current Practice Plan" disabled CTA and graph-paper `PLAYBOOK_VIEW_V1` diagram placeholder on EntryDetail; media transport bar deferred pending #10
- ⏸ #10 Focus Modal — deferred, needs product decision (build vs. accept deviation)
- ⏸ #12 Command-palette browse header — accepted deviation, not built

---

## Update — 2026-07-07 Re-investigation

Re-checked the mockup against the current implementation, focused on gaps the first pass didn't cover: typography wiring, the entry-detail interaction model, and the browse/search page structure. The items above (Hero, Value Props, Community Callout, Footer, hard corners) are still accurate and still open. The items below are new.

### 9. Font families: `mono` and `sans` are not wired to match the mockup (Priority: High)

**What**: The mockup's Tailwind config defines all three font families — `heading`, `mono`, and `sans` — but the real `frontend/tailwind.config.js` only defines `heading`. `font-mono` and `font-sans` utility classes (used pervasively — nav links, tag pills, buttons, breadcrumbs, badges, section numbering) fall back to Tailwind's default stacks, not the mockup's.

**Current State**:
- `tailwind.config.js` (`theme.extend.fontFamily`) only sets `heading`. No `mono` or `sans` override exists.
- `frontend/src/index.css:29` hardcodes `body { font-family: "Nunito", "Inter", system-ui, -apple-system, sans-serif; }` — neither font is self-hosted or linked anywhere (no `@font-face`, no `<link>` in `index.html`), and neither matches the mockup's declared body stack.
- No JetBrains Mono is loaded anywhere in the project (`grep -rn "JetBrains" frontend/` returns nothing).

**Mockup Reference** (`design/landing-and-encyclopedia-mockup.html:27-31`, confirmed in `MOCKUP-NOTES.md:48-51`):
```js
fontFamily: {
    heading: ['"druk"', '"druk Fallback"', '"Oswald"', '"Arial Narrow"', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
    sans: ['Helvetica Neue', 'Arial', 'sans-serif']
}
```
MOCKUP-NOTES.md is explicit that the mono voice "is what gives the whole thing its 'film room / spec sheet' character; it's not just for code-like content" — so this isn't a cosmetic nit, it's load-bearing for the whole visual identity.

**Action**:
1. Add a JetBrains Mono web font (Google Fonts `<link>` in `index.html`, or self-host like Druk in `public/fonts/` + `@font-face` in `index.css` — self-hosting is more consistent with how Druk was already done).
2. Add `mono: ['"JetBrains Mono"', 'monospace']` to `tailwind.config.js` `fontFamily`.
3. Replace the `body` rule in `index.css` with `font-family: "Helvetica Neue", Arial, sans-serif;` (or add `sans: ['"Helvetica Neue"', 'Arial', 'sans-serif']` to the Tailwind config and drop the hardcoded body rule in favor of applying `font-sans` at the root), so body copy matches the mockup's clean grotesque look instead of Nunito's rounded, friendlier feel.
4. Visually re-check every `font-mono` usage (there are dozens) after the swap — some spacing/line-height may shift since JetBrains Mono's metrics differ from the current fallback.

**Future work**: None — this is a self-contained font-loading fix.

---

### 10. Focus Modal "peek" interaction is entirely missing (Priority: High — largest structural gap found)

**What**: `MOCKUP-NOTES.md` calls the modal-peek pattern "the core idea" of the interaction model: clicking a card should open a centered modal overlay (`modal-popup-design-mockup.html`, Design B) over the current browsing context, with a separate action to "promote" it into the full page. The real app has **no modal at all** — `EntryCard` and `ResultCard` (`Search.tsx`) both link straight to the full `EntryDetail` page via `entryUrl()`. There is no intermediate peek state.

**Why this matters**: This isn't a missing visual flourish — it's a missing interaction model. The mockups document it as the primary way users are meant to compare entries while browsing without losing their place; going straight to a full-page navigation on every card click is a materially different (heavier) browsing experience than what was designed and reviewed.

**Action** (scoped, not required to ship immediately — flagging for a deliberate decision):
1. Decide whether to build the modal now or accept the direct-navigation flow as an intentional deviation. If accepted as a deviation, this belongs in "Out of Scope" below with a rationale (e.g., "ship full-page-only for v1, revisit modal post-launch").
2. If building: modal and full-page must render from the same content component per `MOCKUP-NOTES.md:27` (share the instructions/coaching/variations blocks; only the wrapper differs) — do not fork `EntryDetailContent` into two templates.
3. Modal is a trimmed subset of the full page per `MOCKUP-NOTES.md:105-108`: no breadcrumbs, no footer, no Variations section, static (non-sticky) media pane, half-height split layout capped at `max-w-6xl`/`80vh`.
4. A "promote to full tab" action (e.g., an icon/link in the modal header) should navigate to the same entry's full URL.

**Future work**: Even if deferred, the mockup's open question about the modal→full-tab transition animation (`MOCKUP-NOTES.md:114`) is unresolved and would need a decision before building.

---

### 11. EntryDetail (full-tab) page is missing several mockup-specified elements (Priority: Mid)

Comparing `frontend/src/encyclopedia/pages/EntryDetail.tsx` against `design/full-drill-tab-mockup.html`:

- **No "Add to Current Practice Plan" CTA.** The mockup's full-tab and modal views both end their content with a full-width primary button (`+ Add to Current Practice Plan`, white bg/border-2 zinc-900, hover-inverts to solid black). The real page ends after the Tags section / `SimilarEntries` — no CTA at all, not even a disabled/stub one. Given the Practice Planner itself doesn't exist yet (see item #4 above), this should likely be a disabled/stub button rather than a functional one, consistent with how the Hero's secondary CTA was scoped.
- **No "← Back to Directory" / Entry ID utility bar.** The mockup's full-tab left column has a small utility bar above the media pane with a back link and `Entry ID: ####` mono label. The real page's `Breadcrumbs` component covers similar ground but is positioned above the title, not paired with the media pane.
- **No media transport bar.** The mockup's full-tab (not the modal) adds a play button + scrub bar + timestamp below the diagram frame, distinguishing it from the modal's static media. `MediaEmbed.tsx` renders a plain `aspect-video` iframe/image with an optional caption — no transport chrome. This is explicitly called out in `MOCKUP-NOTES.md:101` as a full-tab-only differentiator from the modal, so if the modal (item #10) is deferred, this is lower priority; if the modal ships, this becomes the visual cue that distinguishes the two views.
- **Media placeholder lacks the "diagram frame" treatment.** The mockup wraps its diagram/video placeholder in a mini app-window frame (small titlebar reading `PLAYBOOK_VIEW_V1` with two dot indicators, graph-paper grid background behind it) — see `modal-popup-design-mockup.html:180-196`. The real `MediaEmbed` is a plain bordered box with no graph-paper background or frame chrome. This only matters when there's no real media (`entry.media[0]` is falsy today, `EntryDetail.tsx:143` — worth checking whether entries without media currently render an empty gap where the mockup would show this placeholder).

**Action**: Lower priority than #9/#10; can be bundled with whichever of the CTA/media items are judged worth doing before a media-upload pipeline exists.

---

### 12. Browse/Search page structural differences (Priority: Low — largely an intentional, reasonable deviation)

The mockup's Encyclopedia Browse page (`landing-and-encyclopedia-mockup.html#page2`) uses a centered "command palette" header (pink mono eyebrow + heading-font description line + big centered search input) and organizes results into **per-type grouped sections** (Drills, Strategies, Formations, … each with its own heading + "View all →" + 3-card row), per `MOCKUP-NOTES.md:74-82`.

The real app instead has:
- `Section.tsx` — one type at a time, plain left-aligned `<h1>`, standard grid. No cross-type grouping (by design — each section is its own route).
- `Search.tsx` — a left sidebar `FilterPanel` ("Filter Inspector") that does match the mockup's filter-sidebar concept well, paired with a flat results grid rather than per-type grouped rows, and a standard left-aligned heading rather than the centered command-palette treatment.

**Assessment**: This is a reasonable architectural divergence, not obviously a bug — routing browse-by-type as separate URLs (`/drills`, `/strategies`, …) is arguably better IA than the mockup's single toggle-based browse page, and `Search.tsx` already implements real filter/sort/empty-state logic the static mockup never had to solve. Recommend leaving as-is, but note the centered "command palette" header treatment (pink eyebrow + large search) could be a cheap, high-value visual polish pass on `Search.tsx` and `Section.tsx` if the team wants closer visual fidelity without an IA change.

---

## Where the mockup itself is insufficient

The static HTML mockups are visual/interaction references only — they never had to solve several things the real implementation had to invent from scratch. Worth naming explicitly so they aren't mistaken for "gaps" to close against a mockup that has no opinion on them:

- **No loading, error, or empty states.** The mockups show only the "happy path" fully populated. All skeleton loaders (`Skeletons.tsx`), retry-on-error UI, and the "0 results / close matches" empty-state logic in `Search.tsx` were designed without a mockup reference and should be treated as already-settled, not measured against the mockup.
- **No responsive/mobile design.** Per `MOCKUP-NOTES.md:116`, "mockups are desktop-width only." The real app's mobile nav row, mobile search icon link, and all responsive breakpoint behavior are necessary inventions, not deviations (already correctly captured in "Out of Scope" item 2 and 4 below).
- **No SEO/metadata/structured-data layer.** `Seo.tsx`, sitemap generation, and `HowTo` JSON-LD (per the 4e6ddb4 commit) have no mockup equivalent at all — pure backend/head-management work with no visual surface to compare against.
- **Modal→full-tab transition is unspecified.** `MOCKUP-NOTES.md:114` flags this as an open question even within the mockup itself — the mockups toggle between static states via JS buttons, not a real animated transform. If item #10 is built, the transition design still needs to be invented, not extracted from the mockup.
- **Ambiguous diagram-placeholder purpose.** `MOCKUP-NOTES.md:115` — unclear whether the graph-paper diagram placeholder is where the future Drill Visualizer (manual editor + AI-generated animation, per `encyclopedia-draft.md`) actually renders, or a separate mode. Worth resolving before investing in the "diagram frame" treatment from item #11.
- **Druk font licensing was an open question.** `MOCKUP-NOTES.md:117` asked whether the licensed `druk` font would actually be acquired or whether Oswald becomes the real heading font. Current state (2026-07-07): the real Druk (Commercial Type) **trial** builds from `fonts/Druk_Collection/Druk Family` are wired as the primary `font-heading` face (Medium=400, Bold=700, Super=900), with `DrukaatieBurti` (open-source Druk-alike) as fallback. ⚠️ Trial fonts are evaluation-only — a production license must be purchased (or the stack dropped back to DrukaatieBurti) before launch.

---

## Updated Sequencing Recommendation

Supersedes the "Sequencing Recommendation" section above where it conflicts — the font fix (new, cheap, foundational) should land first since it affects the visual read of every other phase:

**Phase 0 (New — do first)**:
- Font families: wire `mono` and `sans` (#9).

**Phase 1 (High Impact, Low Risk)** — unchanged from original:
1. Value Propositions column (#3)
2. Community Callout band (#5)
3. Footer links (#7)

**Phase 1.5 (Decision needed before scheduling)**:
- Focus Modal interaction (#10) — requires a product decision (build now vs. document as accepted deviation) before it can be sequenced; the largest-effort item found in this investigation.

**Phase 2 (Medium Impact, Medium Risk)** — unchanged, plus new item:
4. Hero expansion (#1)
5. EntryCard media placeholder (#6)
6. EntryDetail CTA + utility bar (#11, CTA/back-link portions only — defer media transport bar until #10 is resolved)

**Phase 3 (Low Impact, Stub-Friendly)** — unchanged:
7. Practice Planner teaser (#4)
8. Hero secondary CTA (#2)

**Phase 4 (Optional Polish)** — unchanged, plus new item:
9. Global hard corners (#8)
10. Browse/Search command-palette header treatment (#12)
