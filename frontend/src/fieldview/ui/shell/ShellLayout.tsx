// The desktop three-pane shell (tech-design.md ADR-5): 280px `LeftSidebar` /
// fluid canvas (`children`, owned by the caller — `FieldCanvas`/`Whiteboard`
// internals are out of this partition's scope) / collapsible 320px
// `RightSidebarSlot`.
//
// Per ADR-5, the breakpoint switch is CSS-only — a Tailwind `lg:` class, not
// a `window.matchMedia`/resize-listener switch. Tailwind's default `lg`
// breakpoint is already 1024px (frontend/tailwind.config.js does not
// override the `screens` scale), which is exactly the value ux.md's
// Responsive & Accessibility section specifies, so no config change was
// needed here.
//
// ADR-5 describes `ShellLayout` rendering *both* the desktop grid and the
// mobile bottom sheet, with CSS (`hidden lg:grid` / `lg:hidden`) choosing
// which is visible. The mobile bottom sheet (`BottomSheet.tsx`) is being
// built in a sibling partition (`feat/fieldview-shell-mobile`) that has not
// merged yet, so this component only implements the `>= 1024px` branch today.
//
// *** INTEGRATION TODO: when `BottomSheet.tsx` lands, add the mobile branch
// here, e.g.:
//
//   <div className="lg:hidden">
//     <BottomSheet store={store} designerOpen={designerOpen} ... />
//     {children}
//   </div>
//
// alongside (not replacing) the `hidden lg:grid` div below, so the two trees
// coexist in the DOM and CSS alone picks one (no JS breakpoint switch is
// introduced by wiring the second branch in). ***

import { useState } from "react";
import type { SceneStore } from "../../scene/store";
import type { ReactNode } from "react";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebarSlot } from "./RightSidebarSlot";

export interface ShellLayoutProps {
  store: SceneStore;
  children: ReactNode;
}

export function ShellLayout({ store, children }: ShellLayoutProps) {
  const [designerOpen, setDesignerOpen] = useState(false);

  return (
    <div
      className="hidden lg:grid lg:h-full lg:w-full"
      style={{ gridTemplateColumns: designerOpen ? "280px 1fr 320px" : "280px 1fr" }}
    >
      <LeftSidebar
        store={store}
        designerOpen={designerOpen}
        onToggleDesigner={() => setDesignerOpen((open) => !open)}
      />
      <main className="min-w-0 bg-white">{children}</main>
      <RightSidebarSlot open={designerOpen} onClose={() => setDesignerOpen(false)} />
    </div>
  );
}
