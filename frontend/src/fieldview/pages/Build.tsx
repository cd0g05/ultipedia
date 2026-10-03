// /fieldview/build — the play designer's placeholder. Desktop shows the card
// over dashed regions that only suggest there will be room for tools, a frame
// timeline and properties (layout deliberately undecided); compact shows the
// card alone. No field, no state.
//
// PLACEHOLDER(fieldview-ui-rework): the copy is a stand-in (#8).

import { Seo } from "../../encyclopedia/seo/Seo";
import { FieldViewFrame } from "../ui/app/FieldViewFrame";

const GHOSTS = [
  { label: "Tools", className: "left-6 top-6 h-[46%] w-[16%]" },
  { label: "Field", className: "left-[19%] top-6 h-[46%] w-[52%]" },
  { label: "Properties", className: "left-[73%] top-6 h-[46%] w-[24%]" },
  { label: "Frames timeline", className: "left-6 top-[52%] h-[40%] w-[calc(100%-3rem)]" },
];

function PlaceholderCard() {
  return (
    <div className="relative z-10 w-full max-w-lg border border-zinc-900 bg-white p-6 sm:p-8">
      <span className="inline-block border border-film-accentPink px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-film-accentPink">
        Next update
      </span>
      <h1 className="mb-3 mt-2 font-heading text-2xl uppercase">Play designer</h1>
      <p className="mb-2 text-zinc-600">
        This is where coaches will build plays on a laptop and then show them on a phone.
      </p>
      <ul className="mb-4 list-disc pl-5 text-sm text-zinc-600">
        <li>Add frames and move players between them</li>
        <li>Add captions</li>
        <li>Save and send a play to the team</li>
      </ul>
      <p className="text-sm text-zinc-600">
        Until then, use <strong>Explore</strong> to rearrange the field and <strong>Watch</strong> to
        run the included plays.
      </p>
    </div>
  );
}

export function Build() {
  return (
    <>
      <Seo
        title="Build — Field View — Ultipedia"
        description="The Field View play designer is coming in the next update."
      />
      <FieldViewFrame
        mode="build"
        showField={false}
        body={
          <div className="relative flex min-h-0 w-full flex-1 items-center justify-center py-4">
            {GHOSTS.map((g) => (
              <div
                key={g.label}
                aria-hidden="true"
                className={`absolute hidden border border-dashed border-zinc-400 bg-white/70 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400 desktop:block ${g.className}`}
              >
                {g.label}
              </div>
            ))}
            <PlaceholderCard />
          </div>
        }
      />
    </>
  );
}
