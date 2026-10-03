// /fieldview/watch — step through curated plays. P2 mounts the frame; P4 fills
// the transport, play list and filmstrip.

import { Seo } from "../../encyclopedia/seo/Seo";
import { FieldViewFrame } from "../ui/app/FieldViewFrame";

export function Watch() {
  return (
    <>
      {/* PLACEHOLDER(fieldview-ui-rework): title/description are stand-ins (#11). */}
      <Seo
        title="Watch — Field View — Ultipedia"
        description="Watch ultimate plays run frame by frame."
      />
      <FieldViewFrame mode="watch" />
    </>
  );
}
