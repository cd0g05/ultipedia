// Placeholder for the mark selection state (ux.md UI States): real content
// (force side/angle controls) ships with fieldview-play-model. See
// OffensePlayerPanel for the shared placeholder treatment this mirrors.
// Kept a distinct panel (not reused from Offense/Defense) because the mark's
// eventual content — force controls — is a different shape entirely, even
// though today all three render identical placeholder copy.

import type { PanelProps } from "../panelRegistry";

export function MarkPanel(_props: PanelProps) {
  return (
    <div className="border border-dashed border-zinc-300 p-4 text-center font-mono text-xs text-zinc-500">
      <span className="mb-2 inline-block border border-film-accentPink px-1.5 py-0.5 text-[9px] text-film-accentPink">
        PENDING FIELDVIEW-PLAY-MODEL
      </span>
      <p>Matchup and mark controls ship in a future update.</p>
    </div>
  );
}
