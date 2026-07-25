import "@testing-library/jest-dom";
import { afterEach } from "vitest";

afterEach(() => {
  localStorage.clear();
});

// jsdom has no PointerEvent constructor; alias it to MouseEvent (which
// PointerEvent extends in browsers) so fireEvent.pointer* in field-view's
// drag tests carries clientX/clientY through like it would in a real browser.
if (typeof window !== "undefined" && !window.PointerEvent) {
  // @ts-expect-error — deliberately widening a browser-only global for tests
  window.PointerEvent = window.MouseEvent;
}
