// The route interaction end to end, through the real Whiteboard: panel
// controls, destination picking on the canvas, marker dragging, drag
// suppression during a run, and the Movement sliders.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Profiler } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Whiteboard } from "../pages/Whiteboard";
import { getStageViewBox, yardToPixel } from "../render/coords";
import { FIELD_PX_HEIGHT, FIELD_PX_WIDTH } from "../render/fieldLayer";
import { getMotionMode, resetMotionMode } from "../ui/motion/motionMode";
import { DEFAULT_MOTION_PARAMS } from "../motion/constants";
import { parsePrefs } from "../ui/prefs";

const viewBox = getStageViewBox(FIELD_PX_WIDTH, FIELD_PX_HEIGHT);

function stubRect(svg: SVGSVGElement) {
  return vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: viewBox.width,
    height: viewBox.height,
    right: viewBox.width,
    bottom: viewBox.height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
}

// Through the real transform, so this stays correct whichever way the field
// points (canon ADR-11).
function at(yard: { x: number; y: number }) {
  const px = yardToPixel(yard);
  return { clientX: px.x - viewBox.x, clientY: px.y - viewBox.y };
}

function setup() {
  const view = render(
    <MemoryRouter>
      <Whiteboard />
    </MemoryRouter>,
  );
  const svg = screen.getByRole("group", { name: /ultimate field/i }) as unknown as SVGSVGElement;
  const restore = stubRect(svg);
  return { view, svg, restore };
}

// Select a cutter by clicking it, which is how a coach reaches the panel.
function selectCutter(name = "offense cutter 1") {
  const piece = screen.getByRole("button", { name });
  fireEvent.pointerDown(piece, { pointerId: 1, ...at({ x: 50, y: 20 }) });
  fireEvent.pointerUp(piece, { pointerId: 1, ...at({ x: 50, y: 20 }) });
  return piece;
}

// Both shells are in the DOM at once (the breakpoint is CSS-only, canon
// ADR-15), so every query here takes the desktop sidebar's copy — index 0.
function routeButton(label: string | RegExp, index = 0) {
  return screen.getAllByRole("button", { name: label })[index];
}

beforeEach(() => {
  localStorage.clear();
  resetMotionMode();
});

describe("setting a destination (ux.md Flow 1)", () => {
  it("arms picking, drops a marker, and enables Run", () => {
    const { svg, restore } = setup();
    try {
      selectCutter();
      expect(screen.getAllByText("None set.").length).toBeGreaterThan(0);

      const arm = routeButton(/set destination/i);
      expect(routeButton(/^run$/i)).toHaveAttribute("aria-disabled", "true");
      fireEvent.click(arm);
      expect(arm).toHaveAttribute("aria-pressed", "true");
      expect(screen.getAllByText("Click where the cutter should go.").length).toBeGreaterThan(0);

      fireEvent.pointerDown(svg, { pointerId: 2, ...at({ x: 75, y: 12 }) });

      expect(Object.values(getMotionMode().routes)[0].legs).toEqual([{ x: 75, y: 12 }]);
      expect(screen.getAllByText("1 leg").length).toBeGreaterThan(0);
      expect(routeButton(/^run$/i)).not.toHaveAttribute("aria-disabled");
      expect(screen.getAllByTestId("route-layer").length).toBeGreaterThan(0);
    } finally {
      restore.mockRestore();
    }
  });

  it("appends further waypoints and clears the whole route", () => {
    const { svg, restore } = setup();
    try {
      selectCutter();
      fireEvent.click(routeButton(/set destination/i));
      fireEvent.pointerDown(svg, { pointerId: 2, ...at({ x: 70, y: 10 }) });
      fireEvent.click(routeButton(/add waypoint/i));
      fireEvent.pointerDown(svg, { pointerId: 3, ...at({ x: 55, y: 30 }) });

      expect(Object.values(getMotionMode().routes)[0].legs).toHaveLength(2);
      expect(screen.getAllByText("2 legs").length).toBeGreaterThan(0);

      fireEvent.click(routeButton(/^clear$/i));
      expect(Object.values(getMotionMode().routes)).toHaveLength(0);
      expect(screen.getAllByText("None set.").length).toBeGreaterThan(0);
    } finally {
      restore.mockRestore();
    }
  });

  it("clamps a destination outside the field (FR-2.5)", () => {
    const { svg, restore } = setup();
    try {
      selectCutter();
      fireEvent.click(routeButton(/set destination/i));
      // Past the back of the endzone: lands on the boundary, the same way
      // dragging a piece off the field already clamps.
      fireEvent.pointerDown(svg, { pointerId: 2, ...at({ x: 200, y: -30 }) });
      expect(Object.values(getMotionMode().routes)[0].legs).toEqual([{ x: 110, y: 0 }]);
    } finally {
      restore.mockRestore();
    }
  });
});

