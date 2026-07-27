// Designer mode: timeline interactions, transport states, the
// between-keyframes block, delete + undo, and the mode handoff.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Designer } from "../pages/Designer";
import { Whiteboard } from "../pages/Whiteboard";
import { stashScene } from "../play/modeHandoff";
import { entitiesOf, keyframeOf, toPlayFile } from "../play/serialize";
import { getPreset } from "../scene/presets";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

function renderDesigner() {
  return render(
    <MemoryRouter>
      <Designer />
    </MemoryRouter>,
  );
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

// jsdom's Blob has no text(); FileReader is the portable read.
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function addKeyframe() {
  fireEvent.click(screen.getByRole("button", { name: "+ Keyframe" }));
}

describe("Designer timeline", () => {
  it("starts with one keyframe at 0.0s, selected, and Play disabled", () => {
    renderDesigner();
    const chip = screen.getByRole("button", { name: "Keyframe 1 at 0.00 seconds" });
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
    expect(screen.getByText("Add a second keyframe to play.")).toBeInTheDocument();
  });

  it("appends a keyframe at +1.5s and selects it", () => {
    renderDesigner();
    addKeyframe();
    const chip = screen.getByRole("button", { name: "Keyframe 2 at 1.50 seconds" });
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Play" })).toBeEnabled();
    expect(screen.queryByText("Add a second keyframe to play.")).not.toBeInTheDocument();
  });

  it("lays chips out proportionally to their timestamp", () => {
    renderDesigner();
    addKeyframe();
    expect(screen.getByRole("button", { name: "Keyframe 1 at 0.00 seconds" })).toHaveStyle({ left: "0%" });
    expect(screen.getByRole("button", { name: "Keyframe 2 at 1.50 seconds" })).toHaveStyle({ left: "100%" });
  });

  it("retimes a keyframe inline and re-sorts the strip", () => {
    renderDesigner();
    addKeyframe();
    addKeyframe(); // keyframes at 0, 1.5, 3

    const input = screen.getByLabelText("Keyframe 3 timestamp in seconds");
    fireEvent.change(input, { target: { value: "0.5" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // The retimed keyframe moved ahead of the 1.5s one, so it is now chip 2.
    expect(screen.getByRole("button", { name: "Keyframe 2 at 0.50 seconds" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Keyframe 3 at 1.50 seconds" })).toBeInTheDocument();
  });

  it("reorders by dragging a chip past its neighbour — order follows the timestamp", () => {
    renderDesigner();
    addKeyframe();
    addKeyframe(); // 0, 1.5, 3

    // jsdom gives every element a zero-size rect, so the strip needs a real
    // one for the chip's pointer x to mean anything.
    vi.spyOn(HTMLDivElement.prototype, "getBoundingClientRect").mockReturnValue({
      left: 0,
      width: 300,
      top: 0,
      height: 64,
      right: 300,
      bottom: 64,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    try {
      const chip = screen.getByRole("button", { name: "Keyframe 3 at 3.00 seconds" });
      fireEvent.pointerDown(chip, { pointerId: 1 });
      // 50px of a 300px strip spanning 3s => 0.5s, left of the 1.5s chip.
      fireEvent.pointerMove(chip, { pointerId: 1, clientX: 50 });
      fireEvent.pointerUp(chip, { pointerId: 1 });

      expect(screen.getByRole("button", { name: "Keyframe 2 at 0.50 seconds" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("button", { name: "Keyframe 3 at 1.50 seconds" })).toBeInTheDocument();
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("does not let a chip drag retime keyframe 1 off the origin", () => {
    renderDesigner();
    addKeyframe();

    const chip = screen.getByRole("button", { name: "Keyframe 1 at 0.00 seconds" });
    fireEvent.pointerDown(chip, { pointerId: 1 });
    fireEvent.pointerMove(chip, { pointerId: 1, clientX: 200 });
    fireEvent.pointerUp(chip, { pointerId: 1 });

    expect(screen.getByRole("button", { name: "Keyframe 1 at 0.00 seconds" })).toBeInTheDocument();
  });

  it("pins keyframe 1 at 0.0s — its timestamp field is disabled", () => {
    renderDesigner();
    expect(screen.getByLabelText("Keyframe 1 timestamp in seconds")).toBeDisabled();
  });

  it("blocks editing while scrubbed between keyframes and offers to add one there", async () => {
    renderDesigner();
    addKeyframe();

    fireEvent.change(screen.getByLabelText("Playhead"), { target: { value: "0.75" } });

    expect(screen.getByText(/Select a keyframe to edit/)).toBeInTheDocument();
    const piece = screen.getByRole("button", { name: "offense cutter 1" });
    expect(piece).toHaveAttribute("aria-disabled", "true");
    expect(piece).toHaveAttribute("tabindex", "-1");

    fireEvent.click(screen.getByRole("button", { name: "add one here" }));

    expect(screen.getByRole("button", { name: "Keyframe 2 at 0.75 seconds" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByText(/Select a keyframe to edit/)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "offense cutter 1" })).not.toHaveAttribute("aria-disabled"),
    );
  });

  it("selecting a chip restores that keyframe's positions and re-enables editing", async () => {
    renderDesigner();
    const cutter = screen.getByRole("button", { name: "offense cutter 1" });
    const startTransform = cutter.getAttribute("transform");

    addKeyframe();
    fireEvent.keyDown(screen.getByRole("button", { name: "offense cutter 1" }), { key: "ArrowRight" });
    await nextFrame();
    const movedTransform = screen.getByRole("button", { name: "offense cutter 1" }).getAttribute("transform");
    expect(movedTransform).not.toBe(startTransform);

    fireEvent.click(screen.getByRole("button", { name: "Keyframe 1 at 0.00 seconds" }));
    await nextFrame();
    expect(screen.getByRole("button", { name: "offense cutter 1" }).getAttribute("transform")).toBe(
      startTransform,
    );
  });

  it("deletes a keyframe with a 5s Undo that restores it", () => {
    renderDesigner();
    addKeyframe();

    fireEvent.click(screen.getByRole("button", { name: "Delete keyframe" }));
    expect(screen.queryByRole("button", { name: "Keyframe 2 at 1.50 seconds" })).not.toBeInTheDocument();
    expect(screen.getByText(/Keyframe deleted/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("button", { name: "Keyframe 2 at 1.50 seconds" })).toBeInTheDocument();
  });

  it("rebases timestamps when the origin keyframe is deleted, so the play still starts at 0.0s", () => {
    renderDesigner();
    addKeyframe();
    addKeyframe(); // 0, 1.5, 3

    fireEvent.click(screen.getByRole("button", { name: "Keyframe 1 at 0.00 seconds" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete keyframe" }));

    // Gaps preserved (1.5s apart), origin back at zero — otherwise keyframe 1
    // would sit at 1.5s and be un-retimable, since the origin is pinned.
    expect(screen.getByRole("button", { name: "Keyframe 1 at 0.00 seconds" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keyframe 2 at 1.50 seconds" })).toBeInTheDocument();
  });

  it("undo after deleting the origin restores the original timestamps", () => {
    renderDesigner();
    addKeyframe();
    addKeyframe();

    fireEvent.click(screen.getByRole("button", { name: "Keyframe 1 at 0.00 seconds" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete keyframe" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(screen.getByRole("button", { name: "Keyframe 1 at 0.00 seconds" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keyframe 2 at 1.50 seconds" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keyframe 3 at 3.00 seconds" })).toBeInTheDocument();
  });

  it("offers no delete affordance when only one keyframe remains", () => {
    renderDesigner();
    expect(screen.queryByRole("button", { name: "Delete keyframe" })).not.toBeInTheDocument();
  });

  it("tweens pieces during playback and stops at the end", async () => {
    // Drive rAF and the clock by hand: real-time playback in a test is
    // either flaky or slow, and what matters is that the piece is
    // mid-interpolation partway through and at the end pose when it stops.
    const callbacks: FrameRequestCallback[] = [];
    let now = 0;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
      callbacks.push(cb);
      return callbacks.length;
    });
    vi.spyOn(performance, "now").mockImplementation(() => now);

    function flush(advanceMs: number) {
      now += advanceMs;
      const pending = callbacks.splice(0, callbacks.length);
      for (const cb of pending) cb(now);
    }

    try {
      renderDesigner();
      addKeyframe(); // keyframe 2 at 1.5s
      const cutter = () => screen.getByRole("button", { name: "offense cutter 1" });

      // Move the piece 5 yd at keyframe 2, so the tween has something to do.
      for (let i = 0; i < 5; i += 1) fireEvent.keyDown(cutter(), { key: "ArrowRight" });
      flush(0);
      const endTransform = cutter().getAttribute("transform");

      fireEvent.click(screen.getByRole("button", { name: "Keyframe 1 at 0.00 seconds" }));
      flush(0);
      const startTransform = cutter().getAttribute("transform");
      expect(startTransform).not.toBe(endTransform);

      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      flush(750); // half way
      flush(0); // let the store's coalesced repaint land

      const midTransform = cutter().getAttribute("transform");
      expect(midTransform).not.toBe(startTransform);
      expect(midTransform).not.toBe(endTransform);

      flush(750); // reach the end
      flush(0);
      expect(cutter().getAttribute("transform")).toBe(endTransform);
      await waitFor(() => expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument());
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("Play swaps to Pause and clears the keyframe selection while running", () => {
    renderDesigner();
    addKeyframe();

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keyframe 1 at 0.00 seconds" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });
});

describe("Designer import/export", () => {
  it("loads a valid play and reports it", async () => {
    renderDesigner();
    const scene = getPreset("horizontalStack");
    const play = toPlayFile({
      name: "Imported play",
      description: "From a file.",
      entities: entitiesOf(scene),
      keyframes: [keyframeOf(scene, 0), keyframeOf(scene, 1)],
    });

    const file = new File([JSON.stringify(play)], "play.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText("Import play file"), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText("Loaded Imported play")).toBeInTheDocument());
    expect(screen.getByLabelText(/Play name/i)).toHaveValue("Imported play");
    expect(screen.getByRole("button", { name: "Keyframe 2 at 1.00 seconds" })).toBeInTheDocument();
  });

  it("rejects a malformed file with a specific message and leaves the scene untouched", async () => {
    renderDesigner();
    const cutter = screen.getByRole("button", { name: "offense cutter 1" });
    const before = cutter.getAttribute("transform");

    const file = new File(["{ not json"], "bad.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText("Import play file"), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/isn't a Field View play/));
    expect(screen.getByRole("button", { name: "Keyframe 1 at 0.00 seconds" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "offense cutter 1" }).getAttribute("transform")).toBe(before);
  });

  it("rejects a newer-version file without destroying the current play", async () => {
    renderDesigner();
    addKeyframe();

    const scene = getPreset("flatMark");
    const play = { ...toPlayFile({ name: "Future", entities: entitiesOf(scene), keyframes: [keyframeOf(scene, 0)] }), formatVersion: 99 };
    const file = new File([JSON.stringify(play)], "future.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText("Import play file"), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/newer version/));
    expect(screen.getByRole("button", { name: "Keyframe 2 at 1.50 seconds" })).toBeInTheDocument();
  });

  it("exports the move made in the same tick — the selected keyframe is flushed first", async () => {
    let exported: Blob | null = null;
    const click = vi.fn();
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = createElement(tag);
      if (tag === "a") el.click = click;
      return el;
    });
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: (blob: Blob) => {
        exported = blob;
        return "blob:play";
      },
      revokeObjectURL: vi.fn(),
    });

    try {
      renderDesigner();
      const cutter = screen.getByRole("button", { name: "offense cutter 1" });
      const before = cutter.getAttribute("transform");

      // Shift-nudge is 5 yd. The keyframe is normally captured on the next
      // rAF, so exporting in this same tick is exactly the losing case.
      fireEvent.keyDown(cutter, { key: "ArrowRight", shiftKey: true });
      fireEvent.click(screen.getByRole("button", { name: "Export play" }));

      expect(exported).not.toBeNull();
      const play = JSON.parse(await readBlob(exported!)) as {
        entities: { id: string; role: string; label?: string }[];
        keyframes: { positions: Record<string, { x: number }> }[];
      };
      const cutterId = play.entities.find((e) => e.role === "cutter" && e.label === "1")?.id;
      expect(cutterId).toBeDefined();
      // Cutter 1 starts at x = 50 in the vert preset; Shift-Right moves it 5 yd.
      expect(play.keyframes[0].positions[cutterId!].x).toBeCloseTo(55, 5);
      // Deliberately no rAF is awaited before the export above: the keyframe
      // is normally captured on the next frame, so exporting in the same tick
      // is exactly the case that used to lose the move. The 55 is only
      // correct because export flushes synchronously.
      //
      // (Asserting "the SVG has not repainted yet" here would be a race — on
      // a loaded machine the frame can land first — so the flush is proven by
      // the exported value, not by DOM timing.)
      await nextFrame();
      expect(cutter.getAttribute("transform")).not.toBe(before);
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });

  it("exports a downloadable play file", () => {
    const click = vi.fn();
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = createElement(tag);
      if (tag === "a") el.click = click;
      return el;
    });
    const createObjectURL = vi.fn(() => "blob:play");
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });

    try {
      renderDesigner();
      fireEvent.click(screen.getByRole("button", { name: "Export play" }));
      expect(createObjectURL).toHaveBeenCalled();
      expect(click).toHaveBeenCalled();
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });
});

describe("Whiteboard -> Designer handoff", () => {
  it("carries the stashed scene in as keyframe 1", () => {
    const scene = getPreset("horizontalStack");
    scene.players[1].pos = { x: 77, y: 33 };
    stashScene(scene);

    renderDesigner();
    expect(screen.getByRole("button", { name: "Keyframe 1 at 0.00 seconds" })).toBeInTheDocument();
    // The stash is consumed, so a reload of the route does not resurrect it.
    expect(sessionStorage.getItem("fieldview.modeHandoff.scene")).toBeNull();
  });

  it("falls back to the default preset when nothing was stashed", () => {
    renderDesigner();
    expect(screen.getByRole("button", { name: "offense thrower T" })).toBeInTheDocument();
  });

  it("the whiteboard's Designer link stashes the current scene", () => {
    render(
      <MemoryRouter>
        <Whiteboard />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("link", { name: "Designer" }));
    expect(sessionStorage.getItem("fieldview.modeHandoff.scene")).toContain("players");
  });
});
