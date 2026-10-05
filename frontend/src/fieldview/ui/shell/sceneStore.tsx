// How a component below the page reaches the SceneStore.
//
// Unlike overlay prefs, the scene is not a module-level singleton — each page
// creates its own store — so it travels by context, provided by whichever page
// owns it.
//
// Nullable rather than throwing: a consumer rendered outside a provider (a unit
// test rendering it in isolation) falls back to its own empty state.

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
