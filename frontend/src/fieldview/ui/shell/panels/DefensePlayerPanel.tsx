// Placeholder for the defensive-player selection state (ux.md UI States):
// real content (matchup assignment, free-roam toggle) ships with
// fieldview-play-model. See OffensePlayerPanel for the shared placeholder
// treatment this mirrors.

import type { PanelProps } from "../panelRegistry";

export function DefensePlayerPanel(_props: PanelProps) {
  return (
    <div className="border border-dashed border-zinc-300 p-4 text-center font-mono text-xs text-zinc-500">
      <span className="mb-2 inline-block border border-film-accentPink px-1.5 py-0.5 text-[9px] text-film-accentPink">
        PENDING FIELDVIEW-PLAY-MODEL
      </span>
      <p>Matchup and mark controls ship in a future update.</p>
    </div>
  );
}
