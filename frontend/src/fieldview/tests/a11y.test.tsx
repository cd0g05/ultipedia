// axe-core audit for /field-view (P2 acceptance criterion). color-contrast
// is disabled per the same rationale as encyclopedia/tests/a11y.test.tsx:
// jsdom does not paint, so axe cannot compute real contrast.

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { Whiteboard } from "../pages/Whiteboard";

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
    const { container } = render(<Whiteboard />);
    await expectNoViolations(container);
  });
});
