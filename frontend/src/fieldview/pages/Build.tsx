// /fieldview/build — the play designer. A play is a list of frames; the field
// shows the selected frame and Explore's drag engine edits it. Each finished
// gesture becomes one placement (and one undo step) in the document; players
// not placed in a frame inherit from the one before. All animation is automatic
// (the same transitions as Watch).
//
// The document lives in a BuildSession; the SceneStore is only a view of the
// current frame (ADR-40). Nothing here runs per pointer move.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Seo } from "../../encyclopedia/seo/Seo";
import type { Play } from "../play/format";
import { library, newPlayId, useLibrary } from "../play/library";
import { addFrame, deleteFrame, newPlay, placedIds, renamePlay } from "../play/model";
import { BUILTIN_PLAYS, BUILTIN_SETUPS } from "../play/plays";
import { playFromFileText } from "../play/share";
import { PlayValidationError } from "../play/validate";
import { FieldViewFrame } from "../ui/app/FieldViewFrame";
import { useFieldViewApp } from "../ui/app/FieldViewApp";
import { BuildPlayerCard, FrameBar, PlayMeta } from "../ui/build/cards";
import { BTN_PRIMARY, FrameChip, SavePill, UndoRedo } from "../ui/build/controls";
import { FrameStrip } from "../ui/build/FrameStrip";
import { LibraryList } from "../ui/build/LibraryList";
import { ShareDialog } from "../ui/build/ShareDialog";
import { GhostLayer } from "../ui/build/GhostLayer";
import { useBuildSession } from "../ui/build/useBuildSession";
import { usePlayback } from "../ui/playback/usePlayback";

// While a preview runs, editing is switched off. `inert` removes the subtree
// from the tab order and from pointer input in one attribute.
const inertWhen = (on: boolean) => (on ? ({ inert: "" } as Record<string, string>) : {});

const SAVE_DELAY_MS = 500;

// FileReader rather than File.text(): the same result, older browsers included.
function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsText(file);
  });
}
const EXAMPLES: readonly Play[] = [...BUILTIN_PLAYS, ...BUILTIN_SETUPS];

