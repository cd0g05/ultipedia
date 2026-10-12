// Build's cards (desktop dock; the compact layout reuses the same pieces):
// Frame, Selected player, Preview, and the play's name/description.

import { useEffect, useState } from "react";
import type { SceneStore } from "../../scene/store";
import type { Play } from "../../play/format";
import {
  deleteFrame,
  duplicateFrame,
  giveDisc,
  placedIds,
  renamePlay,
  resetFrame,
  resetPlayer,
  resolveAll,
  setFrameLabel,
  setTitle,
} from "../../play/model";
import { MAX_LABEL_LENGTH, MAX_TITLE_LENGTH } from "../../play/format";
import { useSelection } from "../shell/useSelection";
import type { BuildSession } from "./BuildSession";
import { BTN, BTN_PRIMARY } from "./controls";
import { badgeFor } from "./FrameStrip";

// ── Frame ────────────────────────────────────────────────────────────────────

export function FrameActions({
  play,
  frameIndex,
  session,
  small = false,
}: {
  play: Play;
  frameIndex: number;
  session: BuildSession;
  small?: boolean;
}) {
  const b = small ? `${BTN} h-9 px-2 text-[11px] tracking-normal` : BTN;
  return (
    <div className={small ? "flex gap-1.5 [&>button]:flex-1 [&>button]:px-1" : "flex flex-wrap gap-2"}>
      <button type="button" className={b} onClick={() => session.apply((p, i) => duplicateFrame(p, i))}>
        Duplicate
      </button>
      <button
        type="button"
        className={b}
        disabled={frameIndex === 0}
        onClick={() => session.apply((p, i) => resetFrame(p, i))}
      >
        Reset frame
      </button>
      <button
        type="button"
        className={b}
        disabled={play.frames.length <= 1}
        onClick={() => {
          session.apply((p, i) => deleteFrame(p, i));
        }}
      >
        Delete
      </button>
    </div>
  );
}

// PLACEHOLDER(fieldview-build): this copy is a stand-in (docs/fieldview-placeholders.md #23).
const NO_CHANGES = "No changes — same as the previous frame.";

