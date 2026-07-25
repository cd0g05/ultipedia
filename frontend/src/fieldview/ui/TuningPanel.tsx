// The six model parameters (brief §4.4) as sliders. Collapsed by default —
// the map is the product, the dials are for the coach who wants to argue
// with it. Values are shown numerically because "I moved a slider and the
// map changed" is only useful if you can say by how much.

import { SLIDER_RANGES, degToRad } from "../space/constants";
import type { SpaceParams } from "../space/types";
import { paramsAreDefault } from "./prefs";

interface TuningPanelProps {
  params: SpaceParams;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onParamChange: (param: keyof SpaceParams, value: number) => void;
  onReset: () => void;
}

interface SliderSpec {
  param: keyof SpaceParams;
  label: string;
  min: number;
  max: number;
  step: number;
  // markW is stored in radians and shown in degrees; every other parameter
  // is displayed in its stored unit.
  toDisplay?: (stored: number) => number;
  fromDisplay?: (display: number) => number;
  unit: string;
  decimals: number;
}

const RAD_TO_DEG = 180 / Math.PI;

const SLIDERS: SliderSpec[] = [
  { param: "vmax", label: "Top speed", ...SLIDER_RANGES.vmax, step: 0.1, unit: "yd/s", decimals: 1 },
  { param: "react", label: "Reaction time", ...SLIDER_RANGES.react, step: 0.05, unit: "s", decimals: 2 },
  { param: "head", label: "Cutter head start", ...SLIDER_RANGES.head, step: 0.05, unit: "s", decimals: 2 },
  { param: "hang", label: "Huck hang", ...SLIDER_RANGES.hang, step: 0.05, unit: "", decimals: 2 },
  { param: "markStr", label: "Mark strength", ...SLIDER_RANGES.markStr, step: 0.05, unit: "", decimals: 2 },
  {
    param: "markW",
    label: "Mark width",
    ...SLIDER_RANGES.markWDeg,
    step: 1,
    unit: "°",
    decimals: 0,
    toDisplay: (rad) => rad * RAD_TO_DEG,
    fromDisplay: (deg) => degToRad(deg),
  },
];

export function TuningPanel({
  params,
  expanded,
  onExpandedChange,
  onParamChange,
  onReset,
}: TuningPanelProps) {
  const modified = !paramsAreDefault(params);

  return (
    <div className="w-full border-t border-zinc-200 pt-3">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => onExpandedChange(!expanded)}
        className="flex w-full items-center justify-between font-mono text-xs uppercase tracking-wider text-zinc-700"
      >
        <span>
          Tuning
          {/* A surprising map should always be traceable to a slider. */}
          {modified && (
            <span className="ml-2 text-film-accentPink" title="Modified from defaults">
              • modified
            </span>
          )}
        </span>
        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className="mt-3 flex flex-col gap-2">
          {SLIDERS.map((spec) => {
            const display = spec.toDisplay ? spec.toDisplay(params[spec.param]) : params[spec.param];
            return (
              <label key={spec.param} className="flex items-center gap-3 font-mono text-xs">
                <span className="w-32 shrink-0 text-zinc-600">{spec.label}</span>
                <input
                  type="range"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={display}
                  aria-label={spec.label}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    onParamChange(spec.param, spec.fromDisplay ? spec.fromDisplay(next) : next);
                  }}
                  className="flex-1"
                />
                <span className="w-16 shrink-0 text-right tabular-nums text-zinc-800">
                  {display.toFixed(spec.decimals)}
                  {spec.unit}
                </span>
              </label>
            );
          })}

          <button
            type="button"
            onClick={onReset}
            className="self-start font-mono text-xs uppercase tracking-wider text-film-accentPink underline"
          >
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}