describe("cancel paths (ux.md Flow 3)", () => {
  it("Escape disarms picking", () => {
    const { restore } = setup();
    try {
      selectCutter();
      fireEvent.click(routeButton(/set destination/i));
      expect(getMotionMode().picking).not.toBeNull();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(getMotionMode().picking).toBeNull();
    } finally {
      restore.mockRestore();
    }
  });

  it("re-clicking the armed button disarms it", () => {
    const { restore } = setup();
    try {
      selectCutter();
      fireEvent.click(routeButton(/set destination/i));
      fireEvent.click(routeButton(/set destination/i));
      expect(getMotionMode().picking).toBeNull();
    } finally {
      restore.mockRestore();
    }
  });

  it("selecting a different player abandons the pending pick", () => {
    const { restore } = setup();
    try {
      selectCutter("offense cutter 1");
      fireEvent.click(routeButton(/set destination/i));
      expect(getMotionMode().picking).not.toBeNull();

      const other = screen.getByRole("button", { name: "offense cutter 2" });
      fireEvent.pointerDown(other, { pointerId: 5, ...at({ x: 45, y: 25 }) });
      fireEvent.pointerUp(other, { pointerId: 5, ...at({ x: 45, y: 25 }) });

      expect(getMotionMode().picking).toBeNull();
    } finally {
      restore.mockRestore();
    }
  });
});

describe("marker dragging (Builder decision 2026-07-31)", () => {
  it("repositions a waypoint and commits once, on release", () => {
    const { svg, restore } = setup();
    try {
      selectCutter();
      fireEvent.click(routeButton(/set destination/i));
      fireEvent.pointerDown(svg, { pointerId: 2, ...at({ x: 70, y: 20 }) });
      expect(Object.values(getMotionMode().routes)[0].legs).toEqual([{ x: 70, y: 20 }]);

      // Grab the marker and drag it shallower — Journey 2's tighten-and-re-run.
      fireEvent.pointerDown(svg, { pointerId: 4, ...at({ x: 70, y: 20 }) });
      fireEvent.pointerMove(svg, { pointerId: 4, ...at({ x: 62, y: 26 }) });

      // Mid-drag the model is untouched: the marker moves in the DOM only, so
      // React stays out of the pointer path (canon ADR-2).
      expect(Object.values(getMotionMode().routes)[0].legs).toEqual([{ x: 70, y: 20 }]);

      fireEvent.pointerUp(svg, { pointerId: 4, ...at({ x: 62, y: 26 }) });
      const moved = Object.values(getMotionMode().routes)[0].legs[0];
      expect(moved.x).toBeCloseTo(62, 6);
      expect(moved.y).toBeCloseTo(26, 6);
    } finally {
      restore.mockRestore();
    }
  });

  it("commits zero React renders while dragging a marker", () => {
    const { svg, restore } = setup();
    try {
      selectCutter();
      fireEvent.click(routeButton(/set destination/i));
      fireEvent.pointerDown(svg, { pointerId: 2, ...at({ x: 70, y: 20 }) });

      let commits = 0;
      render(
        <Profiler id="probe" onRender={() => (commits += 1)}>
          <span />
        </Profiler>,
      );

      fireEvent.pointerDown(svg, { pointerId: 4, ...at({ x: 70, y: 20 }) });
      commits = 0;
      for (let i = 0; i < 20; i++) {
        fireEvent.pointerMove(svg, { pointerId: 4, ...at({ x: 70 - i * 0.4, y: 20 + i * 0.3 }) });
      }
      expect(commits).toBe(0);
    } finally {
      restore.mockRestore();
    }
  });
});

