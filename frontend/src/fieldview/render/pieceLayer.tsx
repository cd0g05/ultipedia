// SVG piece layer: pointer drag writes directly to the scene store via
// imperative DOM transforms (ADR-2) — no React state changes per pointer
// move. React only re-renders this layer when the *identity* list (props)
// changes, e.g. on a preset load, which is a discrete, human-speed event
// owned by the page component.

import { useEffect, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import type { Player } from "../scene/types";
import type { SceneStore } from "../scene/store";
import { movePlayer, moveThrower } from "../scene/scene";
import { clientToYard, getStageViewBox, yardToPixel } from "./coords";
import { FIELD_PX_HEIGHT, FIELD_PX_WIDTH } from "./fieldLayer";
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
  getSvg: () => SVGSVGElement | null;
  // Designer mode blocks editing while playing back or while scrubbed
  // between keyframes — the pieces still render and still repaint every
  // frame, they just stop accepting input.
  disabled?: boolean;
}

export function PieceLayer({ players, store, getSvg, disabled = false }: PieceLayerProps) {
  const pieceRefs = useRef(new Map<string, SVGGElement>());
  const discRef = useRef<SVGGElement | null>(null);
  const markDirRef = useRef<SVGLineElement | null>(null);
  const draggingId = useRef<string | null>(null);

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

  function moveTo(id: string, pos: { x: number; y: number }) {
    store.mutate((draft) => {
      const player = draft.players.find((p) => p.id === id);
      if (!player) return;
      if (player.role === "thrower") moveThrower(draft, pos);
      else movePlayer(draft, id, pos);
    });
  }

  function handlePointerDown(id: string, e: ReactPointerEvent<SVGGElement>) {
    if (disabled) return;
    draggingId.current = id;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(id: string, e: ReactPointerEvent<SVGGElement>) {
    if (draggingId.current !== id) return;
    const svg = getSvg();
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const viewBox = getStageViewBox(FIELD_PX_WIDTH, FIELD_PX_HEIGHT);
    const pos = clientToYard(rect, viewBox, { x: e.clientX, y: e.clientY });
    moveTo(id, pos);
  }

  function handlePointerUp(id: string, e: ReactPointerEvent<SVGGElement>) {
    if (draggingId.current === id) draggingId.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }

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
    moveTo(id, { x: player.pos.x + dx, y: player.pos.y + dy });
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
            ref={(el) => {
              if (el) pieceRefs.current.set(p.id, el);
              else pieceRefs.current.delete(p.id);
            }}
            tabIndex={disabled ? -1 : 0}
            role="button"
            aria-disabled={disabled || undefined}
            aria-label={`${p.team} ${p.role}${p.label ? ` ${p.label}` : ""}`}
            onPointerDown={(e) => handlePointerDown(p.id, e)}
            onPointerMove={(e) => handlePointerMove(p.id, e)}
            onPointerUp={(e) => handlePointerUp(p.id, e)}
            onKeyDown={(e) => handleKeyDown(p.id, e)}
            style={{
              cursor: disabled ? "default" : "grab",
              outline: "none",
              touchAction: "none",
              pointerEvents: disabled ? "none" : undefined,
            }}
          >
            {/* Invisible hit target: comfortably clears the 44x44px minimum
                regardless of the visual glyph's radius. */}
            <circle r={PIECE_TOKENS.hitArea.radiusPx} fill="transparent" />
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
      <g ref={discRef} aria-hidden="true">
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
        aria-hidden="true"
      />
    </g>
  );
}
