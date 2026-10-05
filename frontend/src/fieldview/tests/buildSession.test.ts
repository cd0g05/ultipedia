// BuildSession (fieldview-build ADR-40): the document, its history and the
// frame being shown, with the store as a view. Gestures commit once; frames
// inherit; undo restores exact documents; subscriptions fire on structure only.

import { describe, expect, it, vi } from "vitest";
import { createSceneStore } from "../scene/store";
import type { Scene } from "../scene/types";
import { BuildSession } from "../ui/build/BuildSession";
import { addFrame, giveDisc, newPlay, placedIds, resolve, setTitle } from "../play/model";
import { toScene } from "../play/model";

function make() {
  const store = createSceneStore(toScene(newPlay(), 0));
  const loads: Scene[] = [];
  const loadScene = (scene: Scene) => {
    loads.push(scene);
    store.mutate((d) => {
      d.players = scene.players.map((p) => ({ ...p, pos: { ...p.pos } }));
      d.possession = scene.possession;
      d.matchups = { ...scene.matchups };
    });
  };
  const session = new BuildSession(store, { loadScene }, newPlay());
  session.resync();
  const drag = (id: string, x: number, y: number) =>
    store.mutate((d) => {
      d.players.find((p) => p.id === id)!.pos = { x, y };
    });
  return { store, session, loads, drag };
}

describe("BuildSession", () => {
  it("shows the first frame, with nothing to undo and the document saved", () => {
    const { session, store } = make();
    const s = session.getState();
    expect(s.frameIndex).toBe(0);
    expect(s.canUndo).toBe(false);
    expect(s.canRedo).toBe(false);
    expect(s.save).toBe("saved");
    expect(store.getScene().players).toHaveLength(14);
  });

  it("a gesture commits as ONE placement and ONE undo step", () => {
    const { session, drag } = make();
    session.apply((p, i) => addFrame(p, i), { sync: false });
    session.selectFrame(1);
    // Many moves on the store (what a drag does) are invisible to the session…
    for (let x = 50; x < 60; x += 1) drag("o2", x, 10);
    expect(session.play.frames[1].moved).toEqual({});
    // …until the gesture ends.
    session.commitGesture(["o2"]);
    expect(placedIds(session.play, 1)).toEqual(["o2"]);
    expect(resolve(session.play, 1).positions.o2).toEqual({ x: 59, y: 10 });
    session.undo();
    expect(placedIds(session.play, 1)).toEqual([]);
    expect(session.getState().canUndo).toBe(true); // the add-frame step is still there
    session.undo();
    expect(session.play.frames).toHaveLength(1);
    expect(session.getState().canUndo).toBe(false);
  });

  it("only the listed ids are placed, even if others moved on the store", () => {
    const { session, drag } = make();
    session.apply((p, i) => addFrame(p, i), { sync: false });
    session.selectFrame(1);
    drag("o2", 70, 5);
    drag("o3", 71, 6);
    session.commitGesture(["o2"]);
    expect(placedIds(session.play, 1)).toEqual(["o2"]);
  });

  it("an empty gesture is nothing", () => {
    const { session } = make();
    session.commitGesture([]);
    expect(session.getState().canUndo).toBe(false);
  });

  it("selecting a frame loads its resolved scene; later frames inherit edits to earlier ones", () => {
    const { session, store, drag } = make();
    session.apply((p, i) => addFrame(p, i), { sync: false });
    session.selectFrame(1);
    drag("o2", 60, 10);
    session.commitGesture(["o2"]);
    session.selectFrame(0);
    const start = store.getScene().players.find((p) => p.id === "o2")!.pos;
    expect(start).not.toEqual({ x: 60, y: 10 });

    // Editing frame 0 for a player who is placed nowhere later flows through.
    drag("o5", 33, 33);
    session.commitGesture(["o5"]);
    session.selectFrame(1);
    expect(store.getScene().players.find((p) => p.id === "o5")!.pos).toEqual({ x: 33, y: 33 });
    // o2 was placed in frame 1 and keeps that.
    expect(store.getScene().players.find((p) => p.id === "o2")!.pos).toEqual({ x: 60, y: 10 });
  });

  it("undo and redo re-show the document on the field", () => {
    const { session, store, drag } = make();
    drag("o2", 61, 11);
    session.commitGesture(["o2"]);
    drag("o2", 80, 30); // an uncommitted wobble
    session.undo();
    expect(store.getScene().players.find((p) => p.id === "o2")!.pos).not.toEqual({ x: 61, y: 11 });
    session.redo();
    expect(store.getScene().players.find((p) => p.id === "o2")!.pos).toEqual({ x: 61, y: 11 });
  });

  it("the frame index follows an undo that removes the current frame", () => {
    const { session } = make();
    session.apply((p, i) => addFrame(p, i), { sync: false });
    session.selectFrame(1);
    session.undo();
    expect(session.getState().frameIndex).toBe(0);
  });

  it("apply() handles any pure op (give disc, titles) as undo steps and changes possession on the field", () => {
    const { session, store } = make();
    session.apply((p, i) => giveDisc(p, i, "o3"));
    expect(store.getScene().possession).toBe("o3");
    session.apply((p) => setTitle(p, "o3", "ab"));
    expect(store.getScene().players.find((p) => p.id === "o3")!.label).toBe("AB");
    session.undo();
    expect(store.getScene().players.find((p) => p.id === "o3")!.label).toBeUndefined();
    session.undo();
    expect(store.getScene().possession).toBe("o1");
  });

  it("a no-op op is not an undo step", () => {
    const { session } = make();
    session.apply((p) => p);
    expect(session.getState().canUndo).toBe(false);
  });

  it("marks the document unsaved on change and notifies document listeners once per change", () => {
    const { session } = make();
    const seen = vi.fn();
    session.subscribeDocument(seen);
    session.apply((p, i) => giveDisc(p, i, "o2"));
    expect(session.getState().save).toBe("unsaved");
    expect(seen).toHaveBeenCalledTimes(1);
    session.setSaveStatus("saved");
    expect(session.getState().save).toBe("saved");
    session.selectFrame(0);
    expect(seen).toHaveBeenCalledTimes(1); // navigation is not a document change
  });

  it("notifies structural subscribers, with a stable snapshot between changes", () => {
    const { session } = make();
    const cb = vi.fn();
    session.subscribe(cb);
    const a = session.getState();
    expect(session.getState()).toBe(a);
    session.apply((p, i) => giveDisc(p, i, "o2"));
    expect(cb).toHaveBeenCalled();
    expect(session.getState()).not.toBe(a);
    expect(session.getState().version).toBe(a.version + 1);
  });

  it("loadPlay replaces the document, history and frame", () => {
    const { session } = make();
    session.apply((p, i) => giveDisc(p, i, "o2"));
    session.loadPlay(newPlay());
    expect(session.getState().canUndo).toBe(false);
    expect(session.getState().frameIndex).toBe(0);
    expect(session.getState().save).toBe("saved");
  });
});
