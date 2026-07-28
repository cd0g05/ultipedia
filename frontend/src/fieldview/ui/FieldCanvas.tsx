// The stacked stage (ADR-3): a canvas holding the heatmap underneath an SVG
// holding the field markings and the draggable pieces. It owns the frame
// loop, so this is the one component that must never put React in the drag
// path — no setState lives in any pointer handler or frame callback here.
// Everything that changes per frame (the paint, the hover readout, the perf
// numbers) is written imperatively.

import { useEffect, useLayoutEffect, useRef } from "react";
import type { CSSProperties, MutableRefObject, RefObject } from "react";
import type { SceneStore } from "../scene/store";
import type { Vec2 } from "../scene/types";
import { FIELD } from "../scene/field";
import { movePlayer, moveThrower } from "../scene/scene";
import { FIELD_PX_HEIGHT, FIELD_PX_WIDTH, FieldLayer } from "../render/fieldLayer";
import { PieceLayer } from "../render/pieceLayer";
import type { PieceIdentity } from "../render/pieceLayer";
import { pickNearest } from "../render/pick";
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
  // The element Present mode takes fullscreen. The page owns the button; the
  // stage only says which box to blow up.
  stageRef?: MutableRefObject<HTMLDivElement | null>;
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
  stageRef,
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

  // The live drag, if any. A ref and never state — this is the ADR-2 path.
  // `grabOffset` is the vector from the pointer to the piece's centre at the
  // moment of grabbing, held constant for the drag so a piece taken by its
  // edge does not snap its centre to the cursor.
  const dragRef = useRef<{ id: string; grabOffset: Vec2 } | null>(null);
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const showPerf = useRef(perfEnabled()).current;

  // Mirrored so the native listeners, which are bound once, always read the
  // current value rather than the one captured at bind time.
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

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

  // Thrower-carries-mark and field clamping stay in scene/scene.ts — the drag
  // controller only decides *what* moves and *where*, never the rules.
  function moveTo(id: string, pos: Vec2) {
    store.mutate((draft) => {
      const player = draft.players.find((p) => p.id === id);
      if (!player) return;
      if (player.role === "thrower") moveThrower(draft, pos);
      else movePlayer(draft, id, pos);
    });
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

    // Unclamped field coordinates. Dragging deliberately reads these raw and
    // lets the scene ops clamp, so a pointer taken past the sideline still
    // slides the piece along it instead of dropping the drag.
    function yardFor(event: PointerEvent): { x: number; y: number } | null {
      const rect = svg!.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      return clientToYard(rect, viewBox, { x: event.clientX, y: event.clientY });
    }

    // Hover, by contrast, only means something over the field itself.
    function positionFor(event: PointerEvent): { x: number; y: number } | null {
      const pos = yardFor(event);
      if (!pos) return null;
      if (pos.x < 0 || pos.x > FIELD.length || pos.y < 0 || pos.y > FIELD.width) return null;
      return pos;
    }

    function onPointerDown(event: PointerEvent) {
      if (disabledRef.current) return;
      const pos = yardFor(event);
      if (!pos) return;

      // Nearest-within-radius, not a hit test (render/pick.ts). Overlapping
      // targets used to hand the pointer to whichever piece was rendered
      // last; distance settles it correctly however they are ordered.
      const piece = pickNearest(pos, store.getScene().players);
      if (!piece) return;

      dragRef.current = {
        id: piece.id,
        grabOffset: { x: piece.pos.x - pos.x, y: piece.pos.y - pos.y },
      };
      svg!.setPointerCapture?.(event.pointerId);
      svg!.style.cursor = "grabbing";

      // Pieces are pointer-events: none, so a press never focuses one on its
      // own. Hand focus over explicitly, or grabbing with the mouse and then
      // nudging with the arrow keys would stop working. Chrome does treat this
      // programmatic focus as `:focus-visible`, so the ring shows — which
      // reads as "this piece is selected", not as the old black box.
      const el = svg!.querySelector<SVGGElement>(`[data-piece-id="${piece.id}"]`);
      el?.focus?.({ preventScroll: true });

      event.preventDefault();
    }

    function onPointerUp(event: PointerEvent) {
      if (!dragRef.current) return;
      dragRef.current = null;
      svg!.releasePointerCapture?.(event.pointerId);
      svg!.style.cursor = "";
    }

    function onPointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (drag) {
        const pos = yardFor(event);
        if (!pos) return;
        // The readout stands still while the scene is being rearranged.
        moveTo(drag.id, { x: pos.x + drag.grabOffset.x, y: pos.y + drag.grabOffset.y });
        return;
      }

      hoverRef.current = positionFor(event);
      // Cheap affordance: the cursor says whether a grab here would take
      // hold. It costs one pick per move and no render.
      const pos = hoverRef.current;
      svg!.style.cursor =
        !disabledRef.current && pos && pickNearest(pos, store.getScene().players) ? "grab" : "";
      moveReticle();
      updateReadout(store.getScene());
    }

    function onPointerLeave() {
      hoverRef.current = null;
      moveReticle();
      updateReadout(store.getScene());
    }

    // A drag interrupted by the browser (a system gesture, a lost capture)
    // must not leave the board stuck in the grabbing state.
    function onPointerCancel(event: PointerEvent) {
      onPointerUp(event);
    }

    svg.addEventListener("pointerdown", onPointerDown);
    svg.addEventListener("pointerup", onPointerUp);
    svg.addEventListener("pointermove", onPointerMove);
    svg.addEventListener("pointerleave", onPointerLeave);
    svg.addEventListener("pointercancel", onPointerCancel);
    return () => {
      svg.removeEventListener("pointerdown", onPointerDown);
      svg.removeEventListener("pointerup", onPointerUp);
      svg.removeEventListener("pointermove", onPointerMove);
      svg.removeEventListener("pointerleave", onPointerLeave);
      svg.removeEventListener("pointercancel", onPointerCancel);
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
    <div
      ref={stageRef}
      className="fv-stage relative flex w-full"
      // Read by the :fullscreen rule to height-bound the stage without
      // hardcoding the field's proportions in CSS.
      style={{ "--fv-stage-aspect": viewBox.width / viewBox.height } as CSSProperties}
    >
      <div className="fv-stage-inner relative w-full">
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
          aria-label={`Ultimate field, ${FIELD.length} by ${FIELD.width} yards. Offense attacks left to right.`}
          viewBox={viewBoxString}
          className="relative h-auto w-full"
          // The stage owns the drag, so it must own the gesture: without this a
          // touch drag scrolls the page instead of moving a piece.
          style={{ touchAction: "none" }}
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
          <PieceLayer players={players} store={store} disabled={disabled} />
        </svg>

        {showPerf && (
          <p
            ref={perfRef}
            data-testid="perf-readout"
            className="absolute right-0 top-0 bg-white/90 px-2 py-1 font-mono text-[0.65rem] tabular-nums text-zinc-700"
          />
        )}
      </div>
    </div>
  );
}
