// SVG piece layer: rendering and keyboard only.
//
// The per-frame position writes are imperative DOM transforms (ADR-2) — no
// React state changes per pointer move. React only re-renders this layer when
// the *identity* list (props) changes, e.g. on a preset load, which is a
// discrete, human-speed event owned by the page component.
//
// Pointer dragging deliberately does NOT live here. It is a container-level
// concern (see ui/FieldCanvas.tsx + render/pick.ts): grabbing the nearest
// piece needs to compare distances across every piece at once, which no
// per-element handler can do.

import { useEffect, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Player } from "../scene/types";
import type { SceneStore } from "../scene/store";
import { movePlayer, moveThrower } from "../scene/scene";
import { yardToPixel } from "./coords";
import { NUDGE, PIECE_TOKENS } from "./tokens";
import { getFlightPos } from "../ui/shell/throwMode";

export interface PieceIdentity {
  id: string;
  team: Player["team"];
  role: Player["role"];
  label?: string;
}

interface PieceLayerProps {
  players: PieceIdentity[];
  store: SceneStore;
  // Designer mode blocks editing while playing back or while scrubbed
  // between keyframes — the pieces still render and still repaint every
  // frame, they just stop accepting input.
  disabled?: boolean;
  // Throwing mode, passed down rather than read from ui/shell/throwMode here
  // (render/ stays prop-driven and knows nothing about the shell). Arming is
  // a discrete click, so the re-render it costs is not in the drag path.
  throwArmed?: boolean;
  // Completes a throw on the focused receiver: ux.md requires Enter/Space to
  // do what a click does, since these pieces are already focusable buttons.
  onThrowTo?: (id: string) => void;
  // Build: players placed in the current frame get a small pink corner mark.
  placed?: ReadonlySet<string>;
  // A keyboard nudge moved this piece (Build counts a burst as one gesture).
  onNudge?: (id: string) => void;
}

