// Reads selection state from the SceneStore without ever going through
// React state (tech-design.md ADR-1). `useSyncExternalStore` is the
// standard primitive for exactly this: a value that lives outside React,
// changing on a schedule React doesn't control (here, pointer clicks and
// marquee drags handled imperatively in FieldCanvas.tsx).

import { useSyncExternalStore } from "react";
import type { SceneStore } from "../../scene/store";
import type { SelectionState } from "../../scene/selection";

export function useSelection(store: SceneStore): SelectionState {
  return useSyncExternalStore(store.subscribeSelection, store.getSelection);
}
