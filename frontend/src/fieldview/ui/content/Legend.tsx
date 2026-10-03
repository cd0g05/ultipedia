// The colour legend: the model's own terms (Closed / Contested / Strong space,
// decision D7), drawn from the SAME stop arrays the painter uses (ADR-32), so
// the legend and the map cannot drift apart. Clicking it opens the colour guide.

import { rampStopsFor } from "../../space/palette";

export function rampGradient(colourBlind: boolean): string {
  const stops = rampStopsFor(colourBlind)
    .map((s) => `${s.hex} ${(s.at * 100).toFixed(0)}%`)
    .join(", ");
  return `linear-gradient(90deg, ${stops})`;
}

export interface LegendProps {
  colourBlind: boolean;
  onOpenGuide: () => void;
}

export function Legend({ colourBlind, onOpenGuide }: LegendProps) {
  return (
    <button
      type="button"
      onClick={onOpenGuide}
      aria-label="Colour guide: what the colours mean"
      className="flex h-10 items-center gap-2 border border-film-border bg-white px-3 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-600 hover:bg-film-panel desktop:h-10"
    >
      <span>Closed</span>
      <span
        data-testid="legend-ramp"
        aria-hidden="true"
        className="block h-2 w-14 border border-black/20 desktop:w-20"
        style={{ background: rampGradient(colourBlind) }}
      />
      <span>Strong</span>
      <span
        aria-hidden="true"
        className="grid h-4 w-4 place-items-center border-[1.5px] border-zinc-600 text-[10px] leading-none"
      >
        ?
      </span>
    </button>
  );
}
