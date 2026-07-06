# ultipedia — Design Doc Draft (Steps 1–2: Foundation & Encyclopedia)

*Suggested answers for each section. Treat as a starting draft — override anything that doesn't fit.*

---

## 1. Overview
Steps 1–2 deliver a live, publicly browsable encyclopedia of ultimate frisbee drills, strategies, formations, plays, and skills at `ultipedia.cartercripe.com`, with clean entry pages and section browsing. Search/filtering (Step 3) and content seeding (Step 4) come right after and are designed for here but not built yet.

**Out of scope for this doc:** practice planner, accounts, community submissions, drill visualizer — all later steps, but the data model below should not block them.

---

## 2. Goals & Non-Goals
**Goals:**
- Any entry reachable in ≤2 clicks from the homepage
- Entry pages that read as authoritative and complete, not sparse
- A data model flexible enough that Steps 3–10 don't require a schema rewrite

**Non-goals (for now):**
- Auth/accounts — no login gate anywhere in the encyclopedia
- User-generated content — you're the only author at this stage
- Mobile app — responsive web only
- Video hosting infrastructure — embed from YouTube/Vimeo rather than hosting files yourself

---

## 3. Content Model / Data Design

**Shared fields across all entry types** (Drill, Strategy, Formation, Play, Skill):
- `id`, `slug`, `title`, `short_description` (for cards/previews), `skill_level`, `body` (full instructions, likely markdown/rich text), `coaching_points` (list), `common_mistakes` (list), `variations` (list, could self-reference other entries), `media` (array of image/video refs), `tags` (array, see taxonomy), `related_entry_ids` (manual curation to start), `status` (draft/published), `created_at`/`updated_at`

**Type-specific fields:**
- **Drill:** `player_count_min`, `player_count_max`
- **Strategy/Formation:** `offense_or_defense` enum, `diagram_ref` (placeholder for Step 9 visualizer),
- **Play:** links to parent Strategy/Formation
- **Skill:** difficulty progression, prerequisite skills (self-referencing)

**Design pattern to use:** a **single `entries` table/collection with a `type` discriminator field** plus a flexible `attributes` JSON column for type-specific data, rather than five separate tables. This is the classic "single-table inheritance" or "polymorphic entity" pattern — it keeps search/filtering/tagging logic unified across all entry types (one query hits everything), while type-specific fields still live in one place. Avoids the join-heavy alternative and avoids needing schema migrations every time you add a field to one type.

**Taxonomy (draft, finalize before building):**
- Skill level: Beginner / Intermediate / Advanced
- Team size: numeric range
- Duration: numeric range (minutes)
- Difficulty: 1–5 scale
- Focus category: Throwing, Cutting, Marking/Break-mark, Person Defense, Zone Defense, Offensive Systems, Conditioning, Disc Skills, Mental Game/Communication
- Drill type: Warm-up, Skill Drill, Game-situation, Scrimmage Variant, Conditioning
- Equipment: Cones, Discs, Cleats/none, etc.

Store tags as a **many-to-many join** (entries ↔ tags table), not a comma-separated string — this is what makes filtering and "similar drills" actually performant later.

Versioning: skip for now — flag it as a Step 8 concern (needed once external submissions exist).

---

## 4. Database

**Recommendation: Supabase**

**Schema sketch:**
```
entries (id, slug, type, title, short_description, body, status, created_at, updated_at, attributes JSONB)
tags (id, name, category)
entry_tags (entry_id, tag_id)
media (id, entry_id, url, type, caption, sort_order)
```

**Indexing:** GIN index on the `tsvector` search column, index on `entry_tags.tag_id` for filter queries, index on `entries.status` since published/draft filtering happens on every public query.

**Draft/publish state:** every entry has a `status` field (`draft` | `published`). Public site only ever queries `status = 'published'`. This one flag does a lot of work later — it's also exactly what the Step 8 moderation queue will reuse.

---

## 5. Tech Stack

