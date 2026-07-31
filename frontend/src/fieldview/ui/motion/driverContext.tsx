// How a registered panel reaches the motion driver.
//
// Exactly the shape and the reasoning of ui/shell/sceneStore.tsx: canon ADR-13
// keeps `PanelProps` as `{ selection }`, and the driver — like the scene store
// and unlike overlay prefs — is not a module singleton. It is created per page,
// bound to that page's store (ADR-5), precisely so Initiative D can own its own
// clock without two rAF loops fighting.
//
// Nullable rather than throwing, again matching the scene-store precedent: a
// panel rendered in isolation by a unit test falls back to showing its controls
// inert rather than exploding, which is the same fallback it already needs for
// the no-selection case.

import { createContext, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import type { SceneStore } from "../../scene/store";
import { createMotionDriver, type MotionDriver } from "./driver";
import { readPrefs } from "../prefs";

const MotionDriverContext = createContext<MotionDriver | null>(null);

export function MotionDriverProvider({
  store,
  children,
}: {
  store: SceneStore;
  children: ReactNode;
}) {
  const driver = useMemo(
    () =>
      createMotionDriver(store, {
        // readPrefs() rather than useOverlayState(): the driver reads this
        // from inside a rAF callback, outside React entirely (ADR-2), where a
        // hook value would be a stale snapshot even if calling one were legal.
        // Reading the live store per frame is also what makes a slider drag
        // take effect on the next run without a reload (PRD FR-6.2).
        getParams: () => {
          const prefs = readPrefs();
          return { mp: prefs.motion, sp: prefs.params };
        },
      }),
    [store],
  );

  useEffect(() => () => driver.dispose(), [driver]);

  return <MotionDriverContext.Provider value={driver}>{children}</MotionDriverContext.Provider>;
}

export function useMotionDriver(): MotionDriver | null {
  return useContext(MotionDriverContext);
}
