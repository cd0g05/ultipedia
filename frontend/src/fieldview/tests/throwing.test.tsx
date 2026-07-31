// Throwing mode end to end (ux.md Flow 1 and every one of its alternates,
// approach.md Partition 4 acceptance): arming from the ribbon, completing on
// a click, and the five ways out that must change nothing.
//
// Driven through the real `Whiteboard` page rather than a mounted
// `FieldCanvas`, because the interaction spans the shell (the ribbon button),
// the canvas (the click), and the scene (the throw) — the seams between those
// are exactly what could break. Same conventions as overlay.test.tsx: real
// store, real preset, no mocks, and the SVG's bounding rect stubbed because
// jsdom gives it no layout.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Profiler } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Whiteboard } from "../pages/Whiteboard";
import { getStageViewBox } from "../render/coords";
import { FIELD_PX_HEIGHT, FIELD_PX_WIDTH } from "../render/fieldLayer";
import { resetThrowMode } from "../ui/shell/throwMode";

const viewBox = getStageViewBox(FIELD_PX_WIDTH, FIELD_PX_HEIGHT);

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetThrowMode();
});

// Since fieldview-motion the disc TRAVELS, and possession moves when it lands
// rather than when the receiver is clicked (PRD FR-5.3). The throw semantics
// asserted throughout this file are unchanged — they just happen a second
// later. This pumps frames with the clock jumped forward, so a 1.5 s flight
// resolves in a handful of ticks instead of real time. Each frame advances at
// most MAX_FRAME_SECONDS (0.25 s) however far the clock jumped — that clamp is
// the whole point of FR-4.5 — so a ~1.5 s flight needs several.
async function landDisc() {
  const base = performance.now();
  let jump = 0;
  const clock = vi.spyOn(performance, "now").mockImplementation(() => base + (jump += 1000));
  try {
    await act(async () => {
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      }
    });
  } finally {
    clock.mockRestore();
  }
}

