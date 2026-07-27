// The stacked stage (ADR-3): a canvas holding the heatmap underneath an SVG
// holding the field markings and the draggable pieces. It owns the frame
// loop, so this is the one component that must never put React in the drag
// path — no setState lives in any pointer handler or frame callback here.
// Everything that changes per frame (the paint, the hover readout, the perf
// numbers) is written imperatively.

import { useEffect, useLayoutEffect, useRef } from "react";
import type { MutableRefObject, RefObject } from "react";
import type { SceneStore } from "../scene/store";
import { FIELD } from "../scene/field";
import { FIELD_PX_HEIGHT, FIELD_PX_WIDTH, FieldLayer } from "../render/fieldLayer";
import { PieceLayer } from "../render/pieceLayer";
import type { PieceIdentity } from "../render/pieceLayer";
import { STAGE_MARGIN, clientToYard, getStageViewBox, viewBoxToString } from "../render/coords";
import { createHeatmapPainter } from "../render/heatmap";
import type { HeatmapPainter } from "../render/heatmap";
import { computeGrid } from "../space/score";
import { explainCell } from "../space/explain";
import type { LayerFlags, Lens, SpaceParams } from "../space/types";
import type { CellReadoutHandle } from "./CellReadout";

export interface OverlaySettings {
  on: boolean;
  lens: Lens;
  layers: LayerFlags;
  params: SpaceParams;
}

interface FieldCanvasProps {
  store: SceneStore;
  players: PieceIdentity[];
  svgRef: MutableRefObject<SVGSVGElement | null>;
  overlay: OverlaySettings;
  readoutRef?: RefObject<CellReadoutHandle | null>;
  // Exposed so PNG export can composite the painted map under the SVG.
  canvasRef?: MutableRefObject<HTMLCanvasElement | null>;
  disabled?: boolean;
}

const viewBox = getStageViewBox(FIELD_PX_WIDTH, FIELD_PX_HEIGHT);
const viewBoxString = viewBoxToString(viewBox);

// The canvas covers the field rect only, expressed as percentages of the
// stage so it tracks the SVG's own responsive scaling exactly.
const FIELD_INSET = {
  left: `${(STAGE_MARGIN.left / viewBox.width) * 100}%`,
  top: `${(STAGE_MARGIN.top / viewBox.height) * 100}%`,
  width: `${(FIELD_PX_WIDTH / viewBox.width) * 100}%`,
  height: `${(FIELD_PX_HEIGHT / viewBox.height) * 100}%`,
};

// `?perf=1` turns on the frame-timing readout (§8.9). A query flag rather
// than a build flag, so a measurement can be taken on the client's own
// machine without a rebuild.
function perfEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("perf") === "1";
}

