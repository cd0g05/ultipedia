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
}

export function PieceLayer({ players, store, disabled = false }: PieceLayerProps) {
  const pieceRefs = useRef(new Map<string, SVGGElement>());
  const discRef = useRef<SVGGElement | null>(null);
  const markDirRef = useRef<SVGLineElement | null>(null);

  function repaint() {
    const scene = store.getScene();
    const thrower = scene.players.find((p) => p.role === "thrower");
    const mark = scene.players.find((p) => p.role === "mark");

    for (const p of scene.players) {
      const g = pieceRefs.current.get(p.id);
      if (!g) continue;
      const { x, y } = yardToPixel(p.pos);
      g.setAttribute("transform", `translate(${x}, ${y})`);
    }

    if (discRef.current && thrower) {
      const { x, y } = yardToPixel(thrower.pos);
      const { dx, dy } = PIECE_TOKENS.disc.offsetPx;
      discRef.current.setAttribute("transform", `translate(${x + dx}, ${y + dy})`);
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
  }

  return (
    <g data-testid="pieces">
      {players.map((p) => {
        const isSpecial = p.role === "thrower" || p.role === "mark";
        const style = p.team === "offense" ? PIECE_TOKENS.offense : PIECE_TOKENS.defense;
        const radius = isSpecial ? PIECE_TOKENS.special.radius : style.radius;
        return (
          <g
            key={p.id}
            className="fv-piece"
            // How the drag controller hands keyboard focus to the piece it
            // just grabbed, so click-then-arrow-key nudging still works.
            data-piece-id={p.id}
            ref={(el) => {
              if (el) pieceRefs.current.set(p.id, el);
              else pieceRefs.current.delete(p.id);
            }}
            tabIndex={disabled ? -1 : 0}
            role="button"
            aria-disabled={disabled || undefined}
            aria-label={`${p.team} ${p.role}${p.label ? ` ${p.label}` : ""}`}
            onKeyDown={(e) => handleKeyDown(p.id, e)}
            style={{
              cursor: disabled ? "default" : "grab",
              outline: "none",
              // The container owns the drag; a piece must never swallow the
              // pointerdown that the picker needs to see.
              pointerEvents: "none",
            }}
          >
            {/* Focus indicator. Drawn explicitly rather than left to the
                browser's default ring, which boxes the <g>'s bounding box —
                that is what used to put a black rectangle on the field. */}
            <circle
              className="fv-piece-focus-ring"
              r={radius + PIECE_TOKENS.focusRing.gap}
              fill="none"
              stroke={PIECE_TOKENS.focusRing.stroke}
              strokeWidth={PIECE_TOKENS.focusRing.strokeWidth}
              opacity={0}
            />
            <circle
              r={radius}
              fill={style.fill}
              stroke={isSpecial ? PIECE_TOKENS.special.stroke : undefined}
              strokeWidth={isSpecial ? PIECE_TOKENS.special.strokeWidth : undefined}
            />
            {p.label && (
              <text
                y={PIECE_TOKENS.label.fontSize / 2}
                textAnchor="middle"
                fontSize={PIECE_TOKENS.label.fontSize}
                fill={PIECE_TOKENS.label.fill}
                pointerEvents="none"
              >
                {p.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Disc — docked to the thrower, derived every frame, never stored. */}
      <g ref={discRef} aria-hidden="true" pointerEvents="none">
        <circle
          r={PIECE_TOKENS.disc.radius}
          fill={PIECE_TOKENS.disc.fill}
          stroke={PIECE_TOKENS.disc.stroke}
          strokeWidth={PIECE_TOKENS.disc.strokeWidth}
        />
      </g>

      {/* Mark's directional indicator: the only force input in the UI. */}
      <line
        ref={markDirRef}
        stroke={PIECE_TOKENS.markDirection.stroke}
        strokeWidth={PIECE_TOKENS.markDirection.strokeWidth}
        pointerEvents="none"
        aria-hidden="true"
      />
    </g>
  );
}
