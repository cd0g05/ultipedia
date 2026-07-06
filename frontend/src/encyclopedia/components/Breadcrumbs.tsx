// Breadcrumb trail: Home / {Section} / {Entry Title}. Every crumb except the
// last is a link; the last names the current page (aria-current).

import { Link } from "react-router-dom";

export interface Crumb {
  label: string;
  to?: string; // omitted on the final (current-page) crumb
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="font-mono text-xs uppercase tracking-widest text-zinc-400"
    >
      <ol className="flex flex-wrap items-center gap-2">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true">/</span>}
              {crumb.to && !isLast ? (
                <Link
                  to={crumb.to}
                  className="transition-colors hover:text-pink-700"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className="text-zinc-800"
                  aria-current={isLast ? "page" : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