// The Frame card (mockup: the left of three cards under the field): which
// frame, its label, and its actions. A row on compact layouts, a square-ish card
// on desktop.
export function FrameCard({
  play,
  frameIndex,
  session,
  previewing,
}: {
  play: Play;
  frameIndex: number;
  session: BuildSession;
  previewing: boolean;
}) {
  const frame = play.frames[frameIndex];
  const badge = badgeFor(play, frameIndex);
  const count = play.frames.length;
  return (
    <div
      role="group"
      aria-label="Frame"
      {...(previewing ? { inert: "" } : {})}
      className="flex h-full flex-wrap items-center gap-x-3 gap-y-2 border border-film-border bg-white px-3 py-2 desktop:flex-col desktop:items-stretch desktop:justify-between desktop:gap-2"
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h2 className="whitespace-nowrap font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Frame {frameIndex + 1} of {count}
        </h2>
        <span
          className="whitespace-nowrap border border-film-border px-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-600"
          title={frameIndex > 0 && !badge ? NO_CHANGES : undefined}
        >
          {frameIndex === 0 ? "Starting positions" : badge || "No changes"}
        </span>
      </div>
      <label className="sr-only" htmlFor="frame-label">
        Label
      </label>
      {/* Committed on blur/Enter so a label is one undo step, not one per key. */}
      <input
        id="frame-label"
        key={`${frameIndex}-${frame.label ?? ""}`}
        type="text"
        maxLength={MAX_LABEL_LENGTH}
        defaultValue={frame.label ?? ""}
        placeholder={`Label · Frame ${frameIndex + 1}`}
        onBlur={(e) => {
          if (e.target.value !== (frame.label ?? "")) session.apply((p, i) => setFrameLabel(p, i, e.target.value));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="h-9 w-40 min-w-0 border border-film-border bg-white px-2 text-sm desktop:w-full"
      />
      <FrameActions play={play} frameIndex={frameIndex} session={session} small />
    </div>
  );
}

// The Preview card (the right of the three): watch the play from the start or
// from this frame, with the same transitions as Watch.
export function PreviewCard({
  frameIndex,
  frameCount,
  previewing,
  onPlayAll,
  onFromHere,
  onStop,
}: {
  frameIndex: number;
  frameCount: number;
  previewing: boolean;
  onPlayAll: () => void;
  onFromHere: () => void;
  onStop: () => void;
}) {
  return (
    <div
      role="group"
      aria-label="Preview"
      className="flex h-full flex-wrap items-center gap-x-3 gap-y-2 border border-film-border bg-white px-3 py-2 desktop:flex-col desktop:items-stretch desktop:justify-between desktop:gap-2"
    >
      <h2 className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">Preview</h2>
      <div className="flex gap-2 desktop:w-full">
        {previewing ? (
          <button type="button" className={`${BTN_PRIMARY} h-9 flex-1`} onClick={onStop}>
            Stop
          </button>
        ) : (
          <>
            <button type="button" className={`${BTN_PRIMARY} h-9 flex-1`} disabled={frameCount < 2} onClick={onPlayAll}>
              Play all
            </button>
            <button type="button" className={`${BTN} h-9 flex-1`} disabled={frameIndex >= frameCount - 1} onClick={onFromHere}>
              From frame {frameIndex + 1}
            </button>
          </>
        )}
      </div>
      <p className="hidden text-xs text-zinc-600 desktop:block">
        Same transitions as Watch. Everything in a frame starts and arrives together.
      </p>
    </div>
  );
}

// ── Selected player ──────────────────────────────────────────────────────────

function selectedPlayerId(store: SceneStore): string | null {
  const sel = store.getSelection();
  return sel.kind === "offense" || sel.kind === "defense" || sel.kind === "mark" ? sel.id : null;
}

export interface BuildPlayerCardProps {
  store: SceneStore;
  play: Play;
  frameIndex: number;
  session: BuildSession;
  // The compact layout shows this as a one-row bar, not a card.
  bar?: boolean;
}

export function BuildPlayerCard({ store, play, frameIndex, session, bar = false }: BuildPlayerCardProps) {
  useSelection(store);
  const id = selectedPlayerId(store);
  const ref = id ? play.players.find((p) => p.id === id) : undefined;
  const all = resolveAll(play);
  const here = all[frameIndex];

  // The panel is always here and never changes size: with nobody selected the
  // same controls are shown greyed out, so picking a player moves nothing.
  const selected = ref !== undefined && id !== null;
  const offense = ref?.team === "offense";
  const holds = selected && here.holder === id;
  const placed = selected && placedIds(play, frameIndex).includes(id);
  const before = selected && frameIndex > 0 ? all[frameIndex - 1].positions[id] : undefined;
  const now = selected ? here.positions[id] : undefined;
  const moved = before && now ? Math.hypot(now.x - before.x, now.y - before.y) : 0;
  const ordinal = ref ? play.players.filter((p) => p.team === ref.team).findIndex((p) => p.id === id) + 1 : 0;
  const name = ref ? `${offense ? "Offense" : "Defense"} ${ordinal}` : "Selected player";
  const status = !selected ? "None selected" : frameIndex === 0 ? "Starting position" : placed ? "Placed in this frame" : "Inherited";

  // PLACEHOLDER(fieldview-build): this hint is a stand-in (docs/fieldview-placeholders.md #23).
  const footer = !selected
    ? "Select a player to name them, give them the disc, or undo a move."
    : frameIndex > 0
      ? `Moved from frame ${frameIndex}: ${moved.toFixed(1)} yd`
      : "";

  const controls = (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
        Title
        <input
          type="text"
          aria-label="Player title"
          maxLength={MAX_TITLE_LENGTH + 2}
          autoComplete="off"
          spellCheck={false}
          placeholder="—"
          disabled={!selected}
          value={ref?.title ?? ""}
          onChange={(e) => id && session.apply((p) => setTitle(p, id, e.target.value), { sync: true })}
          className="h-9 w-14 border border-film-border bg-white text-center font-mono text-sm font-bold uppercase text-zinc-900 disabled:bg-film-panel disabled:text-zinc-300"
        />
      </label>
      <button
        type="button"
        className={`${BTN_PRIMARY} h-9`}
        disabled={!selected || !offense || holds}
        onClick={() => id && session.apply((p, i) => giveDisc(p, i, id))}
      >
        {holds ? "Has the disc" : "Give disc"}
      </button>
      <button
        type="button"
        className={`${BTN} h-9`}
        disabled={!placed}
        onClick={() => id && session.apply((p, i) => resetPlayer(p, i, id))}
      >
        Reset player
      </button>
    </div>
  );

  return (
    <div
      role="group"
      aria-label="Selected player"
      data-testid="build-player"
      data-empty={selected ? "false" : "true"}
      className={`flex min-w-0 flex-col justify-between gap-2 border border-film-border bg-white px-3 py-2 data-[empty=true]:text-zinc-400 ${
        bar ? "w-full" : "h-full"
      }`}
    >
      <h2 className="flex items-center justify-between gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
        <span className={selected ? "text-zinc-900" : undefined}>{name}</span>
        <span className="border border-film-border px-1.5 text-zinc-600">{status}</span>
      </h2>
      {controls}
      <p className="min-h-[2.25rem] text-xs text-zinc-600">{footer}</p>
    </div>
  );
}

// ── Play name and description (sidebar / menu) ───────────────────────────────

export function PlayMeta({ play, session }: { play: Play; session: BuildSession }) {
  const [name, setName] = useState(play.name);
  const [description, setDescription] = useState(play.description ?? "");
  useEffect(() => {
    setName(play.name);
    setDescription(play.description ?? "");
  }, [play.name, play.description]);

  const commit = () => {
    if (name !== play.name || description !== (play.description ?? "")) {
      session.apply((p) => renamePlay(p, name, description));
    }
  };
  const field = "mb-3 h-10 w-full border border-film-border bg-white px-3 text-sm";
  const label = "mb-1 block font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400";
  return (
    <div className="px-4 pb-2">
      <label className={label} htmlFor="play-name">
        Name
      </label>
      <input id="play-name" className={field} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
      <label className={label} htmlFor="play-description">
        Description
      </label>
      <input id="play-description" className={field} value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
    </div>
  );
}
