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
