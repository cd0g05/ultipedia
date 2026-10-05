// The smallest thing that mounts the real field: FieldCanvas over a SceneStore
// holding the 14-player vert-stack scene, with the overlay settings passed in
// and the hover readout beneath. No shell, no page, no router. It exists so the
// drag, marquee, nudge, frame-budget and hover-readout tests keep proving the
// interaction engine now that the Whiteboard page is gone.
//
// `SelectionProbe` subscribes to the selection the way a real panel does, so the
// "one commit per selection change, zero per pointer move" invariant (ADR-1,
// ADR-2) is still measured against a React subscriber.

import { useRef } from "react";
import { createSceneStore } from "../scene/store";
import type { SceneStore } from "../scene/store";
import { getPreset } from "../scene/presets";
import { DEFAULT_PARAMS, ALL_LAYERS } from "../space/constants";
import { FieldCanvas } from "../ui/FieldCanvas";
import type { OverlaySettings } from "../ui/FieldCanvas";
import { CellReadout } from "../ui/CellReadout";
import type { CellReadoutHandle } from "../ui/CellReadout";
import type { Lens } from "../space/types";
import { useSelection } from "../ui/shell/useSelection";

export function SelectionProbe({ store }: { store: SceneStore }) {
  useSelection(store);
  return null;
}

export function makeOverlay(on: boolean, lens: Lens = "offense"): OverlaySettings {
  return { on, lens, layers: { ...ALL_LAYERS }, params: { ...DEFAULT_PARAMS } };
}

export function FieldHarness({
  overlayOn = false,
  lens,
  store: given,
}: {
  overlayOn?: boolean;
  lens?: Lens;
  store?: SceneStore;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const readoutRef = useRef<CellReadoutHandle | null>(null);
  const storeRef = useRef<SceneStore>(given ?? createSceneStore(getPreset("vertStackForceSide")));
  const store = storeRef.current;
  const scene = store.getScene();
  const players = scene.players.map((p) => ({ id: p.id, team: p.team, role: p.role, label: p.label }));
  return (
    <>
      <SelectionProbe store={store} />
      <FieldCanvas
        store={store}
        players={players}
        svgRef={svgRef}
        overlay={makeOverlay(overlayOn, lens)}
        readoutRef={readoutRef}
      />
      <CellReadout ref={readoutRef} />
    </>
  );
}
