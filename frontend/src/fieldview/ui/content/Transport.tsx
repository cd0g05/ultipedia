// Watch's transport: previous / play-pause / next, plus the progress dots.
// Compact puts it in the top bar; desktop puts the large variant in the dock.
// Dots are buttons (jump to a frame); past MAX_DOTS frames they collapse to the
// "n / N" counter alone, which stays honest at any length.

import type { PlaybackView } from "../playback/usePlayback";

const MAX_DOTS = 10;

const btn =
  "grid h-10 w-10 place-items-center border border-film-border bg-white text-zinc-900 hover:bg-film-panel disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-white";

function Icon({ d, fill }: { d: string; fill?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth="2.2"
      strokeLinecap="square"
    >
      <path d={d} />
    </svg>
  );
}

export interface TransportProps {
  playback: PlaybackView;
  // Larger buttons for the desktop dock.
  large?: boolean;
}

export function Transport({ playback, large = false }: TransportProps) {
  const { controller, frameIndex, frameCount, status } = playback;
  const playing = status === "playing";
  const size = large ? "h-12 w-14" : "";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Previous frame"
        disabled={frameIndex <= 0}
        onClick={() => controller.prev()}
        className={`${btn} ${size}`}
      >
        <Icon d="M6 5v14M18 5l-9 7 9 7z" />
      </button>
      <button
        type="button"
        aria-label={playing ? "Pause" : "Play"}
        aria-pressed={playing}
        onClick={() => (playing ? controller.pause() : controller.play())}
        className={`grid h-10 w-12 place-items-center border border-film-accentPink bg-film-accentPink text-white hover:bg-film-accentPinkDark ${
          large ? "h-12 w-16" : ""
        }`}
      >
        {playing ? <Icon d="M7 5h3v14H7zM14 5h3v14h-3z" fill /> : <Icon d="M8 5v14l11-7z" fill />}
      </button>
      <button
        type="button"
        aria-label="Next frame"
        disabled={frameIndex >= frameCount - 1}
        onClick={() => controller.next()}
        className={`${btn} ${size}`}
      >
        <Icon d="M18 5v14M6 5l9 7-9 7z" />
      </button>

      <div className="flex items-center gap-2 px-2 font-mono text-xs font-bold text-zinc-600">
        {frameCount <= MAX_DOTS && (
          <ol aria-label="Frames" className="flex items-center gap-1.5">
            {Array.from({ length: frameCount }, (_, i) => (
              <li key={i}>
                <button
                  type="button"
                  aria-label={`Go to frame ${i + 1}`}
                  aria-current={i === frameIndex ? "step" : undefined}
                  onClick={() => controller.goto(i)}
                  className={`block ${large ? "h-3.5 w-3.5" : "h-2.5 w-2.5"} ${
                    i <= frameIndex ? "bg-film-accentPink" : "bg-film-border"
                  }`}
                />
              </li>
            ))}
          </ol>
        )}
        <span aria-live="polite" data-testid="frame-counter">
          {frameIndex + 1} / {frameCount}
        </span>
      </div>
    </div>
  );
}
