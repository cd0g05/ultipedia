// /fieldview — Mode 1: the coaching whiteboard. Drag, presets, PNG export,
// and keyboard nudge in full (approach.md Partition 2), composed through the
// fieldview-shell three-pane desktop grid / mobile bottom sheet (Partition 6:
// Integration).

import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createSceneStore } from "../scene/store";
import { stashScene } from "../play/modeHandoff";
import { getPreset } from "../scene/presets";
import type { Scene } from "../scene/types";
import { createPresetRegistry } from "../scene/presetRegistry";
import { presetToScene } from "../scene/presetFormat";
import type { PresetFile } from "../scene/presetFormat";
import { exportFrameAsPng } from "../render/exportImage";
import { HEATMAP_ALPHA } from "../render/heatmap";
import { STAGE_MARGIN } from "../render/coords";
import { FIELD_PX_HEIGHT, FIELD_PX_WIDTH } from "../render/fieldLayer";
import { PresetMenu } from "../ui/PresetMenu";
import { FieldCanvas } from "../ui/FieldCanvas";
import { CellReadout } from "../ui/CellReadout";
import type { CellReadoutHandle } from "../ui/CellReadout";
import { useFullscreen } from "../ui/useFullscreen";
import { useOverlayState } from "../ui/prefs";
import { ShellLayout } from "../ui/shell/ShellLayout";

function identityOf(scene: Scene) {
  return scene.players.map((p) => ({ id: p.id, team: p.team, role: p.role, label: p.label }));
}

function cloneScene(scene: Scene): Scene {
  return {
    ...scene,
    players: scene.players.map((p) => ({ ...p, pos: { ...p.pos } })),
    matchups: { ...scene.matchups },
  };
}

function scenesEqual(a: Scene, b: Scene): boolean {
  if (a.players.length !== b.players.length) return false;
  return a.players.every((p) => {
    const other = b.players.find((q) => q.id === p.id);
    return other !== undefined && other.pos.x === p.pos.x && other.pos.y === p.pos.y;
  });
}

