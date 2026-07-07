// Decorator block: renders null when the entry has no coaching points — never
// an empty section shell (ux.md Flow 3, step 4).

import { SectionBlock } from "./SectionBlock";

export function CoachingPoints({
  points,
  number = "02",
}: {
  points: string[];
  number?: string;
}) {
  if (points.length === 0) return null;

  return (
    <SectionBlock number={number} title="Coaching Points">
      <ul className="space-y-4">
        {points.map((point, i) => (
          <li
            key={i}
            className="border border-film-border bg-film-panel p-4 text-sm leading-relaxed text-zinc-700 transition-colors hover:border-film-accentGreen"
          >
            {point}
          </li>
        ))}
      </ul>
    </SectionBlock>
  );
}
