// Everything about *how the map is computed*, stowed behind one disclosure.
// The map is the product; these are for the coach who wants to argue with it.
//
// Three groups, in order of how often they get touched: whether the offense
// counts at all, which layers contribute, and the six model parameters
// (brief §4.4). Slider values are shown numerically because "I moved a slider
// and the map changed" is only useful if you can say by how much.

import { SLIDER_RANGES, degToRad } from "../space/constants";
import type { LayerFlags, Lens, SpaceParams } from "../space/types";
import { paramsAreDefault } from "./prefs";

interface AdvancedPanelProps {
  lens: Lens;
  layers: LayerFlags;
  params: SpaceParams;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onLensChange: (lens: Lens) => void;
  onLayerChange: (layer: keyof LayerFlags, enabled: boolean) => void;
  onParamChange: (param: keyof SpaceParams, value: number) => void;
  onReset: () => void;
}

const LAYER_LABELS: { key: keyof LayerFlags; label: string }[] = [
  { key: "markForce", label: "Mark / force" },
  { key: "coverage", label: "Coverage" },
  { key: "lanes", label: "Throwing lanes" },
  { key: "value", label: "Field value" },
];

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

export function AdvancedPanel({
  lens,
  layers,
  params,
  expanded,
  onExpandedChange,
  onLensChange,
  onLayerChange,
  onParamChange,
  onReset,
}: AdvancedPanelProps) {
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
          Advanced settings
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
        <div className="mt-3 flex flex-col gap-4">
          {/* The lens, put as one plain question. It used to be a pair of
              radios labelled "Offense" and "Defense only", which read as a
              filter on who is on the field rather than on what the model
              counts — a confusion the new show/hide toggles would have made
              worse. */}
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2 font-mono text-xs text-zinc-800">
              <input
                type="checkbox"
                checked={lens === "offense"}
                onChange={(e) => onLensChange(e.target.checked ? "offense" : "defense-only")}
              />
              Include offense in space calculations
            </label>
            <p className="pl-6 font-mono text-xs text-zinc-500">
              {lens === "offense"
                ? "Counts whether a cutter could get there first."
                : "Ignores the cutters — pure defensive shape."}
            </p>
          </div>

          <fieldset className="flex flex-col gap-1">
            <legend className="font-mono text-xs uppercase tracking-wider text-zinc-500">Layers</legend>
            {LAYER_LABELS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 font-mono text-xs text-zinc-800">
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={(e) => onLayerChange(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </fieldset>

          <div className="flex flex-col gap-2">
            {SLIDERS.map((spec) => {
              const display = spec.toDisplay ? spec.toDisplay(params[spec.param]) : params[spec.param];
              return (
                <label key={spec.param} className="flex items-center gap-2 font-mono text-xs">
                  <span className="w-24 shrink-0 text-zinc-600">{spec.label}</span>
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
                    // `min-w-0` matters: a range input has an intrinsic width,
                    // and without this a flex child refuses to shrink below it
                    // — which pushed the value column off the 320 px rail.
                    className="min-w-0 flex-1"
                  />
                  <span className="w-14 shrink-0 text-right tabular-nums text-zinc-800">
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
        </div>
      )}
    </div>
  );
}