- **Frontend framework:** Next.js (React) — App Router. Good fit because it gives you server-rendered pages for SEO (Section 12), file-based routing that maps cleanly to your URL structure, and it's the framework most AI coding tools (Claude Code included) are strongest with.
- **Backend/API:** Next.js API routes / Server Actions — no need for a separate backend service at this scale. Keeps Steps 1–2 to a single deployable app.
- **Search:** Postgres full-text search to start (via Supabase). Pattern to know: **the "search index as a query, not a service" approach** — don't reach for Algolia/Meilisearch until entry count or query complexity actually demands it. Migrating later is a contained change if the data layer is clean.
- **Hosting:** Vercel (same platform as your main site, but a **separate project**, not the same deployment). This is what makes independent deploys possible while still living under cartercripe.com via subdomain DNS.
- **Media storage:** Supabase Storage or Cloudinary for images; embed video via YouTube/Vimeo iframe rather than self-hosting.
- **UI components:** Tailwind CSS + shadcn/ui — gives you accessible, unstyled-by-default primitives (dialogs, dropdowns, tags/badges) that you skin yourself, which avoids the generic-template look while not building components from scratch.
- **Icons:** Lucide (pairs natively with shadcn/ui).

---

## 6. Architecture Sketch

```
Browser
  → Next.js frontend (server-rendered entry & section pages)
  → Next.js API routes / Server Actions
  → Postgres (Supabase) — entries, tags, media
  → Supabase Storage / Cloudinary — images
  → YouTube/Vimeo — embedded video (external)
```

**Rendering pattern:** Static Site Generation (SSG) with **Incremental Static Regeneration (ISR)** for entry and section pages. Since you're the sole author at this stage, content doesn't change every second — pre-rendering pages at build time (and revalidating on a timer or on-publish) gives you near-instant page loads and strong SEO, without needing full server-rendering on every request. This is the standard pattern for content sites with infrequent updates (blogs, docs sites, product catalogs) and maps directly onto your encyclopedia.

Search/filter pages are the exception — those need to be dynamic (client- or server-rendered per query) since results depend on user input.

---

## 7. Information Architecture / Navigation

**Top-level nav:** Drills · Strategies · Formations · Plays · Skills · Search (persistent, not just a page)

**URL structure:** `/drills/[slug]`, `/strategies/[slug]`, etc. — type is in the path, slug is human-readable (e.g. `/drills/give-and-go-warmup`). This mirrors how Notion, Coursera, and most modern docs/content sites structure URLs: predictable, shareable, and good for SEO.

**Section pages:** grid of cards (not a bare list) — each card shows title, 1-line description, difficulty badge, and 2–3 key tags, so a coach can decide whether to click without visiting the page. This is the pattern Sportplan and most drill libraries you found already use, and it's also how Notion's gallery view or Airbnb's listing grid works — scan-friendly at a glance.

**Breadcrumbs:** Home / Drills / Give-and-Go Warmup — simple, standard, low-effort to build with Next.js routing.

---

## 8. Entry Page Design

**Layout (modern content-site pattern, think Notion doc + recipe-site hybrid):**
- **Above the fold:** title, difficulty/skill-level badges, duration, team size — all as a tag row directly under the title (same pattern as recipe sites showing prep time/servings up top)
- Primary image or diagram placeholder immediately visible
- **Body:** instructions in a numbered/step format, not a wall of text
- **Sidebar or collapsible sections below the fold:** Coaching Points, Common Mistakes, Variations — each a distinct visually-separated block (cards or accordion), not just headers in a flowing document. This keeps a long entry scannable — a coach glancing at their phone mid-practice can jump straight to "Coaching Points" without reading setup instructions again.
- **Tags:** rendered as clickable pill/badge components (shadcn "Badge" component) — clicking a tag routes to a pre-filtered section/search page. This is the same pattern as GitHub topic tags or Stack Overflow tags — extremely familiar, zero learning curve.
- **Similar drills:** a horizontal card carousel or simple 3-card row at the bottom, computed at this stage via **shared-tag overlap scoring** (count matching tags, sort descending) — good enough without needing embeddings or ML yet. Swap for a smarter method once there's usage data.
- **Video/image:** embedded near the top if it's a short demo clip (mirrors how recipe/drill sites lead with the visual), full media gallery lower on the page if there are multiple images.

---

## 9. Search & Filtering Design

