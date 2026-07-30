import { describe, expect, it, vi } from "vitest";
import { createSceneStore } from "../scene/store";
import { getPreset } from "../scene/presets";
import { clearSelection } from "../scene/selection";

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

describe("createSceneStore", () => {
  it("notifies structural subscribers synchronously on mutate", () => {
    const store = createSceneStore(getPreset("vertStackForceSide"));
    const cb = vi.fn();
    store.subscribe(cb);
    store.mutate((draft) => {
      draft.players[0].pos = { x: 1, y: 1 };
    });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("coalesces multiple mutations in a frame into one onFrame callback", async () => {
    const store = createSceneStore(getPreset("vertStackForceSide"));
    const frameCb = vi.fn();
    store.onFrame(frameCb);

    store.mutate((draft) => {
      draft.players[0].pos = { x: 1, y: 1 };
    });
    store.mutate((draft) => {
      draft.players[1].pos = { x: 2, y: 2 };
    });
    store.mutate((draft) => {
      draft.players[2].pos = { x: 3, y: 3 };
    });

    await nextFrame();
    expect(frameCb).toHaveBeenCalledTimes(1);
  });

  it("schedules a fresh frame for mutations in a later frame", async () => {
    const store = createSceneStore(getPreset("vertStackForceSide"));
    const frameCb = vi.fn();
    store.onFrame(frameCb);

    store.mutate((draft) => {
      draft.players[0].pos = { x: 1, y: 1 };
    });
    await nextFrame();
    expect(frameCb).toHaveBeenCalledTimes(1);

    store.mutate((draft) => {
      draft.players[0].pos = { x: 2, y: 2 };
    });
    await nextFrame();
    expect(frameCb).toHaveBeenCalledTimes(2);
  });

  it("unsubscribe stops future notifications", () => {
    const store = createSceneStore(getPreset("vertStackForceSide"));
    const cb = vi.fn();
    const unsubscribe = store.subscribe(cb);
    unsubscribe();
    store.mutate((draft) => {
      draft.players[0].pos = { x: 1, y: 1 };
    });
    expect(cb).not.toHaveBeenCalled();
  });

  it("getScene returns the live, mutated object", () => {
    const store = createSceneStore(getPreset("vertStackForceSide"));
    store.mutate((draft) => {
      draft.players[0].pos = { x: 42, y: 7 };
    });
    expect(store.getScene().players[0].pos).toEqual({ x: 42, y: 7 });
  });
});

// Selection subscribers are a dedicated list (ADR-1), separate from
// subscribers/frameSubscribers, so a selection change never notifies a
// plain scene subscriber and a scene mutation never notifies a selection
// subscriber.
describe("selection", () => {
  it("starts as none", () => {
    const store = createSceneStore(getPreset("vertStackForceSide"));
    expect(store.getSelection()).toEqual({ kind: "none" });
  });

  it("setSelection updates getSelection", () => {
    const store = createSceneStore(getPreset("vertStackForceSide"));
    store.setSelection({ kind: "offense", id: "o2" });
    expect(store.getSelection()).toEqual({ kind: "offense", id: "o2" });
  });

  it("notifies selection subscribers on setSelection", () => {
    const store = createSceneStore(getPreset("vertStackForceSide"));
    const cb = vi.fn();
    store.subscribeSelection(cb);
    store.setSelection({ kind: "offense", id: "o2" });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("unsubscribeSelection stops future notifications", () => {
    const store = createSceneStore(getPreset("vertStackForceSide"));
    const cb = vi.fn();
    const unsubscribe = store.subscribeSelection(cb);
    unsubscribe();
    store.setSelection({ kind: "offense", id: "o2" });
    expect(cb).not.toHaveBeenCalled();
  });

  it("does not notify scene subscribers on a selection change", () => {
    const store = createSceneStore(getPreset("vertStackForceSide"));
    const sceneCb = vi.fn();
    store.subscribe(sceneCb);
    store.setSelection({ kind: "offense", id: "o2" });
    expect(sceneCb).not.toHaveBeenCalled();
  });

  it("does not notify selection subscribers on a scene mutation", () => {
    const store = createSceneStore(getPreset("vertStackForceSide"));
    const selectionCb = vi.fn();
    store.subscribeSelection(selectionCb);
    store.mutate((draft) => {
      draft.players[0].pos = { x: 1, y: 1 };
    });
    expect(selectionCb).not.toHaveBeenCalled();
  });

  it("selection helpers compose with the store (clearSelection resets to none)", () => {
    const store = createSceneStore(getPreset("vertStackForceSide"));
    store.setSelection({ kind: "offense", id: "o2" });
    store.setSelection(clearSelection());
    expect(store.getSelection()).toEqual({ kind: "none" });
  });
});
