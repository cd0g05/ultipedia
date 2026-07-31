// Disc flight. The duration is NOT computed here — it comes from
// space/layers.ts's flightTime(), which the heatmap has been drawn from since
// the space model shipped (tech-design ADR-3).
//
// That is the whole point. The overlay already tells a coach "a throw to this
// cell hangs this long"; if the animation used a second formula, the picture
// and the clock would disagree about the same throw. motionGuard fails the
// build if a flight duration is ever defined in motion/.

import type { Vec2 } from "../scene/types";
import { flightTime } from "../space/layers";
import type { DiscFlight } from "./types";
import { add, dist, scale, sub } from "./vec";

export function beginFlight(
  from: Vec2,
  to: Vec2,
  receiverId: string,
  hang: number,
): DiscFlight {
  return {
    from: { ...from },
    to: { ...to },
    receiverId,
    elapsed: 0,
    duration: flightTime(dist(from, to), hang),
  };
}

// Straight-line interpolation. A real disc curves, and the space model's
// `hang` already encodes how long it stays up — an arc here would be a second
// opinion about flight shape with nothing to validate it against. Initiative
// D's annotations are where drawn curves belong.
export function discPos(f: DiscFlight): Vec2 {
  const t = f.duration <= 0 ? 1 : Math.min(1, Math.max(0, f.elapsed / f.duration));
  return add(f.from, scale(sub(f.to, f.from), t));
}

export function hasArrived(f: DiscFlight): boolean {
  return f.elapsed >= f.duration;
}

export function advanceFlight(f: DiscFlight, dt: number): DiscFlight {
  return { ...f, elapsed: f.elapsed + dt };
}
