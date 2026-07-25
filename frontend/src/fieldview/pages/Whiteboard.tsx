// /field-view — Mode 1 shell. Renders a static preset scene; dragging,
// the preset menu, and export land in the whiteboard partition.

import { getPreset } from "../scene/presets";
import { FieldStage } from "./FieldStage";

export function Whiteboard() {
  const scene = getPreset("vertStackForceSide");

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-widest text-zinc-900">
        Field View
      </h1>
      <FieldStage scene={scene} />
    </div>
  );
}
