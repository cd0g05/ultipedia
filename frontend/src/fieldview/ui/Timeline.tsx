// The keyframe strip (Designer only). Chips lay out proportionally by
// timestamp, so "reorder" and "retime" are the same gesture — dragging a
// chip past its neighbour changes its `t`, and the parent re-sorts. That
// keeps one source of truth for ordering (the timestamp) instead of an
// index the timestamps could contradict.

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { PlayKeyframe } from "../play/format";

export const DEFAULT_KEYFRAME_GAP = 1.5;

// Strip layout needs a non-zero span even when every keyframe sits at 0.0s.
const MIN_SPAN_SECONDS = 1;

interface TimelineProps {
  keyframes: PlayKeyframe[];
  selectedIndex: number | null;
  playhead: number;
  playing: boolean;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDelete: (index: number) => void;
  onRetime: (index: number, t: number) => void;
  onScrub: (t: number) => void;
  onTogglePlay: () => void;
  onInsertAtPlayhead: () => void;
}

export function Timeline({
  keyframes,
  selectedIndex,
  playhead,
  playing,
  onSelect,
  onAdd,
  onDelete,
  onRetime,
  onScrub,
  onTogglePlay,
  onInsertAtPlayhead,
}: TimelineProps) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const draggingChip = useRef<number | null>(null);
  const [retimeDraft, setRetimeDraft] = useState<string | null>(null);

  const duration = keyframes.length > 0 ? keyframes[keyframes.length - 1].t : 0;
  const span = Math.max(duration, MIN_SPAN_SECONDS);
  const canPlay = keyframes.length >= 2;
  const betweenKeyframes = selectedIndex === null;

  function percentFor(t: number): number {
    return (t / span) * 100;
  }

  function tFromClientX(clientX: number): number {
    const strip = stripRef.current;
    if (!strip) return 0;
    const rect = strip.getBoundingClientRect();
    if (rect.width === 0) return 0;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Number((ratio * span).toFixed(2));
  }

  function handleChipPointerDown(index: number, e: ReactPointerEvent<HTMLButtonElement>) {
    // The first keyframe is the play's origin and stays pinned at 0.0s;
    // retiming it would silently shift every other timestamp's meaning.
    if (index === 0) return;
    draggingChip.current = index;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function handleChipPointerMove(index: number, e: ReactPointerEvent<HTMLButtonElement>) {
    if (draggingChip.current !== index) return;
    onRetime(index, tFromClientX(e.clientX));
  }

  function handleChipPointerUp(index: number, e: ReactPointerEvent<HTMLButtonElement>) {
    if (draggingChip.current === index) draggingChip.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }

  function commitRetime(index: number) {
    if (retimeDraft === null) return;
    const parsed = Number(retimeDraft);
    if (Number.isFinite(parsed) && parsed >= 0) onRetime(index, parsed);
    setRetimeDraft(null);
  }

  const selected = selectedIndex !== null ? keyframes[selectedIndex] : undefined;

  return (
    <div className="w-full border-t border-zinc-300 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={!canPlay}
          className="border border-film-accentPink px-4 py-1.5 font-mono text-sm uppercase tracking-wider text-film-accentPink disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-400"
        >
          {playing ? "Pause" : "Play"}
        </button>

        <button
          type="button"
          onClick={onAdd}
          className="border border-zinc-400 px-4 py-1.5 font-mono text-sm uppercase tracking-wider text-zinc-700 hover:border-film-accentPink hover:text-film-accentPink"
        >
          + Keyframe
        </button>

        {!canPlay && (
          <p className="font-mono text-xs text-zinc-500">Add a second keyframe to play.</p>
        )}

        <span className="ml-auto font-mono text-xs tabular-nums text-zinc-500">
          {playhead.toFixed(2)}s / {duration.toFixed(2)}s
        </span>
      </div>

      <div ref={stripRef} className="relative mt-4 h-16 w-full">
        {/* The rail the chips sit on. */}
        <div className="absolute inset-x-0 top-8 h-px bg-zinc-300" aria-hidden="true" />

        {/* Playhead marker. The keyboard/AT scrub path is the range input
            below — this is the pointer affordance and is hidden from AT so
            the same control is not announced twice. */}
        <div
          data-testid="playhead"
          aria-hidden="true"
          className="absolute top-4 h-9 w-0.5 bg-film-accentPink"
          style={{ left: `${percentFor(playhead)}%` }}
        />

        <ol className="contents">
          {keyframes.map((kf, index) => (
            <li key={`${index}-${kf.t}`} className="contents">
              <button
                type="button"
                onClick={() => onSelect(index)}
                onPointerDown={(e) => handleChipPointerDown(index, e)}
                onPointerMove={(e) => handleChipPointerMove(index, e)}
                onPointerUp={(e) => handleChipPointerUp(index, e)}
                aria-pressed={selectedIndex === index}
                aria-label={`Keyframe ${index + 1} at ${kf.t.toFixed(2)} seconds`}
                className={`absolute top-4 -translate-x-1/2 border px-2 py-1 font-mono text-xs tabular-nums ${
                  selectedIndex === index
                    ? "border-film-accentPink bg-film-accentPink text-white"
                    : "border-zinc-400 bg-white text-zinc-700"
                } ${playing ? "opacity-50" : ""}`}
                style={{ left: `${percentFor(kf.t)}%`, touchAction: "none" }}
              >
                {index + 1}
                <span className="ml-1 text-[0.65rem] opacity-80">{kf.t.toFixed(1)}s</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <label className="flex items-center gap-3">
        <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">Scrub</span>
        <input
          type="range"
          min={0}
          max={span}
          step={0.01}
          value={playhead}
          onChange={(e) => onScrub(Number(e.target.value))}
          aria-label="Playhead"
          aria-valuetext={`${playhead.toFixed(2)} seconds`}
          className="w-full"
        />
      </label>

      {selected && selectedIndex !== null && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-zinc-600">
            Keyframe {selectedIndex + 1} at
            <input
              type="number"
              min={0}
              step={0.1}
              disabled={selectedIndex === 0}
              value={retimeDraft ?? selected.t}
              onChange={(e) => setRetimeDraft(e.target.value)}
              onBlur={() => commitRetime(selectedIndex)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRetime(selectedIndex);
                if (e.key === "Escape") setRetimeDraft(null);
              }}
              aria-label={`Keyframe ${selectedIndex + 1} timestamp in seconds`}
              className="w-20 border border-zinc-300 px-2 py-1 tabular-nums"
            />
            s
          </label>

          {keyframes.length > 1 && (
            <button
              type="button"
              onClick={() => onDelete(selectedIndex)}
              className="font-mono text-xs uppercase tracking-wider text-zinc-500 hover:text-film-accentPink"
            >
              Delete keyframe
            </button>
          )}
        </div>
      )}

      {betweenKeyframes && (
        <p role="status" className="mt-3 font-mono text-xs text-zinc-600">
          Select a keyframe to edit, or{" "}
          <button
            type="button"
            onClick={onInsertAtPlayhead}
            className="uppercase tracking-wider text-film-accentPink underline"
          >
            add one here
          </button>
          .
        </p>
      )}
    </div>
  );
}
