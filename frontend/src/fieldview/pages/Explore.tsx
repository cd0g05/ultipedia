// /fieldview/explore — drag players, watch the space shift (the MVP's hero).
//
// Setups are the built-in one-frame plays (toy content for now — placeholders
// register #1/#2). Switching a setup replaces the scene at once; ✎ marks a
// scene that has drifted from its setup and Reset restores it. "Defense
// follows" is a persisted STUB: the switch works, the following does not yet
// (behaviour deferred, ADR-33 reserved) — and it says so.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Seo } from "../../encyclopedia/seo/Seo";
import { BUILTIN_SETUPS, isSetup } from "../play/plays";
import { useLibrary } from "../play/library";
import type { Play } from "../play/format";
import { toScene } from "../play/model";
import type { SetupItem } from "../ui/content/SetupList";
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

// The list rows: a setup's name and its one-line takeaway (its description).
function itemsOf(plays: readonly Play[]): SetupItem[] {
  return plays.map((p, i) => ({ id: `${i}-${p.name}`, label: p.name, takeaway: p.description ?? "" }));
}

export function Explore() {
  const { store, loadScene } = useFieldViewApp();
  const overlay = useOverlayState();
  // The built-in setups, then the one-frame plays saved on this device.
  const entries = useLibrary();
  const setupPlays = useMemo<readonly Play[]>(
    () => [...BUILTIN_SETUPS, ...entries.map((e) => e.play).filter(isSetup)],
    [entries],
  );
  const SETUPS = useMemo(() => itemsOf(setupPlays), [setupPlays]);
  const [index, setIndex] = useState(0);
  const [loadCount, setLoadCount] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const baselineRef = useRef<Scene | null>(null);

  const applySetup = useCallback(
    (i: number) => {
      const scene = toScene(setupPlays[Math.min(i, setupPlays.length - 1)], 0);
      baselineRef.current = cloneScene(scene);
      loadScene(scene);
      store.setSelection(clearSelection());
      setIndex(i);
      setLoadCount((n) => n + 1);
    },
    [loadScene, store, setupPlays],
  );

  // Entering Explore always starts from the first setup: the shared store may
  // be holding a Watch frame.
  useEffect(() => {
    applySetup(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const custom = useSceneChanged(store, baselineRef, loadCount);
  const count = SETUPS.length;
  const step = (delta: number) => applySetup((index + delta + count) % count);
  const reset = () => applySetup(index);
  const current = SETUPS[index];

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
                setups={SETUPS}
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
        // Always on screen under the field (greyed out until a player is
        // selected); on compact layouts it is pinned to the bottom of the screen.
        panel={
          <div className="sticky bottom-0 z-10 mt-2 w-full shrink-0 bg-film-panel pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 desktop:static desktop:mt-4 desktop:pb-0 desktop:pt-0">
            <SelectedPlayerCard store={store} baselineRef={baselineRef} />
          </div>
        }
      />
      <SetupSlideOver
        open={listOpen}
        onClose={() => setListOpen(false)}
        setups={SETUPS}
        activeIndex={index}
        custom={custom}
        onSelect={applySetup}
      />
    </>
  );
}
