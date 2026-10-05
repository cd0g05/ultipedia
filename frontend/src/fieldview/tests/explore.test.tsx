// Explore (fieldview-ui-rework P3): curated setups, the ◀ ▶ chip and slide-over,
// the ✎ marker and Reset, the Defense-follows STUB, and the desktop
// selected-player card. Pointer-level drag behaviour is covered in drag.test.tsx;
// here a keyboard nudge stands in for "the scene changed".

import { Profiler } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { routes } from "../../router";
import { getPreset } from "../scene/presets";
import { BUILTIN_SETUPS } from "../play/plays";

// The setups as Explore lists them: name + takeaway (the play's description).
const CURATED_SETUPS = BUILTIN_SETUPS.map((p) => ({ label: p.name, takeaway: p.description ?? "" }));
import { createSceneStore } from "../scene/store";
import { selectPlayer } from "../scene/selection";
import { getStageViewBox, yardToPixel } from "../render/coords";
import { FIELD_PX_HEIGHT, FIELD_PX_WIDTH } from "../render/fieldLayer";
import { SelectedPlayerCard } from "../ui/content/SelectedPlayerCard";
import { playerStats, sideOfField } from "../ui/content/playerStats";

const viewBox = getStageViewBox(FIELD_PX_WIDTH, FIELD_PX_HEIGHT);

function AppRoutes() {
  return useRoutes(routes);
}

