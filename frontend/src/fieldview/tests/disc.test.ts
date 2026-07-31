// Disc flight as geometry. The load-bearing assertion here is that the
// duration is the space model's, not a second opinion (tech-design ADR-3).

import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "../space/constants";
import { flightTime } from "../space/layers";
import { advanceFlight, beginFlight, discPos, hasArrived } from "../motion/disc";
import { dist } from "../motion/vec";

const from = { x: 40, y: 20 };
const near = { x: 45, y: 20 };
const far = { x: 85, y: 20 };

describe("flight duration", () => {
  it("is exactly the space model's flightTime — motion computes no duration of its own", () => {
    const f = beginFlight(from, far, "o5", DEFAULT_PARAMS.hang);
    expect(f.duration).toBe(flightTime(dist(from, far), DEFAULT_PARAMS.hang));
  });

  it("a huck hangs longer than a dump", () => {
    const dump = beginFlight(from, near, "o5", DEFAULT_PARAMS.hang);
    const huck = beginFlight(from, far, "o5", DEFAULT_PARAMS.hang);
    expect(huck.duration).toBeGreaterThan(dump.duration);
  });

  it("responds to the existing hang slider", () => {
    const floaty = beginFlight(from, far, "o5", 1.6);
    const flat = beginFlight(from, far, "o5", 0.5);
    expect(floaty.duration).toBeGreaterThan(flat.duration);
  });
});

describe("interpolation", () => {
  it("starts at the thrower and ends at the receiver", () => {
    const f = beginFlight(from, far, "o5", DEFAULT_PARAMS.hang);
    expect(discPos(f)).toEqual(from);
    expect(discPos({ ...f, elapsed: f.duration })).toEqual(far);
  });

  it("is halfway across at half the duration", () => {
    const f = beginFlight(from, far, "o5", DEFAULT_PARAMS.hang);
    const mid = discPos({ ...f, elapsed: f.duration / 2 });
    expect(mid.x).toBeCloseTo((from.x + far.x) / 2, 9);
  });

  it("clamps past the end rather than overshooting the receiver", () => {
    const f = beginFlight(from, far, "o5", DEFAULT_PARAMS.hang);
    expect(discPos({ ...f, elapsed: f.duration * 10 })).toEqual(far);
  });

  it("survives a zero-length throw without dividing by zero", () => {
    const f = { ...beginFlight(from, from, "o5", DEFAULT_PARAMS.hang), duration: 0 };
    expect(discPos(f)).toEqual(from);
    expect(hasArrived(f)).toBe(true);
  });
});

describe("advance", () => {
  it("arrives once elapsed reaches the duration, and not before", () => {
    let f = beginFlight(from, far, "o5", DEFAULT_PARAMS.hang);
    expect(hasArrived(f)).toBe(false);
    while (!hasArrived(f)) f = advanceFlight(f, 1 / 60);
    expect(f.elapsed).toBeGreaterThanOrEqual(f.duration);
  });

  it("does not mutate the flight it was given", () => {
    const f = beginFlight(from, far, "o5", DEFAULT_PARAMS.hang);
    advanceFlight(f, 1);
    expect(f.elapsed).toBe(0);
  });
});