export function FieldCanvas({
  store,
  players,
  svgRef,
  overlay,
  readoutRef,
  canvasRef: exposedCanvasRef,
  disabled = false,
}: FieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const painterRef = useRef<HeatmapPainter | null>(null);
  const perfRef = useRef<HTMLParagraphElement | null>(null);
  const reticleRef = useRef<SVGRectElement | null>(null);

  // Settings are mirrored into a ref so the frame callback always reads the
  // current values without the subscription being torn down and rebuilt on
  // every slider tick.
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;

  const draggingRef = useRef(false);
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const showPerf = useRef(perfEnabled()).current;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const painter = createHeatmapPainter(canvas);
    painter.resize(FIELD_PX_WIDTH, FIELD_PX_HEIGHT);
    painterRef.current = painter;
    return () => {
      painter.dispose();
      painterRef.current = null;
    };
  }, []);

  function paint() {
    const painter = painterRef.current;
    const canvas = canvasRef.current;
    if (!painter || !canvas) return;

    const settings = overlayRef.current;
    const scene = store.getScene();

    if (!settings.on) {
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      // Still reaches the readout: switching the overlay off mid-hover must
      // return it to idle, not freeze the last sampled cell on screen.
      updateReadout(scene);
      return;
    }

    const gridStart = performance.now();
    // The grid buffer is reused across calls (ADR-4) — painted immediately,
    // never retained.
    const grid = computeGrid(scene, settings.params, settings.layers, settings.lens);
    const paintStart = performance.now();
    painter.paint(grid);
    const done = performance.now();

    if (showPerf && perfRef.current) {
      perfRef.current.textContent = `grid ${(paintStart - gridStart).toFixed(1)} ms · paint ${(
        done - paintStart
      ).toFixed(1)} ms · total ${(done - gridStart).toFixed(1)} ms`;
    }

    updateReadout(scene);
  }

  function updateReadout(scene: ReturnType<SceneStore["getScene"]>) {
    const readout = readoutRef?.current;
    if (!readout) return;
    const settings = overlayRef.current;
    const hover = hoverRef.current;

    if (!settings.on || !hover) {
      readout.update(null, settings.lens);
      if (reticleRef.current) reticleRef.current.setAttribute("opacity", "0");
      return;
    }

    readout.update(
      explainCell(hover, scene, settings.params, settings.layers, settings.lens),
      settings.lens,
    );
  }

  // Repaint on every coalesced scene frame (a drag, a nudge, a playback tick).
  useEffect(() => store.onFrame(paint), [store]);

  // ...and whenever a control changes, since those do not mutate the scene.
  useEffect(() => {
    paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay.on, overlay.lens, overlay.layers, overlay.params]);

  // Pointer tracking is a native listener, not a React prop: a hover must
  // not cost a render, and a drag must not cost a readout recompute.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    function positionFor(event: PointerEvent): { x: number; y: number } | null {
      const rect = svg!.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      const pos = clientToYard(rect, viewBox, { x: event.clientX, y: event.clientY });
      if (pos.x < 0 || pos.x > FIELD.length || pos.y < 0 || pos.y > FIELD.width) return null;
      return pos;
    }

    function onPointerDown(event: PointerEvent) {
      // A pointerdown on a piece starts a drag; the readout stands still
      // while the scene is being rearranged.
      draggingRef.current = (event.target as Element | null)?.closest?.('[role="button"]') !== null;
    }

    function onPointerUp() {
      draggingRef.current = false;
    }

    function onPointerMove(event: PointerEvent) {
      if (draggingRef.current) return;
      hoverRef.current = positionFor(event);
      moveReticle();
      updateReadout(store.getScene());
    }

    function onPointerLeave() {
      hoverRef.current = null;
      moveReticle();
      updateReadout(store.getScene());
    }

    svg.addEventListener("pointerdown", onPointerDown);
    svg.addEventListener("pointerup", onPointerUp);
    svg.addEventListener("pointermove", onPointerMove);
    svg.addEventListener("pointerleave", onPointerLeave);
    return () => {
      svg.removeEventListener("pointerdown", onPointerDown);
      svg.removeEventListener("pointerup", onPointerUp);
      svg.removeEventListener("pointermove", onPointerMove);
      svg.removeEventListener("pointerleave", onPointerLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, svgRef]);

  function moveReticle() {
    const reticle = reticleRef.current;
    if (!reticle) return;
    const hover = hoverRef.current;
    if (!hover || !overlayRef.current.on) {
      reticle.setAttribute("opacity", "0");
      return;
    }
    const size = FIELD_PX_WIDTH / FIELD.length; // one yard
    reticle.setAttribute("x", String(hover.x * size - size / 2));
    reticle.setAttribute("y", String(hover.y * size - size / 2));
    reticle.setAttribute("opacity", "1");
  }

  return (
    <div className="relative w-full max-w-4xl">
      <canvas
        ref={(el) => {
          canvasRef.current = el;
          if (exposedCanvasRef) exposedCanvasRef.current = el;
        }}
        data-testid="heatmap-canvas"
        aria-hidden="true"
        // The overlay's fade is decoration; motion-safe drops it for anyone
        // who asked for less motion. The live repaint is never suppressed —
        // that is the feature, not an animation.
        className="pointer-events-none absolute motion-safe:transition-opacity motion-safe:duration-200"
        style={{ ...FIELD_INSET, opacity: overlay.on ? 1 : 0 }}
      />

      <svg
        ref={svgRef}
        role="group"
        aria-label={`Ultimate field, ${FIELD.length} by ${FIELD.width} yards`}
        viewBox={viewBoxString}
        className="relative h-auto w-full"
      >
        <FieldLayer />
        <rect
          ref={reticleRef}
          data-testid="cell-reticle"
          width={FIELD_PX_WIDTH / FIELD.length}
          height={FIELD_PX_WIDTH / FIELD.length}
          fill="none"
          stroke="#18181b"
          strokeWidth={1}
          opacity={0}
          pointerEvents="none"
        />
        <PieceLayer players={players} store={store} getSvg={() => svgRef.current} disabled={disabled} />
      </svg>

      {showPerf && (
        <p
          ref={perfRef}
          data-testid="perf-readout"
          className="absolute right-0 top-0 bg-white/90 px-2 py-1 font-mono text-[0.65rem] tabular-nums text-zinc-700"
        />
      )}
    </div>
  );
}
