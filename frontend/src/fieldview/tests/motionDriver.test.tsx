// The clock, driven by hand. Every test here supplies its own `now` and
// `schedule`, so nothing depends on jsdom's rAF pacing — which is exactly the
// non-determinism the fixed timestep exists to remove.

import { beforeEach, describe, expect, it } from "vitest";
import { Profiler } from "react";
import { act, render, screen } from "@testing-library/react";
import { createSceneStore } from "../scene/store";
import { getPreset } from "../scene/presets";
import { DEFAULT_PARAMS } from "../space/constants";
import { DEFAULT_MOTION_PARAMS, DT, MAX_FRAME_SECONDS } from "../motion/constants";
import { createMotionDriver } from "../ui/motion/driver";
import {
  addDestination,
  getMotionMode,
  resetMotionMode,
  setStatus,
} from "../ui/motion/motionMode";
import { useMotionRun } from "../ui/motion/useMotionRun";
import { getFlightPos, resetThrowMode } from "../ui/shell/throwMode";

const getParams = () => ({ mp: DEFAULT_MOTION_PARAMS, sp: DEFAULT_PARAMS });

// A manual frame pump: `tick(ms)` advances the clock and runs whatever the
// driver has scheduled, exactly once.
function harness(reducedMotion = false) {
  const store = createSceneStore(getPreset("vertStackForceSide"));
  let clock = 0;
  let scheduled: (() => void) | null = null;
  let nextHandle = 1;

  const driver = createMotionDriver(store, {
    getParams,
    now: () => clock,
    schedule: (cb) => {
      scheduled = cb;
      return nextHandle++;
    },
    cancel: () => {
      scheduled = null;
    },
    prefersReducedMotion: () => reducedMotion,
  });

  function tick(ms: number) {
    clock += ms;
    const cb = scheduled;
    scheduled = null;
    cb?.();
  }

  const posOf = (id: string) => {
    const p = store.getScene().players.find((x) => x.id === id);
    return p ? { ...p.pos } : null;
  };

  return { store, driver, tick, posOf, isScheduled: () => scheduled !== null };
}

// The first offensive player that isn't the thrower — something with somewhere
// to run to.
function aCutter(store: ReturnType<typeof createSceneStore>) {
  const scene = store.getScene();
  return scene.players.find((p) => p.team === "offense" && p.id !== scene.possession)!;
}

beforeEach(() => {
  resetMotionMode();
  resetThrowMode();
});

describe("run / stop / reset", () => {
  it("moves pieces once running", () => {
    const h = harness();
    const cutter = aCutter(h.store);
    addDestination(cutter.id, { x: 85, y: 10 });
    const before = h.posOf(cutter.id);

    h.driver.run();
    expect(h.driver.isRunning()).toBe(true);
    expect(getMotionMode().status).toBe("running");

    for (let i = 0; i < 20; i++) h.tick(16);
    expect(h.posOf(cutter.id)).not.toEqual(before);
  });

  it("stop freezes pieces exactly where they are", () => {
    const h = harness();
    const cutter = aCutter(h.store);
    addDestination(cutter.id, { x: 85, y: 10 });

    h.driver.run();
    for (let i = 0; i < 20; i++) h.tick(16);
    const frozen = h.posOf(cutter.id);

    h.driver.stop();
    expect(h.driver.isRunning()).toBe(false);
    expect(getMotionMode().status).toBe("stopped");

    // Nothing scheduled, so nothing can move it afterwards.
    h.tick(16);
    expect(h.posOf(cutter.id)).toEqual(frozen);
  });

  it("reset restores the pre-run positions exactly", () => {
    const h = harness();
    const cutter = aCutter(h.store);
    const origin = h.posOf(cutter.id);
    addDestination(cutter.id, { x: 85, y: 10 });

    h.driver.run();
    for (let i = 0; i < 40; i++) h.tick(16);
    expect(h.posOf(cutter.id)).not.toEqual(origin);

    h.driver.reset();
    expect(h.posOf(cutter.id)).toEqual(origin);
    expect(getMotionMode().status).toBe("idle");
  });

  it("reset rewinds the route so the same cut can be run again", () => {
    const h = harness();
    const cutter = aCutter(h.store);
    addDestination(cutter.id, { x: 70, y: 10 });
    addDestination(cutter.id, { x: 85, y: 30 });

    h.driver.run();
    for (let i = 0; i < 200 && h.driver.isRunning(); i++) h.tick(16);
    h.driver.reset();

    expect(getMotionMode().routes[cutter.id].leg).toBe(0);
    expect(getMotionMode().routes[cutter.id].legs).toHaveLength(2);
  });

  it("ends on its own once everything settles", () => {
    const h = harness();
    const cutter = aCutter(h.store);
    addDestination(cutter.id, { x: 70, y: 22 });

    h.driver.run();
    for (let i = 0; i < 2000 && h.driver.isRunning(); i++) h.tick(16);

    expect(h.driver.isRunning()).toBe(false);
    expect(getMotionMode().status).toBe("settled");
  });

  it("run is a no-op while already running", () => {
    const h = harness();
    addDestination(aCutter(h.store).id, { x: 85, y: 10 });
    h.driver.run();
    const first = h.driver.isRunning();
    h.driver.run();
    expect(first && h.driver.isRunning()).toBe(true);
  });
});

