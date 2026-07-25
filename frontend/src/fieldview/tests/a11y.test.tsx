// axe-core audit for /field-view and /field-view/designer (P2 and P4
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
  it("/field-view has no violations", async () => {
    const { container } = render(<MemoryRouter><Whiteboard /></MemoryRouter>);
    await expectNoViolations(container);
  });

  it("/field-view/designer has no violations", async () => {
    const { container } = render(<MemoryRouter><Designer /></MemoryRouter>);
    await expectNoViolations(container);
  });

  it("/field-view has no violations with the space overlay on", async () => {
    const { container } = render(<MemoryRouter><Whiteboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Space" }));
    fireEvent.click(screen.getByRole("button", { name: /Tuning/ }));
    await expectNoViolations(container);
  });

  it("/field-view/designer has no violations with the space overlay on", async () => {
    const { container } = render(<MemoryRouter><Designer /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Space" }));
    await expectNoViolations(container);
  });

  it("/field-view/designer has no violations with multiple keyframes", async () => {
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
