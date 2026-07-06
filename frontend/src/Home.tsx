// Temporary placeholder for the encyclopedia root route ("/").
// Replaced by the real encyclopedia Home in the browse partition.

import { Link } from "react-router-dom";

export function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cream px-6 text-center">
      <h1 className="text-2xl font-bold text-clay">Ulti-pedia</h1>
      <p className="max-w-sm text-gray-600">
        The ultimate frisbee encyclopedia. Browsing is coming soon — for now,
        help build it by sharing a drill or strategy.
      </p>
      <Link
        to="/contribute"
        className="rounded-full bg-clay px-6 py-3 font-semibold text-white"
      >
        Share a drill or strategy
      </Link>
    </div>
  );
}
