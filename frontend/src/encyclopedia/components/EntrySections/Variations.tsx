// Decorator block: renders null when the entry has no variations — never an
// empty section shell (ux.md Flow 3, step 4).
//
// NOTE: per the contract (types.ts / tech-design), `variations` items are
// entry ids; with no seeded content yet there is no lookup to resolve them to
// titles, so items render as-is. Flagged in Reflect for the Builder — if
// seeding stores descriptive text here instead, this renders it correctly
// already.

import { SectionBlock } from "./SectionBlock";

export function Variations({
  variations,
  number = "04",
}: {
  variations: string[];
  number?: string;
}) {
  if (variations.length === 0) return null;

  return (
    <SectionBlock number={number} title="Variations">
      <ul className="space-y-4">
        {variations.map((variation, i) => (
          <li
            key={i}
            className="border border-zinc-200 p-4 text-sm leading-relaxed text-zinc-700"
          >
            {variation}
          </li>
        ))}
      </ul>
    </SectionBlock>
  );
}
