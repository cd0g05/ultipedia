// Watch's desktop filmstrip (FR-5.3): every frame as a small static picture,
// four showing at a time, scrolling sideways for plays with more. The
// thumbnails are plain SVG drawn once per play — no heat, no per-frame work —
// and clicking one jumps to it. The current frame is kept in view.

import { useEffect, useMemo, useRef } from "react";
import type { Play } from "../../play/format";
import { resolveAll } from "../../play/model";
import type { ResolvedFrame } from "../../play/model";
import { FIELD_PX_HEIGHT, FIELD_PX_WIDTH, FieldLayer } from "../../render/fieldLayer";
import { getStageViewBox, viewBoxToString, yardToPixel } from "../../render/coords";
import { PIECE_TOKENS } from "../../render/tokens";
import type { PlaybackView } from "../playback/usePlayback";

const VIEW_BOX = viewBoxToString(getStageViewBox(FIELD_PX_WIDTH, FIELD_PX_HEIGHT));
const THUMB_RADIUS = PIECE_TOKENS.offense.radius * 0.85;

export function FrameThumb({ play, frame }: { play: Play; frame: ResolvedFrame }) {
  return (
    <svg viewBox={VIEW_BOX} aria-hidden="true" className="block h-auto w-full border border-film-border bg-white">
      <FieldLayer />
      {play.players.map((e) => {
        const at = frame.positions[e.id];
        if (!at) return null;
        const { x, y } = yardToPixel(at);
        const style = e.team === "offense" ? PIECE_TOKENS.offense : PIECE_TOKENS.defense;
        return (
          <circle
            key={e.id}
            cx={x}
            cy={y}
            r={THUMB_RADIUS}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
          />
        );
      })}
    </svg>
  );
}

export interface FilmstripProps {
  play: Play;
  playback: PlaybackView;
}

export function Filmstrip({ play, playback }: FilmstripProps) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const current = playback.frameIndex;
  const thumbs = useMemo(
    () => resolveAll(play).map((frame, i) => <FrameThumb key={i} play={play} frame={frame} />),
    [play],
  );

  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-frame="${current}"]`);
    // jsdom has no scrollIntoView; a real browser keeps the frame in view.
    el?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [current]);

  return (
    <div
      ref={stripRef}
      data-testid="filmstrip"
      aria-label="Frames"
      className="flex gap-4 overflow-x-auto pb-3"
    >
      {play.frames.map((kf, i) => {
        const active = i === current;
        return (
          <button
            key={i}
            type="button"
            data-frame={i}
            aria-label={`Frame ${i + 1}${kf.label ? `: ${kf.label}` : ""}`}
            aria-current={active ? "step" : undefined}
            onClick={() => playback.controller.goto(i)}
            // Four across: each frame is a quarter of the strip less its gaps.
            style={{ flex: "0 0 calc((100% - 3rem) / 4)" }}
            className={`border bg-white p-2 text-left ${
              active ? "border-film-accentPink ring-1 ring-film-accentPink" : "border-film-border hover:bg-film-panel"
            }`}
          >
            {thumbs[i]}
            <span
              className={`mt-2 flex justify-between font-mono text-[11px] font-bold uppercase tracking-wider ${
                active ? "text-film-accentPink" : "text-zinc-900"
              }`}
            >
              <span>
                {i + 1}
                {kf.label ? ` · ${kf.label}` : ""}
              </span>
              {active && <span>Now</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
