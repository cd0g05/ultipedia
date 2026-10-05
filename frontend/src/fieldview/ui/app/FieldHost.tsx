// Renders the one FieldCanvas (ADR-30): reads the store and identity from
// FieldViewApp, the overlay prefs from useOverlayState, and forces the heat ON
// — in the new UI the heatmap is the hero, not a toggle (ADR-32), so the old
// `on` pref is deliberately ignored here. That also makes a stale `on:false`
// left in localStorage by the old Space View button harmless.

import { useRef } from "react";
import type { ReactNode } from "react";
import { FieldCanvas } from "../FieldCanvas";
import { CellReadout, type CellReadoutHandle } from "../CellReadout";
import { useOverlayState } from "../prefs";
import { useFieldViewApp } from "./FieldViewApp";

export interface FieldHostProps {
  // Watch is read-only: no piece can be grabbed.
  disabled?: boolean;
  // A tap anywhere on the field (Watch: pause/resume). The stage is not a
  // control — keyboard users have the transport buttons.
  onTap?: () => void;
  overlayLayer?: ReactNode;
  // Build: players placed in the current frame, and the end of a drag.
  placed?: ReadonlySet<string>;
  onGestureEnd?: (info: { movedIds: string[] }) => void;
}

export function FieldHost({ disabled = false, onTap, overlayLayer, placed, onGestureEnd }: FieldHostProps) {
  const { store, identity } = useFieldViewApp();
  const overlay = useOverlayState();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const readoutRef = useRef<CellReadoutHandle | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  return (
    <div onClick={onTap} role={onTap ? "presentation" : undefined}>
      <FieldCanvas
        store={store}
        // Hidden teams are simply not rendered, which also keeps them out of
        // the tab order.
        players={identity.filter((p) => overlay.visible[p.team])}
        svgRef={svgRef}
        overlay={{
          on: true,
          lens: overlay.lens,
          layers: overlay.layers,
          params: overlay.params,
          colourBlind: overlay.colourBlind,
        }}
        readoutRef={readoutRef}
        canvasRef={canvasRef}
        stageRef={stageRef}
        visible={overlay.visible}
        disabled={disabled}
        overlayLayer={overlayLayer}
        placed={placed}
        onGestureEnd={onGestureEnd}
      />
      {/* Kept mounted and screen-reader-only: it is the model's "why is this
          spot open" answer and the reason colour is never the only carrier of
          meaning (canon convention). */}
      <div className="sr-only">
        <CellReadout ref={readoutRef} />
      </div>
    </div>
  );
}
