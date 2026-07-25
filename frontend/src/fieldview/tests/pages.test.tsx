import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Whiteboard } from "../pages/Whiteboard";
import { Designer } from "../pages/Designer";

describe("Whiteboard", () => {
  it("renders the field with all 14 pieces from the vert-stack preset", () => {
    render(
      <MemoryRouter>
        <Whiteboard />
      </MemoryRouter>,
    );
    const field = screen.getByRole("group", { name: /ultimate field/i });
    const pieces = field.querySelector('[data-testid="pieces"]');
    expect(pieces?.querySelectorAll("g[role='button']")).toHaveLength(14);
  });
});

describe("Designer", () => {
  it("renders the field with all 14 pieces from the vert-stack preset", () => {
    render(
      <MemoryRouter>
        <Designer />
      </MemoryRouter>,
    );
    // role="group", not "img": the Designer's pieces are interactive now
    // (P4), and an image role forbids interactive descendants.
    const field = screen.getByRole("group", { name: /ultimate field/i });
    const pieces = field.querySelectorAll('[data-testid="pieces"] > [role="button"]');
    expect(pieces).toHaveLength(14);
  });
});
