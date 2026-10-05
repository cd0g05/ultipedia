// /fieldview/watch — step through curated plays. A play's frames are its
// frames; Next/Previous animate between them, Play runs the lot. Watch is
// read-only: nothing on the field can be dragged, so a phone handed round the
// huddle cannot be broken.
//
// The plays are toy content for now (placeholders register #3–#5).

import { useEffect, useState } from "react";
import { Seo } from "../../encyclopedia/seo/Seo";
import { BUILTIN_PLAYS } from "../play/plays";
import { toScene } from "../play/model";
import { FieldViewFrame } from "../ui/app/FieldViewFrame";
import { useFieldViewApp } from "../ui/app/FieldViewApp";
import { SlideOver } from "../ui/app/SlideOver";
import { Filmstrip } from "../ui/content/Filmstrip";
import { PlayList } from "../ui/content/PlayList";
import { PlaybackOptions } from "../ui/content/PlaybackOptions";
import { TrailLayer } from "../ui/content/TrailLayer";
import { Transport } from "../ui/content/Transport";
import { usePlayback } from "../ui/playback/usePlayback";
import type { Play } from "../play/format";

// The frame's label as a one-line caption under the field (a frame's label is
// short — 24 characters at most — so it never wraps the layout).
function FrameCaption({ label }: { label?: string }) {
  if (!label) return null;
  return (
    <p data-testid="frame-caption" className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-600">
      {label}
    </p>
  );
}

function WatchPlay({ plays }: { plays: readonly Play[] }) {
  const { store, loadScene } = useFieldViewApp();
  const [index, setIndex] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const [trails, setTrails] = useState(true);
  const play = plays[index];
  const playback = usePlayback(store, play);
  const { controller } = playback;

  // A new play replaces the scene (same roster shape, new poses and model).
  useEffect(() => {
    loadScene(toScene(play, 0));
    controller.goto(0);
  }, [play, controller, loadScene]);

  const playing = playback.status === "playing";
  const options = (
    <PlaybackOptions
      speed={playback.speed}
      onSpeed={controller.setSpeed}
      loop={playback.loop}
      onLoop={controller.setLoop}
      trails={trails}
      onTrails={setTrails}
    />
  );
  const selectPlay = (i: number) => {
    setIndex(i);
    setListOpen(false);
  };

  return (
    <>
      <FieldViewFrame
        mode="watch"
        fieldDisabled
        onFieldTap={() => (playing ? controller.pause() : controller.play())}
        fieldOverlay={trails ? <TrailLayer play={play} frameIndex={playback.frameIndex} /> : null}
        caption={<FrameCaption label={play.frames[playback.frameIndex]?.label} />}
        barCenter={<Transport playback={playback} />}
        barRight={
          <button
            type="button"
            aria-label="Choose a play"
            aria-haspopup="dialog"
            onClick={() => setListOpen(true)}
            className="flex h-10 max-w-[9rem] flex-col justify-center border border-film-border bg-white px-3 text-left leading-tight hover:bg-film-panel"
          >
            <span className="font-mono text-[10px] uppercase text-zinc-400">Play</span>
            <span className="truncate font-mono text-xs font-bold uppercase tracking-wider">
              {play.name} ▾
            </span>
          </button>
        }
        menuExtras={
          <>
            <p className="px-4 pb-2 pt-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Watch options
            </p>
            {options}
          </>
        }
        sidebar={
          <div className="flex min-h-full flex-col">
            <section aria-label="Plays" className="border-b border-film-border">
              <h2 className="flex justify-between px-4 pb-2 pt-4 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Plays <span>{plays.length}</span>
              </h2>
              <PlayList plays={plays} activeIndex={index} onSelect={selectPlay} />
            </section>
            <section aria-label="Playback" className="border-b border-film-border py-1">
              <h2 className="px-4 pb-2 pt-3 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Playback
              </h2>
              {options}
            </section>
          </div>
        }
        dock={
          <div className="flex flex-col gap-4">
            <div className="flex justify-center">
              <Transport playback={playback} large />
            </div>
            <Filmstrip play={play} playback={playback} />
          </div>
        }
      />
      <SlideOver open={listOpen} onClose={() => setListOpen(false)} title="Plays">
        <PlayList plays={plays} activeIndex={index} onSelect={selectPlay} />
      </SlideOver>
    </>
  );
}

export function Watch() {
  return (
    <>
      {/* PLACEHOLDER(fieldview-ui-rework): title/description are stand-ins (#11). */}
      <Seo
        title="Watch — Field View — Ultipedia"
        description="Watch ultimate plays run frame by frame."
      />
      {BUILTIN_PLAYS.length > 0 ? (
        <WatchPlay plays={BUILTIN_PLAYS} />
      ) : (
        <FieldViewFrame
          mode="watch"
          showField={false}
          body={
            <p role="status" className="m-auto text-sm text-zinc-600">
              No plays are available right now.
            </p>
          }
        />
      )}
    </>
  );
}
