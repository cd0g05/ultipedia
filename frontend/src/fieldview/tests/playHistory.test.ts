import { describe, expect, it } from "vitest";
import { HISTORY_CAP, canRedo, canUndo, createHistory, push, redo, undo } from "../play/history";

describe("history", () => {
  it("push, undo and redo walk the snapshots", () => {
    let h = createHistory(1);
    h = push(push(h, 2), 3);
    expect(h.present).toBe(3);
    h = undo(h);
    expect(h.present).toBe(2);
    h = undo(h);
    expect(h.present).toBe(1);
    expect(canUndo(h)).toBe(false);
    expect(undo(h)).toBe(h);
    h = redo(redo(h));
    expect(h.present).toBe(3);
    expect(canRedo(h)).toBe(false);
    expect(redo(h)).toBe(h);
  });

  it("a new push clears the redo branch", () => {
    let h = push(push(createHistory(1), 2), 3);
    h = push(undo(h), 9);
    expect(canRedo(h)).toBe(false);
    expect(h.present).toBe(9);
  });

  it("pushing the same value is not a step", () => {
    const h = createHistory({ a: 1 });
    expect(push(h, h.present)).toBe(h);
  });

  it("is capped, dropping the oldest", () => {
    let h = createHistory(0);
    for (let i = 1; i <= HISTORY_CAP + 25; i += 1) h = push(h, i);
    expect(h.past).toHaveLength(HISTORY_CAP);
    for (let i = 0; i < HISTORY_CAP; i += 1) h = undo(h);
    expect(h.present).toBe(25);
    expect(canUndo(h)).toBe(false);
  });

  it("does not mutate earlier histories", () => {
    const a = createHistory(1);
    const b = push(a, 2);
    expect(a.present).toBe(1);
    expect(a.past).toHaveLength(0);
    expect(b.past).toEqual([1]);
  });
});
