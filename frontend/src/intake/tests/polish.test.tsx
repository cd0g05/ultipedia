import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => ({ status: 204, json: async () => ({}) }) as Response);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("polish + analytics", () => {
  it("opens and returns from the Learn more page", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Learn more" }));
    expect(screen.getByText("About Ulti-pedia")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("button", { name: "Begin" })).toBeInTheDocument();
  });

  it("shows the collapsible info bar after beginning", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Begin" }));
    const infoBtn = screen.getByRole("button", { name: /About this form/ });
    expect(infoBtn).toHaveAttribute("aria-expanded", "false");
    await user.click(infoBtn);
    expect(infoBtn).toHaveAttribute("aria-expanded", "true");
  });

  it("fires a field_completed analytics event on field blur", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Begin" }));
    await user.click(screen.getByRole("button", { name: "Drills" }));

    const freeform = screen.getByLabelText("Anything else");
    await user.type(freeform, "a warmup");
    await user.tab(); // blur

    const events = fetchMock.mock.calls
      .filter(([url]) => url === "/api/events")
      .map(([, opts]) => JSON.parse((opts as RequestInit).body as string).event);
    expect(events).toContain("field_completed");
  });
});
