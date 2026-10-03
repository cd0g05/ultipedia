// /fieldview/explore — drag players, watch the space shift. P2 mounts the
// frame; P3 fills the setup chip, sidebar and dock.

import { Seo } from "../../encyclopedia/seo/Seo";
import { FieldViewFrame } from "../ui/app/FieldViewFrame";

export function Explore() {
  return (
    <>
      {/* PLACEHOLDER(fieldview-ui-rework): title/description are stand-ins (#11). */}
      <Seo
        title="Explore — Field View — Ultipedia"
        description="Drag players around an ultimate field and watch the space shift."
      />
      <FieldViewFrame mode="explore" />
    </>
  );
}
