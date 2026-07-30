// The stacked stage (ADR-3): a canvas holding the heatmap underneath an SVG
// holding the field markings and the draggable pieces. It owns the frame
// loop, so this is the one component that must never put React in the drag
// path — no setState lives in any pointer handler or frame callback here.
// Everything that changes per frame (the paint, the hover readout, the perf
// numbers) is written imperatively.

import { useEffect, useLayoutEffect, useRef } from "react";
import type { CSSProperties, MutableRefObject, RefObject } from "react";
import type { SceneStore } from "../scene/store";
import type { Player, Vec2 } from "../scene/types";
import { FIELD } from "../scene/field";
import { movePlayer, moveThrower } from "../scene/scene";
import { clearSelection, selectMarquee, selectPlayer } from "../scene/selection";
import { FIELD_PX_HEIGHT, FIELD_PX_WIDTH, FieldLayer } from "../render/fieldLayer";
import { PieceLayer } from "../render/pieceLayer";
import type { PieceIdentity } from "../render/pieceLayer";
import { pickNearest } from "../render/pick";
import { FIELD_TOKENS } from "../render/tokens";
import {
  STAGE_MARGIN,
  clientToYard,
  getStageViewBox,
  viewBoxToString,
  yardToPixel,
} from "../render/coords";
import { createHeatmapPainter } from "../render/heatmap";
import type { HeatmapPainter } from "../render/heatmap";
import { computeGrid } from "../space/score";
import { explainCell } from "../space/explain";
import type { LayerFlags, Lens, SpaceParams } from "../space/types";
import type { CellReadoutHandle } from "./CellReadout";
import type { TeamVisibility } from "./prefs";

export interface OverlaySettings {
  on: boolean;
  lens: Lens;
  layers: LayerFlags;
  params: SpaceParams;
}

// Which teams are drawn. Display-only, deliberately: the space model always
// sees the whole scene, so hiding a team changes the picture and never the
// map. Whether the offense counts toward the model is a separate control
// (the lens, in AdvancedPanel).
const ALL_VISIBLE: TeamVisibility = { offense: true, defense: true };

// A press either takes a piece, takes the current selection, or draws a box.
type DragState =
  | { kind: "piece"; id: string; grabOffset: Vec2 }
  // `start` is every moving piece's position at grab time — including a mark
  // carried by a selected thrower. Applying one delta to that snapshot is what
  // keeps a group rigid; moving each piece toward the cursor would not.
  | { kind: "group"; origin: Vec2; start: Map<string, Vec2> }
  | { kind: "marquee"; origin: Vec2; current: Vec2 };