describe("the accumulator (ADR-5)", () => {
  it("a long frame gap produces bounded displacement, not a teleport", () => {
    // PRD FR-4.5. A backgrounded tab hands back one enormous elapsed time;
    // integrating it in one go would put everyone across the field.
    const h = harness();
    const cutter = aCutter(h.store);
    addDestination(cutter.id, { x: 100, y: 10 });
    const before = h.posOf(cutter.id)!;

    h.driver.run();
    h.tick(5000); // five seconds away

    const after = h.posOf(cutter.id)!;
    const travelled = Math.hypot(after.x - before.x, after.y - before.y);
    // At most one clamped frame's worth of simulation, and a mover starting
    // from rest cannot even reach that.
    expect(travelled).toBeLessThanOrEqual(DEFAULT_PARAMS.vmax * MAX_FRAME_SECONDS + 1e-6);
  });

  it("writes exactly one mutation per rendered frame regardless of substep count", () => {
    const h = harness();
    let mutations = 0;
    h.store.subscribe(() => (mutations += 1));
    addDestination(aCutter(h.store).id, { x: 85, y: 10 });

    h.driver.run();
    mutations = 0;
    // 100 ms is twelve DT substeps; it must still be one mutation.
    h.tick(100);
    expect(mutations).toBe(1);
  });

  it("does not mutate when too little time has passed for a substep", () => {
    const h = harness();
    let mutations = 0;
    h.store.subscribe(() => (mutations += 1));
    addDestination(aCutter(h.store).id, { x: 85, y: 10 });

    h.driver.run();
    mutations = 0;
    h.tick((DT * 1000) / 2); // half a substep
    expect(mutations).toBe(0);
  });
});

describe("isolation", () => {
  it("two drivers on two stores do not interfere", () => {
    // The seam Initiative D needs: a second page owning its own clock without
    // two rAF loops fighting over one scene.
    const a = harness();
    const b = harness();
    const cutterA = aCutter(a.store);
    addDestination(cutterA.id, { x: 85, y: 10 });
    const bBefore = b.posOf(cutterA.id);

    a.driver.run();
    for (let i = 0; i < 20; i++) a.tick(16);

    expect(a.posOf(cutterA.id)).not.toEqual(bBefore);
    expect(b.posOf(cutterA.id)).toEqual(bBefore);
  });

  it("dispose cancels the frame loop", () => {
    const h = harness();
    addDestination(aCutter(h.store).id, { x: 85, y: 10 });
    h.driver.run();
    expect(h.isScheduled()).toBe(true);

    h.driver.dispose();
    expect(h.isScheduled()).toBe(false);
    expect(h.driver.isRunning()).toBe(false);
  });
});

describe("reduced motion (ADR-6)", () => {
  it("applies the end state in one mutation with no frame loop", () => {
    const h = harness(true);
    let mutations = 0;
    h.store.subscribe(() => (mutations += 1));
    const cutter = aCutter(h.store);
    addDestination(cutter.id, { x: 70, y: 22 });

    h.driver.run();

    expect(mutations).toBe(1);
    expect(h.isScheduled()).toBe(false);
    expect(h.driver.isRunning()).toBe(false);
    expect(getMotionMode().status).toBe("settled");
    // The end state, not a halfway position.
    expect(h.posOf(cutter.id)).toEqual({ x: 70, y: 22 });
  });
});

