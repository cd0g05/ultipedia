// The desktop (and, later, mobile) shared row-of-4 tool ribbon (tech-design.md
// Project/Module Structure: "Shared row-of-4 ribbon (desktop and mobile both
// single-row)"). Four buttons, side by side, never a 2x2 grid — the mockup
// (`desktop-shell.html`) was corrected from a grid to a row after Builder
// review, so this shape is a closed decision, not a style preference.
//
// Marquee Selection, Space View, and (as of fieldview-play-model) Throw to
// Player are real, wired features; Advanced Stats View is still visibly
// disabled with a tooltip (ux.md Copy & Tone: "Ships in a future update.")
// rather than hidden — a coach should see what's coming, not wonder if the
// ribbon is broken.
//
// Throw has a second, *conditional* disabled state: with nobody holding the
// disc there is no throw to make, so it reads "Nobody has the disc." That is
// a statement about the scene, not about the roadmap, which is why it is a
// different string from DISABLED_TOOLTIP.
//
// Disabled buttons use `aria-disabled`, not the native `disabled` attribute:
// a natively-disabled button is pulled out of the tab order entirely, which
// would make the tooltip unreachable by keyboard (ux.md Responsive &
// Accessibility: "remain focusable enough to expose the tooltip via keyboard
// focus, not just hover").

import { useSceneStore } from "./sceneStore";
import { usePlayModel } from "../playModel";
import { THROW_UNAVAILABLE_TOOLTIP, toggleThrowArmed, useThrowMode } from "./throwMode";

const DISABLED_TOOLTIP = "Ships in a future update.";

interface RibbonButtonProps {
  label: string;
  icon: string;
  active?: boolean;
  disabled?: boolean;
  tooltip?: string;
  onClick?: () => void;
}

function RibbonButton({ label, icon, active, disabled, tooltip, onClick }: RibbonButtonProps) {
  const tooltipId = disabled && tooltip ? `ribbon-tooltip-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined;

  return (
    <button
      type="button"
      // Explicit aria-label: without it, the tooltip span (a text-bearing
      // descendant) would fold into the button's accessible name per the
      // accname algorithm, making `getByRole("button", { name: label })`
      // (and any real screen reader) report "Throw to Player Ships in a
      // future update." as one name instead of a name + a separately
      // announced description.
      aria-label={label}
      // Focusable regardless of disabled state — aria-disabled communicates
      // "not actionable" to assistive tech without removing the element from
      // the tab order (unlike the native `disabled` attribute).
      aria-disabled={disabled || undefined}
      aria-pressed={!disabled && active ? true : undefined}
      aria-describedby={tooltipId}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
        }
      }}
      className={`group relative -ml-px flex flex-1 flex-col items-center gap-1 border px-1 py-3 font-mono text-[9px] uppercase tracking-wide first:ml-0 ${
        disabled
          ? "cursor-not-allowed border-film-border bg-film-panel text-zinc-500"
          : active
            ? "border-film-accentPink bg-film-accentPink/5 text-film-accentPink"
            : "border-film-border bg-white text-zinc-800 hover:border-film-accentPink hover:text-film-accentPink"
      }`}
    >
      <span aria-hidden="true" className="text-base">
        {icon}
      </span>
      <span>{label}</span>
      {tooltipId && (
        <span
          id={tooltipId}
          role="tooltip"
          // Visible on hover OR keyboard focus of the button itself (`group`
          // is this button), never hover-only.
          className="invisible absolute top-full left-0 z-20 mt-1 whitespace-nowrap bg-zinc-900 px-1.5 py-1 text-[9px] normal-case tracking-normal text-white group-hover:visible group-focus:visible"
        >
          {tooltip}
        </span>
      )}
    </button>
  );
}

export interface ToolRibbonProps {
  /** Wired to the same `useOverlayState().on` Space-view toggle OverlayRail already used. */
  spaceOn: boolean;
  onToggleSpace: (on: boolean) => void;
}

export function ToolRibbon({ spaceOn, onToggleSpace }: ToolRibbonProps) {
  // Both shells render this inside a SceneStoreProvider; a ribbon rendered
  // standalone sees no store, which reads as "no disc" — the same disabled
  // state, for the same honest reason.
  const model = usePlayModel(useSceneStore());
  const throwMode = useThrowMode();
  const canThrow = model.possession !== null;

  return (
    <div role="toolbar" aria-label="Field view tools" className="flex border-b border-film-border">
      <RibbonButton label="Marquee Selection" icon="▭" active={!throwMode.armed} />
      <RibbonButton
        label="Throw to Player"
        icon="➤"
        active={throwMode.armed}
        disabled={!canThrow}
        tooltip={canThrow ? undefined : THROW_UNAVAILABLE_TOOLTIP}
        onClick={toggleThrowArmed}
      />
      <RibbonButton label="Advanced Stats View" icon="≡" disabled tooltip={DISABLED_TOOLTIP} />
      <RibbonButton
        label="Space View"
        icon="▦"
        active={spaceOn}
        onClick={() => onToggleSpace(!spaceOn)}
      />
    </div>
  );
}
