# Ultipedia — Feature Specification

*An interactive encyclopedia and practice-planning tool for ultimate frisbee coaches and captains.*

---

## Vision & Audience

**Who it's for:** Coaches and captains — especially newer teams, less-experienced teams, and teams without a dedicated coach.

**What it does:** A single public hub for drills, strategies, skills, formations, and plays, with tools that turn that information into ready-to-run practice plans.

**Guiding design principle:** Intuitive and easy to use above all else. Someone should be able to land on the site with zero onboarding and find exactly what they need in a couple of clicks.

**Hosting:** Deployed independently on a subdomain of cartercripe.com (e.g., `ultipedia.cartercripe.com`), separate from the main personal site's Vercel deployment.

---

## Core Features

### 1. The Encyclopedia

The heart of the site — a browsable, well-organized information database.

- **Top-level sections:** Drills, Strategies, Formations, Plays, Skills
- Each section presents a clean, scannable list of entries
- **Entry pages include:**
    - Setup and step-by-step instructions for running it
    - Coaching points and focus areas
    - Common mistakes to watch for
    - Progressions / variations (easier and harder versions)
    - Full tag/attribute set (see Taxonomy below)
    - Visualization or animation (see Drill Visualizer)
    - Embedded video where available
    - "Similar drills" recommendations

### 2. Search, Filtering & Discovery

- Full-text search across all entries
- **Filter by any attribute:** skill level, team size, difficulty, focus category, session/drill length, equipment needed
- Session-length filtering specifically supports time-crunched coaches ("I have 30 minutes — what fits?")
- Sort options: relevance, popularity, difficulty, newest
- "Similar drills" surfaced on every entry page so one good find leads to more
- Possible goal-based browsing ("teach zone defense," "improve break throws")

### 3. Automatic Practice Planner

The flagship feature — generates a complete practice plan automatically.

- **Inputs:** practice length, team size / expected attendance, skill level, focus areas
- **Output:** a full session — warm-up, 2–4 drills, scrimmage/closer — with time allocations and coaching points for each block
- **PDF export** of the plan, formatted to send directly to the team
- Swap or regenerate individual drills within a generated plan
- Save generated plans to your account
- **Smart planning (later phase):** planner learns from favorites, past plans, and targeted skill gaps to make suggestions rather than pulling randomly from the database

### 4. Accounts & Personalization

- User sign-in
- Favorite drills
- History of previously generated practice plans
- *(Later)* Team profiles — default team size, skill level, and focus areas that pre-fill the planner

### 5. Community Contributions

- **Drill/strategy submission flow** — a structured form matching the tagging taxonomy so submitted content is consistent and filterable
- **Coach commentary** — experienced coaches can add notes, tips, and discussion on entries
- Moderation/review queue before submissions go live
- Contributor attribution on entries
- **Seeding strategy:** initial database built out from the curated source catalog (95+ sources already assessed), supplemented by direct outreach to coaches and experts

### 6. Drill Visualizer

- **Manual editor:** drag-and-drop players, cones, disc paths, and movement arrows — the industry-standard approach (TacticalPad / Sportplan style)
- **AI-generated animations (differentiator):** generate a visualization or animation directly from a drill's written description; the submitting coach reviews and tweaks before publishing
- Consistent visual language across all drills so diagrams are instantly readable site-wide

---

## Tagging Taxonomy (Draft)

Every entry is heavily tagged to power filtering, search, and the planner:

- **Skill level:** beginner / intermediate / advanced
- **Team size:** min–max players required
- **Duration:** time to run the drill
- **Difficulty rating**
- **Focus category:** throwing, cutting, marking / break-mark, person defense, zone defense, offensive systems (vertical, horizontal, side stack, etc.), conditioning/athleticism, disc skills, mental game / communication
- **Drill type:** warm-up, skill drill, game-situation, scrimmage variant, conditioning
- **Equipment needed:** cones, discs, etc.

---

## Inspiration & Prior Art

- **Flik, RiseUP** — ultimate-specific drill libraries with video and categories
- **Sportplan, planet.training** — large-scale multi-sport drill databases with filtering and session planning
- **TacticalPad** — tactics drawing and visualization tooling

**Common patterns worth adopting:** heavy tagging, video on every entry, favorites, and custom session building. AI-generated drill visualization is largely absent from existing platforms — a genuine differentiator.

---

## Pre-development drafting

- At least 3 potential wireframe design layouts showing different design paths
- Defined color/font/visuals displayed in a webpage for that purpose