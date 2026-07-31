// React's view of a run. Deliberately narrow: status, routes, and which
// player is picking — never positions.
//
// This is canon ADR-2 as it applies to the simulation. Positions change up to
// 120 times a second and are written straight into the SceneStore, where the
// existing painters pick them up via onFrame. If React subscribed to them the
// Profiler would record a commit per frame and the whole architecture would be
// back where ADR-2 started. The route controls need to know whether the button
// says Run or Stop; that is all this exposes.

import { useMotionMode, type MotionModeState, type RunStatus } from "./motionMode";

export interface MotionRunView extends MotionModeState {
  isRunning: boolean;
  canRun: boolean;
  canReset: boolean;
}

export function useMotionRun(): MotionRunView {
  const mode = useMotionMode();
  const hasAnyRoute = Object.values(mode.routes).some((r) => r.legs.length > 0);

  return {
    ...mode,
    isRunning: mode.status === "running",
    // Nothing to run without a destination — the panel shows
    // NO_ROUTE_TOOLTIP rather than an inert button (ux.md UI States).
    canRun: hasAnyRoute && mode.status !== "running",
    // Reset is only meaningful once a run has actually moved something.
    canReset: mode.status === "settled" || mode.status === "stopped",
  };
}

export type { RunStatus };