function renderExplore() {
  return render(
    <MemoryRouter initialEntries={["/fieldview/explore"]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

function transformOf(name: string) {
  return screen.getByRole("button", { name }).getAttribute("transform");
}

const rAF = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

beforeEach(() => {
  localStorage.clear();
});

describe("setups", () => {
  it("lists the curated setups in the desktop sidebar, each with its takeaway", () => {
    renderExplore();
    const sidebar = screen.getByRole("complementary", { name: "Sidebar", hidden: true });
    const list = within(sidebar).getByRole("list", { name: "Setups", hidden: true });
    for (const setup of CURATED_SETUPS) {
      expect(within(list).getByText(setup.label)).toBeInTheDocument();
      expect(within(list).getByText(setup.takeaway)).toBeInTheDocument();
    }
    // The first setup is active.
    const rows = within(list).getAllByRole("button", { hidden: true });
    expect(rows[0]).toHaveAttribute("aria-current", "true");
  });

  it("shows five rows and scrolls for more (fixed row height, capped list)", () => {
    renderExplore();
    const list = screen.getByTestId("setup-list");
    const cap = Number.parseInt((list as HTMLElement).style.maxHeight, 10);
    const rowHeights = within(list)
      .getAllByRole("button", { hidden: true })
      .map((b) => Number.parseInt((b as HTMLElement).style.height, 10));
    expect(new Set(rowHeights).size).toBe(1);
    expect(cap).toBe(rowHeights[0] * 5);
    expect(CURATED_SETUPS.length).toBeGreaterThan(5); // so there is something to scroll to
  });

  it("▶ loads the next setup, ◀ goes back, and both wrap", () => {
    renderExplore();
    const before = transformOf("Offense 2");
    fireEvent.click(screen.getByRole("button", { name: "Next setup" }));
    const second = transformOf("Offense 2");
    expect(second).not.toBe(before);
    expect(screen.getByRole("button", { name: "Choose a setup" })).toHaveTextContent(
      CURATED_SETUPS[1].label,
    );

    fireEvent.click(screen.getByRole("button", { name: "Previous setup" }));
    expect(transformOf("Offense 2")).toBe(before);

    // Wrap backwards from the first to the last.
    fireEvent.click(screen.getByRole("button", { name: "Previous setup" }));
    expect(screen.getByRole("button", { name: "Choose a setup" })).toHaveTextContent(
      CURATED_SETUPS[CURATED_SETUPS.length - 1].label,
    );
    // ...and forwards from the last to the first.
    fireEvent.click(screen.getByRole("button", { name: "Next setup" }));
    expect(screen.getByRole("button", { name: "Choose a setup" })).toHaveTextContent(
      CURATED_SETUPS[0].label,
    );
  });

  it("opens the slide-over from the chip, picks a setup, and Escape closes it", () => {
    renderExplore();
    const chip = screen.getByRole("button", { name: "Choose a setup" });
    chip.focus();
    fireEvent.click(chip);
    const dialog = screen.getByRole("dialog", { name: "Setup" });
    fireEvent.click(within(dialog).getByRole("button", { name: new RegExp(CURATED_SETUPS[2].label, "i") }));
    expect(screen.queryByRole("dialog", { name: "Setup" })).not.toBeInTheDocument();
    expect(chip).toHaveTextContent(CURATED_SETUPS[2].label);

    fireEvent.click(chip);
    expect(screen.getByRole("dialog", { name: "Setup" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Setup" })).not.toBeInTheDocument();
  });
});

describe("✎ custom marker and Reset", () => {
  it("shows ✎ after the scene drifts, and Reset restores the setup and clears it", async () => {
    renderExplore();
    const chip = screen.getByRole("button", { name: "Choose a setup" });
    expect(chip).not.toHaveTextContent("✎");

    const cutter = screen.getByRole("button", { name: "Offense 2" });
    const home = cutter.getAttribute("transform");
    fireEvent.keyDown(cutter, { key: "ArrowRight" });
    await rAF();
    expect(cutter.getAttribute("transform")).not.toBe(home);
    // The marker waits for the movement to stop (no commit inside a drag).
    await waitFor(() => expect(chip).toHaveTextContent("✎"), { timeout: 1500 });

    // Two Reset controls exist (compact bar icon, desktop sidebar); CSS shows one.
    fireEvent.click(screen.getAllByRole("button", { name: "Reset setup", hidden: true })[0]);
    await waitFor(() => expect(chip).not.toHaveTextContent("✎"), { timeout: 1500 });
    expect(screen.getByRole("button", { name: "Offense 2" }).getAttribute("transform")).toBe(home);
  });
});

describe("Defense follows (STUB — behaviour deferred, ADR-33 reserved)", () => {
  it("is labelled coming soon and persists its pref", () => {
    renderExplore();
    const sidebar = screen.getByRole("complementary", { name: "Sidebar", hidden: true });
    const toggle = within(sidebar).getByRole("switch", { name: /defense follows/i, hidden: true });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(within(sidebar).getByText(/coming soon/i)).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(JSON.parse(localStorage.getItem("fieldview.overlayPrefs") ?? "{}").defenseFollows).toBe(true);
  });

  it("does nothing yet: moving an attacker never moves a defender, even with the toggle on", async () => {
    renderExplore();
    const sidebar = screen.getByRole("complementary", { name: "Sidebar", hidden: true });
    fireEvent.click(within(sidebar).getByRole("switch", { name: /defense follows/i, hidden: true }));

    const defenderBefore = transformOf("Defense 2");
    const cutter = screen.getByRole("button", { name: "Offense 2" });
    fireEvent.keyDown(cutter, { key: "ArrowRight", shiftKey: true });
    await rAF();
    await rAF();
    expect(transformOf("Defense 2")).toBe(defenderBefore);
  });

  it("shows up in the compact menu too", () => {
    renderExplore();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    const menu = screen.getByRole("dialog", { name: /field view menu/i });
    expect(within(menu).getByRole("switch", { name: /defense follows/i })).toBeInTheDocument();
  });
});

describe("ADR-2: Explore keeps React out of the drag path", () => {
  it("commits zero React renders across a burst of pointer moves", async () => {
    const rect = vi.spyOn(SVGSVGElement.prototype, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: viewBox.width,
      height: viewBox.height,
      right: viewBox.width,
      bottom: viewBox.height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    try {
      let commits = 0;
      render(
        <MemoryRouter initialEntries={["/fieldview/explore"]}>
          <Profiler id="explore" onRender={() => (commits += 1)}>
            <AppRoutes />
          </Profiler>
        </MemoryRouter>,
      );
      const cutter = screen.getByRole("button", { name: "Offense 2" });
      const m = cutter.getAttribute("transform")!.match(/translate\(([-\d.]+), ([-\d.]+)\)/)!;
      const grab = { clientX: Number(m[1]) - viewBox.x, clientY: Number(m[2]) - viewBox.y };
      fireEvent.pointerDown(cutter, { pointerId: 1, ...grab });
      commits = 0;
      for (let i = 0; i < 25; i += 1) {
        fireEvent.pointerMove(cutter, { pointerId: 1, clientX: grab.clientX + i * 4, clientY: grab.clientY });
      }
      expect(commits).toBe(0);
      await rAF();
      expect(cutter.getAttribute("transform")).not.toBe(`translate(${m[1]}, ${m[2]})`);
      expect(commits).toBe(0);
    } finally {
      rect.mockRestore();
    }
  });
});

describe("selected-player card", () => {
  const baselineOf = () => ({ current: getPreset("vertStack") });

  it("derives its rows from the scene", () => {
    const scene = getPreset("vertStack");
    const stats = playerStats(scene, "o3", baselineOf().current)!; // cutter 2
    expect(stats.title).toBe("Offense 3");
    expect(stats.rows.map((r) => r.label)).toEqual([
      "Marked by",
      "Nearest defender",
      "Side of field",
      "Moved from start",
    ]);
    expect(stats.rows[0].value).toBe("Defense 3"); // d3 guards o3 by the preset's own pairing
    expect(stats.rows[2].value).toBe("Middle");
    expect(stats.rows[3].value).toBe("0.0 yd");
  });

  it("flips its labels for a defender", () => {
    const stats = playerStats(getPreset("vertStack"), "d3", null)!;
    expect(stats.title).toBe("Defense 3");
    expect(stats.rows[0].label).toBe("Marking");
    expect(stats.rows[1].label).toBe("Nearest attacker");
  });

  it("describes the side of the field in field terms, not screen terms", () => {
    expect(sideOfField(2)).toBe("Near side");
    expect(sideOfField(38)).toBe("Far side");
    expect(sideOfField(20)).toBe("Middle");
  });

  it("shows an empty state, then follows a selection and a move without React commits", async () => {
    const store = createSceneStore(getPreset("vertStack"));
    const baseline = { current: getPreset("vertStack") };
    let commits = 0;
    render(
      <Profiler id="card" onRender={() => (commits += 1)}>
        <SelectedPlayerCard store={store} baselineRef={baseline} />
      </Profiler>,
    );
    const card = screen.getByTestId("selected-player-card");
    expect(card).toHaveTextContent(/select a player/i);

    const o3 = store.getScene().players.find((p) => p.id === "o3")!;
    store.setSelection(selectPlayer(store.getSelection(), o3));
    await waitFor(() => expect(card).toHaveTextContent("Offense 3"));
    expect(card).toHaveTextContent("Moved from start");
    expect(card).toHaveTextContent("0.0 yd");

    commits = 0;
    store.mutate((draft) => {
      const p = draft.players.find((q) => q.id === "o3")!;
      p.pos = { x: p.pos.x + 3, y: p.pos.y };
    });
    await rAF();
    expect(card).toHaveTextContent("3.0 yd");
    expect(commits).toBe(0);

    // A pointer position far from the start reads in yards of the field.
    expect(yardToPixel({ x: 1, y: 0 }).x).toBeGreaterThan(0);
  });
});
