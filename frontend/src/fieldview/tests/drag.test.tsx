import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Whiteboard } from "../pages/Whiteboard";
import { getStageViewBox } from "../render/coords";
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

function clientFor(yard: { x: number; y: number }) {
  return {
    clientX: yard.x * 8 - viewBox.x,
    clientY: yard.y * 8 - viewBox.y,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("piece drag", () => {
  it("moves a cutter continuously under the pointer, not on release", async () => {
    render(<MemoryRouter><Whiteboard /></MemoryRouter>);
    const svg = screen.getByRole("group", { name: /ultimate field/i }) as unknown as SVGSVGElement;
    mockSvgRect(svg);
    const cutter = screen.getByRole("button", { name: "offense cutter 1" });

    const start = clientFor({ x: 50, y: 20 });
    fireEvent.pointerDown(cutter, { pointerId: 1, ...start });

    const mid = clientFor({ x: 60, y: 25 });
    fireEvent.pointerMove(cutter, { pointerId: 1, ...mid });
    // The mutation is coalesced into the next animation frame (ADR-2), not
    // applied synchronously — but critically, it applies before pointerUp.
    await nextFrame();
    expect(cutter.getAttribute("transform")).toBe("translate(480, 200)");

    fireEvent.pointerUp(cutter, { pointerId: 1, ...mid });
    await nextFrame();
    expect(cutter.getAttribute("transform")).toBe("translate(480, 200)");
  });

  it("carries the mark by the same delta when the thrower is dragged", async () => {
    render(<MemoryRouter><Whiteboard /></MemoryRouter>);
    const svg = screen.getByRole("group", { name: /ultimate field/i }) as unknown as SVGSVGElement;
    mockSvgRect(svg);

    const thrower = screen.getByRole("button", { name: "offense thrower T" });
    const mark = screen.getByRole("button", { name: "defense mark M" });
    const markBeforeMatch = mark.getAttribute("transform")?.match(/translate\(([-\d.]+), ([-\d.]+)\)/);
    const markBeforeX = Number(markBeforeMatch?.[1]);
    const markBeforeY = Number(markBeforeMatch?.[2]);

    const start = clientFor({ x: 40, y: 20 }); // the vert-stack thrower's starting position
    fireEvent.pointerDown(thrower, { pointerId: 2, ...start });
    const target = clientFor({ x: 45, y: 15 });
    fireEvent.pointerMove(thrower, { pointerId: 2, ...target });
    await nextFrame();

    expect(thrower.getAttribute("transform")).toBe("translate(360, 120)");
    // Thrower moved +5,-5 yd (40px, -40px in px space); mark should carry the same delta.
    const markAfterMatch = mark.getAttribute("transform")?.match(/translate\(([-\d.]+), ([-\d.]+)\)/);
    expect(Number(markAfterMatch?.[1])).toBeCloseTo(markBeforeX + 40);
    expect(Number(markAfterMatch?.[2])).toBeCloseTo(markBeforeY - 40);
  });

  it("clamps a piece dragged past the field boundary", async () => {
    render(<MemoryRouter><Whiteboard /></MemoryRouter>);
    const svg = screen.getByRole("group", { name: /ultimate field/i }) as unknown as SVGSVGElement;
    mockSvgRect(svg);
    const cutter = screen.getByRole("button", { name: "offense cutter 1" });

    const start = clientFor({ x: 50, y: 20 });
    fireEvent.pointerDown(cutter, { pointerId: 3, ...start });
    const farOut = clientFor({ x: 5000, y: -5000 });
    fireEvent.pointerMove(cutter, { pointerId: 3, ...farOut });
    await nextFrame();

    // Clamped to the field's max x (110 yd -> 880px) and min y (0 -> 0px).
    expect(cutter.getAttribute("transform")).toBe("translate(880, 0)");
  });
});

describe("keyboard nudge", () => {
  it("moves a focused piece 1 yd per arrow key, 5 yd with Shift", async () => {
    render(<MemoryRouter><Whiteboard /></MemoryRouter>);
    const cutter = screen.getByRole("button", { name: "offense cutter 1" });
    const beforeMatch = cutter.getAttribute("transform")?.match(/translate\(([-\d.]+), ([-\d.]+)\)/);
    const beforeX = Number(beforeMatch?.[1]);
    const beforeY = beforeMatch?.[2];

    fireEvent.keyDown(cutter, { key: "ArrowRight" });
    await nextFrame();
    expect(cutter.getAttribute("transform")).toBe(`translate(${beforeX + 8}, ${beforeY})`);

    fireEvent.keyDown(cutter, { key: "ArrowRight", shiftKey: true });
    await nextFrame();
    expect(cutter.getAttribute("transform")).toBe(`translate(${beforeX + 8 + 40}, ${beforeY})`);
  });
});
