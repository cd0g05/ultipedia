// The pursuit model's behaviour, asserted as geometry rather than by eye.
// Scenarios are transcribed from the Builder's wishlist: "if defense is like
// 10 yards deeper then cutter, and cutter cuts deep, the defense wouldnt want
// to start moving towards cutter... defense would want to A) allow offense to
// close down the gap, B) Begin acceleration deep in order to carry cut deep,
// and C) match any horizontal movement."

import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "../space/constants";
import { DEFAULT_MOTION_PARAMS, DT } from "../motion/constants";
import { addWaypoint, emptyRoute, isFinalLeg } from "../motion/route";
import { createMotionState, isSettled, step } from "../motion/step";
import { delayedPos, pursuitTarget } from "../motion/pursuit";
import type { MotionState, Mover } from "../motion/types";
import { dist } from "../motion/vec";

const MP = DEFAULT_MOTION_PARAMS;
const SP = DEFAULT_PARAMS;

const DISC = { x: 40, y: 20 };

function mover(id: string, x: number, y: number): Mover {
  return { id, pos: { x, y }, vel: { x: 0, y: 0 } };
}

// thrower holds the disc so there is a leverage axis; cutter runs the route;
// defender is assigned to the cutter.
function scenario(cutter: Mover, defender: Mover, legs: { x: number; y: number }[]) {
  return createMotionState({
    movers: [mover("thrower", DISC.x, DISC.y), cutter, defender],
    routes: { [cutter.id]: legs.reduce((r, p) => addWaypoint(r, p), emptyRoute()) },
    matchups: { [defender.id]: cutter.id },
    possession: "thrower",
    react: SP.react,
    dt: DT,
  });
}

function run(s0: MotionState, maxSteps = 3000) {
  const trace: MotionState[] = [s0];
  let s = s0;
  for (let i = 0; i < maxSteps && !isSettled(s); i++) {
    s = step(s, DT, MP, SP);
    trace.push(s);
  }
  return trace;
}

const at = (s: MotionState, id: string) => s.movers.find((m) => m.id === id) as Mover;

describe("cushion point geometry", () => {
  it("places the defender goalside — further from the disc than the cutter", () => {
    const target = pursuitTarget({ x: 60, y: 20 }, { x: 0, y: 0 }, DISC, MP);
    expect(target.x).toBeCloseTo(60 + MP.cushion, 9);
    expect(target.y).toBeCloseTo(20, 9);
  });

  it("projects the cutter's velocity forward by the lead time", () => {
    const still = pursuitTarget({ x: 60, y: 20 }, { x: 0, y: 0 }, DISC, MP);
    const sprinting = pursuitTarget({ x: 60, y: 20 }, { x: SP.vmax, y: 0 }, DISC, MP);
    expect(sprinting.x - still.x).toBeCloseTo(SP.vmax * MP.lead, 9);
  });

  it("falls back to a plain follow when nobody has the disc", () => {
    // No disc means no lane to defend and no axis to be goalside of. Picking
    // an arbitrary direction would be worse than picking none (ADR-2).
    const target = pursuitTarget({ x: 60, y: 20 }, { x: 0, y: 0 }, null, MP);
    expect(target).toEqual({ x: 60, y: 20 });
  });

  it("collapses to a plain follow at zero cushion", () => {
    const target = pursuitTarget({ x: 60, y: 20 }, { x: 0, y: 0 }, DISC, { ...MP, cushion: 0 });
    expect(target).toEqual({ x: 60, y: 20 });
  });
});

describe("reaction delay", () => {
  it("steers on what it saw react seconds ago, not on now", () => {
    const s0 = scenario(mover("cutter", 60, 20), mover("d", 63, 20), [{ x: 85, y: 20 }]);
    let s = s0;
    const ringLaps = Math.round(SP.react / DT);
    for (let i = 0; i < ringLaps - 1; i++) s = step(s, DT, MP, SP);

    // The cutter has moved; what the defender is reading has not caught up.
    expect(at(s, "cutter").pos.x).toBeGreaterThan(60);
    expect(delayedPos(s, "cutter").x).toBeCloseTo(60, 6);
  });

  it("costs the defender ground on a direction change", () => {
    // The same endpoint reached two ways. The setup version forces the
    // defender to commit to a deep leg it then has to unwind.
    //
    // Measured as separation GAINED on the final leg — peak separation after
    // the break, minus separation at the moment of the break.
    //
    // Three earlier framings were wrong, and the reasons are worth keeping.
    // Separation at rest converges on the cushion whatever the path.
    // Separation at arrival is dominated by the final leg's length: over
    // twenty yards any defender with the same top speed recovers, which is
    // physically correct and not what a fake is for. And raw peak separation
    // flatters the STRAIGHT cut, because both cuts start from rest and the
    // straight one still has its one-time reaction-delay burst to spend,
    // while the setup has already spent it going deep. Gain on the final leg
    // compares like with like: what did the break itself buy?
    const end = { x: 48, y: 20 };
    const straight = run(scenario(mover("c", 55, 20), mover("d", 58, 20), [end]));
    const setup = run(scenario(mover("c", 55, 20), mover("d", 58, 20), [{ x: 68, y: 20 }, end]));

    const gainOnFinalLeg = (trace: MotionState[]) => {
      const sep = (s: MotionState) => dist(at(s, "c").pos, at(s, "d").pos);
      const breakAt = trace.findIndex((s) => isFinalLeg(s.routes.c));
      expect(breakAt).toBeGreaterThanOrEqual(0);
      const after = trace.slice(breakAt).map(sep);
      return Math.max(...after) - sep(trace[breakAt]);
    };

    expect(gainOnFinalLeg(setup)).toBeGreaterThan(gainOnFinalLeg(straight));
  });
});

