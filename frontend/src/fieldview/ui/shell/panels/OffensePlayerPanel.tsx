// The offensive-player selection state (ux.md UI States): possession status
// and who is covering this player. Read-only in this initiative — routes and
// cuts belong to a later one — so there is nothing editable here by design,
// not by omission.

import type { PanelProps } from "../panelRegistry";
import { useSceneStore } from "../sceneStore";
import { usePlayModel, pieceName } from "../../playModel";
import { PanelLabel, StatusLine } from "./panelChrome";

export function OffensePlayerPanel({ selection }: PanelProps) {
  const model = usePlayModel(useSceneStore());
  const id = selection.kind === "offense" ? selection.id : null;
  const player = model.players.find((p) => p.id === id);

  if (!player) return null;

  // Read straight off the same matchup map the defender panel writes to (via
  // matchups.reassign), so the "guarded by" line and the matchup selector can
  // never disagree about who covers whom. Scanned in player order rather than
  // Object.keys order for the reason guardedBy() documents: the answer must
  // not depend on how the map was built.
  const defender = model.players.find(
    (p) => p.team === "defense" && model.matchups[p.id] === player.id,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <PanelLabel>Player</PanelLabel>
        <StatusLine>
          {pieceName(player)}
          {model.possession === player.id ? " — Has the disc" : ""}
        </StatusLine>
      </div>

      <div className="flex flex-col gap-1">
        <PanelLabel>Guarded by</PanelLabel>
        {/* ux.md gives the unguarded case its own full phrase rather than a
            bare "nobody" under the label, so it reads as a sentence however
            it is announced. */}
        <StatusLine>{defender ? pieceName(defender) : "Guarded by: nobody"}</StatusLine>
      </div>
    </div>
  );
}
