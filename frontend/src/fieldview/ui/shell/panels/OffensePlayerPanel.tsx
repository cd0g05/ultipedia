// The offensive-player selection state (ux.md UI States): possession status,
// who is covering this player, and — since fieldview-motion — the route this
// player will run.
//
// Route sits BELOW the read-only identity lines: identity first, then what you
// can do to it, the same order the defender panel uses (identity, then matchup
// selector). The controls are a property of the *selected player*, which is
// why motion has no ribbon button: the ribbon is a fixed 2×2 shared verbatim
// by both shells, and "run this player's cut" is not a global tool.

import type { PanelProps } from "../panelRegistry";
import { useSceneStore } from "../sceneStore";
import { usePlayModel, pieceName } from "../../playModel";
import { PanelLabel, StatusLine, HintLine } from "./panelChrome";
import { useMotionDriver } from "../../motion/driverContext";
import { useMotionRun } from "../../motion/useMotionRun";
import {
  NO_ROUTE_TOOLTIP,
  clearRouteFor,
  setPicking,
} from "../../motion/motionMode";

function RouteButton({
  label,
  onClick,
  disabled,
  pressed,
  title,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      // aria-disabled rather than the native attribute, matching ToolRibbon and
      // panelChrome: a disabled control that leaves the tab order takes its
      // explanation with it.
      aria-disabled={disabled || undefined}
      aria-pressed={pressed}
      title={title}
      onClick={disabled ? undefined : onClick}
      className={`min-h-[44px] flex-1 border px-2 py-2 font-mono text-[10px] uppercase tracking-wide ${
        disabled
          ? "cursor-not-allowed border-film-border bg-film-panel text-zinc-400"
          : pressed
            ? "border-film-accentPink bg-film-accentPink/5 text-film-accentPink"
            : "border-film-border bg-white text-zinc-800 hover:border-film-accentPink hover:text-film-accentPink"
      }`}
    >
      {label}
    </button>
  );
}

export function OffensePlayerPanel({ selection }: PanelProps) {
  const model = usePlayModel(useSceneStore());
  const driver = useMotionDriver();
  const run = useMotionRun();

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

  const route = run.routes[player.id];
  const legs = route?.legs.length ?? 0;
  const picking = run.picking === player.id;
  const running = run.isRunning;

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

      <div className="flex flex-col gap-2 border-t border-film-border pt-3">
        <PanelLabel>Route</PanelLabel>
        <StatusLine>
          {legs === 0 ? "None set." : legs === 1 ? "1 leg" : `${legs} legs`}
        </StatusLine>

        <div className="flex">
          <RouteButton
            label={legs === 0 ? "Set Destination" : "Add Waypoint"}
            pressed={picking}
            disabled={running}
            onClick={() => setPicking(picking ? null : player.id)}
          />
          <RouteButton
            label="Clear"
            disabled={legs === 0 || running}
            onClick={() => clearRouteFor(player.id)}
          />
        </div>

        <div className="flex">
          {running ? (
            <RouteButton label="Stop" onClick={() => driver?.stop()} />
          ) : (
            <RouteButton
              label="Run"
              disabled={!run.canRun}
              title={run.canRun ? undefined : NO_ROUTE_TOOLTIP}
              onClick={() => driver?.run()}
            />
          )}
          <RouteButton
            label="Reset"
            disabled={!run.canReset}
            onClick={() => driver?.reset()}
          />
        </div>

        {picking && <HintLine>Click where the cutter should go.</HintLine>}
        {run.status !== "idle" && !picking && <StatusLine>{run.announcement}</StatusLine>}
        {legs > 0 && !picking && !running && (
          <HintLine>Drag a marker to adjust the cut.</HintLine>
        )}
      </div>
    </div>
  );
}