- **Persistent search bar** in the header (not just a dedicated search page) — modern standard (Notion, Linear, Stripe docs) because it lets users search from anywhere without navigating first.
- **Filter UI:** left sidebar on desktop, collapsible drawer/bottom sheet on mobile — filter *chips* summarizing active filters at the top of results (removable by clicking the × on the chip). This is the pattern used by nearly every modern e-commerce and content-filtering UI (Airbnb, Amazon) because it makes the current filter state legible at a glance.
- **Filter logic:** AND across categories (e.g. Skill Level AND Team Size), OR within a category (e.g. Focus: Throwing OR Cutting) — matches how most people intuitively expect filters to behave.
- **Sort options:** Relevance (default when searching), Difficulty (asc/desc), Newest
- **Empty state:** don't just say "no results" — suggest removing the most restrictive filter, or show 2–3 close matches. Small detail, big intuitiveness win.
- **Performance:** fine at low hundreds of entries with Postgres FTS + indexed tag joins; revisit only if the library grows into the thousands.

---

## 10. Visual Design

- **Overall direction:** clean, athletic, high-contrast — avoid the "generic SaaS dashboard" look. Reference points: Linear's clarity and restraint, combined with the energy of a sports-brand site (think Strava's confident use of color and imagery) rather than a sterile productivity tool.
- **Color palette:** one strong accent color (im thinking pink) against a neutral light, with one alternate accent (green), and difficulty/category badges using a small, consistent secondary palette (e.g. green/yellow/red for skill level).
- **Typography:** a clean geometric sans-serif (Inter or similar) for UI text; <"druk","druk Fallback","Oswald","Arial Narrow",sans-serif> font for headers/titles to avoid looking like every other Tailwind starter template.
- **Components:** expandable page sections for components (ie name/core attributes visable). Expand to see description/diagram/etc. Sections seperated by some divider. Pill-shaped badges for tags, a clear visual difficulty indicator (dots or a small bar, not just text) — genuinely useful for coaches scanning quickly.
- **Responsive:** mobile-first, since coaches will likely be pulling this up on a phone at the field — big tap targets, sticky search/filter access, collapsible sections on entry pages to avoid excessive scrolling.
- **Accessibility:** AA contrast minimum on all badge/text combinations, minimum 16px body text, don't rely on color alone for difficulty (pair color with a label or icon).

---

## 11. Content Authoring Workflow

- At this stage, skip building a custom CMS UI — **author directly through a lightweight admin tool**: either Supabase's built-in table editor for structured fields, or a simple internal Next.js form page you build once and reuse. Building a full CMS now is premature; the moderation queue in Step 8 will need a real review UI anyway, so it's reasonable to defer a nicer authoring experience until then.
- **Content checklist per entry** (use this as a literal checklist while seeding): title, short description, full instructions, ≥2 coaching points, ≥1 common mistake, all required tags filled, at least one image or video reference.
- For the 95+ curated sources: a simple **spreadsheet-to-database import script** is worth building once — transcribe sources into a structured spreadsheet (matching the field list above) first, then bulk-import via script rather than hand-entering each one through a UI. Much faster for the seeding grind in Step 4.

---

## 12. SEO & Discoverability

- Yes — public entries should be fully indexable. This is a real growth channel (coaches searching "ultimate frisbee zone defense drills" should be able to find you).
- Next.js makes this straightforward: per-page `<meta>` title/description generated from entry data, auto-generated `sitemap.xml`, and JSON-LD structured data (schema.org `HowTo` type fits drills unusually well — Google can render step-by-step rich results directly in search).
- Shareable URLs are already covered by the slug-based routing in Section 7.

---

## 13. Deployment & Environments

- **Environments:** local dev (your machine) → preview deploys (automatic on Vercel for every branch/PR — useful for checking changes before they go live) → production
- **Pipeline:** GitHub repo connected directly to Vercel — push to main deploys to production automatically, push to any other branch gets a preview URL. Zero custom CI needed at this scale.
- **DNS:** add a CNAME record for `ultipedia` pointing to Vercel's provided target, configured in whatever DNS provider manages cartercripe.com — independent of the main site's Vercel project.
- **Secrets:** database connection string and any API keys (Cloudinary, etc.) stored as Vercel environment variables, never committed to the repo.

