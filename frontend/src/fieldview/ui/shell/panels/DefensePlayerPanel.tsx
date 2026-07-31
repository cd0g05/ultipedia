// The defensive-player selection state (ux.md UI States / Flow 2): which
// offensive player this defender is on, and — when picking one displaces
// somebody — a line saying where the displaced defender went.
//
// A native <select> rather than a custom listbox (ux.md UX Consistency
// Patterns): the option list is 7 cutters plus "No assignment", which is well
// inside what a native control handles, and it is keyboard- and
// screen-reader-native for free.
//
// The swap is the whole reason this panel exists. matchups.reassign() keeps
// the map a permutation by handing the caller's previous target to whoever
// held the new one, and a coach who is not told that happened has to go and
// check every other defender by hand — which is the silent-swap pain point
// ux.md names.

import { useSyncExternalStore } from "react";
import type { PanelProps } from "../panelRegistry";
import { useSceneStore } from "../sceneStore";
import { usePlayModel, pieceName } from "../../playModel";
import type { PlayerIdentity } from "../../playModel";
import { reassign } from "../../../scene/matchups";
import { PanelLabel, StatusLine, HintLine } from "./panelChrome";

const NO_ASSIGNMENT = "No assignment";
// The <select>'s value for "no assignment"; the model's own value is `null`,
// which a DOM select cannot carry.
const NONE_VALUE = "";

// Which defender was last reassigned, and what to say about it.
//
// Module-level rather than useState for the reason ui/prefs.ts documents: the
// desktop sidebar and the mobile sheet BOTH mount this panel at the same time
// (the breakpoint is CSS-only, so both trees are live). Per-instance state
// would let the two copies disagree about whether a swap just happened, which
// is precisely the drift canon ADR-14 exists to prevent.
let swapNotice: { defenderId: string; message: string } | null = null;
const noticeListeners = new Set<() => void>();

function setSwapNotice(next: { defenderId: string; message: string } | null): void {
  swapNotice = next;
  for (const cb of noticeListeners) cb();
}

export function resetSwapNotice(): void {
  setSwapNotice(null);
}

function useSwapNotice(): { defenderId: string; message: string } | null {
  return useSyncExternalStore(
    (cb) => {
      noticeListeners.add(cb);
      return () => {
        noticeListeners.delete(cb);
      };
    },
    () => swapNotice,
  );
}

// What reassigning `defender` to `target` displaces, phrased for a coach.
// Computed from the model BEFORE the mutation, because afterwards the swap
// has already happened and "who used to hold this" is gone.
function swapMessage(
  defenderId: string,
  targetId: string,
  matchups: Record<string, string | null>,
  players: PlayerIdentity[],
): string | null {
  const displacedId = players.find(
    (p) => p.team === "defense" && p.id !== defenderId && matchups[p.id] === targetId,
  )?.id;
  if (!displacedId) return null;

  const previousId = matchups[defenderId] ?? null;
  const displaced = pieceName(players.find((p) => p.id === displacedId));
  if (previousId === null) {
    // Flow 2 Alternate B: a free-roam defender taking somebody leaves the
    // displaced defender with nothing to swap for. That is the correct
    // outcome, not a hole — so it is reported plainly, not as a warning.
    return `Swapped — ${displaced} now has no assignment.`;
  }
  const previous = pieceName(players.find((p) => p.id === previousId));
  return `Swapped — ${displaced} now guards ${previous}.`;
}

export function DefensePlayerPanel({ selection }: PanelProps) {
  const store = useSceneStore();
  const model = usePlayModel(store);
  const notice = useSwapNotice();

  const id = selection.kind === "defense" || selection.kind === "mark" ? selection.id : null;
  const defender = model.players.find((p) => p.id === id);
  if (!defender) return null;

  const offense = model.players.filter((p) => p.team === "offense");
  const current = model.matchups[defender.id] ?? null;

  function onChange(value: string) {
    if (!store || !id) return;
    const target = value === NONE_VALUE ? null : value;
    // Message first, from the pre-mutation model.
    const message = target === null ? null : swapMessage(id, target, model.matchups, model.players);
    store.mutate((draft) => reassign(draft, id, target));
    setSwapNotice(message ? { defenderId: id, message } : null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <PanelLabel>Player</PanelLabel>
        <StatusLine>{pieceName(defender)}</StatusLine>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="fv-matchup-select"
          className="font-mono text-xs uppercase tracking-wider text-zinc-500"
        >
          Guarding
        </label>
        <select
          id="fv-matchup-select"
          value={current ?? NONE_VALUE}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[44px] border border-film-border bg-white px-2 py-1 font-mono text-xs text-zinc-800"
        >
          <option value={NONE_VALUE}>{NO_ASSIGNMENT}</option>
          {offense.map((p) => (
            <option key={p.id} value={p.id}>
              {pieceName(p)}
            </option>
          ))}
        </select>
      </div>

      {current === null && <HintLine>Not tracking anyone — place this defender by hand.</HintLine>}

      {/* Announced politely: a swap the coach cannot see is exactly what a
          non-sighted user would otherwise miss (ux.md Accessibility). Scoped
          to the defender it describes, so selecting somebody else does not
          leave a stale confirmation attached to the wrong player. */}
      <p aria-live="polite" className="font-mono text-xs text-zinc-800">
        {notice && notice.defenderId === defender.id ? notice.message : ""}
      </p>
    </div>
  );
}
