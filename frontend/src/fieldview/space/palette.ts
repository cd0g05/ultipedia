// brief §4 Display: score^0.7 gamma, mapped red → amber → green. Anchor
// stops: #D64B4A @ 0, #EF9F27 @ 0.42, #97C459 @ 0.68, #4F941D @ 1. Piecewise
// linear between stops. Red = closed, yellow = open but not advancing,
// green = strong. Stops and gamma live in constants.ts.

import { GAMMA, RAMP_STOPS } from "./constants";

interface Stop {
  at: number;
  r: number;
  g: number;
  b: number;
}

function hexToStop(at: number, hex: string): Stop {
  const n = parseInt(hex.slice(1), 16);
  return { at, r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

const STOPS: Stop[] = RAMP_STOPS.map((s) => hexToStop(s.at, s.hex));

// score^GAMMA — applied once at colour-mapping time, never per layer.
export function gammaScore(score: number): number {
  const s = score < 0 ? 0 : score > 1 ? 1 : score;
  return Math.pow(s, GAMMA);
}

// Write the RGBA for a raw (pre-gamma) score into `out` at `offset`
// (e.g. directly into an ImageData buffer). Alpha is always 255 — overlay
// transparency is the renderer's concern, not the palette's.
export function scoreToRgba(
  score: number,
  out: Uint8ClampedArray | number[],
  offset: number,
): void {
  const shade = gammaScore(score);
  let lo = STOPS[0];
  let hi = STOPS[STOPS.length - 1];
  for (let i = 1; i < STOPS.length; i++) {
    if (shade <= STOPS[i].at) {
      lo = STOPS[i - 1];
      hi = STOPS[i];
      break;
    }
  }
  const span = hi.at - lo.at;
  const t = span === 0 ? 0 : (shade - lo.at) / span;
  out[offset] = Math.round(lo.r + t * (hi.r - lo.r));
  out[offset + 1] = Math.round(lo.g + t * (hi.g - lo.g));
  out[offset + 2] = Math.round(lo.b + t * (hi.b - lo.b));
  out[offset + 3] = 255;
}
