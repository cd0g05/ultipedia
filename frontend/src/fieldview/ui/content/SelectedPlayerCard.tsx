// The desktop dock's selected-player card (FR-4.5). The text is written
// IMPERATIVELY on every coalesced scene frame — a drag changes the distances
// sixty times a second and none of it may cost a React commit (canon ADR-2).
// React re-renders this component only when the selection itself changes.

import { useEffect, useRef } from "react";
import type { SceneStore } from "../../scene/store";
import type { Scene } from "../../scene/types";
import { throwTo } from "../../scene/possession";
import { cleanTitle } from "../../play/model";
import { useSelection } from "../shell/useSelection";
import { playerStats } from "./playerStats";

const ROW_COUNT = 4;

export interface SelectedPlayerCardProps {
  store: SceneStore;
  // The scene as the setup loaded it, for "Moved from start". A ref so a
  // reset/setup change does not re-render the card.
  baselineRef: { current: Scene | null };
}

export function SelectedPlayerCard({ store, baselineRef }: SelectedPlayerCardProps) {
  const selection = useSelection(store);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const emptyRef = useRef<HTMLParagraphElement | null>(null);
  const listRef = useRef<HTMLDListElement | null>(null);
  const labelRefs = useRef<(HTMLElement | null)[]>([]);
  const valueRefs = useRef<(HTMLElement | null)[]>([]);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const discButtonRef = useRef<HTMLButtonElement | null>(null);
  const shownIdRef = useRef<string | null>(null);

  // The selected player's id, when exactly one player is selected.
  function selectedId(): string | null {
    const sel = store.getSelection();
    return sel.kind === "offense" || sel.kind === "defense" || sel.kind === "mark" ? sel.id : null;
  }

  // A title belongs to the player (identity), not the frame. In Explore it is
  // live-only: it lives in the scene until the setup is changed.
  function onTitle(raw: string) {
    const id = selectedId();
    if (!id) return;
    const title = cleanTitle(raw);
    store.mutate((draft) => {
      const p = draft.players.find((q) => q.id === id);
      if (p) p.label = title || undefined;
    });
  }

  function onGiveDisc() {
    const id = selectedId();
    if (id) store.mutate((draft) => throwTo(draft, id));
  }

  // `disabled` is written imperatively by update() below and deliberately NOT a
  // prop: React ignores clicks on a button whose disabled PROP is true, whatever
  // the DOM says.
  useEffect(() => {
    function show(el: HTMLElement | null, visible: boolean) {
      if (el) el.style.display = visible ? "" : "none";
    }
    const DEFAULT_LABELS = ["Marked by", "Nearest defender", "Side of field", "Moved from start"];
    function setControls(enabled: boolean) {
      if (titleInputRef.current) titleInputRef.current.disabled = !enabled;
      if (discButtonRef.current && !enabled) discButtonRef.current.disabled = true;
      cardRef.current?.setAttribute("data-empty", enabled ? "false" : "true");
    }
    function update() {
      const sel = store.getSelection();
      const single = sel.kind === "offense" || sel.kind === "defense" || sel.kind === "mark";
      const stats = single ? playerStats(store.getScene(), sel.id, baselineRef.current) : null;
      if (!stats) {
        // The card never changes size: with nothing selected the same rows and
        // controls are there, greyed out, so choosing a player moves nothing.
        if (titleRef.current) {
          titleRef.current.textContent =
            sel.kind === "multi" ? `${sel.ids.length} players selected` : "Selected player";
        }
        if (emptyRef.current) {
          emptyRef.current.textContent =
            sel.kind === "multi"
              ? "Select a single player to see details."
              : "Select a player to see details.";
        }
        show(emptyRef.current, true);
        DEFAULT_LABELS.forEach((label, i) => {
          if (labelRefs.current[i]) labelRefs.current[i]!.textContent = label;
          if (valueRefs.current[i]) valueRefs.current[i]!.textContent = "—";
        });
        if (titleInputRef.current && titleInputRef.current.value !== "") titleInputRef.current.value = "";
        if (discButtonRef.current && discButtonRef.current.textContent !== "Give disc") {
          discButtonRef.current.textContent = "Give disc";
        }
        setControls(false);
        shownIdRef.current = null;
        return;
      }
      if (titleRef.current) titleRef.current.textContent = stats.title;
      stats.rows.forEach((row, i) => {
        const l = labelRefs.current[i];
        const v = valueRefs.current[i];
        if (l) l.textContent = row.label;
        if (v) v.textContent = row.value;
      });
      show(emptyRef.current, false);
      setControls(true);

      // Controls follow the scene without React: the title box is only
      // rewritten when the selection changes or when it is not being typed in.
      const id = selectedId();
      const scene = store.getScene();
      const player = scene.players.find((p) => p.id === id);
      const input = titleInputRef.current;
      if (input && player && (shownIdRef.current !== id || document.activeElement !== input)) {
        const next = player.label ?? "";
        if (input.value !== next) input.value = next;
      }
      shownIdRef.current = id;
      const button = discButtonRef.current;
      if (button && player) {
        const holds = scene.possession === player.id;
        const offense = player.team === "offense";
        button.disabled = !offense || holds;
        const text = holds ? "Has the disc" : "Give disc";
        if (button.textContent !== text) button.textContent = text;
      }
    }
    update();
    return store.onFrame(update);
    // `selection` re-runs the effect so a click refreshes the card at once,
    // even when no frame follows it.
  }, [store, baselineRef, selection]);

  return (
    <section
      ref={cardRef}
      aria-label="Selected player"
      data-testid="selected-player-card"
      data-empty="true"
      className="flex w-full flex-wrap items-stretch gap-x-8 gap-y-3 border border-film-border bg-white p-4 data-[empty=true]:text-zinc-400"
    >
      <div className="min-w-[10rem]">
        <h2
          ref={titleRef}
          className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400"
        >
          Selected player
        </h2>
        <p ref={emptyRef} className="mt-1 text-sm text-zinc-500">
          Select a player to see details.
        </p>
      </div>
      <dl ref={listRef} className="grid min-w-[16rem] flex-1 grid-cols-2 gap-x-6 text-sm">
        {Array.from({ length: ROW_COUNT }, (_, i) => (
          <div key={i} className="flex justify-between gap-3 border-t border-film-border py-1.5">
            <dt
              ref={(el) => {
                labelRefs.current[i] = el;
              }}
              className="text-zinc-600"
            />
            <dd
              ref={(el) => {
                valueRefs.current[i] = el;
              }}
              className="font-mono text-xs font-bold"
            />
          </div>
        ))}
      </dl>
      <div ref={controlsRef} className="flex items-end gap-3">
        <label className="flex flex-col gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Title
          <input
            ref={titleInputRef}
            type="text"
            aria-label="Player title"
            maxLength={4}
            autoComplete="off"
            spellCheck={false}
            placeholder="—"
            onChange={(e) => onTitle(e.target.value)}
            className="h-9 w-16 border border-film-border bg-white text-center font-mono text-sm font-bold uppercase text-zinc-900 disabled:bg-film-panel disabled:text-zinc-300"
          />
        </label>
        <button
          ref={discButtonRef}
          type="button"
          onClick={onGiveDisc}
          className="h-9 border border-film-border bg-white px-4 font-mono text-xs font-bold uppercase tracking-wider text-zinc-900 hover:bg-film-panel disabled:cursor-default disabled:bg-film-panel disabled:text-zinc-300 disabled:hover:bg-film-panel"
        >
          Give disc
        </button>
      </div>
    </section>
  );
}
