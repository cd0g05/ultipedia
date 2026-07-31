// Transient motion state: pending routes, which player is currently taking
// destination clicks, and how a run is going (tech-design.md ADR-4).
//
// Deliberately NOT on `Scene`, for the reason throwMode.ts documents at
// length and canon ADR-21 settled: `Scene` is *what a play is*. A pending
// route is a property of this session's pointer. Putting it on the scene
// would leak it into the play format, into every preset, and into Initiative
// D's frames — where D will define a better-shaped representation of the same
// idea as part of its action model. Defining a route format here would mean
// defining it twice.
//
// A module-level external store rather than useState, again per throwMode:
// the route controls have several simultaneously-mounted consumers (the
// desktop sidebar panel, the mobile sheet's copy of it, and FieldCanvas), and
// per-instance state gives each a private copy — the panel would show a route
// the canvas had never heard of.

import { useSyncExternalStore } from "react";
import type { Vec2 } from "../../scene/types";
import type { Route } from "../../motion/types";
import { addWaypoint, emptyRoute } from "../../motion/route";

// ux.md Copy & Tone, verbatim.
export const PICKING_HINT = "Click where the cutter should go.";
export const RUNNING_STATUS = "Running…";
export const SETTLED_STATUS = "Cut complete.";
export const STOPPED_STATUS = "Stopped.";
export const NO_ROUTE_TOOLTIP = "Set a destination first.";

export type RunStatus = "idle" | "running" | "settled" | "stopped";

export interface MotionModeState {
  routes: Record<string, Route>;
  // Which offensive player is currently accepting destination clicks, or null
  // when the tool is disarmed. One at a time: picking is armed from a
  // selected player's panel, and selecting someone else cancels it.
  picking: string | null;
  status: RunStatus;
  // Polite-live-region text. Empty means "say nothing".
  announcement: string;
}

const IDLE: MotionModeState = { routes: {}, picking: null, status: "idle", announcement: "" };

let state: MotionModeState = IDLE;
const listeners = new Set<() => void>();

function setState(next: MotionModeState): void {
  state = next;
  for (const cb of listeners) cb();
}

export function getMotionMode(): MotionModeState {
  return state;
}

export function getRoutes(): Record<string, Route> {
  return state.routes;
}

export function hasRoute(id: string): boolean {
  const r = state.routes[id];
  return r !== undefined && r.legs.length > 0;
}

export function anyRoute(): boolean {
  return Object.values(state.routes).some((r) => r.legs.length > 0);
}

// Arming is per-player and exclusive. Passing null disarms, which is what
// every cancel path calls — Escape, re-clicking the armed button, selecting
// someone else, or clicking a piece instead of grass (ux.md Flow 3).
export function setPicking(id: string | null): void {
  if (state.picking === id) return;
  setState({ ...state, picking: id, announcement: id ? PICKING_HINT : "" });
}

export function addDestination(id: string, point: Vec2): void {
  const existing = state.routes[id] ?? emptyRoute();
  setState({
    ...state,
    routes: { ...state.routes, [id]: addWaypoint(existing, point) },
    // Picking disarms after each click; the panel's button becomes "Add
    // Waypoint" so a second leg is an explicit choice rather than a stray
    // click on the field (ux.md Flow 1 step 3).
    picking: null,
    announcement: "",
  });
}

export function clearRouteFor(id: string): void {
  const routes = { ...state.routes };
  delete routes[id];
  setState({ ...state, routes });
}

export function clearAllRoutes(): void {
  setState({ ...state, routes: {} });
}

// Rewinding every route to its first leg, so the same cut can be run again
// after a Reset without the coach re-clicking it (ux.md Flow 1 step 6).
export function rewindRoutes(): void {
  const routes: Record<string, Route> = {};
  for (const [id, r] of Object.entries(state.routes)) routes[id] = { legs: r.legs, leg: 0 };
  setState({ ...state, routes });
}

const STATUS_TEXT: Record<RunStatus, string> = {
  idle: "",
  running: RUNNING_STATUS,
  settled: SETTLED_STATUS,
  stopped: STOPPED_STATUS,
};

export function setStatus(status: RunStatus): void {
  if (state.status === status) return;
  // Arming and running are mutually exclusive: the field is read-only during
  // a run, so a picking mode left armed underneath it would fire the moment
  // the run ended.
  setState({
    ...state,
    status,
    picking: status === "running" ? null : state.picking,
    announcement: STATUS_TEXT[status],
  });
}

// Test seam: RTL's cleanup() unmounts consumers but module state outlives the
// file, so a leftover route or status would bleed into the next case.
export function resetMotionMode(): void {
  state = IDLE;
  for (const cb of listeners) cb();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): MotionModeState {
  return state;
}

export function useMotionMode(): MotionModeState {
  return useSyncExternalStore(subscribe, getSnapshot);
}
