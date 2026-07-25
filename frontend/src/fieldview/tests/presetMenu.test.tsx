import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Whiteboard } from "../pages/Whiteboard";

beforeEach(() => {
  localStorage.clear();
});

function openMenu() {
  const trigger = screen.getByRole("button", { name: "Presets" });
  if (trigger.getAttribute("aria-expanded") !== "true") {
    fireEvent.click(trigger);
  }
}

describe("Whiteboard preset flow", () => {
  it("loads a built-in preset with no confirm when the scene is unmodified", async () => {
    render(<MemoryRouter><Whiteboard /></MemoryRouter>);
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Horizontal Stack" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("asks 'Replace the current setup?' before loading over a modified scene", async () => {
    render(<MemoryRouter><Whiteboard /></MemoryRouter>);
    const cutter = screen.getByRole("button", { name: "offense cutter 1" });
    fireEvent.keyDown(cutter, { key: "ArrowRight" });
    await waitFor(() => expect(cutter.getAttribute("transform")).toContain("408"));

    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Horizontal Stack" }));
    expect(screen.getByRole("alertdialog", { name: /replace the current setup/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("saves the current setup as a preset and it survives a reload", async () => {
    const { unmount } = render(<MemoryRouter><Whiteboard /></MemoryRouter>);
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Save current as preset" }));
    fireEvent.change(screen.getByLabelText("New preset name"), { target: { value: "My Setup" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    openMenu();
    expect(await screen.findByRole("button", { name: "My Setup" })).toBeInTheDocument();

    unmount();
    render(<MemoryRouter><Whiteboard /></MemoryRouter>);
    openMenu();
    expect(await screen.findByRole("button", { name: "My Setup" })).toBeInTheDocument();
  });

  it("deletes a user preset with a 5s Undo that restores it", async () => {
    render(<MemoryRouter><Whiteboard /></MemoryRouter>);
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Save current as preset" }));
    fireEvent.change(screen.getByLabelText("New preset name"), { target: { value: "Temp" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    openMenu();

    fireEvent.click(screen.getByRole("button", { name: "Delete Temp" }));
    expect(screen.queryByRole("button", { name: "Temp" })).not.toBeInTheDocument();
    expect(screen.getByText(/preset deleted/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    openMenu();
    expect(await screen.findByRole("button", { name: "Temp" })).toBeInTheDocument();
  });

  it("does not expose rename/delete/export controls on built-in presets", async () => {
    render(<MemoryRouter><Whiteboard /></MemoryRouter>);
    openMenu();
    expect(screen.queryByRole("button", { name: /rename horizontal stack/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete horizontal stack/i })).not.toBeInTheDocument();
  });
});
