// Shared encyclopedia shell: persistent header (wordmark + five section nav
// links + search bar) and footer wrapping every encyclopedia page via a
// react-router layout route (<Outlet />).
//
// "Light Film Room" visual system (ux.md): white/zinc base, film-accentPink
// primary accent, film-accentGreen secondary accent, mono uppercase
// micro-copy — the film-* theme tokens are formalized in tailwind.config.js.
//
// HelmetProvider (react-helmet-async context for seo/Seo.tsx) lives here
// rather than in main.tsx so every consumer of the exported route tree —
// including tests driving `routes` with MemoryRouter — gets head management
// without extra wiring. Every page that renders <Seo /> sits under Layout.

import { HelmetProvider } from "react-helmet-async";
import { Link, NavLink, Outlet } from "react-router-dom";
import { SECTIONS } from "../types";
import { SearchBar } from "./SearchBar";

function Wordmark() {
  return (
    <Link
      to="/"
      className="font-heading text-2xl font-bold uppercase tracking-widest text-zinc-900"
    >
      Ultipedia<span className="text-film-accentPink">.</span>
    </Link>
  );
}

function SectionNav({ label }: { label: string }) {
  // Distinct labels keep the desktop/mobile instances (and any page-level
  // section nav) unique landmarks for assistive tech (axe: landmark-unique).
  return (
    <nav
      aria-label={label}
      className="flex items-center gap-4 overflow-x-auto font-mono text-sm text-zinc-600 sm:gap-6"
    >
      {SECTIONS.map((section, i) => (
        <span key={section.path} className="flex items-center gap-4 sm:gap-6">
          {i > 0 && (
            <span aria-hidden="true" className="hidden text-zinc-300 sm:inline">
              ·
            </span>
          )}
          <NavLink
            to={`/${section.path}`}
            className={({ isActive }) =>
              isActive
                ? "whitespace-nowrap py-3 font-bold text-zinc-900 underline decoration-film-accentPink decoration-2 underline-offset-8"
                : "whitespace-nowrap py-3 transition-colors hover:text-zinc-900"
            }
          >
            {section.label}
          </NavLink>
        </span>
      ))}
    </nav>
  );
}

/** Mobile path to search: the full header bar is desktop-only, so below md a
 * 44px icon link routes to /search (which mounts its own full-width bar). */
function MobileSearchLink() {
  return (
    <Link
      to="/search"
      aria-label="Search the encyclopedia"
      className="flex h-11 w-11 items-center justify-center text-zinc-600 transition-colors hover:text-film-accentPink md:hidden"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    </Link>
  );
}

export function Layout() {
  return (
    <HelmetProvider>
      {/* .film-room (index.css): Helvetica body voice + hard-corner rule,
          scoped here so /contribute keeps its own visual system. */}
      <div className="film-room flex min-h-screen flex-col bg-white text-zinc-900">
        <header className="sticky top-0 z-50 border-b border-film-border bg-white">
          <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 md:gap-6">
            <div className="flex items-center gap-10">
              <Wordmark />
              <div className="hidden lg:block">
                <SectionNav label="Encyclopedia sections" />
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-6">
              <SearchBar label="Header search" className="hidden md:flex md:max-w-sm lg:max-w-md" />
              <MobileSearchLink />
              <Link
                to="/contribute"
                className="whitespace-nowrap border border-film-accentPink px-4 py-1.5 font-mono text-sm uppercase tracking-wider text-film-accentPink transition-colors hover:bg-film-accentPink hover:text-white"
              >
                Submit a Drill
              </Link>
            </div>
          </div>
          {/* Mobile/tablet section nav — the desktop nav is hidden below lg. */}
          <div className="border-t border-zinc-200 px-4 sm:px-6 lg:hidden">
            <SectionNav label="Encyclopedia sections (mobile)" />
          </div>
        </header>

        <main className="flex-grow">
          <Outlet />
        </main>

        <footer className="border-t border-film-border bg-film-panel">
          <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
            <div className="text-xl font-bold uppercase tracking-widest text-zinc-900">
              Ultipedia<span className="text-film-accentPink">.</span>
            </div>
            {/* Slash-separated link row per mockup footer. */}
            <nav
              aria-label="Footer"
              className="flex flex-wrap items-center justify-center gap-3 font-mono text-xs font-bold uppercase tracking-wider text-zinc-600"
            >
              <Link to="/about" className="transition-colors hover:text-film-accentPink">
                About
              </Link>
              <span aria-hidden="true" className="text-zinc-400">/</span>
              <Link to="/contact" className="transition-colors hover:text-film-accentPink">
                Contact
              </Link>
              <span aria-hidden="true" className="text-zinc-400">/</span>
              <Link to="/contribute" className="transition-colors hover:text-film-accentPink">
                Submit a Drill
              </Link>
              <span aria-hidden="true" className="text-zinc-400">/</span>
              <Link to="/privacy" className="transition-colors hover:text-film-accentPink">
                Privacy
              </Link>
            </nav>
            <div className="font-mono text-xs text-zinc-600">
              © 2026 Ultipedia
            </div>
          </div>
        </footer>
      </div>
    </HelmetProvider>
  );
}
