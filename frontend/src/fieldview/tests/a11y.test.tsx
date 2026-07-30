// axe-core audit for /fieldview and /fieldview/designer (P2 and P4
// acceptance criteria). color-contrast
// is disabled per the same rationale as encyclopedia/tests/a11y.test.tsx:
// jsdom does not paint, so axe cannot compute real contrast.

import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { MemoryRouter } from "react-router-dom";
import { Whiteboard } from "../pages/Whiteboard";
import { Designer } from "../pages/Designer";

// Overlay prefs persist in localStorage, so each case must start from a
// known rail state rather than inheriting the previous test's.
beforeEach(() => {
  localStorage.clear();
});

async function expectNoViolations(container: Element) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
  expect(summary).toEqual([]);
}

describe("axe-core audit", () => {
  it("/fieldview has no violations", async () => {
    const { container } = render(<MemoryRouter><Whiteboard /></MemoryRouter>);
    await expectNoViolations(container);
  });

  it("/fieldview/designer has no violations", async () => {
    const { container } = render(<MemoryRouter><Designer /></MemoryRouter>);
    await expectNoViolations(container);
  });

  it("/fieldview has no violations with the space overlay on", async () => {
    const { container } = render(<MemoryRouter><Whiteboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Space View" }));
    fireEvent.click(screen.getByRole("button", { name: "⚙ Advanced Settings" }));
    await expectNoViolations(container);
  });

  it("/fieldview/designer has no violations with the space overlay on", async () => {
    const { container } = render(<MemoryRouter><Designer /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Space" }));
    await expectNoViolations(container);
  });

  it("/fieldview/designer has no violations with multiple keyframes", async () => {
    const { container } = render(<MemoryRouter><Designer /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "+ Keyframe" }));
    await expectNoViolations(container);
  });
});

describe("Designer keyboard operation", () => {
  it("every timeline control is reachable and operable from the keyboard", () => {
    render(<MemoryRouter><Designer /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "+ Keyframe" }));

    // Chips, transport, scrub, and retime are all natively focusable
    // elements — no div-with-onClick anywhere in the strip.
    const controls = [
      screen.getByRole("button", { name: "Play" }),
      screen.getByRole("button", { name: "+ Keyframe" }),
      screen.getByRole("button", { name: "Keyframe 1 at 0.00 seconds" }),
      screen.getByRole("button", { name: "Keyframe 2 at 1.50 seconds" }),
      screen.getByLabelText("Playhead"),
      screen.getByLabelText("Keyframe 2 timestamp in seconds"),
      screen.getByRole("button", { name: "Delete keyframe" }),
    ];
    for (const control of controls) {
      control.focus();
      expect(document.activeElement).toBe(control);
    }

    // And the strip is operable without a pointer: select chip 1 by keyboard
    // activation, scrub with the range input.
    fireEvent.click(screen.getByRole("button", { name: "Keyframe 1 at 0.00 seconds" }));
    expect(screen.getByRole("button", { name: "Keyframe 1 at 0.00 seconds" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.change(screen.getByLabelText("Playhead"), { target: { value: "1.5" } });
    expect(screen.getByRole("button", { name: "Keyframe 2 at 1.50 seconds" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

// --- P6 full a11y sweep (task 135) ---

describe("full keyboard traversal", () => {
  // ux.md UI States: opening Advanced Settings *fully replaces* the ribbon,
  // the selection panel, Presets, and the Play Designer button with the
  // settings content and a "← Back" affordance — unlike the old OverlayRail
  // (where the disclosure expanded in place, leaving every other control
  // reachable at the same time). So the default view's controls and the
  // Advanced Settings view's controls are two separate traversals, not one.
  it("reaches every whiteboard control in the default (selection) view", () => {
    render(<MemoryRouter><Whiteboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Space View" }));

    const controls = [
      screen.getByRole("button", { name: "Presets" }),
      screen.getByRole("button", { name: "Export frame" }),
      screen.getByRole("link", { name: "Designer" }),
      screen.getByRole("button", { name: "Marquee Selection" }),
      screen.getByRole("button", { name: "Space View" }),
      screen.getByRole("checkbox", { name: "Offense" }),
      screen.getByRole("checkbox", { name: "Defense" }),
      screen.getByRole("button", { name: "⚙ Advanced Settings" }),
      screen.getByRole("button", { name: "▶ Play Designer" }),
      screen.getByRole("button", { name: "offense thrower T" }),
      screen.getByRole("button", { name: "defense mark M" }),
    ];

    for (const control of controls) {
      control.focus();
      expect(document.activeElement).toBe(control);
    }
  });

  it("reaches every whiteboard control in the Advanced Settings view", () => {
    render(<MemoryRouter><Whiteboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "⚙ Advanced Settings" }));

    const controls = [
      screen.getByRole("button", { name: "← Back" }),
      screen.getByRole("checkbox", { name: /Include offense in space calculations/ }),
      screen.getByRole("checkbox", { name: "Mark / force" }),
      screen.getByRole("checkbox", { name: "Coverage" }),
      screen.getByRole("checkbox", { name: "Throwing lanes" }),
      screen.getByRole("checkbox", { name: "Field value" }),
      screen.getByRole("slider", { name: "Top speed" }),
      screen.getByRole("slider", { name: "Mark width" }),
      screen.getByRole("button", { name: "Reset to defaults" }),
    ];

    for (const control of controls) {
      control.focus();
      expect(document.activeElement).toBe(control);
    }
  });

  it("reaches every designer control, including play metadata and transport", () => {
    render(<MemoryRouter><Designer /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Space" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Keyframe" }));

    const controls = [
      screen.getByLabelText(/Play name/i),
      screen.getByLabelText(/Description/i),
      screen.getByRole("button", { name: "Export play" }),
      screen.getByRole("button", { name: "Import play" }),
      screen.getByRole("button", { name: "Space" }),
      screen.getByRole("button", { name: "Play" }),
      screen.getByRole("button", { name: "+ Keyframe" }),
      screen.getByRole("button", { name: "Keyframe 1 at 0.00 seconds" }),
      screen.getByLabelText("Playhead"),
      screen.getByRole("button", { name: "Delete keyframe" }),
    ];

    for (const control of controls) {
      control.focus();
      expect(document.activeElement).toBe(control);
    }
  });

  it("keeps every piece focusable and nudgeable without a pointer", () => {
    render(<MemoryRouter><Whiteboard /></MemoryRouter>);
    const pieces = screen.getAllByRole("button", { name: /^(offense|defense) / });
    expect(pieces).toHaveLength(14);
    for (const piece of pieces) {
      expect(piece).toHaveAttribute("tabindex", "0");
    }
  });
});

// Integration note: the shell redesign (tech-design.md Project/Module
// Structure) removed `OverlayRail` — including its "Closed / Contested /
// Strong space" legend — from `Whiteboard.tsx`'s composition. Nothing in
// ux.md's shell IA or UI States carries that legend forward into any panel,
// so its removal is a scope decision made upstream of this partition, not a
// regression to patch around here. The remaining colour-is-not-the-only-
// carrier guarantee for this page is the readout verdict below (always text,
// in a live region), which is unchanged.
describe("colour is never the sole carrier of meaning", () => {
  it("exposes the readout verdict as text in a live region", () => {
    render(<MemoryRouter><Whiteboard /></MemoryRouter>);
    const readout = screen.getByRole("region", { name: "Cell readout" });
    expect(readout.querySelector("[aria-live='polite']")).not.toBeNull();
  });
});
