// /fieldview/watch — step through curated plays. A play's frames are its
// frames; Next/Previous animate between them, Play runs the lot. Watch is
// read-only: nothing on the field can be dragged, so a phone handed round the
// huddle cannot be broken.
//
// The plays are toy content for now (placeholders register #3–#5).

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Seo } from "../../encyclopedia/seo/Seo";
import { BUILTIN_PLAYS, isSetup } from "../play/plays";
import { library, newPlayId, useLibrary } from "../play/library";
import { BAD_LINK_MESSAGE, codeFromHash, decodePlay } from "../play/share";
import { PlayValidationError } from "../play/validate";
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

// The play in a shared link, if the address carries one. `error` is the message
// to show for a link that is damaged, too large or from another version.
function useSharedPlay(): { play: Play | null; error: string | null; code: string | null } {
  const { hash } = useLocation();
  return useMemo(() => {
    const code = codeFromHash(hash);
    if (code === null) return { play: null, error: null, code: null };
    try {
      return { play: decodePlay(code), error: null, code };
    } catch (error) {
      return { play: null, error: error instanceof PlayValidationError ? error.message : BAD_LINK_MESSAGE, code };
    }
  }, [hash]);
}

// PLACEHOLDER(fieldview-build): wording of the shared-link banner is a
// stand-in (docs/fieldview-placeholders.md #23).
function SharedBanner({ play }: { play: Play }) {
  const [savedId, setSavedId] = useState<string | null>(null);
  useEffect(() => setSavedId(null), [play]);
  return (
    <div data-testid="shared-banner" className="border-b border-film-border bg-white px-4 py-3 text-sm">
      <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">Shared with you</p>
      {savedId ? (
        <p>
          Saved to my plays.{" "}
          <Link className="font-bold text-film-accentPink underline" to={`/fieldview/build/${savedId}`}>
            Open in Build
          </Link>
        </p>
      ) : (
        <button
          type="button"
          onClick={() => {
            const id = newPlayId();
            library.save(id, play);
            setSavedId(id);
          }}
          className="w-full border border-film-border bg-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider hover:bg-film-panel"
        >
          Save to my plays
        </button>
      )}
    </div>
  );
}

function WatchPlay({ plays, shared, linkError }: { plays: readonly Play[]; shared: Play | null; linkError: string | null }) {
  const { store, loadScene } = useFieldViewApp();
  const [index, setIndex] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const [trails, setTrails] = useState(true);
  // A newly opened link is the first thing in the list and is what plays.
  useEffect(() => {
    if (shared) setIndex(0);
  }, [shared]);
  const play = plays[Math.min(index, plays.length - 1)];
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
        caption={
          linkError ? (
            <p role="alert" data-testid="link-error" className="text-sm text-film-accentPink">
              {linkError}
            </p>
          ) : (
            <FrameCaption label={play.frames[playback.frameIndex]?.label} />
          )
        }
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
            {shared && index === 0 && <SharedBanner play={shared} />}
            <p className="px-4 pb-2 pt-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Watch options
            </p>
            {options}
          </>
        }
        sidebar={
          <div className="flex min-h-full flex-col">
            {shared && index === 0 && <SharedBanner play={shared} />}
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
  const entries = useLibrary();
  const { play: shared, error } = useSharedPlay();
  // A shared link first, then the built-in examples, then multi-frame plays from
  // this device's library (one-frame plays are setups: they live in Explore).
  const plays = useMemo<Play[]>(
    () => [
      ...(shared ? [shared] : []),
      ...BUILTIN_PLAYS,
      ...entries.map((e) => e.play).filter((p) => !isSetup(p)),
    ],
    [shared, entries],
  );
  return (
    <>
      {/* PLACEHOLDER(fieldview-ui-rework): title/description are stand-ins (#11). */}
      <Seo
        title="Watch — Field View — Ultipedia"
        description="Watch ultimate plays run frame by frame."
      />
      {plays.length > 0 ? (
        <WatchPlay plays={plays} shared={shared} linkError={error} />
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
