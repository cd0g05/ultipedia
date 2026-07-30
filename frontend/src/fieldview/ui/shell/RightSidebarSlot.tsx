// The collapsible Play Designer slot (ux.md "Right Sidebar Slot" UI States /
// Flow 3). Closed by default; when open, a fixed 320px pane with a header
// (title + "✕" close) and placeholder body copy linking to the existing,
// unchanged `/fieldview/designer` route. Closed renders nothing so the
// canvas column reclaims the width (tech-design's three-pane grid only has
// three tracks when this is open).

import { Link } from "react-router-dom";

export interface RightSidebarSlotProps {
  open: boolean;
  onClose: () => void;
}

export function RightSidebarSlot({ open, onClose }: RightSidebarSlotProps) {
  if (!open) return null;

  return (
    <aside
      aria-label="Play Designer"
      className="flex w-[320px] shrink-0 flex-col border-l border-film-border bg-white"
    >
      <div className="flex items-center justify-between border-b border-film-border bg-film-panel px-4 py-3">
        <span className="font-heading text-sm uppercase tracking-wide">Play Designer</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Play Designer"
          className="font-mono text-sm text-zinc-600 hover:text-film-accentPink"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center p-8 text-center font-mono text-xs text-zinc-500">
        <p>
          Play Designer — coming in a future update.
          <br />
          <br />
          The existing designer is still available at{" "}
          <Link to="/fieldview/designer" className="text-film-accentPink underline">
            /fieldview/designer
          </Link>
          .
        </p>
      </div>
    </aside>
  );
}
