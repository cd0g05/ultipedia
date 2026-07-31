// Throwing mode: armed/disarmed, plus the one line of prose the interaction
// says out loud (tech-design.md ADR-5).
//
// This is deliberately NOT on `Scene`. "Is the throw tool armed" is a
// property of this session's pointer, not of the play: putting it on the
// scene would leak it into the play format, into every preset, and into
// Initiative D's frames, where it means nothing. `Scene` stays "what a play
// IS".
//
// A module-level external store rather than `useState`, for exactly the
// reason ui/prefs.ts documents at length: the armed flag has several
// simultaneously-mounted consumers (the ribbon in the desktop sidebar, a
// second ribbon in the mobile sheet, and FieldCanvas), and a per-instance
// `useState` gives each of them a private copy — the ribbon would light up
// while the field stayed disarmed. `useSyncExternalStore` over one shared
// value is what makes them agree.
//
// The announcement lives here too rather than in its own module: it is the
// same transient interaction state (armed → "Click a receiver.", completed →
// "#5 has the disc.", cancelled → silence), and splitting it would mean two
// stores that must be kept in step by hand.

import { useSyncExternalStore } from "react";
import type { Vec2 } from "../../scene/types";

// ux.md Copy & Tone, verbatim.
export const THROW_ARMED_HINT = "Click a receiver.";
export const THROW_UNAVAILABLE_TOOLTIP = "Nobody has the disc.";

export interface ThrowModeState {
  armed: boolean;
  // Polite-live-region text. Empty means "say nothing" — a cancelled throw is
  // deliberately silent, since nothing changed.
  announcement: string;
}

const IDLE: ThrowModeState = { armed: false, announcement: "" };

let state: ThrowModeState = IDLE;
const listeners = new Set<() => void>();

function setState(next: ThrowModeState): void {
  // Object.is-stable when nothing actually changed, so a redundant
  // `setThrowArmed(false)` (every cancel path calls it, whether or not the
  // tool was armed) costs zero React commits. FieldCanvas's cancel-on-drag
  // path runs inside a pointer handler, so this matters for ADR-2.
  if (next.armed === state.armed && next.announcement === state.announcement) return;
  state = next;
  for (const cb of listeners) cb();
}

export function getThrowMode(): ThrowModeState {
  return state;
}

export function isThrowArmed(): boolean {
  return state.armed;
}

export function setThrowArmed(armed: boolean): void {
  // Arming always says the hint; disarming clears whatever was showing unless
  // a completion message is set immediately afterwards (announceThrow).
  setState({ armed, announcement: armed ? THROW_ARMED_HINT : "" });
}

export function toggleThrowArmed(): void {
  setThrowArmed(!state.armed);
}

// Said after a throw actually completes. Disarms as a side effect, because a
// completed throw always exits the mode (ux.md Flow 1 step 5) and the two
// must not be able to disagree.
export function announceThrow(message: string): void {
  setState({ armed: false, announcement: message });
}

// Test seam: RTL's cleanup() unmounts consumers but module state outlives the
// file, so a leftover armed flag would bleed into the next case.
export function resetThrowMode(): void {
  state = IDLE;
  flightPos = null;
  for (const cb of listeners) cb();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): ThrowModeState {
  return state;
}

export function useThrowMode(): ThrowModeState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

// Where the disc is drawn while it is in the air (fieldview-motion).
//
// This is the PUBLISHED VIEW of a flight, not the model of one — `DiscFlight`
// in motion/types.ts is the model, and it is what a headless trajectory
// carries for Initiative D. What pieceLayer needs sixty times a second is a
// position, and it has no way to reach into the driver's private state for it.
// So the driver publishes here and the renderer reads here, which is the same
// shape as the SceneStore publishing positions that painters read.
//
// null means "docked to whoever has possession", i.e. the ordinary case.
// Possession itself never becomes null mid-flight (PRD FR-5.4): the old
// thrower keeps it until the disc lands, so there is never a moment where the
// disc belongs to nobody.
let flightPos: Vec2 | null = null;
const flightListeners = new Set<() => void>();

export function getFlightPos(): Vec2 | null {
  return flightPos;
}

// Called from the driver's frame loop, so this must not go through React.
// pieceLayer reads it inside its own store.onFrame repaint, which is already
// running for every scene mutation — no extra subscription, no extra frame.
export function setFlightPos(pos: Vec2 | null): void {
  flightPos = pos;
  for (const cb of flightListeners) cb();
}

export function subscribeFlight(cb: () => void): () => void {
  flightListeners.add(cb);
  return () => {
    flightListeners.delete(cb);
  };
}