// A press-and-release shorter than this never became a marquee — it was a
// click on empty grass, which clears the selection.
const MARQUEE_MIN_YD = 1;

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
  // Hidden teams are not rendered, and so must not be grabbable either — a
  // piece you cannot see must not be a piece you can accidentally drag.
  visible?: TeamVisibility;
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
  visible = ALL_VISIBLE,
  disabled = false,
}: FieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const painterRef = useRef<HeatmapPainter | null>(null);
  const perfRef = useRef<HTMLParagraphElement | null>(null);
  const reticleRef = useRef<SVGCircleElement | null>(null);
  const marqueeRef = useRef<SVGRectElement | null>(null);

  // Settings are mirrored into a ref so the frame callback always reads the
  // current values without the subscription being torn down and rebuilt on
  // every slider tick.
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;

  // The live drag, if any. A ref and never state — this is the ADR-2 path.
  // For a single piece, `grabOffset` is the vector from the pointer to the
  // piece's centre at the moment of grabbing, held constant for the drag so a
  // piece taken by its edge does not snap its centre to the cursor.
  const dragRef = useRef<DragState | null>(null);
  // The marquee selection. Also a ref, for the same reason: selecting six
  // players and dragging them must not put React back in the pointer path.
  // The visual is a `data-selected` attribute written straight onto the piece
  // elements and revealed by CSS (see index.css).
  const selectionRef = useRef<Set<string>>(new Set());
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const showPerf = useRef(perfEnabled()).current;

  // Mirrored so the native listeners, which are bound once, always read the
  // current value rather than the one captured at bind time.
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

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

  // Only what is drawn can be grabbed or swept up by the marquee.
  function grabbablePlayers(): Player[] {
    const teams = visibleRef.current;
    return store.getScene().players.filter((p) => teams[p.team]);
  }

  // The selection's visual, written straight onto the DOM. Called at the few
  // discrete moments the selection changes — never per frame. This is
  // deliberately local (group-drag membership / marquee highlight), separate
  // from the store's `selection` field (ADR-1) — the two are kept in step by
  // the call sites below, which update both together at each of those
  // discrete moments rather than merging them into one concept.
  function setSelection(ids: Iterable<string>) {
    selectionRef.current = new Set(ids);
    const svg = svgRef.current;
    if (!svg) return;
    for (const el of svg.querySelectorAll<SVGGElement>("[data-piece-id]")) {
      const id = el.getAttribute("data-piece-id");
      if (id && selectionRef.current.has(id)) el.setAttribute("data-selected", "true");
      else el.removeAttribute("data-selected");
    }
  }

  // A preset load replaces the pieces; a selection of ids that no longer exist
  // would linger as an invisible group drag waiting to happen. The store's
  // selection (which the shell's panel registry reads) must be reset the same
  // way, or a stale panel could keep pointing at a player that no longer
  // exists in the new scene.
  useEffect(() => {
    setSelection([]);
    store.setSelection(clearSelection());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

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
      const piece = pickNearest(pos, grabbablePlayers());

      if (!piece) {
        // Empty grass: start drawing a box. The selection is not cleared yet —
        // that happens on release, and only if no box was actually drawn.
        dragRef.current = { kind: "marquee", origin: pos, current: pos };
        drawMarquee();
        svg!.setPointerCapture?.(event.pointerId);
        svg!.style.cursor = "crosshair";
        event.preventDefault();
        return;
      }

      if (selectionRef.current.has(piece.id)) {
        dragRef.current = { kind: "group", origin: pos, start: groupStartPositions() };
      } else {
        // Grabbing an unselected piece is the old single-piece drag, and
        // abandons whatever was selected — the same way it would in any editor.
        setSelection([]);
        // ADR-1: this is also the moment the shell's contextual panel needs to
        // know about — a plain click-drag on a single piece is how ux.md's
        // "coach clicks a defensive player" flow actually fires in practice
        // (a press-and-release with zero movement is still a press). Reuses
        // the same pure transition `selectPlayer` uses for its own toggle-off
        // case, so grabbing the already-singly-selected piece again clears it
        // rather than re-selecting it.
        store.setSelection(selectPlayer(store.getSelection(), piece));
        dragRef.current = {
          kind: "piece",
          id: piece.id,
          grabOffset: { x: piece.pos.x - pos.x, y: piece.pos.y - pos.y },
        };
      }

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
      const drag = dragRef.current;
      if (!drag) return;

      if (drag.kind === "marquee") {
        const dx = Math.abs(drag.current.x - drag.origin.x);
        const dy = Math.abs(drag.current.y - drag.origin.y);
        // A click on grass deselects; a box selects what it contains, even if
        // that is nothing.
        const ids =
          dx < MARQUEE_MIN_YD && dy < MARQUEE_MIN_YD ? [] : playersInMarquee(drag).map((p) => p.id);
        setSelection(ids);
        // `selectMarquee` already collapses an empty result to `{ kind: "none" }`,
        // so a click on open grass and an empty box both clear the store's
        // selection the same way they clear the local one above.
        store.setSelection(selectMarquee(ids));
        hideMarquee();
      }

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
        if (drag.kind === "piece") {
          moveTo(drag.id, { x: pos.x + drag.grabOffset.x, y: pos.y + drag.grabOffset.y });
        } else if (drag.kind === "group") {
          moveGroup(drag, pos);
        } else {
          drag.current = pos;
          drawMarquee();
        }
        return;
      }

      hoverRef.current = positionFor(event);
      // Cheap affordance: the cursor says whether a grab here would take
      // hold. It costs one pick per move and no render.
      const pos = hoverRef.current;
      svg!.style.cursor =
        !disabledRef.current && pos && pickNearest(pos, grabbablePlayers()) ? "grab" : "";
      moveReticle();
      updateReadout(store.getScene());
    }

    function onPointerLeave() {
      hoverRef.current = null;
      moveReticle();
      updateReadout(store.getScene());
    }

    // A drag interrupted by the browser (a system gesture, a lost capture)
    // must not leave the board stuck in the grabbing state. An interrupted
    // marquee is discarded rather than applied — the coach never released it.
    function onPointerCancel(event: PointerEvent) {
      if (!dragRef.current) return;
      hideMarquee();
      dragRef.current = null;
      svg!.releasePointerCapture?.(event.pointerId);
      svg!.style.cursor = "";
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
    const { x, y } = yardToPixel(hover);
    reticle.setAttribute("cx", String(x));
    reticle.setAttribute("cy", String(y));
    reticle.setAttribute("opacity", String(FIELD_TOKENS.reticle.opacity));
  }

  // Every selected piece's position at grab time, which one delta is then
  // applied to. Snapshotting is what makes the group rigid.
  function groupStartPositions(): Map<string, Vec2> {
    const scene = store.getScene();
    const start = new Map<string, Vec2>();
    for (const p of scene.players) {
      if (selectionRef.current.has(p.id)) start.set(p.id, { ...p.pos });
    }
    // Thrower-carries-mark (FR-2.2) still holds for a group — but only when the
    // mark is not itself selected, or it would take the delta twice: once as a
    // member of the group and once as the thrower's passenger.
    const thrower = scene.players.find((p) => p.role === "thrower");
    const mark = scene.players.find((p) => p.role === "mark");
    if (thrower && mark && start.has(thrower.id) && !start.has(mark.id)) {
      start.set(mark.id, { ...mark.pos });
    }
    return start;
  }

  function moveGroup(drag: { origin: Vec2; start: Map<string, Vec2> }, pos: Vec2) {
    if (drag.start.size === 0) return;

    // Clamp the *delta* against the group's bounding box rather than letting
    // each piece clamp itself. Per-piece clamping would let the leading edge
    // pile up on the sideline while the rest kept moving — the formation would
    // deform. Clamping the delta slides the whole shape along the line.
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of drag.start.values()) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    const dx = Math.min(FIELD.length - maxX, Math.max(-minX, pos.x - drag.origin.x));
    const dy = Math.min(FIELD.width - maxY, Math.max(-minY, pos.y - drag.origin.y));

    store.mutate((draft) => {
      for (const [id, start] of drag.start) {
        movePlayer(draft, id, { x: start.x + dx, y: start.y + dy });
      }
    });
  }

  function playersInMarquee(drag: { origin: Vec2; current: Vec2 }): Player[] {
    const x0 = Math.min(drag.origin.x, drag.current.x);
    const x1 = Math.max(drag.origin.x, drag.current.x);
    const y0 = Math.min(drag.origin.y, drag.current.y);
    const y1 = Math.max(drag.origin.y, drag.current.y);
    return grabbablePlayers().filter(
      (p) => p.pos.x >= x0 && p.pos.x <= x1 && p.pos.y >= y0 && p.pos.y <= y1,
    );
  }

  function drawMarquee() {
    const rect = marqueeRef.current;
    const drag = dragRef.current;
    if (!rect || drag?.kind !== "marquee") return;
    const a = yardToPixel(drag.origin);
    const b = yardToPixel(drag.current);
    rect.setAttribute("x", String(Math.min(a.x, b.x)));
    rect.setAttribute("y", String(Math.min(a.y, b.y)));
    rect.setAttribute("width", String(Math.abs(b.x - a.x)));
    rect.setAttribute("height", String(Math.abs(b.y - a.y)));
    rect.setAttribute("opacity", "1");
  }

  function hideMarquee() {
    marqueeRef.current?.setAttribute("opacity", "0");
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
          aria-label={`Ultimate field, ${FIELD.length} by ${FIELD.width} yards. Offense attacks up the field.`}
          viewBox={viewBoxString}
          className="relative h-auto w-full"
          // The stage owns the drag, so it must own the gesture: without this a
          // touch drag scrolls the page instead of moving a piece.
          style={{ touchAction: "none" }}
        >
          <FieldLayer />
          {/* The cell the readout is describing. A ring rather than the old
              black square, which read as a rendering artefact on the map. */}
          <circle
            ref={reticleRef}
            data-testid="cell-reticle"
            r={FIELD_PX_WIDTH / FIELD.length / 2}
            fill="none"
            stroke={FIELD_TOKENS.reticle.stroke}
            strokeWidth={FIELD_TOKENS.reticle.strokeWidth}
            opacity={0}
            pointerEvents="none"
          />
          <PieceLayer players={players} store={store} disabled={disabled} />
          {/* Drawn above the pieces so the box is never hidden behind them.
              Sized imperatively during the drag — no render per pointer move. */}
          <rect
            ref={marqueeRef}
            data-testid="selection-marquee"
            fill={FIELD_TOKENS.marquee.fill}
            fillOpacity={FIELD_TOKENS.marquee.fillOpacity}
            stroke={FIELD_TOKENS.marquee.stroke}
            strokeWidth={FIELD_TOKENS.marquee.strokeWidth}
            strokeDasharray={FIELD_TOKENS.marquee.strokeDasharray}
            width={0}
            height={0}
            opacity={0}
            pointerEvents="none"
          />
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
