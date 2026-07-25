import { describe, expect, it, vi } from "vitest";
import { createSceneStore } from "../scene/store";
import { getPreset } from "../scene/presets";

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
