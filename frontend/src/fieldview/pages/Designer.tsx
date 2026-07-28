// /field-view/designer — Mode 2: the keyframed play designer.
//
// Keyframes live in a ref, not in state (ADR-2's reasoning extended to this
// mode): while a keyframe is selected, every dragged frame writes the live
// scene into that keyframe's positions, and re-rendering the timeline 60
// times a second to show a number that did not change would be pure waste.
// React state carries only structural changes — how many chips exist, which
// is selected, where the playhead is.

import { useEffect, useMemo, useRef, useState } from "react";
import { createSceneStore } from "../scene/store";
import { getPreset } from "../scene/presets";
import type { Scene } from "../scene/types";
import type { PlayEntity, PlayKeyframe } from "../play/format";
import { FilePlayStore, entitiesOf, fromPlayFile, keyframeOf, toPlayFile } from "../play/serialize";
import { PlayValidationError } from "../play/validate";
import { samplePositions, sceneFrom } from "../play/tween";
import { takeScene } from "../play/modeHandoff";
import { DEFAULT_KEYFRAME_GAP, Timeline } from "../ui/Timeline";
import { PlayMeta } from "../ui/PlayMeta";
import { FieldCanvas } from "../ui/FieldCanvas";
import { OverlayRail } from "../ui/OverlayRail";
import { CellReadout } from "../ui/CellReadout";
import type { CellReadoutHandle } from "../ui/CellReadout";
import { useOverlayState } from "../ui/prefs";
import { SmallScreenNotice } from "../ui/SmallScreenNotice";

const UNDO_WINDOW_MS = 5000;
// Timestamps are compared with a tolerance because scrubbing produces
// floats: landing "on" a keyframe must select it rather than read as
// between-keyframes by a rounding hair.
const T_EPSILON = 1e-6;

function cloneScene(scene: Scene): Scene {
  return { players: scene.players.map((p) => ({ ...p, pos: { ...p.pos } })) };
}

