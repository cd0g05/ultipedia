import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "../space/constants";
import { DEFAULT_MOTION_PARAMS, DT, MOTION_SLIDER_RANGES } from "../motion/constants";
import { addWaypoint, emptyRoute } from "../motion/route";
import { cloneState, createMotionState, isSettled, step } from "../motion/step";
import { sampleAt, simulate } from "../motion/simulate";
import type { MotionParams, Mover } from "../motion/types";

const MP = DEFAULT_MOTION_PARAMS;
const SP = DEFAULT_PARAMS;

function mover(id: string, x: number, y: number): Mover {
  return { id, pos: { x, y }, vel: { x: 0, y: 0 } };
}

function scenario(legs: { x: number; y: number }[] = [{ x: 80, y: 12 }]) {
  return createMotionState({
    movers: [mover("thrower", 40, 20), mover("c", 55, 20), mover("d", 58, 20)],
    routes: { c: legs.reduce((r, p) => addWaypoint(r, p), emptyRoute()) },
    matchups: { d: "c" },
    possession: "thrower",
    react: SP.react,
    dt: DT,
  });
}

describe("simulate", () => {
  it("runs to settle and reports a plausible duration", () => {
    const t = simulate(scenario(), MP, SP);
    expect(t.dt).toBe(DT);
    expect(t.duration).toBeGreaterThan(0);
    expect(t.duration).toBeLessThan(15);
    expect(Object.keys(t.samples).sort()).toEqual(["c", "d", "thrower"]);
  });

  it("does not consume the state it was given", () => {
    // step() consumes its input by design; simulate() clones first, so a
    // caller holding the state (the driver's reduced-motion path does) is
    // not left with a mutated one.
    const s0 = scenario();
    const before = JSON.stringify(s0);
    simulate(s0, MP, SP);
    expect(JSON.stringify(s0)).toBe(before);
  });

  it("ends with the cutter on its final waypoint", () => {
    const t = simulate(scenario([{ x: 80, y: 12 }]), MP, SP);
    const track = t.samples.c;
    expect(track[track.length - 1]).toEqual({ x: 80, y: 12 });
  });
});

describe("live and headless agree (ADR-1)", () => {
  it("n steps of DT equals the trajectory sampled at n·DT, exactly", () => {
    // The guarantee Initiative D rests on: replaying a trajectory and running
    // the model live are the same computation, not two that resemble each
    // other.
    const t = simulate(cloneState(scenario()), MP, SP);

    let s = scenario();
    for (let n = 1; n <= 200; n++) {
      s = step(s, DT, MP, SP);
      const sampled = sampleAt(t, n * DT);
      for (const m of s.movers) {
        expect(sampled[m.id].x).toBeCloseTo(m.pos.x, 12);
        expect(sampled[m.id].y).toBeCloseTo(m.pos.y, 12);
      }
    }
  });

  it("is reproducible: two runs of the same inputs are identical", () => {
    const a = simulate(scenario(), MP, SP);
    const b = simulate(scenario(), MP, SP);
    expect(a.duration).toBe(b.duration);
    expect(a.samples).toEqual(b.samples);
  });
});

describe("sampleAt", () => {
  const t = simulate(scenario(), MP, SP);

  it("returns stored samples untouched at exact multiples of dt", () => {
    expect(sampleAt(t, 0).c).toEqual(t.samples.c[0]);
    expect(sampleAt(t, 5 * DT).c).toEqual(t.samples.c[5]);
  });

  it("interpolates between samples", () => {
    const mid = sampleAt(t, 5.5 * DT).c;
    const lo = t.samples.c[5];
    const hi = t.samples.c[6];
    expect(mid.x).toBeCloseTo((lo.x + hi.x) / 2, 12);
  });

  it("clamps outside the trajectory rather than returning undefined", () => {
    const track = t.samples.c;
    expect(sampleAt(t, -10).c).toEqual(track[0]);
    expect(sampleAt(t, 1e6).c).toEqual(track[track.length - 1]);
  });
});

describe("termination (PRD Reliability)", () => {
  it("settles for tunables across the full slider ranges", () => {
    // Pursuit is a feedback loop and these gains are draggable to their
    // extremes. Every corner must terminate, not merely the defaults.
    const R = MOTION_SLIDER_RANGES;
    const corners: MotionParams[] = [];
    for (const accel of [R.accel.min, R.accel.max]) {
      for (const decel of [R.decel.min, R.decel.max]) {
        for (const cushion of [R.cushion.min, R.cushion.max]) {
          for (const lead of [R.lead.min, R.lead.max]) {
            corners.push({ accel, decel, cushion, lead });
          }
        }
      }
    }

    for (const mp of corners) {
      for (const vmax of [5, 9]) {
        const t = simulate(scenario([{ x: 80, y: 6 }, { x: 50, y: 34 }]), mp, { ...SP, vmax });
        expect(t.duration, `settled for ${JSON.stringify(mp)} vmax=${vmax}`).toBeLessThan(30);
      }
    }
  });

  it("stops at the ceiling rather than hanging if a run never settles", () => {
    const t = simulate(scenario(), MP, SP, { maxSeconds: 0.5 });
    expect(t.duration).toBeLessThanOrEqual(0.5 + DT);
  });
});

describe("isSettled", () => {
  it("is false while a route is unspent and true once everything has stopped", () => {
    const s0 = scenario();
    expect(isSettled(s0)).toBe(false);
    let s = s0;
    for (let i = 0; i < 3000 && !isSettled(s); i++) s = step(s, DT, MP, SP);
    expect(isSettled(s)).toBe(true);
  });
});
