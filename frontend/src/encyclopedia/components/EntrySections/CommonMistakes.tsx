// Decorator block: renders null when the entry has no common mistakes — never
// an empty section shell (ux.md Flow 3, step 4).

import { SectionBlock } from "./SectionBlock";

export function CommonMistakes({
  mistakes,
  number = "03",
}: {
  mistakes: string[];
  number?: string;
}) {
  if (mistakes.length === 0) return null;

  return (
    <SectionBlock number={number} title="Common Mistakes">
      <ul className="space-y-4">
        {mistakes.map((mistake, i) => (
          <li
            key={i}
            className="flex gap-3 border border-zinc-200 p-4 text-sm leading-relaxed text-zinc-700"
          >
            <span
              aria-hidden="true"
              className="font-mono font-bold text-red-700"
            >
              ✕
            </span>
            {mistake}
          </li>
        ))}
      </ul>
    </SectionBlock>
  );
}