export function PieceLayer({
  players,
  store,
  disabled = false,
  throwArmed = false,
  onThrowTo,
  placed,
  onNudge,
}: PieceLayerProps) {
  const pieceRefs = useRef(new Map<string, SVGGElement>());
  const discRef = useRef<SVGGElement | null>(null);
  const discDotRef = useRef<SVGCircleElement | null>(null);
  const markDirRef = useRef<SVGLineElement | null>(null);

  // Who holds the disc and who is the mark change DURING a drag (the mark is
  // whoever is within 10 ft — fieldview-build ADR-38) and during playback (the
  // disc moves between players), so the rings are written imperatively from the
  // scene, like positions, and only when they actually change.
  function paintState(
    g: SVGGElement,
    isHolder: boolean,
    isMark: boolean,
    team: Player["team"],
    title: string,
  ) {
    // The title is identity (play level) and the player's to change in Explore,
    // so it is written from the scene like a position — never through React.
    const text = g.querySelector<SVGTextElement>(".fv-piece-title");
    if (text && text.textContent !== title) text.textContent = title;
    const flag = (isHolder ? "h" : "") + (isMark ? "m" : "");
    if (g.dataset.state === flag) return;
    g.dataset.state = flag;
    const ring = g.querySelector<SVGCircleElement>(".fv-holder-ring");
    ring?.setAttribute("opacity", isHolder ? "1" : "0");
    const body = g.querySelector<SVGCircleElement>(".fv-piece-disc");
    if (body) {
      const style = team === "offense" ? PIECE_TOKENS.offense : PIECE_TOKENS.defense;
      body.setAttribute("stroke", isMark ? PIECE_TOKENS.special.stroke : style.stroke);
      body.setAttribute("stroke-width", String(isMark ? PIECE_TOKENS.special.strokeWidth : style.strokeWidth));
    }
    const note = isHolder ? "Has the disc" : isMark ? "Is the mark" : "";
    if (note) g.setAttribute("aria-description", note);
    else g.removeAttribute("aria-description");
  }

  function repaint() {
    const scene = store.getScene();
    // The disc is docked to whoever HOLDS it (tech-design ADR-1): possession
    // is the stored fact now, and `role: "thrower"` is derived from it by
    // normalize(). Reading possession directly means the disc cannot lag a
    // role that has not been re-derived yet.
    const thrower = scene.players.find((p) => p.id === scene.possession);
    const mark = scene.players.find((p) => p.role === "mark");

    for (const p of scene.players) {
      const g = pieceRefs.current.get(p.id);
      if (!g) continue;
      const { x, y } = yardToPixel(p.pos);
      g.setAttribute("transform", `translate(${x}, ${y})`);
      paintState(g, p.id === scene.possession, p.role === "mark", p.team, p.label ?? "");
    }

    if (discRef.current) discRef.current.setAttribute("display", thrower ? "inline" : "none");
    if (markDirRef.current) markDirRef.current.setAttribute("display", mark && thrower ? "inline" : "none");

    if (discRef.current && thrower) {
      // In flight, the disc is wherever the driver last published it — and it
      // is deliberately NOT offset to a holder's shoulder, because nobody is
      // holding it. Docked otherwise, exactly as before. Read here rather than
      // subscribed in React because this repaint already runs on every scene
      // mutation, which is what the driver is producing during the flight.
      const airborne = getFlightPos();
      const { x, y } = yardToPixel(airborne ?? thrower.pos);
      // The docking offset lives inside the scaled body (below), so the disc
      // sits at the same place relative to a piece at every piece size.
      discRef.current.setAttribute("transform", `translate(${x}, ${y})`);
      const { dx, dy } = airborne ? { dx: 0, dy: 0 } : PIECE_TOKENS.disc.offsetPx;
      discDotRef.current?.setAttribute("cx", String(dx));
      discDotRef.current?.setAttribute("cy", String(dy));
    }

    if (markDirRef.current && mark && thrower) {
      const dx = mark.pos.x - thrower.pos.x;
      const dy = mark.pos.y - thrower.pos.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;
      const { x, y } = yardToPixel(mark.pos);
      const len = PIECE_TOKENS.markDirection.lengthPx;
      markDirRef.current.setAttribute("x1", String(x));
      markDirRef.current.setAttribute("y1", String(y));
      markDirRef.current.setAttribute("x2", String(x + ux * len));
      markDirRef.current.setAttribute("y2", String(y + uy * len));
    }
  }

  // Repaint on every coalesced frame (ADR-2) and whenever the identity list
  // itself changes (a preset just loaded new pieces).
  useEffect(() => store.onFrame(repaint), [store]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(repaint, [players, store]);

  function handleKeyDown(id: string, e: ReactKeyboardEvent<SVGGElement>) {
    if (disabled) return;

    // Keyboard parity with clicking a receiver (ux.md Accessibility). Checked
    // before the nudge keys so an armed tool cannot be escaped by a stray
    // Enter that silently moves a piece instead.
    if (throwArmed && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onThrowTo?.(id);
      return;
    }

    const step = e.shiftKey ? NUDGE.shiftYards : NUDGE.yards;
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowLeft") dx = -step;
    else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "ArrowUp") dy = -step;
    else if (e.key === "ArrowDown") dy = step;
    else return;
    e.preventDefault();
    const player = store.getScene().players.find((p) => p.id === id);
    if (!player) return;
    const pos = { x: player.pos.x + dx, y: player.pos.y + dy };
    store.mutate((draft) => {
      const target = draft.players.find((p) => p.id === id);
      if (!target) return;
      if (target.role === "thrower") moveThrower(draft, pos);
      else movePlayer(draft, id, pos);
    });
    onNudge?.(id);
  }

  // The disc and the mark's force indicator are derived decorations, not
  // pieces — so they follow whether their owner is being drawn. A force arrow
  // hanging in space under a hidden mark reads as a bug.
  // Roles change while the scene is live, so these only ask whether the team
  // is drawn at all; repaint() hides the disc / arrow when nobody holds it or
  // nobody is the mark.
  const throwerShown = players.some((p) => p.team === "offense");
  const markShown = players.some((p) => p.team === "defense");

  return (
    <g data-testid="pieces">
      {players.map((p, index) => {
        const style = p.team === "offense" ? PIECE_TOKENS.offense : PIECE_TOKENS.defense;
        const radius = style.radius;
        // "Offense 3": the same name whatever the title, so an unnamed player
        // is still addressable (titles are visual only). Counted within the
        // team in roster order.
        const ordinal = players.slice(0, index + 1).filter((q) => q.team === p.team).length;
        const name = `${p.team === "offense" ? "Offense" : "Defense"} ${ordinal}`;
        // Eligible receivers are every offensive player except the one
        // already holding it — throwing to yourself is a no-op exit, not a
        // target (ux.md Flow 1 Alternate B).
        const eligible = throwArmed && p.team === "offense" && p.role !== "thrower";
        return (
          <g
            key={p.id}
            className="fv-piece"
            // How the drag controller hands keyboard focus to the piece it
            // just grabbed, so click-then-arrow-key nudging still works.
            data-piece-id={p.id}
            data-throw-target={eligible || undefined}
            ref={(el) => {
              if (el) pieceRefs.current.set(p.id, el);
              else pieceRefs.current.delete(p.id);
            }}
            tabIndex={disabled ? -1 : 0}
            role="button"
            aria-disabled={disabled || undefined}
            aria-label={name}
            onKeyDown={(e) => handleKeyDown(p.id, e)}
            style={{
              cursor: disabled ? "default" : "grab",
              outline: "none",
              // While armed, everything that is not a receiver recedes so the
              // targets read as the only live thing on the field.
              opacity: throwArmed && !eligible ? PIECE_TOKENS.throwTarget.dimOpacity : undefined,
              // The container owns the drag; a piece must never swallow the
              // pointerdown that the picker needs to see.
              pointerEvents: "none",
            }}
          >
            {/* The scaled body: everything that is the piece — rings, disc,
                title — shrinks together with --fv-piece-scale (per device,
                index.css), strokes included. Grab distance is yards, not this. */}
            <g className="fv-piece-body">
              {/* Focus indicator. Drawn explicitly rather than left to the
                  browser's default ring, which boxes the <g>'s bounding box —
                  that is what used to put a black rectangle on the field. */}
              <circle
                className="fv-piece-focus-ring"
                r={radius + PIECE_TOKENS.holder.gap + PIECE_TOKENS.focusRing.gap}
                fill="none"
                stroke={PIECE_TOKENS.focusRing.stroke}
                strokeWidth={PIECE_TOKENS.focusRing.strokeWidth}
                opacity={0}
              />
              {/* Receiver emphasis: a dashed ring outside the piece, in the
                  CANVAS accent (PIECE_TOKENS), never the shell accent — canon
                  ADR-16 keeps the two palettes apart. */}
              {eligible && (
                <circle
                  className="fv-throw-target"
                  r={radius + PIECE_TOKENS.throwTarget.gap}
                  fill="none"
                  stroke={PIECE_TOKENS.throwTarget.stroke}
                  strokeWidth={PIECE_TOKENS.throwTarget.strokeWidth}
                  strokeDasharray={PIECE_TOKENS.throwTarget.strokeDasharray}
                />
              )}
              {/* Holds the disc: a coloured ring, written by repaint(). */}
              <circle
                className="fv-holder-ring"
                r={radius + PIECE_TOKENS.holder.gap}
                fill="none"
                stroke={PIECE_TOKENS.holder.stroke}
                strokeWidth={PIECE_TOKENS.holder.strokeWidth}
                opacity={0}
              />
              <circle
                className="fv-piece-disc"
                r={radius}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
              />
              <text
                className="fv-piece-title"
                y={PIECE_TOKENS.label.fontSize * 0.35}
                textAnchor="middle"
                fontSize={PIECE_TOKENS.label.fontSize}
                fontFamily={PIECE_TOKENS.label.fontFamily}
                fontWeight={700}
                fill={style.labelFill}
                pointerEvents="none"
              />
              {placed?.has(p.id) && (
                <rect
                  className="fv-placed-mark"
                  data-testid="placed-mark"
                  x={-radius - 1}
                  y={-radius - 1}
                  width={PIECE_TOKENS.placed.size}
                  height={PIECE_TOKENS.placed.size}
                  fill={PIECE_TOKENS.placed.fill}
                />
              )}
            </g>
          </g>
        );
      })}

      {/* Disc — docked to the holder, derived every frame, never stored. */}
      {throwerShown && (
        <g ref={discRef} data-testid="disc" aria-hidden="true" pointerEvents="none">
          <g className="fv-piece-body">
            <circle
              ref={discDotRef}
              cx={PIECE_TOKENS.disc.offsetPx.dx}
              cy={PIECE_TOKENS.disc.offsetPx.dy}
              r={PIECE_TOKENS.disc.radius}
              fill={PIECE_TOKENS.disc.fill}
              stroke={PIECE_TOKENS.disc.stroke}
              strokeWidth={PIECE_TOKENS.disc.strokeWidth}
            />
          </g>
        </g>
      )}

      {/* Mark's directional indicator: the only force input in the UI. It is
          drawn from the mark toward the thrower, so it needs both on screen. */}
      {throwerShown && markShown && (
        <line
          ref={markDirRef}
          data-testid="mark-direction"
          stroke={PIECE_TOKENS.markDirection.stroke}
          strokeWidth={PIECE_TOKENS.markDirection.strokeWidth}
          pointerEvents="none"
          aria-hidden="true"
        />
      )}
    </g>
  );
}
