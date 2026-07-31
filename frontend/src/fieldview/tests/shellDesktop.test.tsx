// Desktop shell components (tasks.md ids 40-48, approach.md Partition 4
// acceptance criteria): ShellLayout / LeftSidebar / RightSidebarSlot /
// ToolRibbon. Style follows shellPanels.test.tsx / useSelection.test.tsx:
// plain SceneStore instances, Testing Library render + interaction, no
// mocks, contract-level assertions (jsdom can't verify computed layout).

import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { createSceneStore } from "../scene/store";
import { getPreset } from "../scene/presets";
import { ShellLayout } from "../ui/shell/ShellLayout";
import { LeftSidebar } from "../ui/shell/LeftSidebar";
import { RightSidebarSlot } from "../ui/shell/RightSidebarSlot";
import { ToolRibbon } from "../ui/shell/ToolRibbon";
import { SceneStoreProvider } from "../ui/shell/sceneStore";
import { resetThrowMode } from "../ui/shell/throwMode";
import { normalize } from "../scene/possession";
import type { SceneStore } from "../scene/store";

function makeStore(): SceneStore {
  return createSceneStore(getPreset("vertStackForceSide"));
}

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

beforeEach(() => {
  localStorage.clear();
  // Throwing mode is module-level UI state (ADR-5), so it outlives RTL's
  // cleanup the same way overlay prefs do.
  resetThrowMode();
});

