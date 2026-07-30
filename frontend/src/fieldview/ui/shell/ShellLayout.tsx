// The desktop three-pane shell (tech-design.md ADR-5): 280px `LeftSidebar` /
// fluid canvas (`children`, owned by the caller — `FieldCanvas`/`Whiteboard`
// internals are out of this partition's scope) / collapsible 320px
// `RightSidebarSlot`. Below `lg`, the same `children` is framed by
// `BottomSheet` instead (tech-design.md Project/Module Structure).
//
// Per ADR-5, the breakpoint switch is CSS-only — Tailwind `lg:` classes, not
// a `window.matchMedia`/resize-listener switch. Tailwind's default `lg`
// breakpoint is already 1024px (frontend/tailwind.config.js does not
// override the `screens` scale), which is exactly the value ux.md's
// Responsive & Accessibility section specifies, so no config change was
// needed here.
//
// Integration deviation from the Desktop partition's original sketch (see
// git history / tasks.md's fieldview-shell-desktop note): that draft had
// `hidden lg:grid` on the *outer* container, with the plan to add a sibling
// `lg:hidden` div that renders `{children}` a second time for mobile. That
// does not work once `children` is `FieldCanvas` for real: `FieldCanvas`
// receives `svgRef`/`canvasRef`/`stageRef` as props from `Whiteboard.tsx`,
// and mounting the same JSX twice would fight over those single, shared ref
// objects (each `<svg ref={svgRef}>` occurrence reassigns `svgRef.current` on
// commit, so pointer listeners set up in one instance's effect can end up
// bound to the *other* instance's DOM node — a real, silent, hard-to-spot
// bug). It also cannot be nested inside a `display:none` ancestor and still
// render at other widths, which a single `hidden lg:grid` root would force.
//
// The fix: `children` renders exactly once, as its own flex child, never
// nested inside anything that goes `display:none` at any width. The desktop
// sidebar and right slot are each individually `hidden lg:flex` wrappers
// (invisible and width-0 below `lg`, taking their layout slot only at
// `lg:+`); `BottomSheet`'s own root already carries `lg:hidden` (its
// `position: fixed` chrome does not need to participate in this flex layout
// at all — it overlays the viewport independently, per its own component).

import { useState } from "react";
import type { SceneStore } from "../../scene/store";
import type { ReactNode } from "react";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebarSlot } from "./RightSidebarSlot";
import { BottomSheet } from "./BottomSheet";

export interface ShellLayoutProps {
  store: SceneStore;
  children: ReactNode;
  // Rendered in each shell's bottom-menu area (LeftSidebar's default view,
  // BottomSheet's SETTINGS tab) — tasks.md id 62 relocates `PresetMenu` out
  // of the page header into the shell chrome. Optional so a caller (or a
  // future ShellLayout consumer that has no presets concept) is not forced
  // to supply one.
  presetMenu?: ReactNode;
}

export function ShellLayout({ store, children, presetMenu }: ShellLayoutProps) {
  const [designerOpen, setDesignerOpen] = useState(false);

  return (
    <div className="flex h-full w-full flex-col lg:h-full lg:flex-row">
      <div className="hidden lg:flex lg:w-[280px] lg:shrink-0">
        <LeftSidebar
          store={store}
          designerOpen={designerOpen}
          onToggleDesigner={() => setDesignerOpen((open) => !open)}
          presetMenu={presetMenu}
        />
      </div>

      <main className="min-w-0 flex-1 bg-white">{children}</main>

      <div className="hidden lg:flex lg:w-[320px] lg:shrink-0">
        <RightSidebarSlot open={designerOpen} onClose={() => setDesignerOpen(false)} />
      </div>

      <BottomSheet store={store} presetMenu={presetMenu} />
    </div>
  );
}
