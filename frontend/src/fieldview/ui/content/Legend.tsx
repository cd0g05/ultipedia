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
  // Whether the space colours are being painted. The legend is the switch: press
  // it to grey it out and turn the colours off, press again to bring them back.
  heat: boolean;
  onToggleHeat: () => void;
  onOpenGuide: () => void;
}

export function Legend({ colourBlind, heat, onToggleHeat, onOpenGuide }: LegendProps) {
  return (
    <div className="flex h-10 items-stretch border border-film-border bg-white font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-600">
      <button
        type="button"
        onClick={onToggleHeat}
        aria-pressed={heat}
        aria-label="Show the space colours"
        title={heat ? "Turn the colours off" : "Turn the colours on"}
        className={`flex items-center gap-2 px-3 hover:bg-film-panel ${heat ? "" : "text-zinc-400"}`}
      >
        <span>{heat ? "Closed" : "Colours off"}</span>
        <span
          data-testid="legend-ramp"
          aria-hidden="true"
          className={`block h-2 w-14 border border-black/20 desktop:w-20 ${heat ? "" : "bg-zinc-300"}`}
          style={{ background: heat ? rampGradient(colourBlind) : undefined }}
        />
        {heat && <span>Strong</span>}
      </button>
      <button
        type="button"
        onClick={onOpenGuide}
        aria-label="Colour guide: what the colours mean"
        className="grid w-9 place-items-center border-l border-film-border hover:bg-film-panel"
      >
        <span
          aria-hidden="true"
          className="grid h-4 w-4 place-items-center border-[1.5px] border-zinc-600 text-[10px] leading-none"
        >
          ?
        </span>
      </button>
    </div>
  );
}
