import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FieldHarness } from "./fieldHarness";
import { getStageViewBox, yardToPixel } from "../render/coords";
import { FIELD_PX_HEIGHT, FIELD_PX_WIDTH } from "../render/fieldLayer";

const viewBox = getStageViewBox(FIELD_PX_WIDTH, FIELD_PX_HEIGHT);

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function mockSvgRect(svg: SVGSVGElement) {
  // 1:1 mapping between client pixels and SVG user units so the expected
  // yard math in each test is easy to state.
  vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
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

// Goes through the real transform (coords.ts) rather than hardcoding the
// yard->pixel formula here, so this file stays correct regardless of the
// field's on-screen orientation (ADR-2 — orientation lives only in
// coords.ts).
function clientFor(yard: { x: number; y: number }) {
  const px = yardToPixel(yard);
  return {
    clientX: px.x - viewBox.x,
    clientY: px.y - viewBox.y,
  };
}

// The transform string a piece should carry at a yard position. Built from the
// real transform so these assertions survive an orientation change (ADR-28).
function tf(yard: { x: number; y: number }) {
  const px = yardToPixel(yard);
  return `translate(${px.x}, ${px.y})`;
}

beforeEach(() => {
  localStorage.clear();
});

describe("piece drag", () => {
  it("moves a cutter continuously under the pointer, not on release", async () => {
    render(<FieldHarness />);
    const svg = screen.getByRole("group", { name: /ultimate field/i }) as unknown as SVGSVGElement;
    mockSvgRect(svg);
    const cutter = screen.getByRole("button", { name: "Offense 2" });

    const start = clientFor({ x: 50, y: 20 });
    fireEvent.pointerDown(cutter, { pointerId: 1, ...start });

    const mid = clientFor({ x: 60, y: 25 });
    fireEvent.pointerMove(cutter, { pointerId: 1, ...mid });
    // The mutation is coalesced into the next animation frame (ADR-2), not
    // applied synchronously — but critically, it applies before pointerUp.
    await nextFrame();
    expect(cutter.getAttribute("transform")).toBe(tf({ x: 60, y: 25 }));

    fireEvent.pointerUp(cutter, { pointerId: 1, ...mid });
    await nextFrame();
    expect(cutter.getAttribute("transform")).toBe(tf({ x: 60, y: 25 }));
  });

  it("carries the mark by the same delta when the thrower is dragged", async () => {
    render(<FieldHarness />);
    const svg = screen.getByRole("group", { name: /ultimate field/i }) as unknown as SVGSVGElement;
    mockSvgRect(svg);

    const thrower = screen.getByRole("button", { name: "Offense 1" });
    const mark = screen.getByRole("button", { name: "Defense 1" });
    const markBeforeMatch = mark.getAttribute("transform")?.match(/translate\(([-\d.]+), ([-\d.]+)\)/);
    const markBeforeX = Number(markBeforeMatch?.[1]);
    const markBeforeY = Number(markBeforeMatch?.[2]);

    const start = clientFor({ x: 40, y: 20 }); // the vert-stack thrower's starting position
    fireEvent.pointerDown(thrower, { pointerId: 2, ...start });
    const target = clientFor({ x: 45, y: 15 });
    fireEvent.pointerMove(thrower, { pointerId: 2, ...target });
    await nextFrame();

    expect(thrower.getAttribute("transform")).toBe(tf({ x: 45, y: 15 }));
    // Thrower moved +5 downfield, -5 lateral; horizontally (coords.ts ADR-28)
    // that's +40px on screen-x and -40px on screen-y. The mark carries the same
    // pixel delta.
    const markAfterMatch = mark.getAttribute("transform")?.match(/translate\(([-\d.]+), ([-\d.]+)\)/);
    expect(Number(markAfterMatch?.[1])).toBeCloseTo(markBeforeX + 40);
    expect(Number(markAfterMatch?.[2])).toBeCloseTo(markBeforeY - 40);
  });

  it("clamps a piece dragged past the field boundary", async () => {
    render(<FieldHarness />);
    const svg = screen.getByRole("group", { name: /ultimate field/i }) as unknown as SVGSVGElement;
    mockSvgRect(svg);
    const cutter = screen.getByRole("button", { name: "Offense 2" });

    const start = clientFor({ x: 50, y: 20 });
    fireEvent.pointerDown(cutter, { pointerId: 3, ...start });
    const farOut = clientFor({ x: 5000, y: -5000 });
    fireEvent.pointerMove(cutter, { pointerId: 3, ...farOut });
    await nextFrame();

    // Clamped to the field's max x (110 yd downfield) and min y (0 yd lateral).
    expect(cutter.getAttribute("transform")).toBe(tf({ x: 110, y: 0 }));
  });
});

describe("grabbing the right piece", () => {
  // The vert stack is the case that broke: cutters sit 2 yd apart on one
  // line, and defender "2" sits at (51, 20) — 1 yd from cutter "1" at
  // (50, 20) and rendered *after* it. Overlapping SVG hit targets are
  // resolved by document order, so a press just right of cutter 1 used to
  // pick up the defender behind it. Distance settles it (render/pick.ts).
  it("picks the nearest piece, not the one rendered last", async () => {
    render(<FieldHarness />);
    const svg = screen.getByRole("group", { name: /ultimate field/i }) as unknown as SVGSVGElement;
    mockSvgRect(svg);

    const cutter = screen.getByRole("button", { name: "Offense 2" });
    const defender = screen.getByRole("button", { name: "Defense 3" });
    const defenderBefore = defender.getAttribute("transform");

    fireEvent.pointerDown(svg, { pointerId: 10, ...clientFor({ x: 50.2, y: 20 }) });
    fireEvent.pointerMove(svg, { pointerId: 10, ...clientFor({ x: 60.2, y: 20 }) });
    await nextFrame();

    expect(cutter.getAttribute("transform")).toBe(tf({ x: 60, y: 20 }));
    expect(defender.getAttribute("transform")).toBe(defenderBefore);
  });

  it("preserves the grab offset so an off-centre grab does not snap", async () => {
    render(<FieldHarness />);
    const svg = screen.getByRole("group", { name: /ultimate field/i }) as unknown as SVGSVGElement;
    mockSvgRect(svg);
    const cutter = screen.getByRole("button", { name: "Offense 2" });

    // Grabbed 0.8 yd left of cutter 1's centre (still its nearest piece),
    // then moved 10 yd right: it should end at 60, following the pointer —
    // not at 59.2, snapped to it.
    fireEvent.pointerDown(svg, { pointerId: 11, ...clientFor({ x: 49.2, y: 20 }) });
    fireEvent.pointerMove(svg, { pointerId: 11, ...clientFor({ x: 59.2, y: 20 }) });
    await nextFrame();

    expect(cutter.getAttribute("transform")).toBe(tf({ x: 60, y: 20 }));
  });

  it("moves nothing when the press lands in open space", async () => {
    render(<FieldHarness />);
    const svg = screen.getByRole("group", { name: /ultimate field/i }) as unknown as SVGSVGElement;
    mockSvgRect(svg);
    const cutter = screen.getByRole("button", { name: "Offense 2" });
    const before = cutter.getAttribute("transform");

    fireEvent.pointerDown(svg, { pointerId: 12, ...clientFor({ x: 5, y: 35 }) });
    fireEvent.pointerMove(svg, { pointerId: 12, ...clientFor({ x: 50, y: 20 }) });
    await nextFrame();

    expect(cutter.getAttribute("transform")).toBe(before);
  });
});

describe("marquee selection", () => {
  // Selecting is a *drag on empty grass*, so every marquee here has to start
  // more than the 3 yd grab radius from any piece — otherwise the press is a
  // grab, which is exactly the disambiguation being tested.
  function selectedLabels(svg: SVGSVGElement) {
    return Array.from(svg.querySelectorAll('[data-selected="true"]'))
      .map((el) => el.getAttribute("aria-label"))
      .sort();
  }

  function marquee(svg: SVGSVGElement, from: { x: number; y: number }, to: { x: number; y: number }) {
    fireEvent.pointerDown(svg, { pointerId: 20, ...clientFor(from) });
    fireEvent.pointerMove(svg, { pointerId: 20, ...clientFor(to) });
    fireEvent.pointerUp(svg, { pointerId: 20, ...clientFor(to) });
  }

  function setup() {
    render(<FieldHarness />);
    const svg = screen.getByRole("group", { name: /ultimate field/i }) as unknown as SVGSVGElement;
    mockSvgRect(svg);
    return svg;
  }

  it("selects exactly the pieces inside the box", () => {
    const svg = setup();
    // Down-field right quarter: cutters 5 and 6 plus defenders 5 and 6.
    marquee(svg, { x: 75, y: 35 }, { x: 57, y: 18 });

    expect(selectedLabels(svg)).toEqual([
      "Defense 6",
      "Defense 7",
      "Offense 6",
      "Offense 7",
    ]);
  });

  it("moves the whole selection by one delta when any member is dragged", async () => {
    const svg = setup();
    marquee(svg, { x: 75, y: 35 }, { x: 57, y: 18 });

    const members = [
      screen.getByRole("button", { name: "Offense 6" }), // (58, 20)
      screen.getByRole("button", { name: "Offense 7" }), // (60, 20)
      screen.getByRole("button", { name: "Defense 6" }), // (62, 23)
      screen.getByRole("button", { name: "Defense 7" }), // (70, 20)
    ];
    const outsider = screen.getByRole("button", { name: "Offense 2" });
    const outsiderBefore = outsider.getAttribute("transform");

    // Grab cutter 6 and pull the group 5 yd downfield, 2 yd across.
    fireEvent.pointerDown(svg, { pointerId: 21, ...clientFor({ x: 60, y: 20 }) });
    fireEvent.pointerMove(svg, { pointerId: 21, ...clientFor({ x: 65, y: 22 }) });
    await nextFrame();

    expect(members.map((el) => el.getAttribute("transform"))).toEqual([
      tf({ x: 63, y: 22 }),
      tf({ x: 65, y: 22 }),
      tf({ x: 67, y: 25 }),
      tf({ x: 75, y: 22 }),
    ]);
    // The formation kept its shape, and nothing outside the box moved.
    expect(outsider.getAttribute("transform")).toBe(outsiderBefore);
  });

  it("slides a group along the sideline instead of letting it compress", async () => {
    const svg = setup();
    // Thrower (40, 20) and mark (41, 23) — 3 yd apart across the field.
    marquee(svg, { x: 38, y: 25 }, { x: 43, y: 18 });
    expect(selectedLabels(svg)).toEqual(["Defense 1", "Offense 1"]);

    // Pull 30 yd toward the near sideline. Only 20 yd of that is available,
    // so the delta is clamped once, for the group — not per piece, which
    // would flatten both onto y = 0 and lose the mark's angle.
    fireEvent.pointerDown(svg, { pointerId: 22, ...clientFor({ x: 40, y: 20 }) });
    fireEvent.pointerMove(svg, { pointerId: 22, ...clientFor({ x: 40, y: -10 }) });
    await nextFrame();

    expect(screen.getByRole("button", { name: "Offense 1" }).getAttribute("transform")).toBe(
      tf({ x: 40, y: 0 }),
    );
    expect(screen.getByRole("button", { name: "Defense 1" }).getAttribute("transform")).toBe(
      tf({ x: 41, y: 3 }), // still 3 yd off the thrower
    );
  });

  it("does not carry the mark twice when the thrower and mark are both selected", async () => {
    const svg = setup();
    marquee(svg, { x: 38, y: 25 }, { x: 43, y: 18 });

    // Thrower-carries-mark (FR-2.2) still applies to a lone thrower, but a
    // mark that is itself in the group must take the delta once, not once as
    // a member and again as the thrower's passenger.
    fireEvent.pointerDown(svg, { pointerId: 23, ...clientFor({ x: 40, y: 20 }) });
    fireEvent.pointerMove(svg, { pointerId: 23, ...clientFor({ x: 45, y: 20 }) });
    await nextFrame();

    expect(screen.getByRole("button", { name: "Defense 1" }).getAttribute("transform")).toBe(
      tf({ x: 46, y: 23 }), // not (51, 23)
    );
  });

  it("clears the selection on a click in open space", () => {
    const svg = setup();
    marquee(svg, { x: 75, y: 35 }, { x: 57, y: 18 });
    expect(selectedLabels(svg)).toHaveLength(4);

    // Press and release without drawing a box.
    fireEvent.pointerDown(svg, { pointerId: 24, ...clientFor({ x: 5, y: 35 }) });
    fireEvent.pointerUp(svg, { pointerId: 24, ...clientFor({ x: 5, y: 35 }) });

    expect(selectedLabels(svg)).toEqual([]);
  });

  it("abandons the selection when an unselected piece is grabbed", async () => {
    const svg = setup();
    marquee(svg, { x: 75, y: 35 }, { x: 57, y: 18 });

    const cutter5 = screen.getByRole("button", { name: "Offense 6" });
    const before = cutter5.getAttribute("transform");

    fireEvent.pointerDown(svg, { pointerId: 25, ...clientFor({ x: 50, y: 20 }) });
    fireEvent.pointerMove(svg, { pointerId: 25, ...clientFor({ x: 45, y: 20 }) });
    await nextFrame();

    expect(selectedLabels(svg)).toEqual([]);
    expect(screen.getByRole("button", { name: "Offense 2" }).getAttribute("transform")).toBe(
      tf({ x: 45, y: 20 }),
    );
    expect(cutter5.getAttribute("transform")).toBe(before);
  });
});

describe("keyboard nudge", () => {
  it("moves a focused piece 1 yd per arrow key, 5 yd with Shift", async () => {
    render(<FieldHarness />);
    const cutter = screen.getByRole("button", { name: "Offense 2" });
    const beforeMatch = cutter.getAttribute("transform")?.match(/translate\(([-\d.]+), ([-\d.]+)\)/);
    const beforeX = Number(beforeMatch?.[1]);
    const beforeY = beforeMatch?.[2];

    // ArrowRight nudges +1 yd downfield (+x yard), which is +8px on the
    // screen-x axis in the horizontal orientation (coords.ts ADR-28) — the
    // key now moves the piece the way it points on screen.
    fireEvent.keyDown(cutter, { key: "ArrowRight" });
    await nextFrame();
    expect(cutter.getAttribute("transform")).toBe(`translate(${beforeX + 8}, ${beforeY})`);

    fireEvent.keyDown(cutter, { key: "ArrowRight", shiftKey: true });
    await nextFrame();
    expect(cutter.getAttribute("transform")).toBe(`translate(${beforeX + 8 + 40}, ${beforeY})`);
  });
});
