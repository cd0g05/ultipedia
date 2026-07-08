// Persistent encyclopedia search bar (Partition 4, task 50). Mounted in the
// shared Layout header (desktop) and page-mounted full-width on /search;
// below md the header shows an icon link to /search instead (Partition 5).
//
// Self-contained: submitting navigates to /search?q=... . When already on
// /search it preserves the active filter params so refining a query never
// silently drops the user's narrowing. Styled per the Light Film Room system
// (film-* tokens).

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function SearchBar({
  className = "",
  label = "Search",
}: {
  className?: string;
  /** Accessible name for the search landmark (must be unique per page). */
  label?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentQ =
    new URLSearchParams(location.search).get("q") ?? "";
  const [value, setValue] = useState(currentQ);

  // Keep the input in sync when the q param changes underneath us
  // (back/forward navigation, empty-state "clear search" action).
  useEffect(() => {
    setValue(currentQ);
  }, [currentQ]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = value.trim();
    // On /search, keep active filters and swap the query; elsewhere start fresh.
    const params =
      location.pathname === "/search"
        ? new URLSearchParams(location.search)
        : new URLSearchParams();
    if (q) {
      params.set("q", q);
    } else {
      params.delete("q"); // empty query returns to the unfiltered view
    }
    params.delete("page"); // a new query restarts pagination
    const qs = params.toString();
    navigate(`/search${qs ? `?${qs}` : ""}`);
  }

  return (
    <form
      role="search"
      aria-label={label}
      onSubmit={handleSubmit}
      className={`flex w-full max-w-xl items-center gap-2 ${className}`}
    >
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search"
        aria-label="Search the encyclopedia"
        className="w-full border border-film-border bg-white px-4 py-2 text-zinc-900 placeholder:text-zinc-500 focus:border-film-accentPink focus:outline-none focus:ring-1 focus:ring-film-accentPink"
      />
      <button
        type="submit"
        className="bg-film-accentPink px-5 py-2 font-mono text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-film-accentPinkDark"
      >
        Search
      </button>
    </form>
  );
}
