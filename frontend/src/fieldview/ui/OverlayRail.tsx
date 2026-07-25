// The overlay rail: the Space toggle, the lens switch, the four layer
// toggles, the legend, and the tuning panel.
//
// With the overlay off, everything except the toggle is *hidden* rather than
// greyed out — there is nothing to explain until the map is on, and a row of
// disabled controls reads as broken rather than as not-yet-relevant.

import { RAMP_STOPS } from "../space/constants";
import type { LayerFlags, Lens, SpaceParams } from "../space/types";
import { TuningPanel } from "./TuningPanel";

interface OverlayRailProps {
  on: boolean;
  lens: Lens;
  layers: LayerFlags;
  params: SpaceParams;
  tuningExpanded: boolean;
  onToggle: (on: boolean) => void;
  onLensChange: (lens: Lens) => void;
  onLayerChange: (layer: keyof LayerFlags, enabled: boolean) => void;
  onParamChange: (param: keyof SpaceParams, value: number) => void;
  onTuningExpandedChange: (expanded: boolean) => void;
  onResetParams: () => void;
}

const LAYER_LABELS: { key: keyof LayerFlags; label: string }[] = [
  { key: "markForce", label: "Mark / force" },
  { key: "coverage", label: "Coverage" },
  { key: "lanes", label: "Throwing lanes" },
  { key: "value", label: "Field value" },
];

const LENS_HELP: Record<Lens, string> = {
  offense: "Counts whether a cutter could get there first.",
  "defense-only": "Ignores the cutters — pure defensive shape.",
};

// The legend's colours come from the same ramp stops the painter uses, so a
// recalibration can never leave the key describing a map that no longer
// exists. Meaning is carried by the words, not the hue (WCAG 1.4.1).
const LEGEND = [
  { hex: RAMP_STOPS[0].hex, label: "Closed" },
  { hex: RAMP_STOPS[1].hex, label: "Open, low value" },
  { hex: RAMP_STOPS[3].hex, label: "Strong space" },
];

export function OverlayRail({
  on,
  lens,
  layers,
  params,
  tuningExpanded,
  onToggle,
  onLensChange,
  onLayerChange,
  onParamChange,
  onTuningExpandedChange,
  onResetParams,
}: OverlayRailProps) {
  return (
    // Tablet (768–1279): a horizontal control bar under the field. Desktop
    // (>= 1280, Tailwind `xl`): a vertical rail beside it. The field is the
    // thing that wants the width, so it gets it until there is enough for both.
    <aside
      aria-label="Space overlay controls"
      className="flex w-full flex-row flex-wrap items-start gap-x-8 gap-y-3 border border-zinc-300 bg-white px-4 py-3 xl:flex-col xl:gap-3"
    >
      <button
        type="button"
        aria-pressed={on}
        onClick={() => onToggle(!on)}
        className={`self-start border px-4 py-1.5 font-mono text-sm uppercase tracking-wider ${
          on
            ? "border-film-accentPink bg-film-accentPink text-white"
            : "border-zinc-400 text-zinc-700 hover:border-film-accentPink hover:text-film-accentPink"
        }`}
      >
        Space
      </button>

      {on && (
        // A fragment, not a wrapper div: the fieldsets, legend, and tuning
        // panel must be direct flex children of the rail, or they would stack
        // inside a box and defeat the horizontal tablet bar.
        <>
          <fieldset className="flex flex-col gap-1">
            <legend className="font-mono text-xs uppercase tracking-wider text-zinc-500">Lens</legend>
            {(["offense", "defense-only"] as Lens[]).map((option) => (
              <label key={option} className="flex items-baseline gap-2 font-mono text-xs">
                <input
                  type="radio"
                  name="lens"
                  value={option}
                  checked={lens === option}
                  onChange={() => onLensChange(option)}
                />
                <span className="text-zinc-800">{option === "offense" ? "Offense" : "Defense only"}</span>
                <span className="text-zinc-500">{LENS_HELP[option]}</span>
              </label>
            ))}
          </fieldset>

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

          <div className="flex flex-wrap gap-4">
            {LEGEND.map((entry) => (
              <span key={entry.label} className="flex items-center gap-2 font-mono text-xs text-zinc-700">
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 border border-zinc-400"
                  style={{ backgroundColor: entry.hex }}
                />
                {entry.label}
              </span>
            ))}
          </div>

          <TuningPanel
            params={params}
            expanded={tuningExpanded}
            onExpandedChange={onTuningExpandedChange}
            onParamChange={onParamChange}
            onReset={onResetParams}
          />
        </>
      )}
    </aside>
  );
}
