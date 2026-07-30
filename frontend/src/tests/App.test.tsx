import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

beforeEach(() => {
  // Analytics/queue calls hit fetch — stub to a harmless 204.
  vi.stubGlobal("fetch", vi.fn(async () => ({ status: 204, json: async () => ({}) }) as Response));
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("intake flow", () => {
  it("goes tutorial -> path -> drill form", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Begin" }));
    expect(screen.getByText("What do you want to share?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Drills" }));
    expect(screen.getByRole("heading", { name: "Drill" })).toBeInTheDocument();
    expect(screen.getByText(/All optional/)).toBeInTheDocument();
  });

  it("warns before losing work when switching type", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Begin" }));
    await user.click(screen.getByRole("button", { name: "Drills" }));

    // Write something, then try to change type.
    const freeform = screen.getByLabelText("Anything else");
    await user.type(freeform, "a warmup drill");
    await user.click(screen.getByRole("button", { name: "Change type" }));

    // The data-loss warning must appear.
    expect(screen.getByText("Switch type?")).toBeInTheDocument();

    // Cancelling keeps the work and stays on the form.
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Switch type?")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Drill" })).toBeInTheDocument();
  });

  it("does not warn when switching with an empty form", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Begin" }));
    await user.click(screen.getByRole("button", { name: "Drills" }));
    await user.click(screen.getByRole("button", { name: "Change type" }));

    expect(screen.queryByText("Switch type?")).not.toBeInTheDocument();
    expect(screen.getByText("What do you want to share?")).toBeInTheDocument();
  });
});
