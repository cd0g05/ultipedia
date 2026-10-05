// The local play library (fieldview-build ADR-43): persists across a "reload",
// drops invalid entries, reports a full or unavailable store without losing the
// in-memory play, and follows another tab's changes.

import { describe, expect, it, vi } from "vitest";
import { LIBRARY_KEY, createLocalPlayStore, newPlayId } from "../play/library";
import { BUILTIN_PLAYS } from "../play/plays";
import { newPlay, renamePlay } from "../play/model";

function memoryStorage(): Storage & { data: Map<string, string>; failWith?: unknown } {
  const data = new Map<string, string>();
  const s = {
    data,
    failWith: undefined as unknown,
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k: string) => data.get(k) ?? null,
    key: (i: number) => [...data.keys()][i] ?? null,
    removeItem: (k: string) => void data.delete(k),
    setItem(k: string, v: string) {
      if (s.failWith) throw s.failWith;
      data.set(k, v);
    },
  };
  return s;
}

describe("LocalPlayStore", () => {
  it("saves, lists, gets and removes", () => {
    const store = createLocalPlayStore(memoryStorage());
    expect(store.list()).toEqual([]);
    expect(store.save("a", newPlay())).toEqual({ ok: true });
    expect(store.save("b", renamePlay(newPlay(), "Second"))).toEqual({ ok: true });
    expect(store.list().map((p) => p.id)).toEqual(["a", "b"]);
    expect(store.get("b")!.play.name).toBe("Second");
    store.save("a", renamePlay(newPlay(), "Renamed")); // replaces in place, keeps order
    expect(store.list().map((p) => p.play.name)).toEqual(["Renamed", "Second"]);
    store.remove("a");
    expect(store.list().map((p) => p.id)).toEqual(["b"]);
    expect(store.get("a")).toBeUndefined();
  });

  it("survives a reload (a new store over the same storage)", () => {
    const storage = memoryStorage();
    const first = createLocalPlayStore(storage);
    first.save("a", BUILTIN_PLAYS[0]);
    const second = createLocalPlayStore(storage);
    expect(second.list()).toHaveLength(1);
    expect(second.get("a")!.play).toEqual(BUILTIN_PLAYS[0]);
    expect(second.get("a")!.updatedAt).toBeGreaterThan(0);
  });

  it("drops invalid, wrong-version and duplicate entries instead of throwing", () => {
    const storage = memoryStorage();
    storage.setItem(
      LIBRARY_KEY,
      JSON.stringify({
        version: 3,
        plays: [
          { id: "ok", updatedAt: 5, play: BUILTIN_PLAYS[0] },
          { id: "old", updatedAt: 1, play: { ...BUILTIN_PLAYS[0], formatVersion: 2 } },
          { id: "junk", play: { hello: 1 } },
          { play: BUILTIN_PLAYS[0] },
          "nope",
          { id: "ok", updatedAt: 9, play: BUILTIN_PLAYS[1] },
        ],
      }),
    );
    const store = createLocalPlayStore(storage);
    expect(store.list().map((p) => p.id)).toEqual(["ok"]);
    expect(store.get("ok")!.play.name).toBe(BUILTIN_PLAYS[0].name);
  });

  it("tolerates corrupt storage and a missing storage", () => {
    const storage = memoryStorage();
    storage.setItem(LIBRARY_KEY, "{not json");
    expect(createLocalPlayStore(storage).list()).toEqual([]);
    storage.setItem(LIBRARY_KEY, JSON.stringify({ plays: "x" }));
    expect(createLocalPlayStore(storage).list()).toEqual([]);
    const none = createLocalPlayStore(null);
    expect(none.save("a", newPlay())).toEqual({ ok: false, reason: "unavailable" });
    expect(none.list()).toHaveLength(1); // memory still holds it
  });

  it("a full store reports an error and leaves the in-memory play intact", () => {
    const storage = memoryStorage();
    const store = createLocalPlayStore(storage);
    store.save("a", newPlay());
    storage.failWith = Object.assign(new Error("full"), { name: "QuotaExceededError" });
    const result = store.save("b", renamePlay(newPlay(), "Big"));
    expect(result).toEqual({ ok: false, reason: "quota" });
    expect(store.get("b")!.play.name).toBe("Big"); // not lost
    expect(store.list()).toHaveLength(2);
    // Once space frees up, the next save writes everything.
    storage.failWith = undefined;
    expect(store.save("b", renamePlay(newPlay(), "Big"))).toEqual({ ok: true });
    expect(createLocalPlayStore(storage).list()).toHaveLength(2);
  });

  it("restores a removed entry exactly (undo of a delete)", () => {
    const store = createLocalPlayStore(memoryStorage());
    store.save("a", newPlay());
    const entry = store.get("a")!;
    store.remove("a");
    store.restore(entry);
    expect(store.get("a")).toEqual(entry);
    store.restore(entry); // idempotent
    expect(store.list()).toHaveLength(1);
  });

  it("notifies subscribers with a new snapshot each change", () => {
    const store = createLocalPlayStore(memoryStorage());
    const cb = vi.fn();
    const off = store.subscribe(cb);
    const a = store.getSnapshot();
    store.save("a", newPlay());
    expect(cb).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).not.toBe(a);
    off();
    store.save("b", newPlay());
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("follows another tab's change (storage event)", () => {
    const storage = memoryStorage();
    const store = createLocalPlayStore(storage);
    const cb = vi.fn();
    store.subscribe(cb);
    // Another tab writes, then the browser tells this one.
    storage.setItem(LIBRARY_KEY, JSON.stringify({ version: 3, plays: [{ id: "x", updatedAt: 1, play: BUILTIN_PLAYS[0] }] }));
    window.dispatchEvent(new StorageEvent("storage", { key: LIBRARY_KEY }));
    expect(store.list().map((p) => p.id)).toEqual(["x"]);
    expect(cb).toHaveBeenCalled();
    // An unrelated key is ignored.
    cb.mockClear();
    window.dispatchEvent(new StorageEvent("storage", { key: "something-else" }));
    expect(cb).not.toHaveBeenCalled();
  });

  it("makes distinct ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => newPlayId()));
    expect(ids.size).toBe(50);
  });
});