export function Designer() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const readoutRef = useRef<CellReadoutHandle | null>(null);
  const overlay = useOverlayState();

  // The whiteboard scene if the user switched modes; otherwise the default
  // preset, so a direct link to /field-view/designer still works.
  const initialScene = useMemo(() => takeScene() ?? getPreset("vertStackForceSide"), []);

  const storeRef = useRef(createSceneStore(cloneScene(initialScene)));
  const store = storeRef.current;

  const [entities, setEntities] = useState<PlayEntity[]>(() => entitiesOf(initialScene));
  const keyframesRef = useRef<PlayKeyframe[]>([keyframeOf(initialScene, 0)]);

  const [keyframeCount, setKeyframeCount] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [name, setName] = useState("Untitled play");
  const [description, setDescription] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  // Undo restores the whole keyframe list rather than re-inserting the
  // deleted chip: deleting the origin rebases every timestamp, so the removed
  // keyframe's `t` alone is no longer meaningful afterwards.
  const [undoState, setUndoState] = useState<{ keyframes: PlayKeyframe[]; selected: number; timer: number } | null>(
    null,
  );

  const selectedRef = useRef<number | null>(0);
  const playingRef = useRef(false);
  selectedRef.current = selectedIndex;
  playingRef.current = playing;

  // A structural change (added/deleted/retimed chip) is the only thing that
  // needs to reach React.
  function syncStructure() {
    setKeyframeCount(keyframesRef.current.length);
  }

  // Capture the live scene into the selected keyframe on every coalesced
  // frame. This is what makes "select a chip, drag a piece, the keyframe
  // updates in place" true without a save step.
  useEffect(
    () =>
      store.onFrame(() => {
        const index = selectedRef.current;
        if (index === null || playingRef.current) return;
        const keyframe = keyframesRef.current[index];
        if (!keyframe) return;
        keyframe.positions = keyframeOf(store.getScene(), keyframe.t).positions;
      }),
    [store],
  );

  // The selected keyframe is normally captured on the next coalesced frame.
  // Anything that reads the keyframes synchronously (export) must flush
  // first, or a drag finished in the same tick is silently lost.
  function commitSelected() {
    const index = selectedRef.current;
    if (index === null || playingRef.current) return;
    const keyframe = keyframesRef.current[index];
    if (!keyframe) return;
    keyframe.positions = keyframeOf(store.getScene(), keyframe.t).positions;
  }

  function applyPositions(positions: Record<string, { x: number; y: number }>) {
    store.mutate((draft) => {
      for (const player of draft.players) {
        const pos = positions[player.id];
        if (pos) player.pos = { x: pos.x, y: pos.y };
      }
    });
  }

  function indexAt(t: number): number | null {
    const found = keyframesRef.current.findIndex((kf) => Math.abs(kf.t - t) < T_EPSILON);
    return found === -1 ? null : found;
  }

  function scrubTo(t: number) {
    setPlaying(false);
    setPlayhead(t);
    applyPositions(samplePositions(keyframesRef.current, t));
    setSelectedIndex(indexAt(t));
  }

  function selectKeyframe(index: number) {
    const keyframe = keyframesRef.current[index];
    if (!keyframe) return;
    setPlaying(false);
    setSelectedIndex(index);
    setPlayhead(keyframe.t);
    applyPositions(keyframe.positions);
  }

  function insertKeyframe(keyframe: PlayKeyframe) {
    const next = [...keyframesRef.current, keyframe].sort((a, b) => a.t - b.t);
    keyframesRef.current = next;
    syncStructure();
    setSelectedIndex(next.indexOf(keyframe));
    setPlayhead(keyframe.t);
  }

  function addKeyframe() {
    setPlaying(false);
    const last = keyframesRef.current[keyframesRef.current.length - 1];
    insertKeyframe(keyframeOf(store.getScene(), last.t + DEFAULT_KEYFRAME_GAP));
  }

  // The scene on screen while scrubbed between keyframes *is* the
  // interpolated pose, so capturing the store is capturing the interpolation.
  function insertAtPlayhead() {
    if (indexAt(playhead) !== null) return;
    insertKeyframe(keyframeOf(store.getScene(), playhead));
  }

  function deleteKeyframe(index: number) {
    if (keyframesRef.current.length <= 1) return;
    const before = keyframesRef.current.map((kf) => ({ t: kf.t, positions: { ...kf.positions } }));
    const remaining = [...keyframesRef.current];
    remaining.splice(index, 1);

    // Deleting the origin would leave a play that starts at, say, 1.5s and
    // can never be retimed back to 0 (keyframe 1 is pinned). Rebase instead,
    // so the play always starts at 0.0s and every gap is preserved.
    const shift = remaining[0].t;
    if (shift !== 0) for (const kf of remaining) kf.t -= shift;

    keyframesRef.current = remaining;
    syncStructure();
    setPlaying(false);

    selectKeyframe(Math.min(index, remaining.length - 1));

    if (undoState) window.clearTimeout(undoState.timer);
    const timer = window.setTimeout(() => setUndoState(null), UNDO_WINDOW_MS);
    setUndoState({ keyframes: before, selected: index, timer });
  }

  function undoDelete() {
    if (!undoState) return;
    window.clearTimeout(undoState.timer);
    keyframesRef.current = undoState.keyframes;
    syncStructure();
    setUndoState(null);
    selectKeyframe(undoState.selected);
  }

  function retimeKeyframe(index: number, t: number) {
    // Keyframe 1 is the play's origin; the Timeline blocks retiming it and
    // this is the second half of that guarantee.
    if (index === 0) return;
    const keyframe = keyframesRef.current[index];
    if (!keyframe) return;
    const clamped = Math.max(0, t);
    if (keyframesRef.current.some((kf, i) => i !== index && Math.abs(kf.t - clamped) < T_EPSILON)) {
      return;
    }
    keyframe.t = clamped;
    keyframesRef.current = [...keyframesRef.current].sort((a, b) => a.t - b.t);
    syncStructure();
    setSelectedIndex(keyframesRef.current.indexOf(keyframe));
    setPlayhead(clamped);
  }

  // Transport: one rAF loop advancing wall-clock time. Piece motion goes
  // through the store (imperative), so the per-frame React work is the
  // playhead readout only.
  useEffect(() => {
    if (!playing) return;
    const keyframes = keyframesRef.current;
    const duration = keyframes[keyframes.length - 1].t;
    const startWall = performance.now();
    const startT = playhead >= duration ? 0 : playhead;
    let raf = 0;

    function step(now: number) {
      const t = startT + (now - startWall) / 1000;
      if (t >= duration) {
        setPlayhead(duration);
        applyPositions(samplePositions(keyframesRef.current, duration));
        setSelectedIndex(indexAt(duration));
        setPlaying(false);
        return;
      }
      setPlayhead(t);
      applyPositions(samplePositions(keyframesRef.current, t));
      raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // playhead is read once at start; depending on it would restart the
    // loop every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  function togglePlay() {
    if (keyframesRef.current.length < 2) return;
    setSelectedIndex(null);
    setPlaying((p) => !p);
  }

  function exportPlay() {
    commitSelected();
    const play = toPlayFile({
      name: name.trim() || "Untitled play",
      description: description.trim() || undefined,
      entities,
      keyframes: keyframesRef.current,
    });
    void new FilePlayStore().save(play);
  }

  async function importPlay(file: File) {
    setImportError(null);
    try {
      // Nothing below this line runs unless validation returned clean, so a
      // rejected import leaves the current scene exactly as it was (ADR-7).
      const play = await new FilePlayStore().loadFromFile(file);
      const draft = fromPlayFile(play);

      keyframesRef.current = draft.keyframes;
      setEntities(draft.entities);
      setName(draft.name);
      setDescription(draft.description ?? "");
      syncStructure();

      const scene = sceneFrom(draft.entities, draft.keyframes[0].positions);
      store.mutate((s) => {
        s.players = scene.players;
      });
      setSelectedIndex(0);
      setPlayhead(draft.keyframes[0].t);
      setPlaying(false);
      setNotice(`Loaded ${draft.name}`);
    } catch (error) {
      setImportError(
        error instanceof PlayValidationError ? error.message : "This file isn't a Field View play.",
      );
    }
  }

  const editable = selectedIndex !== null && !playing;
  const keyframes = keyframesRef.current.slice(0, keyframeCount);

  return (
    <>
      <SmallScreenNotice />
      <div className="mx-auto hidden max-w-[1600px] flex-col items-center gap-6 px-4 py-10 md:flex">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-widest text-zinc-900">
          Field View — Designer
        </h1>

        <PlayMeta
          name={name}
          description={description}
          onNameChange={setName}
          onDescriptionChange={setDescription}
          onExport={exportPlay}
          onImportFile={(file) => void importPlay(file)}
        />

        {notice && (
          <div role="status" className="w-full border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm text-zinc-700">
            {notice}
          </div>
        )}

        {importError && (
          <div role="alert" className="w-full border border-film-accentPink bg-white px-4 py-2 text-sm text-zinc-800">
            {importError}
          </div>
        )}

        {undoState && (
          <div role="status" className="w-full border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm text-zinc-700">
            Keyframe deleted.{" "}
            <button
              type="button"
              onClick={undoDelete}
              className="font-mono text-xs uppercase text-film-accentPink underline"
            >
              Undo
            </button>
          </div>
        )}

        {/* Same split as the whiteboard; the timeline stays full-width along
            the bottom at every breakpoint, since it is the play's spine. */}
        <div className="flex w-full flex-col items-center gap-6 xl:flex-row xl:items-start">
          <FieldCanvas
            store={store}
            players={entities}
            svgRef={svgRef}
            overlay={overlay}
            readoutRef={readoutRef}
            disabled={!editable}
          />

          <div className="flex w-full flex-col gap-4 xl:w-80 xl:shrink-0">
            <OverlayRail
              on={overlay.on}
              lens={overlay.lens}
              layers={overlay.layers}
              params={overlay.params}
              tuningExpanded={overlay.tuningExpanded}
              onToggle={overlay.setOn}
              onLensChange={overlay.setLens}
              onLayerChange={overlay.setLayer}
              onParamChange={overlay.setParam}
              onTuningExpandedChange={overlay.setTuningExpanded}
              onResetParams={overlay.resetParams}
            />
            <CellReadout ref={readoutRef} />
          </div>
        </div>

        <Timeline
          keyframes={keyframes}
          selectedIndex={selectedIndex}
          playhead={playhead}
          playing={playing}
          onSelect={selectKeyframe}
          onAdd={addKeyframe}
          onDelete={deleteKeyframe}
          onRetime={retimeKeyframe}
          onScrub={scrubTo}
          onTogglePlay={togglePlay}
          onInsertAtPlayhead={insertAtPlayhead}
        />
      </div>
    </>
  );
}