---

## 14. Open Questions
- Final taxonomy values — worth sanity-checking against the 95+ sources before locking the schema, in case a category is missing
- Whether "Plays" truly needs to be a separate entry type or is just a sub-type of Strategy/Formation
- Exact visual identity (colors/fonts) — worth a quick moodboard pass before committing in Tailwind config
- Whether to build the admin authoring form now or just use Supabase's table editor through all of Step 4

---

## 15. Decision Log

| Decision | Choice | Reasoning | Date |
|---|---|---|---|
| Database | PostgreSQL (Supabase) | Relational + JSONB flexibility, free auth later | — |
| Frontend | Next.js | SEO via SSG/ISR, strong AI-tooling support | — |
| Entry data model | Single table + type discriminator | One query/search path across all entry types | — |
| Search (Step 3) | Postgres full-text search | Sufficient at current scale, avoids extra service | — |
| Hosting | Vercel, separate project from main site | Independent deploys, subdomain via DNS | — |

---

## 16. Design Patterns by Feature

*Organized by feature/aspect, not by pattern — the goal is the best-fit pattern(s) for each problem, not one slot per pattern. Some features get two patterns working together; some get none, because a plain function is genuinely the right answer there.*

### Entry data model (§3/§4 — Drill/Strategy/Formation/Play/Skill via single table + `type` discriminator)
- **Factory Method.** The discriminator already implies this: an `EntryFactory.fromRow(row)` should be the one place that turns a raw row + `attributes` JSONB blob into the right typed object, so every other layer works against a common `Entry` interface instead of branching on `type` repeatedly. This is really what "single table + type discriminator" already is on the data side — naming it just makes the factory an explicit object instead of scattered conditionals.
- No Abstract Factory needed here on its own — see Entry Page Rendering below, where the "family of UI pieces per type" problem actually lives.

### Tagging & taxonomy (§3/§4 — many-to-many tags, ~20–30 fixed taxonomy values)
- **Flyweight.** Taxonomy values are a small fixed set reused across potentially hundreds of entries. Interning `Tag` objects by id/name rather than re-instantiating per entry is a cheap, genuine win once "similar drills" scoring (below) is comparing tag sets across the whole library.

### Media embedding (§5/§6/§8 — Supabase Storage/Cloudinary images, YouTube/Vimeo video)
- **Adapter.** A `MediaEmbed` interface with `YouTubeAdapter`/`VimeoAdapter`/`CloudinaryAdapter` normalizes "give me an embeddable element" so entry pages don't care which provider a given media row came from, and adding a provider later doesn't touch rendering code.
- **Proxy (virtual).** Video embeds "near the top if short" (§8) are a natural lazy-load candidate — don't construct the actual iframe/player until it's scrolled into view.

### Entry page rendering (§8 — shared layout across 5 types, optional sidebar sections)
- **Template Method.** All five types share one page skeleton (header/badges → media → body → sidebar sections → similar entries) with only small type-specific pockets (Drill's player count, Skill's prerequisite chain). One `renderEntryPage()` template with overridable hooks per type avoids re-deriving the layout five times.
- **Decorator.** Coaching Points / Common Mistakes / Variations (§8) are optional, stackable, independently-present-or-absent blocks — a base entry renderer wrapped by optional section decorators (only applied if that data exists) fits better than a conditional-heavy flat template.
- **Abstract Factory.** If card + detail-page + submission-form (§8, §11, community submissions) need to stay visually/structurally consistent per type, a per-type UI factory (`DrillUIFactory`, `PlayUIFactory`, ...) is worth it — but only once you notice the three are drifting out of sync in practice; don't build it preemptively.

