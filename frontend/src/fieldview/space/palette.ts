// brief §4 Display: score^0.7 gamma, mapped red → amber → green. Anchor
// stops: #D64B4A @ 0, #EF9F27 @ 0.42, #97C459 @ 0.68, #4F941D @ 1. Piecewise
// linear between stops. Red = closed, yellow = open but not advancing,
// green = strong. Stops and gamma live in constants.ts.

import { CB_RAMP_STOPS, GAMMA, RAMP_STOPS } from "./constants";

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

// score^GAMMA — applied once at colour-mapping time, never per layer.
export function gammaScore(score: number): number {
  const s = score < 0 ? 0 : score > 1 ? 1 : score;
  return Math.pow(s, GAMMA);
}

type Colorizer = (score: number, out: Uint8ClampedArray | number[], offset: number) => void;

// Builds a colorizer for any ordered stop list. The ramp is data, so a second
// palette (colour-blind) is a parameter, not a fork of the maths.
export function makeColorizer(stopList: readonly { at: number; hex: string }[]): Colorizer {
  const stops: Stop[] = stopList.map((s) => hexToStop(s.at, s.hex));
  return (score, out, offset) => {
    const shade = gammaScore(score);
    let lo = stops[0];
    let hi = stops[stops.length - 1];
    for (let i = 1; i < stops.length; i++) {
      if (shade <= stops[i].at) {
        lo = stops[i - 1];
        hi = stops[i];
        break;
      }
    }
    const span = hi.at - lo.at;
    const t = span === 0 ? 0 : (shade - lo.at) / span;
    out[offset] = Math.round(lo.r + t * (hi.r - lo.r));
    out[offset + 1] = Math.round(lo.g + t * (hi.g - lo.g));
    out[offset + 2] = Math.round(lo.b + t * (hi.b - lo.b));
    out[offset + 3] = 255;
  };
}

// Write the RGBA for a raw (pre-gamma) score into `out` at `offset`
// (e.g. directly into an ImageData buffer). Alpha is always 255 — overlay
// transparency is the renderer's concern, not the palette's.
export const scoreToRgba: Colorizer = makeColorizer(RAMP_STOPS);

// The colour-blind ramp (orange → neutral → blue), same maths, other stops.
export const scoreToRgbaColourBlind: Colorizer = makeColorizer(CB_RAMP_STOPS);

export function colorizerFor(colourBlind: boolean): Colorizer {
  return colourBlind ? scoreToRgbaColourBlind : scoreToRgba;
}

// The stop list the legend should draw for a palette.
export function rampStopsFor(colourBlind: boolean): readonly { at: number; hex: string }[] {
  return colourBlind ? CB_RAMP_STOPS : RAMP_STOPS;
}
