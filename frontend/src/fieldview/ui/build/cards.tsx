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
import { BTN, BTN_PRIMARY, Card } from "./controls";
import { badgeFor } from "./FrameStrip";

// ── Frame ────────────────────────────────────────────────────────────────────

export function FrameActions({ play, frameIndex, session }: { play: Play; frameIndex: number; session: BuildSession }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={BTN} onClick={() => session.apply((p, i) => duplicateFrame(p, i))}>
        Duplicate
      </button>
      <button
        type="button"
        className={BTN}
        disabled={frameIndex === 0}
        onClick={() => session.apply((p, i) => resetFrame(p, i))}
      >
        Reset frame
      </button>
      <button
        type="button"
        className={BTN}
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

export function FrameCard({ play, frameIndex, session }: { play: Play; frameIndex: number; session: BuildSession }) {
  const frame = play.frames[frameIndex];
  const badge = badgeFor(play, frameIndex);
  return (
    <Card title={`Frame ${frameIndex + 1} of ${play.frames.length}`} tag={badge || undefined}>
      <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400" htmlFor="frame-label">
        Label
      </label>
      {/* Committed on blur/Enter so a label is one undo step, not one per key. */}
      <input
        id="frame-label"
        key={`${frameIndex}-${frame.label ?? ""}`}
        type="text"
        maxLength={MAX_LABEL_LENGTH}
        defaultValue={frame.label ?? ""}
        placeholder={`Frame ${frameIndex + 1}`}
        onBlur={(e) => {
          if (e.target.value !== (frame.label ?? "")) session.apply((p, i) => setFrameLabel(p, i, e.target.value));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="mb-3 h-10 w-full border border-film-border bg-white px-3 text-sm"
      />
      <FrameActions play={play} frameIndex={frameIndex} session={session} />
      {frameIndex > 0 && !badge && <p className="mt-3 text-xs text-zinc-600">{NO_CHANGES}</p>}
    </Card>
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

  if (!ref || !id) {
    const text = "Select a player to name them, give them the disc, or undo a move.";
    return bar ? (
      <p data-testid="build-player" className="border border-film-border bg-white px-4 py-3 text-sm text-zinc-500">
        {text}
      </p>
    ) : (
      <Card title="Selected player">
        <p data-testid="build-player" className="text-sm text-zinc-500">
          {text}
        </p>
      </Card>
    );
  }

  const offense = ref.team === "offense";
  const holds = here.holder === id;
  const placed = placedIds(play, frameIndex).includes(id);
  const before = frameIndex > 0 ? all[frameIndex - 1].positions[id] : undefined;
  const now = here.positions[id];
  const moved = before ? Math.hypot(now.x - before.x, now.y - before.y) : 0;
  const ordinal = play.players.filter((p) => p.team === ref.team).findIndex((p) => p.id === id) + 1;
  const name = `${offense ? "Offense" : "Defense"} ${ordinal}`;
  const status = frameIndex === 0 ? "Starting position" : placed ? "Placed in this frame" : "Inherited";

  const controls = (
    <div className={bar ? "flex flex-wrap items-center gap-3" : "flex flex-col gap-3"}>
      <label className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
        Title
        <input
          type="text"
          aria-label="Player title"
          maxLength={MAX_TITLE_LENGTH + 2}
          autoComplete="off"
          spellCheck={false}
          placeholder="—"
          value={ref.title ?? ""}
          onChange={(e) => session.apply((p) => setTitle(p, id, e.target.value), { sync: true })}
          className="h-10 w-16 border border-film-border bg-white text-center font-mono text-sm font-bold uppercase text-zinc-900"
        />
      </label>
      <button
        type="button"
        className={BTN_PRIMARY}
        disabled={!offense || holds}
        onClick={() => session.apply((p, i) => giveDisc(p, i, id))}
      >
        {holds ? "Has the disc" : "Give disc"}
      </button>
      <button
        type="button"
        className={BTN}
        disabled={!placed}
        onClick={() => session.apply((p, i) => resetPlayer(p, i, id))}
      >
        Reset player
      </button>
    </div>
  );

  if (bar) {
    return (
      <div data-testid="build-player" className="flex flex-wrap items-center gap-4 border border-film-border bg-white px-4 py-2">
        <span className="border border-film-border px-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-600">
          {name} · {status}
        </span>
        {controls}
        {frameIndex > 0 && (
          <span className="ml-auto text-xs text-zinc-600">
            Moved from frame {frameIndex}: <b className="font-mono">{moved.toFixed(1)} yd</b>
          </span>
        )}
      </div>
    );
  }
  return (
    <Card title="Selected player" tag={status}>
      <div data-testid="build-player">
        <p className="mb-3 font-mono text-xs font-bold uppercase tracking-wider">{name}</p>
        {controls}
        {frameIndex > 0 && (
          <p className="mt-3 flex justify-between border-t border-film-border pt-2 text-xs text-zinc-600">
            <span>Moved from frame {frameIndex}</span>
            <b className="font-mono">{moved.toFixed(1)} yd</b>
          </p>
        )}
      </div>
    </Card>
  );
}

// ── Preview ──────────────────────────────────────────────────────────────────

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
    <Card title="Preview">
      <div className="flex gap-2">
        {previewing ? (
          <button type="button" className={`${BTN_PRIMARY} flex-1`} onClick={onStop}>
            Stop
          </button>
        ) : (
          <>
            <button type="button" className={`${BTN_PRIMARY} flex-1`} disabled={frameCount < 2} onClick={onPlayAll}>
              Play all
            </button>
            <button
              type="button"
              className={`${BTN} flex-1`}
              disabled={frameIndex >= frameCount - 1}
              onClick={onFromHere}
            >
              From frame {frameIndex + 1}
            </button>
          </>
        )}
      </div>
      <p className="mt-3 text-xs text-zinc-600">
        Same transitions as Watch. Everything in a frame starts and arrives together.
      </p>
    </Card>
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