function stubStageRect() {
  return vi.spyOn(SVGSVGElement.prototype, "getBoundingClientRect").mockReturnValue({
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
}

function renderWhiteboard() {
  return render(
    <MemoryRouter>
      <Whiteboard />
    </MemoryRouter>,
  );
}

// Nearest-within-radius picking means a press has to land on the piece, not
// merely on its element.
function pointFor(piece: Element) {
  const match = piece.getAttribute("transform")!.match(/translate\(([-\d.]+), ([-\d.]+)\)/)!;
  return { clientX: Number(match[1]) - viewBox.x, clientY: Number(match[2]) - viewBox.y };
}

function throwButton() {
  return screen.getByRole("button", { name: "Throw to Player" });
}

function arm() {
  fireEvent.click(throwButton());
}

// Clicking a piece: press and release without travelling, which is what
// separates a throw from a drag (ux.md Flow 1 Alternate C).
function clickPiece(piece: Element) {
  const at = pointFor(piece);
  fireEvent.pointerDown(piece, { pointerId: 1, ...at });
  fireEvent.pointerUp(piece, { pointerId: 1, ...at });
}

function discOwner(): string | null {
  const thrower = screen.queryAllByRole("button", { name: /offense thrower/ })[0];
  return thrower ? thrower.getAttribute("data-piece-id") : null;
}

describe("arming the throw tool", () => {
  it("marks the ribbon button pressed and says what it is waiting for", () => {
    renderWhiteboard();
    expect(throwButton()).not.toHaveAttribute("aria-pressed", "true");

    arm();
    expect(throwButton()).toHaveAttribute("aria-pressed", "true");
    // ux.md: a mode always announces itself — a pressed button AND a
    // field-level hint, in a polite live region.
    const hint = screen.getByTestId("throw-hint");
    expect(hint).toHaveTextContent("Click a receiver.");
    expect(hint).toHaveAttribute("aria-live", "polite");
  });

  it("emphasises every eligible receiver and nobody else", () => {
    renderWhiteboard();
    arm();

    const targets = document.querySelectorAll("[data-throw-target]");
    // Six cutters: every offensive player except the one already holding it.
    expect(targets).toHaveLength(6);
    for (const el of targets) {
      expect(el.getAttribute("aria-label")).toMatch(/^offense cutter/);
    }
  });
});

describe("completing a throw (Flow 1)", () => {
  it("moves the disc, the roles and the mark, then exits the mode", async () => {
    const rect = stubStageRect();
    try {
      renderWhiteboard();
      expect(discOwner()).toBe("o1");

      arm();
      clickPiece(screen.getByRole("button", { name: "offense cutter 3" }));

      // Mid-flight the old thrower still holds it — there is never a moment
      // where the disc belongs to nobody (FR-5.4).
      expect(discOwner()).toBe("o1");
      await landDisc();

      // The receiver now holds it, and the old thrower is an ordinary cutter.
      expect(discOwner()).toBe("o4");
      // The mark followed possession: d4 guards o4 in the built-in pairing.
      expect(
        screen.getByRole("button", { name: /defense mark/ }).getAttribute("data-piece-id"),
      ).toBe("d4");
      // Mode exited, and the change was announced rather than silent.
      expect(throwButton()).not.toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("throw-hint")).toHaveTextContent("#3 has the disc.");
    } finally {
      rect.mockRestore();
    }
  });

  it("selects the new thrower so the sidebar shows the new situation", async () => {
    const rect = stubStageRect();
    try {
      renderWhiteboard();
      arm();
      clickPiece(screen.getByRole("button", { name: "offense cutter 3" }));
      await landDisc();

      // The offense panel for the new holder, straight from the registry.
      expect(screen.getByText(/Has the disc/)).toBeInTheDocument();
    } finally {
      rect.mockRestore();
    }
  });

  it("completes on Enter for a keyboard user on the focused receiver", async () => {
    renderWhiteboard();
    arm();

    const receiver = screen.getByRole("button", { name: "offense cutter 2" });
    receiver.focus();
    fireEvent.keyDown(receiver, { key: "Enter" });
    await landDisc();

    expect(discOwner()).toBe("o3");
    expect(throwButton()).not.toHaveAttribute("aria-pressed", "true");
  });
});

describe("cancelling (Flow 1 Alternates A-C)", () => {
  it("Escape exits the mode and changes nothing", () => {
    renderWhiteboard();
    arm();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(throwButton()).not.toHaveAttribute("aria-pressed", "true");
    expect(discOwner()).toBe("o1");
    expect(screen.getByTestId("throw-hint")).toHaveTextContent("");
  });

  it("re-clicking Throw exits the mode and changes nothing", () => {
    renderWhiteboard();
    arm();
    arm();

    expect(throwButton()).not.toHaveAttribute("aria-pressed", "true");
    expect(discOwner()).toBe("o1");
  });

  it("clicking a defender exits the mode and changes nothing", () => {
    const rect = stubStageRect();
    try {
      renderWhiteboard();
      arm();
      clickPiece(screen.getByRole("button", { name: "defense defender 3" }));

      expect(throwButton()).not.toHaveAttribute("aria-pressed", "true");
      expect(discOwner()).toBe("o1");
    } finally {
      rect.mockRestore();
    }
  });

  it("clicking empty grass exits the mode and changes nothing", () => {
    const rect = stubStageRect();
    try {
      renderWhiteboard();
      arm();
      const stage = screen.getByRole("group", { name: /Ultimate field/i });
      fireEvent.pointerDown(stage, { pointerId: 1, clientX: 5, clientY: 5 });
      fireEvent.pointerUp(stage, { pointerId: 1, clientX: 5, clientY: 5 });

      expect(throwButton()).not.toHaveAttribute("aria-pressed", "true");
      expect(discOwner()).toBe("o1");
    } finally {
      rect.mockRestore();
    }
  });

  it("throwing to the current holder is a no-op that still exits the mode", () => {
    const rect = stubStageRect();
    try {
      renderWhiteboard();
      const holder = screen.getByRole("button", { name: "offense thrower T" });
      const before = holder.getAttribute("transform");

      arm();
      clickPiece(holder);

      expect(throwButton()).not.toHaveAttribute("aria-pressed", "true");
      expect(discOwner()).toBe("o1");
      expect(
        screen.getByRole("button", { name: "offense thrower T" }).getAttribute("transform"),
      ).toBe(before);
      // Nothing happened, so nothing is announced.
      expect(screen.getByTestId("throw-hint")).toHaveTextContent("");
    } finally {
      rect.mockRestore();
    }
  });

  it("dragging a receiver while armed drags it instead of throwing to it", async () => {
    const rect = stubStageRect();
    try {
      renderWhiteboard();
      const receiver = screen.getByRole("button", { name: "offense cutter 3" });
      const at = pointFor(receiver);
      const atRest = receiver.getAttribute("transform");

      arm();
      fireEvent.pointerDown(receiver, { pointerId: 1, ...at });
      for (let i = 1; i <= 5; i += 1) {
        fireEvent.pointerMove(receiver, {
          pointerId: 1,
          clientX: at.clientX + i * 6,
          clientY: at.clientY,
        });
      }
      fireEvent.pointerUp(receiver, { pointerId: 1, clientX: at.clientX + 30, clientY: at.clientY });

      // The mode is gone, the disc never moved, and the drag happened.
      expect(throwButton()).not.toHaveAttribute("aria-pressed", "true");
      expect(discOwner()).toBe("o1");
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      expect(
        screen.getByRole("button", { name: "offense cutter 3" }).getAttribute("transform"),
      ).not.toBe(atRest);
    } finally {
      rect.mockRestore();
    }
  });
});

describe("ADR-2: throwing mode stays out of the drag path", () => {
  it("commits zero React renders across a burst of moves while armed", async () => {
    const rect = stubStageRect();
    try {
      let commits = 0;
      render(
        <MemoryRouter>
          <Profiler id="throwing" onRender={() => (commits += 1)}>
            <Whiteboard />
          </Profiler>
        </MemoryRouter>,
      );

      arm();
      const receiver = screen.getByRole("button", { name: "offense cutter 3" });
      const at = pointFor(receiver);
      const atRest = receiver.getAttribute("transform");
      // The press is where the mode exits — one legitimate, discrete commit,
      // deliberately taken here so the moves that follow are free.
      fireEvent.pointerDown(receiver, { pointerId: 1, ...at });

      commits = 0;
      for (let i = 1; i <= 25; i += 1) {
        fireEvent.pointerMove(receiver, {
          pointerId: 1,
          clientX: at.clientX + i * 2,
          clientY: at.clientY,
        });
      }

      expect(commits).toBe(0);
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      expect(
        screen.getByRole("button", { name: "offense cutter 3" }).getAttribute("transform"),
      ).not.toBe(atRest);
      expect(commits).toBe(0);
    } finally {
      rect.mockRestore();
    }
  });
});
