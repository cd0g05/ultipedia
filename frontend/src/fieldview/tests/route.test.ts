import { describe, expect, it } from "vitest";
import { FIELD } from "../scene/field";
import { DEFAULT_PARAMS } from "../space/constants";
import { DT, DEFAULT_MOTION_PARAMS, WAYPOINT_RADIUS } from "../motion/constants";
import { arrive, speedOf } from "../motion/kinematics";
import {
  addWaypoint,
  advance,
  currentTarget,
  emptyRoute,
  isComplete,
  isFinalLeg,
} from "../motion/route";
import type { Mover, Route } from "../motion/types";
import { dist } from "../motion/vec";

const MP = DEFAULT_MOTION_PARAMS;
const VMAX = DEFAULT_PARAMS.vmax;

// The leg-runner the stepper will contain in the pursuit partition, inlined
// here so this partition is testable on its own.
function runRoute(start: { x: number; y: number }, points: { x: number; y: number }[]) {
  let route: Route = points.reduce((r, p) => addWaypoint(r, p), emptyRoute());
  let m: Mover = { id: "m", pos: start, vel: { x: 0, y: 0 } };
  let steps = 0;
  let speedAtTurn: number | null = null;

  while (!isComplete(route) && steps < 8000) {
    const target = currentTarget(route);
    if (target === null) break;
    const wasFinal = isFinalLeg(route);
    m = arrive(m, target, DT, MP, VMAX, { brake: wasFinal });
    const advanced = advance(route, m);
    if (advanced.leg !== route.leg && !wasFinal && speedAtTurn === null) {
      speedAtTurn = speedOf(m);
    }
    route = advanced;
    steps++;
  }
  return { mover: m, steps, seconds: steps * DT, speedAtTurn };
}

describe("route construction", () => {
  it("starts empty and complete", () => {
    const r = emptyRoute();
    expect(r.legs).toEqual([]);
    expect(isComplete(r)).toBe(true);
    expect(currentTarget(r)).toBeNull();
  });

  it("appends waypoints in order", () => {
    const r = addWaypoint(addWaypoint(emptyRoute(), { x: 50, y: 10 }), { x: 60, y: 30 });
    expect(r.legs).toEqual([
      { x: 50, y: 10 },
      { x: 60, y: 30 },
    ]);
    expect(currentTarget(r)).toEqual({ x: 50, y: 10 });
  });

  it("clamps destinations to the field, as dragging already does", () => {
    const r = addWaypoint(emptyRoute(), { x: 999, y: -40 });
    expect(r.legs[0]).toEqual({ x: FIELD.length, y: 0 });
  });

  it("does not mutate the route it was given", () => {
    const r = emptyRoute();
    addWaypoint(r, { x: 50, y: 10 });
    expect(r.legs).toEqual([]);
  });
});

describe("leg advance", () => {
  it("rounds through an intermediate waypoint without stopping", () => {
    const { speedAtTurn } = runRoute({ x: 20, y: 20 }, [
      { x: 50, y: 20 },
      { x: 50, y: 5 },
    ]);
    expect(speedAtTurn).not.toBeNull();
    expect(speedAtTurn as number).toBeGreaterThan(0);
  });

  it("advances an intermediate leg within the waypoint radius", () => {
    const route = addWaypoint(addWaypoint(emptyRoute(), { x: 50, y: 20 }), { x: 70, y: 20 });
    const near: Mover = {
      id: "m",
      pos: { x: 50 - WAYPOINT_RADIUS * 0.5, y: 20 },
      vel: { x: 1, y: 0 },
    };
    expect(advance(route, near).leg).toBe(1);
  });

  it("does not advance the final leg until the mover has actually arrived", () => {
    const route = addWaypoint(emptyRoute(), { x: 50, y: 20 });
    const near: Mover = { id: "m", pos: { x: 49.9, y: 20 }, vel: { x: 1, y: 0 } };
    expect(advance(route, near).leg).toBe(0);

    const arrived: Mover = { id: "m", pos: { x: 50, y: 20 }, vel: { x: 0, y: 0 } };
    expect(isComplete(advance(route, arrived))).toBe(true);
  });
});

describe("multi-leg cuts", () => {
  it("finishes on the final waypoint, stopped", () => {
    const { mover } = runRoute({ x: 20, y: 20 }, [
      { x: 50, y: 8 },
      { x: 75, y: 32 },
    ]);
    expect(mover.pos).toEqual({ x: 75, y: 32 });
    expect(speedOf(mover)).toBe(0);
  });

  it("a two-leg cut is strictly slower than the straight run to the same endpoint", () => {
    // The property the whole initiative rests on: setting up a cut costs the
    // cutter time. If it were free, a defender could never be beaten by it in
    // a way that meant anything.
    const start = { x: 20, y: 20 };
    const end = { x: 75, y: 30 };
    const straight = runRoute(start, [end]);
    const twoLeg = runRoute(start, [{ x: 50, y: 6 }, end]);
    expect(twoLeg.seconds).toBeGreaterThan(straight.seconds);
  });

  it("a route that doubles back costs more than its extra distance alone", () => {
    // Distance-matched comparison, so the extra time is attributable to the
    // turn rather than to the longer path.
    const start = { x: 20, y: 20 };
    const outAndBack = runRoute(start, [{ x: 50, y: 20 }, { x: 20, y: 20 }]);
    const straightSameDistance = runRoute(start, [{ x: 80, y: 20 }]);
    expect(dist(start, { x: 50, y: 20 }) * 2).toBeCloseTo(dist(start, { x: 80, y: 20 }), 9);
    expect(outAndBack.seconds).toBeGreaterThan(straightSameDistance.seconds);
  });
});
