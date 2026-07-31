// Waypoint sequencing. A route is an ordered list of legs run in order; the
// mover rounds through intermediate waypoints at speed and brakes only into
// the last one (PRD FR-2.4). That asymmetry is the point: it is what makes a
// two-part cut a genuine setup rather than two separate sprints with a full
// stop between them, and it is why a defender steering on delayed information
// can be beaten by the turn.

import type { Vec2 } from "../scene/types";
import { clampToField } from "../scene/field";
import type { Mover, Route } from "./types";
import { WAYPOINT_RADIUS } from "./constants";
import { dist } from "./vec";

export function emptyRoute(): Route {
  return { legs: [], leg: 0 };
}

// Destinations are clamped as they are added, matching how dragging a piece
// already behaves — a coach who clicks past the sideline gets the sideline,
// not an out-of-bounds cut (PRD FR-2.5).
export function addWaypoint(route: Route, point: Vec2): Route {
  return { legs: [...route.legs, clampToField(point)], leg: route.leg };
}

export function currentTarget(route: Route): Vec2 | null {
  if (route.leg >= route.legs.length) return null;
  return route.legs[route.leg];
}

export function isFinalLeg(route: Route): boolean {
  return route.leg === route.legs.length - 1;
}

export function isComplete(route: Route): boolean {
  return route.legs.length === 0 || route.leg >= route.legs.length;
}

// Advance past an intermediate waypoint once the mover is near enough to
// count as having rounded it. The final leg is NOT advanced by proximity:
// arrive() brakes onto it exactly and snaps, and completion is recognised by
// having actually stopped there — otherwise a route would report itself
// finished a yard early, while the piece was still visibly moving.
export function advance(route: Route, m: Mover): Route {
  const target = currentTarget(route);
  if (target === null) return route;
  if (isFinalLeg(route)) {
    return dist(m.pos, target) === 0 ? { legs: route.legs, leg: route.leg + 1 } : route;
  }
  return dist(m.pos, target) <= WAYPOINT_RADIUS
    ? { legs: route.legs, leg: route.leg + 1 }
    : route;
}
