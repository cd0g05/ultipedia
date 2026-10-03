// Watch's playback options: speed, loop, trails. A segmented speed control and
// two switches; the desktop sidebar and the compact menu both render this.

import { PLAYBACK_SPEEDS } from "../playback/playback";
import type { PlaybackSpeed } from "../playback/playback";
import { Switch } from "./Switch";

export interface PlaybackOptionsProps {
  speed: PlaybackSpeed;
  onSpeed: (speed: PlaybackSpeed) => void;
  loop: boolean;
  onLoop: (loop: boolean) => void;
  trails: boolean;
  onTrails: (trails: boolean) => void;
}

export function PlaybackOptions({ speed, onSpeed, loop, onLoop, trails, onTrails }: PlaybackOptionsProps) {
  return (
    <div>
      <div role="group" aria-label="Speed" className="mx-4 mb-3 flex border border-film-border">
        {PLAYBACK_SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={speed === s}
            onClick={() => onSpeed(s)}
            className={`flex-1 border-r border-film-border py-2 font-mono text-xs font-bold last:border-r-0 ${
              speed === s ? "bg-zinc-900 text-white" : "bg-white text-zinc-700 hover:bg-film-panel"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
      <Switch checked={loop} onChange={onLoop}>
        Loop
      </Switch>
      <Switch checked={trails} onChange={onTrails}>
        Show trails
      </Switch>
    </div>
  );
}
