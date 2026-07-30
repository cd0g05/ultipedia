// Below 768 px Field View is out of scope for v1 (ux.md "Responsive &
// Accessibility"). A readable message is the deliverable there — a coach who
// opens this on a phone should learn that it needs a bigger screen, not meet
// a field squeezed to 300 px with 44 px pieces overlapping each other.
//
// Pure CSS visibility rather than a JS width check: no resize listener, no
// hydration flash, and it responds to a window resize for free.

export function SmallScreenNotice() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 px-6 py-16 text-center md:hidden">
      {/* Deliberately not the same text as the page's own h1: only one of
          the two is ever displayed (the other is `display: none`, so it is
          out of the a11y tree), but distinct wording keeps the heading
          unambiguous to anything reading the DOM directly. */}
      <h1 className="font-heading text-xl uppercase tracking-widest text-zinc-900">
        Field View needs a bigger screen
      </h1>
      <p className="text-sm text-zinc-700">
        Field View needs a tablet or a desktop — the field, the control rail, and the timeline
        do not fit a phone screen at a size you could coach from.
      </p>
      <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">
        Open this page on a screen at least 768 px wide.
      </p>
    </div>
  );
}