describe("disc flight", () => {
  function withDisc() {
    const h = harness();
    const scene = h.store.getScene();
    const receiver = scene.players.find(
      (p) => p.team === "offense" && p.id !== scene.possession,
    )!;
    return { ...h, receiver, thrower: scene.possession! };
  }

  it("animates the disc and applies the throw only on arrival", () => {
    const h = withDisc();
    let applied = false;
    expect(h.driver.throwDisc(h.receiver.id, () => (applied = true))).toBe(true);

    // Airborne: the caller's throw has NOT been applied yet, so possession is
    // still the old thrower's — never nobody's (PRD FR-5.4).
    h.tick(16);
    expect(applied).toBe(false);
    expect(getFlightPos()).not.toBeNull();
    expect(h.store.getScene().possession).toBe(h.thrower);

    for (let i = 0; i < 400 && getFlightPos() !== null; i++) h.tick(16);
    expect(applied).toBe(true);
    // Cleared before the throw is applied, so there is no instant where both
    // a flight and the new possession are live.
    expect(getFlightPos()).toBeNull();
  });

  it("travels — the published position moves between frames", () => {
    const h = withDisc();
    h.driver.throwDisc(h.receiver.id, () => {});
    h.tick(16);
    const first = getFlightPos();
    h.tick(100);
    const later = getFlightPos();
    expect(first).not.toBeNull();
    expect(later).not.toEqual(first);
  });

  it("declines to animate under reduced motion, so the caller throws instantly", () => {
    const h = harness(true);
    const scene = h.store.getScene();
    const receiver = scene.players.find(
      (p) => p.team === "offense" && p.id !== scene.possession,
    )!;
    expect(h.driver.throwDisc(receiver.id, () => {})).toBe(false);
    expect(getFlightPos()).toBeNull();
  });

  it("declines a throw to the current holder and a throw with no holder", () => {
    const h = harness();
    const holder = h.store.getScene().possession!;
    expect(h.driver.throwDisc(holder, () => {})).toBe(false);
    expect(h.driver.throwDisc("nobody", () => {})).toBe(false);
  });

  it("dispose mid-flight leaves no orphaned disc", () => {
    const h = withDisc();
    let applied = false;
    h.driver.throwDisc(h.receiver.id, () => (applied = true));
    h.tick(16);
    h.driver.dispose();
    expect(getFlightPos()).toBeNull();
    // The throw never landed, so possession stayed with the thrower — the
    // disc is accounted for either way (FR-5.4).
    expect(applied).toBe(false);
    expect(h.store.getScene().possession).toBe(h.thrower);
  });
});

describe("ADR-2: React is not in the frame path", () => {
  it("commits zero React renders across a running simulation", () => {
    const h = harness();
    const cutter = aCutter(h.store);
    addDestination(cutter.id, { x: 95, y: 10 });

    let commits = 0;
    function StatusOnly() {
      const run = useMotionRun();
      return <output>{run.status}</output>;
    }
    render(
      <Profiler id="motion" onRender={() => (commits += 1)}>
        <StatusOnly />
      </Profiler>,
    );

    // act() so React flushes the single status transition before counting
    // begins. The ticks below are deliberately NOT wrapped, so any commit
    // they provoked would be counted rather than absorbed.
    act(() => h.driver.run());
    const before = h.posOf(cutter.id);

    commits = 0; // count only the run itself
    for (let i = 0; i < 60; i++) h.tick(16);

    expect(commits).toBe(0);
    // Zero commits only means something if the simulation actually ran — a
    // driver that never started would satisfy it for the wrong reason.
    expect(h.posOf(cutter.id)).not.toEqual(before);
    expect(screen.getByRole("status")).toHaveTextContent("running");
  });

  it("does commit when the run status changes, which is the only thing React sees", () => {
    let commits = 0;
    function StatusOnly() {
      const run = useMotionRun();
      return <output>{run.status}</output>;
    }
    render(
      <Profiler id="motion" onRender={() => (commits += 1)}>
        <StatusOnly />
      </Profiler>,
    );

    commits = 0;
    act(() => setStatus("running"));
    expect(commits).toBeGreaterThan(0);
  });
});