### Search & filtering (§9)
- **Strategy.** Sort options (Relevance/Difficulty/Newest) are naturally interchangeable `SortStrategy` objects, and the AND-across-categories/OR-within-category filter logic is one strategy per filter behavior.
- **Chain of Responsibility.** The filter pipeline itself — narrow by skill level, then team size, then focus category — is a sequence of independent handlers, each narrowing the result set, rather than one big predicate.
- **Facade.** Wrap the entries/tags/entry_tags/media joins (§4) behind one `EncyclopediaService` (`searchEntries()`, `getEntry()`, `getSimilar()`) so the eventual Postgres FTS → Meilisearch swap (§5) changes one implementation, not every call site.
- **Iterator.** Paginated result sets, once entry count grows past "low hundreds" (§9's own performance note).

### Similar-drills recommendations (§8)
- **Strategy** — this is the standout fit, and it's already implicit in your own wording: §8 says "shared-tag overlap scoring... swap for a smarter method once there's usage data." That's a `SimilarityStrategy` interface, `TagOverlapStrategy` today, `EmbeddingStrategy` later, swapped without touching any caller.

### Automatic practice planner (overview §3 — warm-up/drills/scrimmage, swap/regenerate, save plans)
- **Builder.** A plan is assembled incrementally with dependent constraints (time budget, skill level already chosen) — `PracticePlanBuilder.addWarmup().addDrillBlock().addScrimmage().build()` beats one large generator function.
- **Composite.** The resulting plan is a tree (Plan → Blocks → Drills, each with a duration) — modeling it as `PlanNode.getDuration()/render()` makes "does this fit in 60 minutes" and export (below) recurse instead of hand-summing durations in multiple places.
- **Mediator.** Swapping/regenerating one drill within a plan has to keep timing, block order, and skill-level constraints in sync — a `PracticePlannerMediator` centralizes that instead of drill-card components reaching into each other.
- **Memento.** "Save generated plans to your account" and swap/regenerate-with-undo (overview §3/§4) are the same underlying need: a saved plan or a pre-swap snapshot is a Memento of planner state. Worth treating them as one mechanism rather than two.

### Drill visualizer (overview §6 — manual drag-drop editor + AI-generated animation)
- **Command.** Drag-drop edits (move player, add arrow, place cone) are the classic case for encapsulating each edit as an undoable command object — this is what makes undo/redo in a diagram editor tractable at all.
- **Composite.** The diagram itself (players, cones, arrows, disc paths) is a scene graph of drawable elements — same shape as the practice-plan tree above, same pattern.
- **Strategy.** Manual editing vs. AI-generated animation are two interchangeable ways of producing the same underlying diagram data structure — worth keeping them behind one interface from the start rather than bolting AI generation on as a special case later.

### Community submissions & moderation (overview §5)
- **State.** §4's `draft`/`published` flag is already flagged for reuse here — once submissions exist, it grows to draft → submitted → in-review → published/rejected, each with different valid transitions. Worth an explicit `EntryState` rather than an expanding set of string checks.
- **Chain of Responsibility.** Submission review (field-completeness check → tag validation → duplicate check → human review) is the same shape as the search filter pipeline above — independent stages, each able to reject or pass through.

### Content authoring / seeding (§11)
- **Prototype.** Variations/progressions (§3's self-referencing `variations` field) and the 95+ source seeding grind are both "start from a near-duplicate, tweak a few fields" — cloning a base entry beats re-entering one from scratch through the admin form.

### SEO & export (§12 — JSON-LD, sitemap; overview §3 — PDF plan export)
- **Visitor.** JSON-LD structured data, PDF export, and sitemap generation are all "traverse the entry/plan tree, produce a different output per node type" — a `JsonLdExportVisitor`/`PdfExportVisitor` keeps that logic out of the core `Entry`/`PlanNode` classes instead of each one growing a `toPdf()`/`toJsonLd()` method.

### Shared infrastructure (§4/§6 — DB client, caching)
- **Singleton.** The Supabase client and the search query builder should be constructed once and reused — flagged only so it isn't reinvented ad hoc in multiple files.
- **Proxy (caching).** A caching layer in front of `EncyclopediaService.searchEntries()` avoids re-hitting Postgres FTS for repeat/common queries once usage grows.

### Not worth a pattern
- **Deployment/hosting (§13)** — infrastructure config, not object collaboration; nothing here benefits from a GoF pattern.
- **Interpreter** — only earns its keep if search grows a real query language (e.g. `focus:zone AND difficulty:<3`); not justified at current scope.
- **Bridge** — only relevant if a second rendering target distinct from web/PDF shows up (e.g. a native app); Adapter + Composite already cover today's needs without it.