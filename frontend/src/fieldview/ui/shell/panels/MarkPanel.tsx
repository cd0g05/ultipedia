// The mark selection state (ux.md UI States / Flow 3): the force.
//
// ADR-3 is load-bearing here. These buttons do not store a force — there is no
// such field, and adding one is a review-blocking change. They MOVE THE MARK
// to the preset position for the chosen side/angle, and the active state is
// read back out of the resulting geometry by readForce(). That is why dragging
// the mark by hand honestly reads `Custom` instead of leaving a stale button
// lit: the drawn scene is the only answer, and space/ derives its own force
// from the same geometry without knowing this panel exists.
//
// Two labelled rows (Force side, Force angle) rather than nine loose buttons:
// ux.md's UI States and Flow 3 describe picking a side and then adjusting the
// angle, and the accessibility section names those two groups explicitly. The
// six controls still span the full 3x3 FORCE_SIDES x FORCE_ANGLES space.

import type { PanelProps } from "../panelRegistry";
import { useSceneStore } from "../sceneStore";
import { usePlayModel } from "../../playModel";
import { FORCE_ANGLES, FORCE_SIDES, markPosFor } from "../../../scene/force";
import type { ForceAngle, ForceSide } from "../../../scene/force";
import { movePlayer } from "../../../scene/scene";
import { PanelLabel, StatusLine, HintLine, ToggleRow, ToggleRowButton } from "./panelChrome";

const NO_THROWER = "Force needs a thrower — give someone the disc first.";
const CUSTOM_HINT = "Pick a force to snap the mark back to a named position.";

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// From `Custom`, one control alone does not say what the other should be.
// Anchoring on the neutral force means the readout immediately states the
// whole answer ("Flat · Around") rather than guessing at an intent the coach
// has not expressed — and the mark visibly moves, so nothing is silent.
const CUSTOM_BASE = { side: "flat" as ForceSide, angle: "default" as ForceAngle };

export function MarkPanel({ selection }: PanelProps) {
  const store = useSceneStore();
  const model = usePlayModel(store);

  const id = selection.kind === "mark" || selection.kind === "defense" ? selection.id : null;
  const mark = model.players.find((p) => p.id === id);
  if (!mark) return null;

  // The force is meaningless without a holder, and this is the honest reason
  // to disable — not readForce() returning "custom", which is a legitimate
  // state a coach chose by dragging.
  const disabled = model.possession === null;
  const reading = model.force;
  const active = reading === "custom" ? null : reading;

  function applyForce(side: ForceSide, angle: ForceAngle) {
    if (!store || !id) return;
    store.mutate((draft) => {
      const thrower = draft.players.find((p) => p.role === "thrower");
      if (!thrower) return;
      // movePlayer clamps to the field and re-normalises; near a sideline the
      // mark can land short of the preset, in which case readForce() will say
      // "custom" — correctly, because the mark is not where that force wants
      // it. The heatmap repaints off the same mutation, for free.
      movePlayer(draft, id, markPosFor(side, angle, thrower.pos));
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <PanelLabel>Force</PanelLabel>
        {/* Never colour alone: the active force is stated in words, and
            `Custom` is a normal readout, not an error. */}
        <StatusLine>
          {active ? `${titleCase(active.side)} · ${titleCase(active.angle)}` : "Custom"}
        </StatusLine>
      </div>

      {disabled ? (
        <HintLine>{NO_THROWER}</HintLine>
      ) : (
        active === null && <HintLine>{CUSTOM_HINT}</HintLine>
      )}

      <div className="flex flex-col gap-1">
        <PanelLabel>Force side</PanelLabel>
        <ToggleRow label="Force side">
          {FORCE_SIDES.map((side) => (
            <ToggleRowButton
              key={side}
              label={titleCase(side)}
              active={active?.side === side}
              disabled={disabled}
              onClick={() => applyForce(side, active?.angle ?? CUSTOM_BASE.angle)}
            />
          ))}
        </ToggleRow>
      </div>

      <div className="flex flex-col gap-1">
        <PanelLabel>Force angle</PanelLabel>
        <ToggleRow label="Force angle">
          {FORCE_ANGLES.map((angle) => (
            <ToggleRowButton
              key={angle}
              label={titleCase(angle)}
              active={active?.angle === angle}
              disabled={disabled}
              onClick={() => applyForce(active?.side ?? CUSTOM_BASE.side, angle)}
            />
          ))}
        </ToggleRow>
      </div>
    </div>
  );
}
