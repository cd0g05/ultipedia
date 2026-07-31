// Kinematics as mathematics — no clock, no store, no DOM. Every case here
// drives arrive() by hand at the fixed step, which is exactly what the live
// driver and the headless runner will both do later (ADR-1).

import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "../space/constants";
import { DT, DEFAULT_MOTION_PARAMS } from "../motion/constants";
import { arrive, coast, speedOf } from "../motion/kinematics";
import type { Mover } from "../motion/types";
import { dist } from "../motion/vec";

const MP = DEFAULT_MOTION_PARAMS;
const VMAX = DEFAULT_PARAMS.vmax;

function atRest(pos: { x: number; y: number }): Mover {
  return { id: "m", pos, vel: { x: 0, y: 0 } };
}

// Run until arrival or the ceiling, returning the trace. Deliberately a local
// helper rather than simulate(): that lands in the pursuit partition, and
// this partition must be testable without it.
function runTo(m: Mover, target: { x: number; y: number }, maxSteps = 4000) {
  const trace: Mover[] = [m];
  let cur = m;
  for (let i = 0; i < maxSteps; i++) {
    cur = arrive(cur, target, DT, MP, VMAX);
    trace.push(cur);
    if (dist(cur.pos, target) === 0 && speedOf(cur) === 0) break;
  }
  return trace;
}

describe("acceleration", () => {
  it("reaches top speed in about vmax / accel seconds, and no faster", () => {
    let m = atRest({ x: 10, y: 20 });
    let steps = 0;
    while (speedOf(m) < VMAX - 1e-9 && steps < 4000) {
      m = arrive(m, { x: 105, y: 20 }, DT, MP, VMAX);
      steps++;
    }
    const seconds = steps * DT;
    const expected = VMAX / MP.accel;
    expect(seconds).toBeGreaterThanOrEqual(expected - DT);
    expect(seconds).toBeLessThanOrEqual(expected + DT);
  });

  it("never exceeds vmax", () => {
    const trace = runTo(atRest({ x: 5, y: 20 }), { x: 100, y: 20 });
    for (const m of trace) {
      expect(speedOf(m)).toBeLessThanOrEqual(VMAX + 1e-9);
    }
  });
});

describe("arrival", () => {
  const start = { x: 20, y: 20 };
  const target = { x: 60, y: 20 };

  it("stops exactly on the target", () => {
    const trace = runTo(atRest(start), target);
    const last = trace[trace.length - 1];
    expect(last.pos).toEqual(target);
    expect(speedOf(last)).toBe(0);
  });

  it("never overshoots — distance to target is monotonically non-increasing", () => {
    const trace = runTo(atRest(start), target);
    for (let i = 1; i < trace.length; i++) {
      const before = dist(trace[i - 1].pos, target);
      const after = dist(trace[i].pos, target);
      expect(after).toBeLessThanOrEqual(before + 1e-12);
    }
  });

  it("does not oscillate: it arrives once and stays", () => {
    // Keep stepping well past arrival. A model that overshoots and corrects
    // would show a non-zero speed here; this asserts the snap is terminal.
    let m = atRest(start);
    for (let i = 0; i < 2000; i++) m = arrive(m, target, DT, MP, VMAX);
    expect(m.pos).toEqual(target);
    expect(speedOf(m)).toBe(0);
  });
});

describe("braking", () => {
  it("begins within one step of the v²/(2·decel) threshold", () => {
    const target = { x: 90, y: 20 };
    const trace = runTo(atRest({ x: 10, y: 20 }), target);

    const firstSlowing = trace.findIndex(
      (m, i) => i > 0 && speedOf(m) < speedOf(trace[i - 1]) - 1e-12,
    );
    expect(firstSlowing).toBeGreaterThan(0);

    const justBefore = trace[firstSlowing - 1];
    const v = speedOf(justBefore);
    const d = dist(justBefore.pos, target);
    const threshold = (v * v) / (2 * MP.decel);

    // It should not have started braking while still comfortably outside the
    // threshold, nor left it more than a step late.
    expect(d).toBeLessThanOrEqual(threshold + v * DT + 1e-9);
    expect(d).toBeGreaterThanOrEqual(threshold - v * DT - 1e-9);
  });

  it("brakes harder than it accelerates, per the tunables", () => {
    expect(MP.decel).toBeGreaterThan(MP.accel);
  });
});

describe("turn cost is emergent", () => {
  it("a 90-degree turn costs speed", () => {
    // Run up to speed along +x, then steer at a target square to the left.
    let m = atRest({ x: 30, y: 20 });
    for (let i = 0; i < 400; i++) m = arrive(m, { x: 100, y: 20 }, DT, MP, VMAX);
    expect(speedOf(m)).toBeCloseTo(VMAX, 6);

    const before = speedOf(m);
    for (let i = 0; i < 30; i++) {
      m = arrive(m, { x: m.pos.x, y: 0 }, DT, MP, VMAX, { brake: false });
    }
    expect(speedOf(m)).toBeLessThan(before);
  });

  it("no acceleration budget is spent turning when running straight", () => {
    // The control case for the above: the same number of steps in a straight
    // line holds top speed exactly. Without this, "turning is slower" could
    // pass simply because the model bleeds speed everywhere.
    let m = atRest({ x: 30, y: 20 });
    for (let i = 0; i < 400; i++) m = arrive(m, { x: 100, y: 20 }, DT, MP, VMAX);
    const before = speedOf(m);
    for (let i = 0; i < 30; i++) {
      m = arrive(m, { x: 100, y: 20 }, DT, MP, VMAX, { brake: false });
    }
    expect(speedOf(m)).toBeCloseTo(before, 9);
  });
});

describe("coast", () => {
  it("sheds speed to a stop rather than gliding forever", () => {
    let m: Mover = { id: "m", pos: { x: 40, y: 20 }, vel: { x: VMAX, y: 0 } };
    for (let i = 0; i < 2000; i++) m = coast(m, DT, MP);
    expect(speedOf(m)).toBe(0);
  });

  it("leaves an already-stopped mover untouched", () => {
    const m = atRest({ x: 40, y: 20 });
    expect(coast(m, DT, MP)).toBe(m);
  });
});
