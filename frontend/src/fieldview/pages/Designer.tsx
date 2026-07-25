// /field-view/designer — Mode 2 shell. Renders a static preset scene; the
// keyframe timeline and transport land in the play-designer partition.

import { getPreset } from "../scene/presets";
import { FieldStage } from "./FieldStage";

export function Designer() {
  const scene = getPreset("vertStackForceSide");

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-widest text-zinc-900">
        Field View — Designer
      </h1>
      <FieldStage scene={scene} />
    </div>
  );
}