describe("running", () => {
  it("shows the canvas indicator and suppresses dragging", async () => {
    const { svg, restore } = setup();
    try {
      const piece = selectCutter();
      fireEvent.click(routeButton(/set destination/i));
      fireEvent.pointerDown(svg, { pointerId: 2, ...at({ x: 85, y: 12 }) });

      await act(async () => {
        fireEvent.click(routeButton(/^run$/i));
      });

      expect(screen.getByTestId("running-indicator")).toBeInTheDocument();
      expect(screen.getAllByText("Running…").length).toBeGreaterThan(0);
      // The route markers step aside for the pieces they were describing.
      expect(screen.queryAllByTestId("route-layer")).toHaveLength(0);

      // A drag during a run does nothing — the simulation owns position.
      const before = piece.getAttribute("transform");
      fireEvent.pointerDown(piece, { pointerId: 9, ...at({ x: 50, y: 20 }) });
      fireEvent.pointerMove(piece, { pointerId: 9, ...at({ x: 20, y: 35 }) });
      expect(piece.getAttribute("transform")).toBe(before);
    } finally {
      restore.mockRestore();
    }
  });

  it("commits zero React renders across a run through the mounted page (task 68)", async () => {
    // The page-level counterpart to motionDriver.test.tsx's driver-level
    // assertion, possible only now that MotionDriverProvider is mounted in
    // Whiteboard. Real rAF here, deliberately: this is the wiring under test,
    // including the provider, the panel subscription and FieldCanvas's
    // useMotionMode — the parts a hand-pumped clock would bypass.
    const { svg, restore } = setup();
    try {
      selectCutter();
      fireEvent.click(routeButton(/set destination/i));
      fireEvent.pointerDown(svg, { pointerId: 2, ...at({ x: 100, y: 12 }) });

      let commits = 0;
      render(
        <Profiler id="probe" onRender={() => (commits += 1)}>
          <span />
        </Profiler>,
      );

      await act(async () => {
        fireEvent.click(routeButton(/^run$/i));
      });

      const piece = screen.getByRole("button", { name: "offense cutter 1" });
      const before = piece.getAttribute("transform");

      commits = 0; // count only the frames, not the one status transition
      await act(async () => {
        for (let i = 0; i < 8; i++) {
          await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
        }
      });

      expect(commits).toBe(0);
      // Not vacuous: the piece actually moved during those frames.
      expect(piece.getAttribute("transform")).not.toBe(before);
    } finally {
      restore.mockRestore();
    }
  });

  it("Run is disabled with an explanation when no route is set", () => {
    const { restore } = setup();
    try {
      selectCutter();
      const run = routeButton(/^run$/i);
      expect(run).toHaveAttribute("aria-disabled", "true");
      expect(run).toHaveAttribute("title", "Set a destination first.");
    } finally {
      restore.mockRestore();
    }
  });
});

describe("Movement sliders", () => {
  it("are present alongside the space sliders and change the stored value", () => {
    const { restore } = setup();
    try {
      const advanced = screen.getAllByRole("button", { name: /advanced settings/i })[0];
      fireEvent.click(advanced);

      const cushion = screen.getAllByLabelText("Cushion")[0] as HTMLInputElement;
      fireEvent.change(cushion, { target: { value: "6" } });

      const stored = JSON.parse(localStorage.getItem("fieldview.overlayPrefs") ?? "{}");
      expect(stored.motion.cushion).toBe(6);
      // Top speed stays in the space group: it is shared between the two
      // models (tech-design ADR-3), and duplicating it would be a second
      // answer to the same question.
      expect(screen.getAllByLabelText("Top speed").length).toBeGreaterThan(0);
    } finally {
      restore.mockRestore();
    }
  });
});

describe("prefs migration", () => {
  it("stored preferences without a motion key load with defaults", () => {
    const parsed = parsePrefs({ on: true, params: { vmax: 8 } });
    expect(parsed.motion).toEqual(DEFAULT_MOTION_PARAMS);
  });

  it("clamps hostile motion values rather than producing NaN positions", () => {
    const parsed = parsePrefs({
      motion: { accel: 1e9, decel: "fast", cushion: -50, lead: Number.NaN },
    });
    expect(parsed.motion.accel).toBe(10);
    expect(parsed.motion.decel).toBe(DEFAULT_MOTION_PARAMS.decel);
    expect(parsed.motion.cushion).toBe(0);
    expect(parsed.motion.lead).toBe(DEFAULT_MOTION_PARAMS.lead);
  });
});

// Shell parity is NOT asserted here. panelParity.test.tsx already compares the
// offense panel's full control-and-copy contract between LeftSidebar and
// BottomSheet field for field, and it passed unchanged when the Route section
// landed — which is a stronger proof than counting buttons, and the reason
// canon ADR-14 holds without a second implementation. A duplicate here would
// also have to expand the mobile sheet by hand, which is the sheet's own
// behaviour rather than motion's.
