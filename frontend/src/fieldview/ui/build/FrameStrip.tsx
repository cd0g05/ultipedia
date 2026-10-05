// Build's frame strip: every frame as a small static picture, four across,
// scrolling sideways for more, with a badge for what the frame changed and an
// "Add frame" tile at the end. The current frame is kept in view. Keyboard:
// ←/→ move between frames, Delete/Backspace removes the focused frame.

import { useEffect, useMemo, useRef } from "react";
import type { KeyboardEvent } from "react";
import type { Play } from "../../play/format";
import { discChangedIn, placedIds, resolveAll } from "../../play/model";
import { MAX_FRAMES } from "../../play/format";
import { FrameThumb } from "../content/Filmstrip";

export interface FrameStripProps {
  play: Play;
  version: number;
  frameIndex: number;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onDelete: (i: number) => void;
}

export function badgeFor(play: Play, i: number): string {
  if (i === 0) return "";
  const n = placedIds(play, i).length;
  const parts: string[] = [];
  if (n > 0) parts.push(`${n} placed`);
  if (discChangedIn(play, i)) parts.push("disc");
  return parts.join(" · ");
}

export function FrameStrip({ play, version, frameIndex, onSelect, onAdd, onDelete }: FrameStripProps) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  // Thumbnails are drawn once per document version, never per animation frame.
  const thumbs = useMemo(
    () => resolveAll(play).map((frame, i) => <FrameThumb key={i} play={play} frame={frame} />),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-frame="${frameIndex}"]`);
    el?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [frameIndex]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const focused = (document.activeElement as HTMLElement | null)?.dataset?.frame;
    const at = focused === undefined ? frameIndex : Number(focused);
    if (e.key === "ArrowRight" && at < play.frames.length - 1) {
      e.preventDefault();
      onSelect(at + 1);
      stripRef.current?.querySelector<HTMLElement>(`[data-frame="${at + 1}"]`)?.focus();
    } else if (e.key === "ArrowLeft" && at > 0) {
      e.preventDefault();
      onSelect(at - 1);
      stripRef.current?.querySelector<HTMLElement>(`[data-frame="${at - 1}"]`)?.focus();
    } else if ((e.key === "Delete" || e.key === "Backspace") && focused !== undefined) {
      e.preventDefault();
      onDelete(at);
    }
  }

  const full = play.frames.length >= MAX_FRAMES;
  return (
    <div
      ref={stripRef}
      data-testid="frame-strip"
      role="group"
      aria-label="Frames"
      onKeyDown={onKeyDown}
      className="flex gap-3 overflow-x-auto pb-3"
    >
      {play.frames.map((frame, i) => {
        const active = i === frameIndex;
        const badge = badgeFor(play, i);
        return (
          <button
            key={i}
            type="button"
            data-frame={i}
            aria-label={`Frame ${i + 1}${frame.label ? `: ${frame.label}` : ""}`}
            aria-current={active ? "step" : undefined}
            onClick={() => onSelect(i)}
            style={{ flex: "0 0 calc((100% - 2.25rem) / 4)" }}
            className={`relative border bg-white p-2 text-left ${
              active ? "border-film-accentPink ring-1 ring-film-accentPink" : "border-film-border hover:bg-film-panel"
            }`}
          >
            {badge && (
              <span
                data-testid="frame-badge"
                className="absolute right-3 top-3 border border-film-accentPink bg-white px-1.5 font-mono text-[10px] font-bold uppercase text-film-accentPink"
              >
                {badge}
              </span>
            )}
            {thumbs[i]}
            <span
              className={`mt-2 flex justify-between font-mono text-[11px] font-bold uppercase tracking-wider ${
                active ? "text-film-accentPink" : "text-zinc-900"
              }`}
            >
              <span className="truncate">
                {i + 1}
                {frame.label ? ` · ${frame.label}` : ""}
              </span>
              {active && <span>Now</span>}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onAdd}
        disabled={full}
        aria-label="Add frame"
        style={{ flex: "0 0 calc((100% - 2.25rem) / 4)" }}
        className="grid min-h-[6rem] place-items-center border border-dashed border-zinc-400 bg-white font-mono text-xs font-bold uppercase tracking-wider text-zinc-600 hover:bg-film-panel disabled:cursor-not-allowed disabled:text-zinc-300"
      >
        + Add frame
      </button>
    </div>
  );
}
