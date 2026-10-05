// /fieldview/build — the play designer. A play is a list of frames; the field
// shows the selected frame and Explore's drag engine edits it. Each finished
// gesture becomes one placement (and one undo step) in the document; players
// not placed in a frame inherit from the one before. All animation is automatic
// (the same transitions as Watch).
//
// The document lives in a BuildSession; the SceneStore is only a view of the
// current frame (ADR-40). Nothing here runs per pointer move.

import { useEffect, useMemo, useState } from "react";
import { Seo } from "../../encyclopedia/seo/Seo";
import { addFrame, deleteFrame, duplicateFrame, newPlay, placedIds, resetFrame } from "../play/model";
import { FieldViewFrame } from "../ui/app/FieldViewFrame";
import { useFieldViewApp } from "../ui/app/FieldViewApp";
import { BuildPlayerCard, FrameCard, PlayMeta, PreviewCard } from "../ui/build/cards";
import { BTN, BTN_PRIMARY, FrameChip, SavePill, UndoRedo } from "../ui/build/controls";
import { FrameStrip } from "../ui/build/FrameStrip";
import { GhostLayer } from "../ui/build/GhostLayer";
import { useBuildSession } from "../ui/build/useBuildSession";
import { usePlayback } from "../ui/playback/usePlayback";

// While a preview runs, editing is switched off. `inert` removes the subtree
// from the tab order and from pointer input in one attribute.
const inertWhen = (on: boolean) => (on ? ({ inert: "" } as Record<string, string>) : {});

export function Build() {
  const { store, loadScene } = useFieldViewApp();
  const view = useBuildSession(store, loadScene, newPlay);
  const { session, play, frameIndex } = view;
  const playback = usePlayback(store, play);
  const { controller } = playback;
  const [previewing, setPreviewing] = useState(false);

  const placed = useMemo(() => new Set(placedIds(play, frameIndex)), [play, frameIndex]);

  const startPreview = (from: number) => {
    setPreviewing(true);
    controller.goto(from);
    controller.play();
  };
  const stopPreview = () => {
    controller.pause();
    setPreviewing(false);
    session.resync();
  };
  // The preview ends by itself at the last frame; the field then returns to the
  // frame being edited.
  useEffect(() => {
    if (previewing && playback.status !== "playing") {
      setPreviewing(false);
      session.resync();
    }
  }, [previewing, playback.status, session]);

  // Undo / redo from the keyboard, except while typing in a field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      if (previewing) return;
      if (e.shiftKey) session.redo();
      else session.undo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session, previewing]);

  const label = play.frames[frameIndex]?.label;
  const history = (
    <UndoRedo canUndo={view.canUndo && !previewing} canRedo={view.canRedo && !previewing} onUndo={() => session.undo()} onRedo={() => session.redo()} />
  );

  const strip = (
    <div {...inertWhen(previewing)}>
      <FrameStrip
        play={play}
        version={view.version}
        frameIndex={frameIndex}
        onSelect={(i) => session.selectFrame(i)}
        onAdd={() => {
          session.apply((p, i) => addFrame(p, i), { sync: false });
          session.selectFrame(frameIndex + 1);
        }}
        onDelete={(i) => {
          session.selectFrame(i);
          session.apply((p, at) => deleteFrame(p, at));
        }}
      />
    </div>
  );

  const playerCard = (bar: boolean) => (
    <div {...inertWhen(previewing)}>
      <BuildPlayerCard store={store} play={play} frameIndex={frameIndex} session={session} bar={bar} />
    </div>
  );

  return (
    <>
      <Seo
        title="Build — Field View — Ultipedia"
        description="Build an ultimate play frame by frame and show it on a phone."
      />
      <FieldViewFrame
        mode="build"
        fieldDisabled={previewing}
        fieldOverlay={previewing ? null : <GhostLayer play={play} frameIndex={frameIndex} />}
        fieldPlaced={previewing ? undefined : placed}
        onFieldGestureEnd={({ movedIds }) => session.commitGesture(movedIds)}
        barCenter={
          <FrameChip
            index={frameIndex}
            count={play.frames.length}
            label={label}
            onPrev={() => session.selectFrame(frameIndex - 1)}
            onNext={() => session.selectFrame(frameIndex + 1)}
          />
        }
        barRight={history}
        barDesktop={
          <>
            {history}
            <SavePill status={view.save} />
          </>
        }
        menuExtras={
          <>
            <p className="px-4 pb-2 pt-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">Play</p>
            <PlayMeta play={play} session={session} />
          </>
        }
        sidebar={
          <div className="flex min-h-full flex-col">
            <section aria-label="Play" className="border-b border-film-border">
              <h2 className="px-4 pb-2 pt-4 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">Play</h2>
              <PlayMeta play={play} session={session} />
            </section>
          </div>
        }
        dock={
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div {...inertWhen(previewing)}>
                <FrameCard play={play} frameIndex={frameIndex} session={session} />
              </div>
              {playerCard(false)}
              <PreviewCard
                frameIndex={frameIndex}
                frameCount={play.frames.length}
                previewing={previewing}
                onPlayAll={() => startPreview(0)}
                onFromHere={() => startPreview(frameIndex)}
                onStop={stopPreview}
              />
            </div>
            {strip}
          </div>
        }
        compactDock={
          <div className="flex flex-col gap-2 px-1">
            {strip}
            <div className="flex flex-wrap gap-2" {...inertWhen(previewing)}>
              <button type="button" className={BTN} disabled={play.frames.length >= 30} onClick={() => { session.apply((p, i) => addFrame(p, i), { sync: false }); session.selectFrame(frameIndex + 1); }}>
                Add frame
              </button>
              <button type="button" className={BTN} onClick={() => session.apply((p, i) => duplicateFrame(p, i))}>
                Duplicate
              </button>
              <button type="button" className={BTN} disabled={play.frames.length <= 1} onClick={() => session.apply((p, i) => deleteFrame(p, i))}>
                Delete
              </button>
              <button type="button" className={BTN} disabled={frameIndex === 0} onClick={() => session.apply((p, i) => resetFrame(p, i))}>
                Reset frame
              </button>
            </div>
            <div className="flex">
              {previewing ? (
                <button type="button" className={`${BTN_PRIMARY} ml-auto`} onClick={stopPreview}>
                  Stop
                </button>
              ) : (
                <button type="button" className={`${BTN_PRIMARY} ml-auto`} disabled={play.frames.length < 2} onClick={() => startPreview(frameIndex)}>
                  Preview
                </button>
              )}
            </div>
            {playerCard(true)}
          </div>
        }
      />
    </>
  );
}
