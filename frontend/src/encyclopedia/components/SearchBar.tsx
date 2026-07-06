// Persistent encyclopedia search bar (Partition 4, task 50).
//
// Self-contained: submitting navigates to /search?q=... . When already on
// /search it preserves the active filter params so refining a query never
// silently drops the user's narrowing. The shared header/shell is being built
// on feat/encyclopedia-browse in parallel — mounting this component in that
// header is deferred to the merge/Partition 5 (flagged in Reflect).

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function SearchBar({ className = "" }: { className?: string }) {
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
      onSubmit={handleSubmit}
      className={`flex w-full max-w-xl items-center gap-2 ${className}`}
    >
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search drills, strategies, plays..."
        aria-label="Search the encyclopedia"
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
      />
      <button
        type="submit"
        className="rounded-xl bg-clay px-5 py-2.5 font-semibold text-white"
      >
        Search
      </button>
    </form>
  );
}
