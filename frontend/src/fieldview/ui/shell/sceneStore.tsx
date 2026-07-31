// How a registered panel reaches the SceneStore.
//
// canon ADR-13 is explicit that `PanelProps` stays `{ selection }` and that a
// panel needing more state "manages it itself instead of requiring the
// registry's caller to know what every registered panel needs" —
// DefaultVisibilityPanel does exactly that with `useOverlayState()`. The play
// model cannot use that trick directly, because unlike overlay prefs the
// scene is not a module-level singleton: `Whiteboard` and `Designer` each
// create their own store.
//
// So: context, provided by whichever shell is rendering the panel. That keeps
// `panelRegistry`'s type untouched (no per-panel props leaking into the
// registry seam), keeps both shells on the SAME seam (ADR-14), and adds no
// per-kind branching to any layout file — the two shells each gain one
// provider wrapper, not knowledge of what any particular panel needs.
//
// Nullable rather than throwing: a panel rendered outside a provider (a unit
// test rendering it in isolation) falls back to its own empty state, which
// every panel here has to have anyway for the no-selection / loose-disc case.

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { SceneStore } from "../../scene/store";

const SceneStoreContext = createContext<SceneStore | null>(null);

export function SceneStoreProvider({
  store,
  children,
}: {
  store: SceneStore;
  children: ReactNode;
}) {
  return <SceneStoreContext.Provider value={store}>{children}</SceneStoreContext.Provider>;
}

export function useSceneStore(): SceneStore | null {
  return useContext(SceneStoreContext);
}