describe("the wishlist scenario: defender 10 yd deep, cutter breaks deep", () => {
  const trace = run(scenario(mover("c", 60, 20), mover("d", 70, 20), [{ x: 88, y: 20 }]));
  const defenderX = trace.map((s) => at(s, "d").pos.x);

  it("A) lets the gap close instead of charging the cutter", () => {
    // A beeline follower would run all the way down to the cutter's x (60).
    // This defender gives up a few yards at most before the lead term turns
    // it around.
    expect(Math.min(...defenderX)).toBeGreaterThan(66);
  });

  it("B) is already accelerating deep before the cutter reaches it", () => {
    const startX = defenderX[0];
    const turned = trace.findIndex((s) => at(s, "d").vel.x > 0.5);
    expect(turned).toBeGreaterThan(0);
    expect(at(trace[turned], "c").pos.x).toBeLessThan(startX);
  });

  it("ends goalside of the cutter, having carried the cut", () => {
    const last = trace[trace.length - 1];
    expect(at(last, "d").pos.x).toBeGreaterThan(at(last, "c").pos.x);
    expect(at(last, "d").pos.x).toBeGreaterThan(defenderX[0]);
  });
});

describe("C) horizontal movement is matched", () => {
  it("tracks a lateral cut across the field", () => {
    const trace = run(scenario(mover("c", 60, 20), mover("d", 63, 20), [{ x: 60, y: 4 }]));
    const last = trace[trace.length - 1];
    expect(at(last, "c").pos.y).toBeCloseTo(4, 6);
    expect(Math.abs(at(last, "d").pos.y - 4)).toBeLessThan(MP.cushion + 1);
  });
});

describe("kinematic parity (FR-3.6)", () => {
  it("the defender never exceeds vmax and never reverses instantly", () => {
    const trace = run(scenario(mover("c", 55, 20), mover("d", 58, 20), [{ x: 80, y: 8 }, { x: 50, y: 32 }]));
    for (let i = 1; i < trace.length; i++) {
      const d = at(trace[i], "d");
      const speed = Math.hypot(d.vel.x, d.vel.y);
      expect(speed).toBeLessThanOrEqual(SP.vmax + 1e-9);

      const prev = at(trace[i - 1], "d");
      const dv = Math.hypot(d.vel.x - prev.vel.x, d.vel.y - prev.vel.y);
      // No instant reversal: the change in velocity per step is bounded by
      // the larger of the two budgets. The one exemption is arrival — a mover
      // within a single substep's travel of its target snaps onto it and
      // stops, which is what keeps a defender from chattering around a
      // cushion point it has effectively reached. That is a stop inside eight
      // hundredths of a yard, not a reversal.
      const arrived = speed === 0;
      expect(dv <= Math.max(MP.accel, MP.decel) * DT + 1e-9 || arrived).toBe(true);
    }
  });
});

describe("free roam", () => {
  it("a defender with a null matchup does not move (canon ADR-18)", () => {
    const s0 = createMotionState({
      movers: [mover("thrower", DISC.x, DISC.y), mover("c", 60, 20), mover("d", 70, 20)],
      routes: { c: addWaypoint(emptyRoute(), { x: 85, y: 20 }) },
      matchups: { d: null },
      possession: "thrower",
      react: SP.react,
      dt: DT,
    });
    const trace = run(s0);
    expect(at(trace[trace.length - 1], "d").pos).toEqual({ x: 70, y: 20 });
  });

  it("does not throw when nobody has the disc", () => {
    const s0 = createMotionState({
      movers: [mover("c", 60, 20), mover("d", 70, 20)],
      routes: { c: addWaypoint(emptyRoute(), { x: 85, y: 20 }) },
      matchups: { d: "c" },
      possession: null,
      react: SP.react,
      dt: DT,
    });
    expect(() => run(s0)).not.toThrow();
    const trace = run(s0);
    // Still pursues — it just has no leverage axis to bias toward.
    expect(at(trace[trace.length - 1], "d").pos.x).toBeGreaterThan(70);
  });
});