export function Whiteboard() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const readoutRef = useRef<CellReadoutHandle | null>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const presentation = useFullscreen(stageRef);
  const overlay = useOverlayState();
  const initialScene = useMemo(() => getPreset("vertStackForceSide"), []);
  const storeRef = useRef(createSceneStore(initialScene));
  const store = storeRef.current;

  const [identity, setIdentity] = useState(() => identityOf(initialScene));
  // A snapshot must never share object/array/pos references with the live
  // store — the store's players array is mutated in place by drag/nudge, so
  // any shared reference would "update" the snapshot too and make the
  // modified-scene check always false.
  const [lastLoadedSnapshot, setLastLoadedSnapshot] = useState<Scene>(() => cloneScene(initialScene));
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingLoad, setPendingLoad] = useState<PresetFile | null>(null);
  const [undoState, setUndoState] = useState<{ preset: PresetFile; timer: number } | null>(null);

  const registry = useMemo(() => createPresetRegistry((message) => setNotice(message)), []);
  const [presets, setPresets] = useState<PresetFile[]>(() => registry.list());

  function refreshPresets() {
    setPresets(registry.list());
  }

  function applyScene(scene: Scene, snapshot: Scene) {
    store.mutate((draft) => {
      draft.players = scene.players.map((p) => ({ ...p, pos: { ...p.pos } }));
    });
    setIdentity(identityOf(scene));
    setLastLoadedSnapshot(snapshot);
  }

  function requestLoad(preset: PresetFile) {
    const scene = presetToScene(preset);
    if (!scenesEqual(store.getScene(), lastLoadedSnapshot)) {
      setPendingLoad(preset);
    } else {
      applyScene(scene, scene);
    }
  }

  function confirmPendingLoad() {
    if (!pendingLoad) return;
    const scene = presetToScene(pendingLoad);
    applyScene(scene, scene);
    setPendingLoad(null);
  }

  function saveCurrent(name: string) {
    const scene = store.getScene();
    registry.save(name, scene);
    refreshPresets();
    setLastLoadedSnapshot(cloneScene(scene));
  }

  function renamePreset(id: string, name: string) {
    registry.rename(id, name);
    refreshPresets();
  }

  function deletePreset(id: string) {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    registry.remove(id);
    refreshPresets();
    const timer = window.setTimeout(() => setUndoState(null), 5000);
    setUndoState({ preset, timer });
  }

  function undoDelete() {
    if (!undoState) return;
    window.clearTimeout(undoState.timer);
    registry.restoreRemoved(undoState.preset);
    refreshPresets();
    setUndoState(null);
  }

  function exportPreset(id: string) {
    const preset = registry.export(id);
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${preset.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(file: File) {
    try {
      const text = await file.text();
      registry.importFile(JSON.parse(text));
      refreshPresets();
    } catch {
      setNotice("That file could not be imported — it isn't a valid preset.");
    }
  }

  function handleExportFrame() {
    if (!svgRef.current) return;
    // The exported PNG must match what is on screen — including the heatmap,
    // which lives on its own canvas beneath the SVG.
    const canvas = heatmapCanvasRef.current;
    const overlayLayer =
      overlay.on && canvas
        ? {
            canvas,
            x: STAGE_MARGIN.left,
            y: STAGE_MARGIN.top,
            width: FIELD_PX_WIDTH,
            height: FIELD_PX_HEIGHT,
            alpha: HEATMAP_ALPHA,
          }
        : undefined;
    void exportFrameAsPng(svgRef.current, "field-view.png", overlayLayer);
  }

  return (
    <>
      {/* PRD FR-6.2: no viewport width may block Field View from rendering.
          ShellLayout owns the desktop/mobile breakpoint switch below (CSS
          only, ADR-5) — nothing in this page gates the tool behind a
          viewport width. */}
      <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-6 px-4 py-10">
        <h1 className="font-heading text-2xl uppercase tracking-widest text-zinc-900">
          Field View
        </h1>

        {/* PresetMenu relocated into the shell's bottom-menu area (tasks.md
            id 62) — the header keeps only Present/Export/Designer, which are
            not selection- or panel-driven and have no natural shell slot. */}
        <div className="flex w-full flex-wrap items-center justify-end gap-4">
          <div className="flex items-center gap-3">
            {/* Present mode: the field alone, filling the screen, for showing
                a setup to a team in a huddle. Hidden where the browser has no
                Fullscreen API rather than offered and then failing. */}
            {presentation.supported && (
              <button
                type="button"
                onClick={presentation.toggle}
                className="border border-zinc-400 px-4 py-1.5 font-mono text-sm uppercase tracking-wider text-zinc-700 hover:border-film-accentPink hover:text-film-accentPink"
              >
                {presentation.active ? "Exit present" : "⛶ Present"}
              </button>
            )}
            <button
              type="button"
              onClick={handleExportFrame}
              className="border border-film-accentPink px-4 py-1.5 font-mono text-sm uppercase tracking-wider text-film-accentPink hover:bg-film-accentPink hover:text-white"
            >
              Export frame
            </button>
            {/* The current arrangement becomes keyframe 1 in Designer mode —
                stashed on the way out rather than pushed continuously, so the
                whiteboard stays free of designer concerns. */}
            <Link
              to="/fieldview/designer"
              onClick={() => stashScene(store.getScene())}
              className="border border-zinc-400 px-4 py-1.5 font-mono text-sm uppercase tracking-wider text-zinc-700 hover:border-film-accentPink hover:text-film-accentPink"
            >
              Designer
            </Link>
          </div>
        </div>

        {notice && (
          <div role="status" className="w-full border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm text-zinc-700">
            {notice}
          </div>
        )}

        {pendingLoad && (
          <div
            role="alertdialog"
            aria-label="Replace the current setup?"
            className="w-full border border-film-accentPink bg-white px-4 py-3"
          >
            <p className="text-sm text-zinc-800">Replace the current setup?</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={confirmPendingLoad}
                className="font-mono text-xs uppercase text-film-accentPink"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => setPendingLoad(null)}
                className="font-mono text-xs uppercase text-zinc-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {undoState && (
          <div role="status" className="w-full border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm text-zinc-700">
            Preset deleted.{" "}
            <button
              type="button"
              onClick={undoDelete}
              className="font-mono text-xs uppercase text-film-accentPink underline"
            >
              Undo
            </button>
          </div>
        )}

        <div className="w-full lg:h-[720px]">
          <ShellLayout
            store={store}
            presetMenu={
              <PresetMenu
                presets={presets}
                onLoad={requestLoad}
                onSaveCurrent={saveCurrent}
                onRename={renamePreset}
                onDelete={deletePreset}
                onExport={exportPreset}
                onImportFile={importFile}
              />
            }
          >
            <div className="flex w-full flex-col items-center gap-4 p-4">
              <FieldCanvas
                store={store}
                // Hidden teams are simply not rendered, which is also what keeps
                // them out of the PNG export and the tab order.
                players={identity.filter((p) => overlay.visible[p.team])}
                svgRef={svgRef}
                overlay={overlay}
                readoutRef={readoutRef}
                canvasRef={heatmapCanvasRef}
                stageRef={stageRef}
                visible={overlay.visible}
              />
              <div className="w-full max-w-md">
                <CellReadout ref={readoutRef} />
              </div>
            </div>
          </ShellLayout>
        </div>
      </div>
    </>
  );
}
