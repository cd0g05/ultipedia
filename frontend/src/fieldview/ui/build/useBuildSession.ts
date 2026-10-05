// Structural Build state for React (frame index, document, undo availability,
// save status). Positions never come through here — they live in the store.

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { SceneStore } from "../../scene/store";
import type { Scene } from "../../scene/types";
import type { Play } from "../../play/format";
import { BuildSession } from "./BuildSession";
import type { BuildSessionOptions, BuildState } from "./BuildSession";

export interface BuildView extends BuildState {
  session: BuildSession;
}

export function useBuildSession(
  store: SceneStore,
  loadScene: (scene: Scene) => void,
  initial: () => Play,
  initialSave?: BuildSessionOptions["initialSave"],
): BuildView {
  // One session per Build visit. `initial` and `loadScene` are read once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const session = useMemo(() => new BuildSession(store, { loadScene, initialSave }, initial()), [store]);
  // Show the first frame once mounted (loading a scene updates app state, which
  // must not happen during render).
  useEffect(() => {
    session.resync();
  }, [session]);
  const state = useSyncExternalStore(session.subscribe, session.getState);
  return { ...state, session };
}
