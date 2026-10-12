// Explore's selected-player card now carries a title box and Give disc
// (fieldview-build P2). Both change the LIVE scene only — nothing is persisted —
// and neither costs a React commit beyond the selection change itself. Also: an
// axe audit of the card and field with a titled, holder-ringed scene.

import { Profiler } from "react";
import { describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { createSceneStore } from "../scene/store";
import { getPreset } from "../scene/presets";
import { selectPlayer } from "../scene/selection";
import { SelectedPlayerCard } from "../ui/content/SelectedPlayerCard";
import { FieldHarness } from "./fieldHarness";

const rAF = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

function setup() {
  const store = createSceneStore(getPreset("vertStack"));
  const baseline = { current: getPreset("vertStack") };
  let commits = 0;
  render(
    <Profiler id="card" onRender={() => (commits += 1)}>
      <SelectedPlayerCard store={store} baselineRef={baseline} />
    </Profiler>,
  );
  const select = (id: string) =>
    act(() => {
      store.setSelection(selectPlayer(store.getSelection(), store.getScene().players.find((p) => p.id === id)!));
    });
  return { store, select, commits: () => commits, resetCommits: () => (commits = 0) };
}

const titleInput = () => screen.getByRole("textbox", { name: "Player title" }) as HTMLInputElement;
const discButton = () => screen.getByRole("button", { name: /give disc|has the disc/i }) as HTMLButtonElement;

describe("title", () => {
  it("is always there but greyed out until a player is selected, then edits that player's title (trimmed, uppercased, two characters)", async () => {
    const { store, select } = setup();
    expect(screen.getByLabelText("Player title")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Give disc" })).toBeDisabled();
    expect(screen.getByTestId("selected-player-card")).toHaveAttribute("data-empty", "true");
    select("o3");
    await rAF();
    expect(titleInput()).toBeEnabled();
    expect(screen.getByTestId("selected-player-card")).toHaveAttribute("data-empty", "false");
    fireEvent.change(titleInput(), { target: { value: " abc " } });
    expect(store.getScene().players.find((p) => p.id === "o3")!.label).toBe("AB");
    // Others are untouched.
    expect(store.getScene().players.filter((p) => p.label)).toHaveLength(1);
  });

  it("clearing the box removes the title", () => {
    const { store, select } = setup();
    select("o3");
    fireEvent.change(titleInput(), { target: { value: "Q" } });
    expect(store.getScene().players.find((p) => p.id === "o3")!.label).toBe("Q");
    fireEvent.change(titleInput(), { target: { value: "" } });
    expect(store.getScene().players.find((p) => p.id === "o3")!.label).toBeUndefined();
  });

  it("shows the selected player's current title, and follows a change of selection", async () => {
    const { store, select } = setup();
    store.mutate((d) => {
      d.players.find((p) => p.id === "o2")!.label = "ZZ";
    });
    select("o2");
    await rAF();
    expect(titleInput().value).toBe("ZZ");
    select("o3");
    await rAF();
    expect(titleInput().value).toBe("");
  });

  it("costs no React commit while typing", () => {
    const { select, commits, resetCommits } = setup();
    select("o3");
    resetCommits();
    fireEvent.change(titleInput(), { target: { value: "A" } });
    fireEvent.change(titleInput(), { target: { value: "AB" } });
    expect(commits()).toBe(0);
  });
});

describe("Give disc", () => {
  it("gives the selected offensive player the disc; the mark re-derives", async () => {
    const { store, select } = setup();
    select("o4");
    await rAF();
    expect(discButton()).toHaveTextContent("Give disc");
    expect(discButton().disabled).toBe(false);
    fireEvent.click(discButton());
    expect(store.getScene().possession).toBe("o4");
    expect(store.getScene().players.find((p) => p.id === "o4")!.role).toBe("thrower");
    await rAF();
    expect(discButton()).toHaveTextContent("Has the disc");
    expect(discButton().disabled).toBe(true);
  });

  it("is disabled for a defender", async () => {
    const { store, select } = setup();
    select("d4");
    await rAF();
    expect(discButton().disabled).toBe(true);
    fireEvent.click(discButton());
    expect(store.getScene().possession).toBe("o1");
  });

  it("costs no React commit", () => {
    const { select, commits, resetCommits } = setup();
    select("o4");
    resetCommits();
    fireEvent.click(discButton());
    expect(commits()).toBe(0);
  });
});

describe("axe — a titled, holder-ringed scene", () => {
  it("has no violations", async () => {
    const store = createSceneStore(getPreset("vertStack"));
    store.mutate((d) => {
      d.players.find((p) => p.id === "o2")!.label = "AB";
      d.possession = "o3";
    });
    const { container } = render(
      <>
        <FieldHarness store={store} />
        <SelectedPlayerCard store={store} baselineRef={{ current: null }} />
      </>,
    );
    act(() => {
      store.setSelection(selectPlayer(store.getSelection(), store.getScene().players.find((p) => p.id === "o2")!));
    });
    await rAF();
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
});
