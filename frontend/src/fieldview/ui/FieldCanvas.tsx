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
import { FIELD, clampToField } from "../scene/field";
import { movePlayer, moveThrower } from "../scene/scene";
import { throwTo } from "../scene/possession";
import { clearSelection, selectMarquee, selectPlayer } from "../scene/selection";
import { announceThrow, isThrowArmed, setThrowArmed, useThrowMode } from "./shell/throwMode";
import { useSelection } from "./shell/useSelection";
import { useMotionDriver } from "./motion/driverContext";
import {
  addDestination,
  getMotionMode,
  moveWaypoint,
  setPicking,
  useMotionMode,
} from "./motion/motionMode";
import { ROUTE_TOKENS } from "../render/tokens";
import { usePlayModel } from "./playModel";
import { FIELD_PX_HEIGHT, FIELD_PX_WIDTH, FieldLayer } from "../render/fieldLayer";
import { PieceLayer } from "../render/pieceLayer";
import { RouteLayer } from "../render/routeLayer";
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
  // Dragging a placed waypoint to reshape a cut (Builder decision 2026-07-31).
  // Deliberately a DragState kind rather than its own pointer path: it needs
  // the same capture, the same clamping, and the same ADR-2 ref discipline as
  // a piece drag, and a parallel implementation would drift from all three.
  | { kind: "waypoint"; playerId: string; index: number; pos: Vec2 }
  | { kind: "marquee"; origin: Vec2; current: Vec2 };

// A press within this of a marker's centre grabs the marker rather than what
// is behind it. Half the marker's own size plus a little, so the whole glyph
// is grabbable without stealing presses from a piece standing beside it.
const WAYPOINT_GRAB_YD = ROUTE_TOKENS.marker.size * 0.75;

// A press-and-release shorter than this never became a marquee — it was a
// click on empty grass, which clears the selection.
const MARQUEE_MIN_YD = 1;

