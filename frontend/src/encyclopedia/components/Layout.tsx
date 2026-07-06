// Shared encyclopedia shell: persistent header (wordmark + five section nav
// links + search-bar slot) and footer wrapping every encyclopedia page via a
// react-router layout route (<Outlet />).
//
// "Light Film Room" visual system (ux.md): white/zinc base, pink-700 primary
// accent, emerald-700 secondary accent, mono uppercase micro-copy. Uses
// built-in Tailwind classes matching the mockups' hex values (zinc-100 =
// film-panel, zinc-300 = film-border, pink-700 = film-accentPink, emerald-700
// = film-accentGreen); formalizing film-* theme tokens in tailwind.config.js
// is deferred to the polish partition since that file is outside this
// partition's modules.

import { Link, NavLink, Outlet } from "react-router-dom";
import { SECTIONS } from "../types";
import { SearchBar } from "./SearchBar";

function Wordmark() {
  return (
    <Link
      to="/"
      className="text-2xl font-bold uppercase tracking-widest text-zinc-900"
    >
      Ultipedia<span className="text-pink-700">.</span>
    </Link>
  );
}

function SectionNav() {
  return (
    <nav
      aria-label="Encyclopedia sections"
      className="flex items-center gap-4 overflow-x-auto font-mono text-sm text-zinc-500 sm:gap-6"
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
                ? "whitespace-nowrap py-3 font-bold text-zinc-900 underline decoration-pink-700 decoration-2 underline-offset-8"
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

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900">
      <header className="sticky top-0 z-50 border-b border-zinc-300 bg-white">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-6 px-4 sm:px-6">
          <div className="flex items-center gap-10">
            <Wordmark />
            <div className="hidden lg:block">
              <SectionNav />
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* Header search is desktop-only; on mobile the /search page
                mounts its own full-width bar (mobile header treatment is a
                polish-partition item). */}
            <SearchBar className="hidden md:flex md:max-w-xs lg:max-w-sm" />
            <Link
              to="/contribute"
              className="whitespace-nowrap border border-pink-700 px-4 py-1.5 font-mono text-sm uppercase tracking-wider text-pink-700 transition-colors hover:bg-pink-700 hover:text-white"
            >
              Submit a Drill
            </Link>
          </div>
        </div>
        {/* Mobile/tablet section nav — the desktop nav is hidden below lg. */}
        <div className="border-t border-zinc-200 px-4 sm:px-6 lg:hidden">
          <SectionNav />
        </div>
      </header>

      <main className="flex-grow">
        <Outlet />
      </main>

      <footer className="border-t border-zinc-300 bg-zinc-100">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="text-xl font-bold uppercase tracking-widest text-zinc-900">
            Ultipedia<span className="text-pink-700">.</span>
          </div>
          <Link
            to="/contribute"
            className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-600 transition-colors hover:text-pink-700"
          >
            Submit a Drill
          </Link>
          <div className="font-mono text-xs text-zinc-400">© 2026 Ultipedia</div>
        </div>
      </footer>
    </div>
  );
}