export function Build() {
  const { store, loadScene } = useFieldViewApp();
  const { playId } = useParams();
  const navigate = useNavigate();
  const entries = useLibrary();

  // The id of the play in the session: null until it has been saved once.
  const currentIdRef = useRef<string | null>(playId && library.get(playId) ? playId : null);
  const view = useBuildSession(
    store,
    loadScene,
    () => (currentIdRef.current ? library.get(currentIdRef.current)!.play : newPlay()),
    currentIdRef.current ? "saved" : "new",
  );
  const { session, play, frameIndex } = view;
  const playback = usePlayback(store, play);
  const { controller } = playback;
  const [previewing, setPreviewing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [notice, setNotice] = useState<{ text: string; undo?: () => void } | null>(null);

  // ── autosave ────────────────────────────────────────────────────────────────

  const pendingRef = useRef<{ timer: number; play: Play } | null>(null);
  // Writes the last edit now. `address` gives a first-saved play its URL; it is
  // off when the caller is about to navigate somewhere else itself.
  const flush = useCallback(
    (address = true) => {
    const pending = pendingRef.current;
    if (!pending) return;
    window.clearTimeout(pending.timer);
    pendingRef.current = null;
    const isNew = currentIdRef.current === null;
    const id = currentIdRef.current ?? newPlayId();
    const result = library.save(id, pending.play);
    currentIdRef.current = id;
    session.setSaveStatus(result.ok ? "saved" : "error");
    // A play's first save gives it its address, without reloading anything.
    if (isNew && address) navigate(`/fieldview/build/${id}`, { replace: true });
    },
    [session, navigate],
  );

  useEffect(() => {
    const off = session.subscribeDocument((next) => {
      if (pendingRef.current) window.clearTimeout(pendingRef.current.timer);
      session.setSaveStatus("saving");
      pendingRef.current = { play: next, timer: window.setTimeout(() => flush(), SAVE_DELAY_MS) };
    });
    return () => {
      off();
      flush(false); // leaving Build must not lose the last edit (and must not navigate back)
    };
  }, [session, flush]);

  // ── library: open, new, duplicate, delete ───────────────────────────────────

  // The address is the source of truth for WHICH play is open: handlers only
  // navigate, and this effect loads whatever the address names when it is not
  // the play already in the session. (A render that still shows the old address
  // while the router catches up with our own navigation finds the session
  // already holding that play and does nothing.)
  const loadFresh = useCallback(() => {
    flush(false); // the play being left keeps its last edit
    currentIdRef.current = null;
    session.loadPlay(newPlay());
    session.setSaveStatus("new");
  }, [session, flush]);

  useEffect(() => {
    if (playId === (currentIdRef.current ?? undefined)) return;
    if (playId === undefined) {
      loadFresh();
      return;
    }
    const entry = library.get(playId);
    if (!entry) {
      navigate("/fieldview/build", { replace: true });
      return;
    }
    flush(false);
    currentIdRef.current = playId;
    session.loadPlay(entry.play);
  }, [playId, session, navigate, flush, loadFresh]);

  const startNew = useCallback(() => {
    // Already on an unsaved new play: the address will not change, so start over here.
    if (playId === undefined) loadFresh();
    else navigate("/fieldview/build");
  }, [playId, loadFresh, navigate]);

  const openCopy = useCallback(
    (source: Play, name?: string) => {
      flush(false);
      const id = newPlayId();
      library.save(id, name ? renamePlay(source, name) : source);
      navigate(`/fieldview/build/${id}`);
    },
    [navigate, flush],
  );

  // ── files ───────────────────────────────────────────────────────────────────

  const importFile = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const opened = playFromFileText(await readFileText(file));
        openCopy(opened);
        return null;
      } catch (error) {
        return error instanceof PlayValidationError ? error.message : "That file couldn't be read.";
      }
    },
    [openCopy],
  );

  const libraryPanel = (
    <LibraryList
      entries={entries}
      currentId={currentIdRef.current}
      examples={EXAMPLES}
      onNew={startNew}
      onOpen={(id) => {
        flush(false);
        navigate(`/fieldview/build/${id}`);
      }}
      onDuplicate={(id) => {
        const entry = library.get(id);
        if (entry) openCopy(entry.play, `${entry.play.name} copy`);
      }}
      onDelete={(id) => {
        const entry = library.get(id);
        if (!entry) return;
        if (id === currentIdRef.current && pendingRef.current) {
          // Its last edit must not write the play back after it is deleted.
          window.clearTimeout(pendingRef.current.timer);
          pendingRef.current = null;
        }
        library.remove(id);
        setNotice({ text: `Deleted “${entry.play.name}”.`, undo: () => library.restore(entry) });
        if (id === currentIdRef.current) startNew();
      }}
      onDuplicateExample={(example) => openCopy(example, example.frames.length === 1 ? example.name : `${example.name} copy`)}
    />
  );

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
  const shareButton = (
    <button type="button" className={BTN_PRIMARY} onClick={() => setShareOpen(true)}>
      Share
    </button>
  );
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
    <div className="h-full" {...inertWhen(previewing)}>
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
        barRight={
          <>
            {history}
            {shareButton}
          </>
        }
        barDesktop={
          <>
            {history}
            <SavePill status={view.save} />
            {shareButton}
          </>
        }
        menuExtras={
          <>
            <p className="px-4 pb-2 pt-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">Play</p>
            <PlayMeta play={play} session={session} />
            {libraryPanel}
          </>
        }
        sidebar={
          <div className="flex min-h-full flex-col">
            <section aria-label="Play" className="border-b border-film-border">
              <h2 className="px-4 pb-2 pt-4 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">Play</h2>
              <PlayMeta play={play} session={session} />
            </section>
            {libraryPanel}
          </div>
        }
        // Under the field on every layout. Compact: the frame strip and frame
        // row scroll with the page, the selected-player panel is pinned to the
        // bottom of the screen. Desktop: two thirds frames, one third the player.
        panel={
          <div className="contents desktop:mt-4 desktop:grid desktop:w-full desktop:grid-cols-3 desktop:items-stretch desktop:gap-4">
            <div className="mt-2 flex w-full min-w-0 shrink-0 flex-col gap-2 px-1 desktop:col-span-2 desktop:mt-0 desktop:px-0">
              {strip}
              <FrameBar
                play={play}
                frameIndex={frameIndex}
                session={session}
                previewing={previewing}
                onPlayAll={() => startPreview(0)}
                onFromHere={() => startPreview(frameIndex)}
                onStop={stopPreview}
              />
            </div>
            <div className="sticky bottom-0 z-10 mt-2 w-full min-w-0 shrink-0 bg-film-panel px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 desktop:static desktop:mt-0 desktop:px-0 desktop:pb-3 desktop:pt-0">
              {playerCard(false)}
            </div>
          </div>
        }
      />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} play={play} onImportFile={importFile} />
      {notice && (
        <div role="status" className="fixed bottom-4 left-1/2 z-[65] flex -translate-x-1/2 items-center gap-3 border border-film-border bg-white px-4 py-2 text-sm shadow">
          {notice.text}
          {notice.undo && (
            <button
              type="button"
              aria-label="Undo delete"
              className="font-mono text-xs font-bold uppercase text-film-accentPink underline"
              onClick={() => {
                notice.undo?.();
                setNotice(null);
              }}
            >
              Undo
            </button>
          )}
          <button type="button" aria-label="Dismiss" className="px-1 text-zinc-500" onClick={() => setNotice(null)}>
            ✕
          </button>
        </div>
      )}
    </>
  );
}
