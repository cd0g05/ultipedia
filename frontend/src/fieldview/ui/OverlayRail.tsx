// The controls beside the field: which teams are drawn, the Space toggle,
// the legend, and the Advanced settings disclosure.
//
// Two kinds of control live here and the split matters. The visibility
// checkboxes are *diagram* controls — they change the picture and nothing
// else, so they show whether or not the overlay is on. Everything below the
// Space button is an *overlay* control, and with the overlay off it is hidden
// rather than greyed out: there is nothing to explain until the map is on, and
// a row of disabled controls reads as broken rather than as not-yet-relevant.

import { RAMP_STOPS } from "../space/constants";
import type { LayerFlags, Lens, SpaceParams } from "../space/types";
import type { TeamVisibility } from "./prefs";
import { AdvancedPanel } from "./AdvancedPanel";
import type { MotionParams } from "../motion/types";

interface OverlayRailProps {
  on: boolean;
  lens: Lens;
  layers: LayerFlags;
  params: SpaceParams;
  motion: MotionParams;
  visible: TeamVisibility;
  advancedExpanded: boolean;
  onToggle: (on: boolean) => void;
  onLensChange: (lens: Lens) => void;
  onLayerChange: (layer: keyof LayerFlags, enabled: boolean) => void;
  onParamChange: (param: keyof SpaceParams, value: number) => void;
  onMotionParamChange: (param: keyof MotionParams, value: number) => void;
  onVisibleChange: (team: keyof TeamVisibility, shown: boolean) => void;
  onAdvancedExpandedChange: (expanded: boolean) => void;
  onResetParams: () => void;
}

const TEAM_LABELS: { key: keyof TeamVisibility; label: string }[] = [
  { key: "offense", label: "Offense" },
  { key: "defense", label: "Defense" },
];

// The legend's colours come from the same ramp stops the painter uses, so a
// recalibration can never leave the key describing a map that no longer
// exists. Meaning is carried by the words, not the hue (WCAG 1.4.1) — and by
// the same words the readout uses, so "contested" means one thing here.
const LEGEND = [
  { hex: RAMP_STOPS[0].hex, label: "Closed" },
  { hex: RAMP_STOPS[1].hex, label: "Contested" },
  { hex: RAMP_STOPS[3].hex, label: "Strong space" },
];

export function OverlayRail({
  on,
  lens,
  layers,
  params,
  motion,
  visible,
  advancedExpanded,
  onToggle,
  onLensChange,
  onLayerChange,
  onParamChange,
  onMotionParamChange,
  onVisibleChange,
  onAdvancedExpandedChange,
  onResetParams,
}: OverlayRailProps) {
  return (
    // Tablet (768–1279): a horizontal control bar under the field. Desktop
    // (>= 1280, Tailwind `xl`): a vertical rail beside it. The field is the
    // thing that wants the width, so it gets it until there is enough for both.
    <aside
      aria-label="Field view controls"
      className="flex w-full flex-row flex-wrap items-start gap-x-8 gap-y-3 border border-zinc-300 bg-white px-4 py-3 xl:flex-col xl:gap-3"
    >
      {/* Show one side of a formation at a time — a coach walking through a
          new defensive shape does not want six green dots in the way. Purely
          what is drawn: the map still sees everyone. */}
      <fieldset className="flex flex-col gap-1">
        <legend className="font-mono text-xs uppercase tracking-wider text-zinc-500">
          Show on diagram
        </legend>
        {TEAM_LABELS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 font-mono text-xs text-zinc-800">
            <input
              type="checkbox"
              checked={visible[key]}
              onChange={(e) => onVisibleChange(key, e.target.checked)}
            />
            {label}
          </label>
        ))}
      </fieldset>

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
        // A fragment, not a wrapper div: the legend and advanced panel must be
        // direct flex children of the rail, or they would stack inside a box
        // and defeat the horizontal tablet bar.
        <>
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

          <AdvancedPanel
            lens={lens}
            layers={layers}
            params={params}
            motion={motion}
            expanded={advancedExpanded}
            onExpandedChange={onAdvancedExpandedChange}
            onLensChange={onLensChange}
            onLayerChange={onLayerChange}
            onParamChange={onParamChange}
            onMotionParamChange={onMotionParamChange}
            onReset={onResetParams}
          />
        </>
      )}
    </aside>
  );
}
