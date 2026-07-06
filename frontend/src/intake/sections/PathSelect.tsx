import { useState } from "react";
import type { SubmissionType } from "../types";

export function PathSelect({
  onPick,
}: {
  onPick: (type: SubmissionType) => void;
}) {
  const [strategyOpen, setStrategyOpen] = useState(false);

  return (
    <section className="mx-auto max-w-xl px-5 py-8">
      <h2 className="text-center text-2xl font-bold text-gray-900">
        What do you want to share?
      </h2>

      <div className="mt-6 space-y-3">
        <PathButton label="Drills" onClick={() => onPick("drill")} />

        <PathButton
          label="Strategies"
          expanded={strategyOpen}
          onClick={() => setStrategyOpen((o) => !o)}
        />
        {strategyOpen && (
          <div className="ml-4 space-y-2">
            <PathButton small label="Formation" onClick={() => onPick("strategy.formation")} />
            <PathButton small label="Play design" onClick={() => onPick("strategy.play")} />
            <PathButton small label="Concept" onClick={() => onPick("strategy.concept")} />
          </div>
        )}

        <PathButton label="Other" onClick={() => onPick("other")} />
      </div>
    </section>
  );
}

function PathButton({
  label,
  onClick,
  small = false,
  expanded,
}: {
  label: string;
  onClick: () => void;
  small?: boolean;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className={`w-full rounded-2xl border-2 border-amber/50 bg-white font-semibold text-gray-900 shadow-sm active:scale-[0.99] ${
        small ? "py-3 text-base" : "py-5 text-lg"
      }`}
    >
      {label}
    </button>
  );
}