describe("ToolRibbon", () => {
  it("renders exactly 4 buttons in a single row, not a 2x2 grid", () => {
    render(<ToolRibbon spaceOn={false} onToggleSpace={() => {}} />);
    const toolbar = screen.getByRole("toolbar", { name: "Field view tools" });
    const buttons = within(toolbar).getAllByRole("button");
    expect(buttons).toHaveLength(4);
    // A single row means the toolbar itself is the only flex/grid container —
    // no nested row wrapper splitting the 4 buttons into groups.
    expect(toolbar.querySelectorAll(":scope > *").length).toBe(4);
  });

  // fieldview-play-model: Throw to Player is a live tool now, so only
  // Advanced Stats View still carries the roadmap tooltip. Throw keeps the
  // same aria-disabled (never native `disabled`) treatment, but for a reason
  // about the *scene* rather than the roadmap — a ribbon rendered with no
  // SceneStore has nobody holding the disc.
  it("marks Advanced Stats View as aria-disabled with a tooltip, not natively disabled", () => {
    render(<ToolRibbon spaceOn={false} onToggleSpace={() => {}} />);
    const statsBtn = screen.getByRole("button", { name: "Advanced Stats View" });

    expect(statsBtn).toHaveAttribute("aria-disabled", "true");
    expect(statsBtn).not.toBeDisabled();
    // Still focusable, so the tooltip is reachable by keyboard, not just hover.
    statsBtn.focus();
    expect(statsBtn).toHaveFocus();
    expect(screen.getAllByRole("tooltip", { name: "Ships in a future update." })).toHaveLength(1);
  });

  it("disables Throw to Player with the no-disc tooltip when nobody has the disc", () => {
    render(<ToolRibbon spaceOn={false} onToggleSpace={() => {}} />);
    const throwBtn = screen.getByRole("button", { name: "Throw to Player" });

    expect(throwBtn).toHaveAttribute("aria-disabled", "true");
    expect(throwBtn).not.toBeDisabled();
    throwBtn.focus();
    expect(throwBtn).toHaveFocus();
    expect(screen.getByRole("tooltip", { name: "Nobody has the disc." })).toBeInTheDocument();
  });

  it("disables Throw to Player when a real scene has a loose disc", () => {
    const store = makeStore();
    store.mutate((draft) => {
      draft.possession = null;
      normalize(draft);
    });
    render(
      <SceneStoreProvider store={store}>
        <ToolRibbon spaceOn={false} onToggleSpace={() => {}} />
      </SceneStoreProvider>,
    );

    const throwBtn = screen.getByRole("button", { name: "Throw to Player" });
    expect(throwBtn).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("tooltip", { name: "Nobody has the disc." })).toBeInTheDocument();
    // aria-disabled, not native disabled: pressing it must do nothing rather
    // than arm a tool with no disc to throw.
    fireEvent.click(throwBtn);
    expect(throwBtn).not.toHaveAttribute("aria-pressed", "true");
  });

  it("arms and disarms Throw to Player via aria-pressed when somebody has the disc", () => {
    const store = makeStore();
    render(
      <SceneStoreProvider store={store}>
        <ToolRibbon spaceOn={false} onToggleSpace={() => {}} />
      </SceneStoreProvider>,
    );
    const throwBtn = screen.getByRole("button", { name: "Throw to Player" });
    expect(throwBtn).not.toHaveAttribute("aria-disabled");
    expect(throwBtn).not.toHaveAttribute("aria-pressed", "true");

    fireEvent.click(throwBtn);
    expect(throwBtn).toHaveAttribute("aria-pressed", "true");

    // Re-clicking Throw is one of ux.md Flow 1's cancel paths.
    fireEvent.click(throwBtn);
    expect(throwBtn).not.toHaveAttribute("aria-pressed", "true");
  });

  it("wires Space View to the caller's on/setOn state", () => {
    let on = false;
    const setOn = (next: boolean) => {
      on = next;
    };
    render(<ToolRibbon spaceOn={on} onToggleSpace={setOn} />);
    fireEvent.click(screen.getByRole("button", { name: "Space View" }));
    expect(on).toBe(true);
  });

  it("renders Marquee Selection as active by default", () => {
    render(<ToolRibbon spaceOn={false} onToggleSpace={() => {}} />);
    expect(screen.getByRole("button", { name: "Marquee Selection" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("LeftSidebar", () => {
  it("shows the default visibility panel when nothing is selected", () => {
    const store = makeStore();
    renderWithRouter(
      <LeftSidebar store={store} designerOpen={false} onToggleDesigner={() => {}} />,
    );
    expect(screen.getByRole("checkbox", { name: "Offense" })).toBeInTheDocument();
  });

  it("swaps the middle section to the matching registry panel when selection changes", () => {
    const store = makeStore();
    renderWithRouter(
      <LeftSidebar store={store} designerOpen={false} onToggleDesigner={() => {}} />,
    );
    expect(screen.getByRole("checkbox", { name: "Offense" })).toBeInTheDocument();

    const offensePlayerId = store.getScene().players.find((p) => p.team === "offense")!.id;
    act(() => {
      store.setSelection({ kind: "offense", id: offensePlayerId });
    });

    expect(screen.queryByRole("checkbox", { name: "Offense" })).not.toBeInTheDocument();
    // fieldview-play-model replaced the placeholder with the real offense
    // panel; the registry seam being exercised here is unchanged.
    expect(screen.getByText("Guarded by")).toBeVisible();
  });

  it("the middle section is aria-live=polite so a panel swap is announced", () => {
    const store = makeStore();
    renderWithRouter(
      <LeftSidebar store={store} designerOpen={false} onToggleDesigner={() => {}} />,
    );
    const region = screen.getByText("Show on diagram").closest('[aria-live="polite"]');
    expect(region).not.toBeNull();
  });

  it("Advanced Settings fully overrides the sidebar body, and Back restores the selection view", () => {
    const store = makeStore();
    renderWithRouter(
      <LeftSidebar store={store} designerOpen={false} onToggleDesigner={() => {}} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "⚙ Advanced Settings" }));

    // Ribbon and the default panel are gone; the settings content and a Back
    // affordance take over the whole body.
    expect(screen.queryByRole("toolbar", { name: "Field view tools" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "← Back" })).toBeInTheDocument();
    expect(screen.getByText("Include offense in space calculations")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "← Back" }));

    expect(screen.getByRole("toolbar", { name: "Field view tools" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Offense" })).toBeInTheDocument();
  });

  it("Advanced Settings always renders AdvancedSettingsPanel expanded (no second disclosure)", () => {
    const store = makeStore();
    renderWithRouter(
      <LeftSidebar store={store} designerOpen={false} onToggleDesigner={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "⚙ Advanced Settings" }));
    expect(screen.getByRole("slider", { name: "Top speed" })).toBeVisible();
  });

  it("the Play Designer button is reachable via keyboard and reports pressed state", () => {
    const store = makeStore();
    let open = false;
    const { rerender } = renderWithRouter(
      <LeftSidebar
        store={store}
        designerOpen={open}
        onToggleDesigner={() => {
          open = true;
        }}
      />,
    );
    const btn = screen.getByRole("button", { name: "▶ Play Designer" });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    btn.focus();
    expect(btn).toHaveFocus();
    fireEvent.click(btn);
    expect(open).toBe(true);

    rerender(
      <MemoryRouter>
        <LeftSidebar store={store} designerOpen={open} onToggleDesigner={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "▶ Play Designer" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("RightSidebarSlot", () => {
  it("renders nothing when closed", () => {
    const { container } = renderWithRouter(<RightSidebarSlot open={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the placeholder copy and a link to /fieldview/designer when open", () => {
    renderWithRouter(<RightSidebarSlot open={true} onClose={() => {}} />);
    expect(screen.getByText(/Play Designer — coming in a future update\./)).toBeVisible();
    const link = screen.getByRole("link", { name: "/fieldview/designer" });
    expect(link).toHaveAttribute("href", "/fieldview/designer");
  });

  it("calls onClose when the ✕ button is clicked", () => {
    let closed = false;
    renderWithRouter(<RightSidebarSlot open={true} onClose={() => (closed = true)} />);
    fireEvent.click(screen.getByRole("button", { name: "Close Play Designer" }));
    expect(closed).toBe(true);
  });
});

describe("ShellLayout", () => {
  it("composes LeftSidebar + children canvas + RightSidebarSlot, slot closed by default", () => {
    const store = makeStore();
    renderWithRouter(
      <ShellLayout store={store}>
        <div data-testid="canvas">canvas</div>
      </ShellLayout>,
    );
    expect(screen.getByRole("complementary", { name: "Field view sidebar" })).toBeInTheDocument();
    expect(screen.getByTestId("canvas")).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Play Designer" })).not.toBeInTheDocument();
  });

  it("is gated behind the lg (>=1024px) breakpoint via a CSS-only class, not a resize listener", () => {
    // Integration note: `children` (the real canvas, FieldCanvas) must render
    // exactly once and must never sit inside an ancestor that goes
    // `display:none` at any width — nesting it inside a single `hidden
    // lg:grid` root (as this test originally asserted) would make the field
    // itself vanish below `lg`. So the gate now lives on each chrome piece
    // individually: the desktop sidebar/right-slot wrappers are `hidden
    // lg:flex`, and `BottomSheet`'s own root already carries `lg:hidden`
    // (its `position: fixed` chrome doesn't need to participate in this
    // component's layout at all).
    const store = makeStore();
    renderWithRouter(
      <ShellLayout store={store}>
        <div>canvas</div>
      </ShellLayout>,
    );
    const sidebarWrapper = screen.getByRole("complementary", { name: "Field view sidebar" }).parentElement!;
    expect(sidebarWrapper.className).toContain("hidden");
    expect(sidebarWrapper.className).toContain("lg:flex");

    const bottomSheetRoot = screen.getByTestId("bottom-sheet-root");
    expect(bottomSheetRoot.className).toContain("lg:hidden");
  });

  it("opening Play Designer from the sidebar renders the right slot", () => {
    const store = makeStore();
    renderWithRouter(
      <ShellLayout store={store}>
        <div>canvas</div>
      </ShellLayout>,
    );
    fireEvent.click(screen.getByRole("button", { name: "▶ Play Designer" }));
    expect(screen.getByRole("complementary", { name: "Play Designer" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close Play Designer" }));
    expect(screen.queryByRole("complementary", { name: "Play Designer" })).not.toBeInTheDocument();
  });
});
