// The hover readout. Updated *imperatively* through a ref rather than by
// props: a pointer move is a 60 Hz event, and re-rendering six rows of text
// on every one of them would put React back in the exact path ADR-2 exists
// to keep it out of. The component renders a fixed skeleton once; the frame
// loop writes text into it.

import { forwardRef, useImperativeHandle, useRef } from "react";
import type { CellExplain, Lens } from "../space/types";

export interface CellReadoutHandle {
  update: (explain: CellExplain | null, lens: Lens) => void;
}

const IDLE_TEXT = "Hover the field to see why a spot is open or closed.";

const LABEL_COPY: Record<CellExplain["label"], string> = {
  strong: "Strong space",
  contested: "Contested",
  closed: "Closed",
};

function seconds(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(2)} s` : "—";
}

// The `hidden` attribute is `display: none` at the lowest specificity, so a
// Tailwind display utility (`flex`) on the same element silently beats it and
// the "hidden" skeleton stays on screen. Inline style wins over both.
function show(el: HTMLElement, visible: boolean, display = "block"): void {
  el.style.display = visible ? display : "none";
}

export const CellReadout = forwardRef<CellReadoutHandle>(function CellReadout(_props, ref) {
  const idleRef = useRef<HTMLParagraphElement | null>(null);
  const bodyRef = useRef<HTMLDListElement | null>(null);
  const liveRef = useRef<HTMLParagraphElement | null>(null);
  const cells = useRef<Record<string, HTMLElement | null>>({});
  const cutterRowRef = useRef<HTMLDivElement | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      update(explain, lens) {
        const idle = idleRef.current;
        const body = bodyRef.current;
        if (!idle || !body) return;

        if (!explain) {
          show(idle, true);
          show(body, false, "flex");
          if (liveRef.current) liveRef.current.textContent = "";
          return;
        }

        show(idle, false);
        show(body, true, "flex");

        const set = (key: string, text: string) => {
          const el = cells.current[key];
          if (el) el.textContent = text;
        };

        set("distance", `${explain.distance.toFixed(1)} yd`);
        set("flight", seconds(explain.flightTime));
        set("defender", seconds(explain.nearestDefenderArrival));
        set("score", explain.score.toFixed(3));
        set("label", LABEL_COPY[explain.label]);

        // Under the defense-only lens the cutter row is removed rather than
        // blanked, so its absence reads as the lens, not as a bug.
        const cutterRow = cutterRowRef.current;
        if (cutterRow) {
          const showCutter = lens === "offense" && explain.bestCutterEffectiveArrival !== null;
          show(cutterRow, showCutter, "flex");
          if (showCutter) set("cutter", seconds(explain.bestCutterEffectiveArrival!));
        }

        // Colour is never the only carrier of meaning — the label is spoken
        // too, and politely (the live region is not a firehose of numbers).
        if (liveRef.current) liveRef.current.textContent = LABEL_COPY[explain.label];
      },
    }),
    [],
  );

  const row = (key: string, term: string) => (
    <div className="flex justify-between gap-4 py-0.5">
      <dt className="text-zinc-500">{term}</dt>
      <dd
        ref={(el) => {
          cells.current[key] = el;
        }}
        className="tabular-nums text-zinc-800"
      >
        —
      </dd>
    </div>
  );

  return (
    <section
      aria-label="Cell readout"
      className="w-full border border-zinc-300 bg-white px-4 py-3 font-mono text-xs"
    >
      <p ref={idleRef} className="text-zinc-500">
        {IDLE_TEXT}
      </p>

      {/* Starts hidden by inline style, for the same specificity reason. */}
      <dl ref={bodyRef} style={{ display: "none" }} className="flex flex-col">
        {row("distance", "Distance")}
        {row("flight", "Flight time")}
        {row("defender", "Nearest defender arrives")}
        <div
          ref={cutterRowRef}
          className="flex justify-between gap-4 py-0.5"
        >
          <dt className="text-zinc-500">Best cutter arrives</dt>
          <dd
            ref={(el) => {
              cells.current.cutter = el;
            }}
            className="tabular-nums text-zinc-800"
          >
            —
          </dd>
        </div>
        {row("score", "Score")}
        {row("label", "Verdict")}
      </dl>

      <p ref={liveRef} role="status" aria-live="polite" className="sr-only" />
    </section>
  );
});
