// Placeholder for the offensive-player selection state (ux.md UI States):
// real content (route assignments) ships with fieldview-play-model. The
// dashed border + pink "PENDING" tag is the shared placeholder treatment
// (see mockups/desktop-shell.html's `.placeholder-panel`) so every
// not-yet-shipped panel reads as "coming soon," not "broken."

import type { PanelProps } from "../panelRegistry";

export function OffensePlayerPanel(_props: PanelProps) {
  return (
    <div className="border border-dashed border-zinc-300 p-4 text-center font-mono text-xs text-zinc-500">
      <span className="mb-2 inline-block border border-film-accentPink px-1.5 py-0.5 text-[9px] text-film-accentPink">
        PENDING FIELDVIEW-PLAY-MODEL
      </span>
      <p>Matchup and mark controls ship in a future update.</p>
    </div>
  );
}
