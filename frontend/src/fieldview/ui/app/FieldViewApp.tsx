// The layout route for every /fieldview/* mode page (ADR-29/31). It is a
// SIBLING of the encyclopedia Layout, not a child: Field View is a
// full-viewport app, and the site header appears only in its desktop frame.
//
// It owns the things that must exist exactly once however the mode pages come
// and go (the ADR-15 lesson): the SceneStore, the single MotionDriver
// (ADR-26), and the identity list the canvas renders. Mode pages configure the
// store (an Explore setup, a Watch frame) through `loadScene`; switching mode
// keeps the store alive and the new page loads its own scene.

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { createSceneStore } from "../../scene/store";
import type { SceneStore } from "../../scene/store";
import type { Scene } from "../../scene/types";
import { CURATED_SETUPS, getPreset } from "../../scene/presets";
import type { PieceIdentity } from "../../render/pieceLayer";
import { MotionDriverProvider } from "../motion/driverContext";
import { SceneStoreProvider } from "../shell/sceneStore";

export function identityOf(scene: Scene): PieceIdentity[] {
  return scene.players.map((p) => ({ id: p.id, team: p.team, role: p.role, label: p.label }));
}

interface FieldViewAppValue {
  store: SceneStore;
  identity: PieceIdentity[];
  // Replaces the whole scene (players, possession, matchups) and the identity
  // list the canvas renders. A discrete, human-speed event — never per frame.
  loadScene: (scene: Scene) => void;
}

const FieldViewAppContext = createContext<FieldViewAppValue | null>(null);

export function useFieldViewApp(): FieldViewAppValue {
  const value = useContext(FieldViewAppContext);
  if (!value) throw new Error("useFieldViewApp must be used under <FieldViewApp>");
  return value;
}

// The setup the app opens on until a mode page loads its own: the first
// curated setup. PLACEHOLDER(fieldview-ui-rework): whichever setup the Builder
// puts first (docs/fieldview-placeholders.md #1).
const OPENING_PRESET = CURATED_SETUPS[0].name;

export function FieldViewApp() {
  const storeRef = useRef<SceneStore | null>(null);
  if (storeRef.current === null) storeRef.current = createSceneStore(getPreset(OPENING_PRESET));
  const store = storeRef.current;

  const [identity, setIdentity] = useState<PieceIdentity[]>(() => identityOf(store.getScene()));

  const loadScene = useCallback(
    (scene: Scene) => {
      store.mutate((draft) => {
        draft.players = scene.players.map((p) => ({ ...p, pos: { ...p.pos } }));
        // Loading replaces the whole play: possession and matchups travel with
        // it, or they would point into a roster that no longer exists.
        draft.possession = scene.possession;
        draft.matchups = { ...scene.matchups };
      });
      setIdentity(identityOf(scene));
    },
    [store],
  );

  const value = useMemo(() => ({ store, identity, loadScene }), [store, identity, loadScene]);

  return (
    <HelmetProvider>
      <FieldViewAppContext.Provider value={value}>
        <SceneStoreProvider store={store}>
          <MotionDriverProvider store={store}>
            <Outlet />
          </MotionDriverProvider>
        </SceneStoreProvider>
      </FieldViewAppContext.Provider>
    </HelmetProvider>
  );
}
