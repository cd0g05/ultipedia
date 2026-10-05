// Touch dragging (fieldview-ui-rework P5, ADR-35): the piece is held above the
// finger with a ghost left behind, a tap never nudges anything, and the touch
// grab radius scales with the rendered size while the mouse's does not.

import { Profiler } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useRoutes } from "react-router-dom";
import { routes } from "../../router";
import { HIT_RADIUS_YD, TOUCH_TARGET_PX, hitRadiusYd } from "../render/pick";
import { PIXELS_PER_YARD, getStageViewBox, pixelToYard, yardToPixel } from "../render/coords";
import { FIELD_PX_HEIGHT, FIELD_PX_WIDTH } from "../render/fieldLayer";
import { TOUCH_TOKENS } from "../render/tokens";

const viewBox = getStageViewBox(FIELD_PX_WIDTH, FIELD_PX_HEIGHT);

describe("hitRadiusYd", () => {
  it("leaves the mouse radius alone at every scale", () => {
    for (const scale of [3, 6, 8, 12]) {
      expect(hitRadiusYd("mouse", scale)).toBe(HIT_RADIUS_YD);
      expect(hitRadiusYd(undefined, scale)).toBe(HIT_RADIUS_YD);
    }
  });

  it("keeps a touch target at least 44 px across at any rendered scale", () => {
    for (const pxPerYard of [3, 4.5, 6, 7.4, 10]) {
      const diameterPx = hitRadiusYd("touch", pxPerYard) * pxPerYard * 2;
      expect(diameterPx).toBeGreaterThanOrEqual(TOUCH_TARGET_PX - 1e-9);
    }
  });

  it("never shrinks below the mouse radius, however large the stage", () => {
    expect(hitRadiusYd("touch", 40)).toBe(HIT_RADIUS_YD);
  });

  it("falls back to the mouse radius when the scale is unknown", () => {
    expect(hitRadiusYd("touch", 0)).toBe(HIT_RADIUS_YD);
  });
});

function AppRoutes() {
  return useRoutes(routes);
}

function stubRect() {
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

function pointFor(piece: Element) {
  const m = piece.getAttribute("transform")!.match(/translate\(([-\d.]+), ([-\d.]+)\)/)!;
  return { x: Number(m[1]), y: Number(m[2]) };
}

// jsdom builds pointer events as plain MouseEvents with no pointerType, so a
// touch event is a MouseEvent given the two properties the canvas reads.
function firePointer(
  el: Element,
  type: "pointerdown" | "pointermove" | "pointerup",
  init: { pointerType: "touch" | "mouse"; clientX: number; clientY: number },
) {
  const ev = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: init.clientX,
    clientY: init.clientY,
  });
  Object.defineProperty(ev, "pointerType", { value: init.pointerType });
  Object.defineProperty(ev, "pointerId", { value: 1 });
  fireEvent(el, ev);
}

const rAF = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

beforeEach(() => {
  localStorage.clear();
});

