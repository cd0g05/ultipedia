import { describe, expect, it } from "vitest";
import { clearSelection, selectMarquee, selectPlayer } from "../scene/selection";
import type { SelectionState } from "../scene/selection";
import { getPreset } from "../scene/presets";

function player(id: string) {
  const scene = getPreset("vertStackForceSide");
  const p = scene.players.find((p) => p.id === id);
  if (!p) throw new Error(`no player ${id}`);
  return p;
}

describe("clearSelection", () => {
  it("returns none", () => {
    expect(clearSelection()).toEqual({ kind: "none" });
  });
});

describe("selectPlayer", () => {
  it("selects an offense cutter as kind offense", () => {
    const cutter = player("o2");
    expect(selectPlayer(clearSelection(), cutter)).toEqual({ kind: "offense", id: "o2" });
  });

  it("selects a defender as kind defense", () => {
    const defender = getPreset("vertStackForceSide").players.find(
      (p) => p.team === "defense" && p.role === "defender",
    )!;
    expect(selectPlayer(clearSelection(), defender)).toEqual({
      kind: "defense",
      id: defender.id,
    });
  });

  it("selects the mark as kind mark, not defense", () => {
    const mark = getPreset("vertStackForceSide").players.find((p) => p.role === "mark")!;
    expect(selectPlayer(clearSelection(), mark)).toEqual({ kind: "mark", id: mark.id });
  });

  it("selects the thrower as kind offense", () => {
    const thrower = getPreset("vertStackForceSide").players.find((p) => p.role === "thrower")!;
    expect(selectPlayer(clearSelection(), thrower)).toEqual({
      kind: "offense",
      id: thrower.id,
    });
  });

  it("toggles off when re-selecting the same singly-selected piece", () => {
    const cutter = player("o2");
    const selected = selectPlayer(clearSelection(), cutter);
    expect(selectPlayer(selected, cutter)).toEqual({ kind: "none" });
  });

  it("replaces the selection when a different piece is clicked", () => {
    const cutter = player("o2");
    const other = player("o3");
    const selected = selectPlayer(clearSelection(), cutter);
    expect(selectPlayer(selected, other)).toEqual({ kind: "offense", id: "o3" });
  });

  it("replaces a multi selection outright rather than toggling", () => {
    const cutter = player("o2");
    const multi: SelectionState = { kind: "multi", ids: ["o2", "o3"] };
    expect(selectPlayer(multi, cutter)).toEqual({ kind: "offense", id: "o2" });
  });
});

describe("selectMarquee", () => {
  it("returns none for an empty set", () => {
    expect(selectMarquee([])).toEqual({ kind: "none" });
  });

  it("returns kind multi for one id", () => {
    expect(selectMarquee(["o2"])).toEqual({ kind: "multi", ids: ["o2"] });
  });

  it("returns kind multi for several ids", () => {
    expect(selectMarquee(["o2", "o3", "d1"])).toEqual({
      kind: "multi",
      ids: ["o2", "o3", "d1"],
    });
  });
});