// How far the pointer may wander between pressing a receiver and releasing
// and still count as a click rather than a drag (ux.md Flow 1 Alternate C:
// starting a drag while armed cancels the throw and drags normally, so the
// coach can never get stuck in a mode). Generous enough to survive the hand
// tremor of a real click on a touchscreen.
const THROW_CLICK_SLOP_YD = 0.75;

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

  // Throwing mode (tech-design ADR-5). Subscribed for RENDERING only — the
  // hint banner and the receiver emphasis. The pointer handlers never read
  // this value; they call `isThrowArmed()` directly, because they are bound
  // once and must see the live flag, not the one captured at bind time.
  const throwMode = useThrowMode();

  // Routes and run status, for RENDERING only — the pending route and the
  // running indicator. The pointer handlers never read these values; they call
  // getMotionMode() directly, because they are bound once and must see the
  // live state rather than the one captured at bind time (same reasoning as
  // throwMode above).
  const motionMode = useMotionMode();
  const motionDriver = useMotionDriver();
  const selectionState = useSelection(store);
  const selectedOffenseId = selectionState.kind === "offense" ? selectionState.id : null;

  // Roles are derived from possession (ADR-1), so a throw changes them — but
  // `players` is an identity list owned by the page and only rebuilt on a
  // preset load. Without this the ring, the T/M glyphs and the aria-labels
  // would keep describing the situation before the throw. The snapshot's key
  // deliberately excludes positions (see ui/playModel.ts), so this
  // subscription costs zero commits during a drag.
  const model = usePlayModel(store);
  const livePlayers = players.map((p) => {
    const live = model.players.find((q) => q.id === p.id);
    return live && live.role !== p.role ? { ...p, role: live.role } : p;
  });

  // A press that might still turn out to be a throw: set on pointerdown over
  // a receiver while armed, dropped as soon as the pointer travels far enough
  // to be a drag, consumed on pointerup. A ref, not state — it is read and
  // written inside pointer handlers (ADR-2).
  const pendingThrowRef = useRef<{ id: string; origin: Vec2 } | null>(null);

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

  // Complete a throw to `id` (ux.md Flow 1 steps 4-5). Everything that makes
  // a throw a throw — possession moving, the old thrower becoming a cutter,
  // the mark moving to whoever guards the new thrower — happens inside
  // scene/possession.ts; this only decides *who*, and reports it.
  //
  // Throwing to the current holder is a no-op that still exits the mode
  // (Alternate B): nothing is mutated, so nothing is announced either.
  function completeThrow(id: string) {
    const scene = store.getScene();
    const receiver = scene.players.find((p) => p.id === id);
    if (!receiver || receiver.team !== "offense") return;
    if (scene.possession === id) return;

    // Everything the throw does, deferred behind the flight. Possession, the
    // roles, the mark and the announcement all move together at the moment
    // the disc lands (PRD FR-5.3) — so what the coach hears matches what is
    // on screen, and there is never a state where the disc belongs to nobody
    // (FR-5.4): the old thrower keeps possession for the whole flight.
    const land = () => {
      store.mutate((draft) => throwTo(draft, id));
      announceThrow(`${receiver.label ? `#${receiver.label}` : receiver.id} has the disc.`);
      landSelection(receiver);
    };

    // Falls back to the instant throw whenever the driver declines — reduced
    // motion, or no provider at all (a unit test rendering FieldCanvas alone).
    if (motionDriver?.throwDisc(id, land)) return;
    land();
  }

  function landSelection(receiver: Player) {

    // The new thrower becomes the selection, so the sidebar shows the new
    // situation without the coach having to click the piece they just threw
    // to. Built from a cleared selection rather than the current one, because
    // selectPlayer's toggle-off case would otherwise clear the selection
    // whenever the receiver happened to already be selected.
    setSelection([]);
    store.setSelection(selectPlayer(clearSelection(), receiver));
  }

  // Escape cancels (ux.md Flow 1 Alternate A). Bound on the document rather
  // than the stage: the coach may have focus anywhere — the ribbon button
  // they just pressed, a piece, the sidebar — and Escape has to work from all
  // of them. Only bound while armed, so there is no idle listener.
  useEffect(() => {
    if (!throwMode.armed) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      pendingThrowRef.current = null;
      setThrowArmed(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [throwMode.armed]);

  // Destination picking cancels the same way, from anywhere, for the same
  // reason — the coach armed it from a sidebar button and focus is still
  // there (ux.md Flow 3). Deliberately a second effect rather than a shared
  // one: the two modes are never armed at once, and merging them would bind
  // a listener for whichever was idle.
  useEffect(() => {
    if (!motionMode.picking) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setPicking(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [motionMode.picking]);

  // Selecting somebody else abandons a pending pick rather than silently
  // retargeting it at the new player (ux.md Flow 3).
  useEffect(() => {
    if (motionMode.picking && motionMode.picking !== selectedOffenseId) setPicking(null);
  }, [motionMode.picking, selectedOffenseId]);

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

      // The field is read-only while a run is in progress (PRD FR-4.4): the
      // simulation and a drag are competing writers of position, and letting
      // both through would have the coach fighting the physics.
      const motion = getMotionMode();
      if (motion.status === "running") return;

      // Destination picking. Checked before the piece pick because the target
      // here is the GRASS, not a piece — the inverse of throwing mode, which
      // is exactly why ux.md de-emphasises pieces in this mode rather than
      // highlighting them.
      if (motion.picking) {
        // Clamped, not rejected (PRD FR-2.5): a press past the sideline lands
        // on the sideline, exactly as dragging a piece off the field already
        // does. addWaypoint does the clamping, on the same path a fresh click
        // takes, so there is one answer to "where can a waypoint be".
        addDestination(motion.picking, pos);
        event.preventDefault();
        return;
      }

      // A press on one of the selected player's route markers reshapes the
      // cut instead of grabbing whatever is behind it. Markers are drawn
      // pointer-events:none, so this distance test is what makes them
      // grabbable at all.
      const selected = store.getSelection();
      if (selected.kind === "offense") {
        const route = motion.routes[selected.id];
        if (route) {
          const index = route.legs.findIndex(
            (leg) => Math.hypot(leg.x - pos.x, leg.y - pos.y) <= WAYPOINT_GRAB_YD,
          );
          if (index !== -1) {
            dragRef.current = { kind: "waypoint", playerId: selected.id, index, pos: route.legs[index] };
            svg!.setPointerCapture?.(event.pointerId);
            svg!.style.cursor = "grabbing";
            event.preventDefault();
            return;
          }
        }
      }

      // Nearest-within-radius, not a hit test (render/pick.ts). Overlapping
      // targets used to hand the pointer to whichever piece was rendered
      // last; distance settles it correctly however they are ordered.
      const piece = pickNearest(pos, grabbablePlayers());

      // Throwing mode exits on ANY press — a receiver, a defender, empty
      // grass, all of them (ux.md Flow 1 Alternate A). Disarming here rather
      // than on release is what keeps the mode-exit commit out of the moves
      // that follow: by the time the pointer starts travelling, React has
      // already settled.
      if (isThrowArmed()) {
        setThrowArmed(false);
        // A press on a receiver is only *provisionally* a throw. If the
        // pointer travels it becomes an ordinary drag (Alternate C) and the
        // pending throw is dropped in onPointerMove.
        if (piece && piece.team === "offense") {
          pendingThrowRef.current = { id: piece.id, origin: pos };
        }
        // Deliberately falls through to the normal press handling below, so
        // the drag this might turn into is already set up.
      }

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
      // A press that never travelled far enough to be a drag: this is the
      // click that completes the throw.
      const pending = pendingThrowRef.current;
      pendingThrowRef.current = null;
      if (pending) completeThrow(pending.id);

      const drag = dragRef.current;
      if (!drag) return;

      if (drag.kind === "waypoint") {
        // The one React update for the whole drag.
        moveWaypoint(drag.playerId, drag.index, drag.pos);
      }

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

        if (drag.kind === "waypoint") {
          // ADR-2 applies to THIS drag too. Committing to the motion store per
          // pointer move would re-render RouteLayer sixty times a second and
          // put React straight back in the pointer path — the exact thing the
          // piece drag was built to avoid. So the marker is moved in the DOM
          // here and committed once, on release, like the marquee.
          drag.pos = clampToField(pos);
          drawWaypointDrag(drag.index, drag.pos);
          return;
        }
        // Two ref reads and, at most once per press, an abandoned throw. No
        // React, no store read, nothing that scales with the scene — this is
        // the ADR-2 path.
        const pending = pendingThrowRef.current;
        if (
          pending &&
          Math.hypot(pos.x - pending.origin.x, pos.y - pending.origin.y) > THROW_CLICK_SLOP_YD
        ) {
          pendingThrowRef.current = null;
        }
        // The readout stands still while the scene is being rearranged.
        if (drag.kind === "piece") {
          moveTo(drag.id, { x: pos.x + drag.grabOffset.x, y: pos.y + drag.grabOffset.y });
          // The first leg starts at the player, so dragging a player who is
          // carrying a route has to bring that leg with it — imperatively,
          // for the same ADR-2 reason the marker drag is imperative.
          drawRouteOrigin(drag.id);
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
      // An interrupted press is not a throw the coach completed.
      pendingThrowRef.current = null;
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

  // Re-anchor leg 0 to wherever its player currently is.
  function drawRouteOrigin(playerId: string) {
    const svg = svgRef.current;
    if (!svg || playerId !== selectedOffenseId) return;
    const player = store.getScene().players.find((p) => p.id === playerId);
    if (!player) return;
    const px = yardToPixel(player.pos);
    const first = svg.querySelector<SVGLineElement>('[data-leg="0"]');
    first?.setAttribute("x1", String(px.x));
    first?.setAttribute("y1", String(px.y));
  }

  // The route-marker equivalent of drawMarquee: move the glyph and the two
  // legs that touch it, straight in the DOM. Marker `index` is drawn at
  // points[index + 1], so it terminates leg `index` and originates leg
  // `index + 1` — the last marker has no outgoing leg, hence the null checks.
  function drawWaypointDrag(index: number, yard: Vec2) {
    const svg = svgRef.current;
    if (!svg) return;
    const px = yardToPixel(yard);
    const half = ROUTE_TOKENS.marker.size / 2;

    const group = svg.querySelector<SVGGElement>(`[data-waypoint="${index}"]`);
    group?.querySelector("rect")?.setAttribute("x", String(px.x - half));
    group?.querySelector("rect")?.setAttribute("y", String(px.y - half));
    const label = group?.querySelector("text");
    label?.setAttribute("x", String(px.x));
    label?.setAttribute("y", String(px.y));

    const incoming = svg.querySelector<SVGLineElement>(`[data-leg="${index}"]`);
    incoming?.setAttribute("x2", String(px.x));
    incoming?.setAttribute("y2", String(px.y));
    const outgoing = svg.querySelector<SVGLineElement>(`[data-leg="${index + 1}"]`);
    outgoing?.setAttribute("x1", String(px.x));
    outgoing?.setAttribute("y1", String(px.y));
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
        {/* An armed tool must never be invisible (ux.md UX Consistency
            Patterns): the ribbon shows a pressed button and the field says
            what it is waiting for. The same region carries the "…has the
            disc" line afterwards, so a screen-reader user learns both that
            the tool armed and that possession changed. Absolutely positioned
            and pointer-transparent so it never shifts the stage or steals a
            press meant for a piece. */}
        <p
          data-testid="throw-hint"
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 bg-white/90 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-film-accentPink empty:hidden"
        >
          {throwMode.announcement}
        </p>
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
          <PieceLayer
            players={livePlayers}
            store={store}
            disabled={disabled}
            throwArmed={throwMode.armed}
            onThrowTo={(id) => {
              // Keyboard completion (Enter/Space on a focused receiver): the
              // mode exits either way, exactly as a click would.
              pendingThrowRef.current = null;
              setThrowArmed(false);
              completeThrow(id);
            }}
          />
          {/* The selected player's pending route. Drawn above the pieces so a
              marker standing on a piece is still grabbable, and hidden during
              a run — the markers describe a plan, and while it is executing
              they say nothing the moving pieces do not. */}
          <RouteLayer
            route={motionMode.routes[selectedOffenseId ?? ""]}
            origin={store.getScene().players.find((p) => p.id === selectedOffenseId)?.pos}
            hidden={motionMode.status === "running"}
          />
          {/* Visible even when the mobile sheet is collapsed over the panel
              that would otherwise say so — and the field is read-only in this
              state, which the coach has no other way to discover (ux.md UI
              States). */}
          {motionMode.status === "running" && (
            <g data-testid="running-indicator" pointerEvents="none">
              <rect
                x={-STAGE_MARGIN.left + 4}
                y={-STAGE_MARGIN.top + 4}
                width={14}
                height={3.2}
                fill={ROUTE_TOKENS.runningIndicator.fill}
              />
              <text
                x={-STAGE_MARGIN.left + 11}
                y={-STAGE_MARGIN.top + 5.6}
                textAnchor="middle"
                dominantBaseline="central"
                fill={ROUTE_TOKENS.runningIndicator.textFill}
                fontSize={ROUTE_TOKENS.runningIndicator.fontSize}
                fontFamily="'JetBrains Mono', ui-monospace, monospace"
              >
                RUNNING
              </text>
            </g>
          )}
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
