// Structural playback state for React: frame index, status, speed, loop.
// Positions never come through here — the controller writes them into the
// store directly (canon ADR-2).

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { SceneStore } from "../../scene/store";
import type { Play } from "../../play/format";
import { createPlaybackController } from "./playback";
import type { PlaybackController, PlaybackState } from "./playback";

export interface PlaybackView extends PlaybackState {
  controller: PlaybackController;
}

export function usePlayback(store: SceneStore, play: Play): PlaybackView {
  const controller = useMemo(() => createPlaybackController(store, play), [store, play]);
  useEffect(() => () => controller.dispose(), [controller]);
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  return { ...state, controller };
}