describe("touch drag on the field", () => {
  it("a tap selects without moving the piece", async () => {
    const rect = stubRect();
    try {
      render(
        <MemoryRouter initialEntries={["/fieldview/explore"]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      const cutter = screen.getByRole("button", { name: "Offense 2" });
      const home = cutter.getAttribute("transform");
      const at = pointFor(cutter);
      const client = { clientX: at.x - viewBox.x, clientY: at.y - viewBox.y };
      firePointer(cutter, "pointerdown", { pointerType: "touch", ...client });
      firePointer(cutter, "pointerup", { pointerType: "touch", ...client });
      await rAF();
      expect(cutter.getAttribute("transform")).toBe(home);
    } finally {
      rect.mockRestore();
    }
  });

  it("lifts the piece above the finger and draws a ghost where it started", async () => {
    const rect = stubRect();
    try {
      render(
        <MemoryRouter initialEntries={["/fieldview/explore"]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      const cutter = screen.getByRole("button", { name: "Offense 2" });
      const start = pointFor(cutter);
      const client = { clientX: start.x - viewBox.x, clientY: start.y - viewBox.y };
      firePointer(cutter, "pointerdown", { pointerType: "touch", ...client });
      // Finger moves 40 px to the right along the field.
      firePointer(cutter, "pointermove", { pointerType: "touch", clientX: client.clientX + 40, clientY: client.clientY });
      await rAF();

      const now = pointFor(cutter);
      // Drawn ABOVE the finger (screen-up by the lift) and 40 px along.
      expect(now.x).toBeCloseTo(start.x + 40);
      expect(now.y).toBeCloseTo(start.y - TOUCH_TOKENS.liftPx);

      // The store agrees with the picture: position === what is drawn.
      const yard = pixelToYard(now);
      expect(yardToPixel(yard).x).toBeCloseTo(now.x);

      const lift = screen.getByTestId("touch-lift");
      expect(lift.getAttribute("opacity")).toBe("1");
      const ghost = lift.querySelector("circle")!;
      expect(Number(ghost.getAttribute("cx"))).toBeCloseTo(start.x);
      expect(Number(ghost.getAttribute("cy"))).toBeCloseTo(start.y);

      firePointer(cutter, "pointerup", { pointerType: "touch", clientX: client.clientX + 40, clientY: client.clientY });
      expect(screen.getByTestId("touch-lift").getAttribute("opacity")).toBe("0");
      // Releasing leaves the piece where it was drawn.
      expect(pointFor(cutter).x).toBeCloseTo(start.x + 40);
    } finally {
      rect.mockRestore();
    }
  });

  it("does NOT lift a mouse drag", async () => {
    const rect = stubRect();
    try {
      render(
        <MemoryRouter initialEntries={["/fieldview/explore"]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      const cutter = screen.getByRole("button", { name: "Offense 2" });
      const start = pointFor(cutter);
      const client = { clientX: start.x - viewBox.x, clientY: start.y - viewBox.y };
      firePointer(cutter, "pointerdown", { pointerType: "mouse", ...client });
      firePointer(cutter, "pointermove", { pointerType: "mouse", clientX: client.clientX + 40, clientY: client.clientY });
      await rAF();
      expect(pointFor(cutter).y).toBeCloseTo(start.y);
      expect(screen.getByTestId("touch-lift").getAttribute("opacity")).toBe("0");
    } finally {
      rect.mockRestore();
    }
  });

  it("a touch drag commits zero React renders (ADR-2)", async () => {
    const rect = stubRect();
    try {
      let commits = 0;
      render(
        <MemoryRouter initialEntries={["/fieldview/explore"]}>
          <Profiler id="touch" onRender={() => (commits += 1)}>
            <AppRoutes />
          </Profiler>
        </MemoryRouter>,
      );
      const cutter = screen.getByRole("button", { name: "Offense 2" });
      const start = pointFor(cutter);
      const client = { clientX: start.x - viewBox.x, clientY: start.y - viewBox.y };
      firePointer(cutter, "pointerdown", { pointerType: "touch", ...client });
      commits = 0;
      for (let i = 1; i <= 25; i += 1) {
        firePointer(cutter, "pointermove", { pointerType: "touch", clientX: client.clientX + i * 3, clientY: client.clientY });
      }
      expect(commits).toBe(0);
      await rAF();
      expect(commits).toBe(0);
    } finally {
      rect.mockRestore();
    }
  });
});

describe("rendered scale (sanity)", () => {
  it("a phone-width stage is ~7.4 px per yard, so the mouse radius is already ~44 px across", () => {
    const pxPerYard = (844 / viewBox.width) * PIXELS_PER_YARD;
    expect(pxPerYard).toBeGreaterThan(7);
    expect(HIT_RADIUS_YD * pxPerYard * 2).toBeGreaterThan(40);
  });
});
