// The pending route drawn on the field: numbered markers joined by dashed
// legs, from the selected player through each waypoint in order.
//
// Only the SELECTED player's route is drawn, though several players may hold
// routes and all of them run together (PRD FR-2.6). A full play's routes drawn
// at once is an unreadable tangle — resolving that is Initiative D's job, with
// frames, and pre-empting it here would mean designing the same thing twice.
//
// Rendered in yard space and transformed by the caller's existing stage
// transform, like every other layer: orientation lives only in coords.ts
// (canon ADR-11), and this file has no idea which way the field points.

import type { Vec2 } from "../scene/types";
import type { Route } from "../motion/types";
import { ROUTE_TOKENS } from "./tokens";
import { yardToPixel } from "./coords";

interface RouteLayerProps {
  route: Route | undefined;
  // Where the legs start from — the player the route belongs to.
  origin: Vec2 | undefined;
  // Suppressed during a run: the markers describe a plan, and while the plan
  // is being executed they would sit under moving pieces saying nothing new.
  hidden?: boolean;
}

export function RouteLayer({ route, origin, hidden }: RouteLayerProps) {
  if (hidden || !route || !origin || route.legs.length === 0) return null;

  const points = [origin, ...route.legs].map((p) => yardToPixel(p));
  const { marker, markerLabel, leg } = ROUTE_TOKENS;
  const half = marker.size / 2;

  return (
    <g aria-hidden="true" data-testid="route-layer" style={{ pointerEvents: "none" }}>
      {points.slice(0, -1).map((from, i) => {
        const to = points[i + 1];
        return (
          <line
            key={`leg-${i}`}
            data-leg={i}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={leg.stroke}
            strokeWidth={leg.strokeWidth}
            strokeDasharray={leg.dash}
            opacity={leg.opacity}
          />
        );
      })}

      {points.slice(1).map((p, i) => (
        // data-waypoint is what FieldCanvas's pointer path uses to recognise a
        // press on a marker as a waypoint drag rather than a piece grab.
        <g key={`wp-${i}`} data-waypoint={i}>
          <rect
            x={p.x - half}
            y={p.y - half}
            width={marker.size}
            height={marker.size}
            fill={marker.fill}
            stroke={marker.stroke}
            strokeWidth={marker.strokeWidth}
          />
          <text
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={markerLabel.fill}
            fontSize={markerLabel.fontSize}
            fontFamily={markerLabel.fontFamily}
          >
            {i + 1}
          </text>
        </g>
      ))}
    </g>
  );
}
