// /fieldview/explore — drag players, watch the space shift (the MVP's hero).
//
// Setups come from CURATED_SETUPS (toy content for now — placeholders
// register #1/#2). Switching a setup replaces the scene at once; ✎ marks a
// scene that has drifted from its setup and Reset restores it. "Defense
// follows" is a persisted STUB: the switch works, the following does not yet
// (behaviour deferred, ADR-33 reserved) — and it says so.

import { useCallback, useEffect, useRef, useState } from "react";
import { Seo } from "../../encyclopedia/seo/Seo";
import { CURATED_SETUPS, getPreset } from "../scene/presets";
import type { Scene } from "../scene/types";
import { clearSelection } from "../scene/selection";
import { FieldViewFrame } from "../ui/app/FieldViewFrame";
import { useFieldViewApp } from "../ui/app/FieldViewApp";
import { SetupSlideOver } from "../ui/app/SetupSlideOver";
import { SetupChip } from "../ui/content/SetupChip";
import { SetupList } from "../ui/content/SetupList";
import { SelectedPlayerCard } from "../ui/content/SelectedPlayerCard";
import { Switch } from "../ui/content/Switch";
import { useSceneChanged } from "../ui/content/useSceneChanged";
import { useOverlayState } from "../ui/prefs";

function cloneScene(scene: Scene): Scene {
  return {
    ...scene,
    players: scene.players.map((p) => ({ ...p, pos: { ...p.pos } })),
    matchups: { ...scene.matchups },
  };
}

export function Explore() {
  const { store, loadScene } = useFieldViewApp();
  const overlay = useOverlayState();
  const [index, setIndex] = useState(0);
  const [loadCount, setLoadCount] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const baselineRef = useRef<Scene | null>(null);

  const applySetup = useCallback(
    (i: number) => {
      const scene = getPreset(CURATED_SETUPS[i].name);
      baselineRef.current = cloneScene(scene);
      loadScene(scene);
      store.setSelection(clearSelection());
      setIndex(i);
      setLoadCount((n) => n + 1);
    },
    [loadScene, store],
  );

  // Entering Explore always starts from the first setup: the shared store may
  // be holding a Watch frame.
  useEffect(() => {
    applySetup(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const custom = useSceneChanged(store, baselineRef, loadCount);
  const count = CURATED_SETUPS.length;
  const step = (delta: number) => applySetup((index + delta + count) % count);
  const reset = () => applySetup(index);
  const current = CURATED_SETUPS[index];

  const defenseFollows = (
    <Switch
      checked={overlay.defenseFollows}
      onChange={overlay.setDefenseFollows}
      // PLACEHOLDER(fieldview-ui-rework): label/hint wording (#9). The toggle is a
      // stub (#18) — it persists the pref only; nothing reads it yet.
      hint="Coming soon"
    >
      Defense follows
    </Switch>
  );

  return (
    <>
      {/* PLACEHOLDER(fieldview-ui-rework): title/description are stand-ins (#11). */}
      <Seo
        title="Explore — Field View — Ultipedia"
        description="Drag players around an ultimate field and watch the space shift."
      />
      <FieldViewFrame
        mode="explore"
        barCenter={
          <SetupChip
            label={current.label}
            custom={custom}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
            onOpen={() => setListOpen(true)}
          />
        }
        barRight={
          <button
            type="button"
            aria-label="Reset setup"
            onClick={reset}
            className="grid h-10 w-10 place-items-center border border-film-border bg-white text-zinc-800 hover:bg-film-panel"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="square"
            >
              <path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5" />
            </svg>
          </button>
        }
        menuExtras={
          <>
            <p className="px-4 pb-1 pt-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Explore options
            </p>
            {defenseFollows}
          </>
        }
        sidebar={
          <div className="flex min-h-full flex-col">
            <section aria-label="Setup" className="border-b border-film-border">
              <h2 className="flex justify-between px-4 pb-2 pt-4 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Setup <span>{count}</span>
              </h2>
              <SetupList
                setups={CURATED_SETUPS}
                activeIndex={index}
                custom={custom}
                onSelect={applySetup}
              />
            </section>
            <section aria-label="Options" className="border-b border-film-border py-1">
              <h2 className="px-4 pb-1 pt-3 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Options
              </h2>
              {defenseFollows}
            </section>
            <div className="mt-auto border-t border-film-border bg-white p-4">
              <button
                type="button"
                onClick={reset}
                className="w-full border border-film-border bg-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider hover:bg-film-panel"
              >
                Reset setup
              </button>
            </div>
          </div>
        }
        dock={<SelectedPlayerCard store={store} baselineRef={baselineRef} />}
      />
      <SetupSlideOver
        open={listOpen}
        onClose={() => setListOpen(false)}
        setups={CURATED_SETUPS}
        activeIndex={index}
        custom={custom}
        onSelect={applySetup}
      />
    </>
  );
}
