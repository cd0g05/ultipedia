// The desktop dock's selected-player card (FR-4.5). The text is written
// IMPERATIVELY on every coalesced scene frame — a drag changes the distances
// sixty times a second and none of it may cost a React commit (canon ADR-2).
// React re-renders this component only when the selection itself changes.

import { useEffect, useRef } from "react";
import type { SceneStore } from "../../scene/store";
import type { Scene } from "../../scene/types";
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

  useEffect(() => {
    function show(el: HTMLElement | null, visible: boolean) {
      if (el) el.style.display = visible ? "" : "none";
    }
    function update() {
      const sel = store.getSelection();
      const single = sel.kind === "offense" || sel.kind === "defense" || sel.kind === "mark";
      const stats = single ? playerStats(store.getScene(), sel.id, baselineRef.current) : null;
      if (!stats) {
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
        show(listRef.current, false);
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
      show(listRef.current, true);
    }
    update();
    return store.onFrame(update);
    // `selection` re-runs the effect so a click refreshes the card at once,
    // even when no frame follows it.
  }, [store, baselineRef, selection]);

  return (
    <section
      aria-label="Selected player"
      data-testid="selected-player-card"
      className="w-full max-w-sm border border-film-border bg-white p-4"
    >
      <h2
        ref={titleRef}
        className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400"
      >
        Selected player
      </h2>
      <p ref={emptyRef} className="text-sm text-zinc-500">
        Select a player to see details.
      </p>
      <dl ref={listRef} style={{ display: "none" }} className="text-sm">
        {Array.from({ length: ROW_COUNT }, (_, i) => (
          <div key={i} className="flex justify-between gap-4 border-t border-film-border py-1.5">
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
    </section>
  );
}
