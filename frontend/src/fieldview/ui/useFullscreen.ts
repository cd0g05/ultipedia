// Present mode: take one element fullscreen so a play can be shown to a team
// in a huddle. The stage scales from its viewBox, so this is purely a sizing
// concern — see the `.fv-stage:fullscreen` rules in index.css. No coordinate
// maths changes, which is why fullscreen was chosen over a zoom/pan viewBox.

import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";

// Absent in jsdom, and still prefixed on older Safari. Support is checked
// once so the button can be hidden rather than offered and then failing.
function fullscreenSupported(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: unknown };
  return typeof el.requestFullscreen === "function" || typeof el.webkitRequestFullscreen === "function";
}

export function useFullscreen(targetRef: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(false);
  const [supported] = useState(fullscreenSupported);

  // Esc and the browser's own fullscreen controls exit without going through
  // us, so the flag follows the document rather than our own calls.
  useEffect(() => {
    function sync() {
      setActive(document.fullscreenElement !== null);
    }
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
      return;
    }
    const el = targetRef.current as
      | (HTMLElement & { webkitRequestFullscreen?: () => Promise<void> })
      | null;
    if (!el) return;
    // A refused request (a permissions policy, an automated context, a
    // gesture the browser will not honour) leaves the page exactly as it
    // was; `fullscreenchange` never fires, so the flag stays false and the
    // button keeps offering the same action. Chrome can refuse *synchronously*
    // with a TypeError rather than by rejecting, so both paths are caught —
    // an uncaught throw here would escape into the click handler.
    const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
    try {
      void request?.().catch(() => undefined);
    } catch {
      /* refused; nothing to undo */
    }
  }, [targetRef]);

  return { active, supported, toggle };
}
