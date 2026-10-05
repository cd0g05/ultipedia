// Pieces (fieldview-build P2): stable accessible names, titles drawn centred
// inside the piece, the disc-holder ring, the mark ring following geometry, and
// the per-device size variable. Everything here reads the DOM the way a user's
// browser would build it from the scene — no React commits per change.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createSceneStore } from "../scene/store";
import { getPreset } from "../scene/presets";
import { throwTo, normalize } from "../scene/possession";
import { PIECE_TOKENS } from "../render/tokens";
import { FieldHarness } from "./fieldHarness";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(__dirname, "../../index.css"), "utf8");

const rAF = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

function setup() {
  const store = createSceneStore(getPreset("vertStackForceSide"));
  render(<FieldHarness store={store} />);
  return store;
}

const piece = (name: string) => screen.getByRole("button", { name });
const ringOf = (el: Element) => el.querySelector(".fv-holder-ring")!;
const bodyOf = (el: Element) => el.querySelector(".fv-piece-disc")!;
const titleOf = (el: Element) => el.querySelector(".fv-piece-title")!;

describe("accessible names", () => {
  it("are 'Offense n' / 'Defense n' in roster order, and do not depend on titles", async () => {
    const store = setup();
    expect(piece("Offense 1")).toBeInTheDocument();
    expect(piece("Offense 7")).toBeInTheDocument();
    expect(piece("Defense 1")).toBeInTheDocument();
    expect(piece("Defense 7")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(14);

    store.mutate((d) => {
      d.players.find((p) => p.id === "o2")!.label = "AB";
    });
    await rAF();
    expect(piece("Offense 2")).toBeInTheDocument(); // same name, now titled
  });

  it("describe state separately: the holder and the mark", async () => {
    setup();
    await rAF();
    expect(piece("Offense 1")).toHaveAttribute("aria-description", "Has the disc");
    expect(piece("Defense 1")).toHaveAttribute("aria-description", "Is the mark");
    expect(piece("Offense 2")).not.toHaveAttribute("aria-description");
  });
});

describe("titles", () => {
  it("are blank by default and drawn centred inside the piece once set", async () => {
    const store = setup();
    await rAF();
    const o2 = piece("Offense 2");
    expect(titleOf(o2).textContent).toBe("");

    store.mutate((d) => {
      d.players.find((p) => p.id === "o2")!.label = "K9";
    });
    await rAF();
    const text = titleOf(o2);
    expect(text.textContent).toBe("K9");
    expect(text.getAttribute("text-anchor")).toBe("middle");
    // Baseline offset follows the font size so the glyphs sit on the piece's centre.
    expect(Number(text.getAttribute("y"))).toBeCloseTo(PIECE_TOKENS.label.fontSize * 0.35);
    // Inside the scaled body, with the disc it belongs to.
    expect(text.parentElement?.classList.contains("fv-piece-body")).toBe(true);
  });

  it("never change when the disc moves", async () => {
    const store = setup();
    store.mutate((d) => {
      d.players.find((p) => p.id === "o2")!.label = "QB";
    });
    store.mutate((d) => throwTo(d, "o2"));
    await rAF();
    expect(titleOf(piece("Offense 2")).textContent).toBe("QB");
    store.mutate((d) => throwTo(d, "o3"));
    await rAF();
    expect(titleOf(piece("Offense 2")).textContent).toBe("QB");
  });
});

describe("the disc holder", () => {
  it("has the green ring; giving the disc moves it", async () => {
    const store = setup();
    await rAF();
    expect(ringOf(piece("Offense 1")).getAttribute("opacity")).toBe("1");
    expect(ringOf(piece("Offense 2")).getAttribute("opacity")).toBe("0");
    expect(ringOf(piece("Offense 1")).getAttribute("stroke")).toBe(PIECE_TOKENS.holder.stroke);

    store.mutate((d) => throwTo(d, "o2"));
    await rAF();
    expect(ringOf(piece("Offense 1")).getAttribute("opacity")).toBe("0");
    expect(ringOf(piece("Offense 2")).getAttribute("opacity")).toBe("1");
    expect(piece("Offense 2")).toHaveAttribute("aria-description", "Has the disc");
    expect(screen.getByTestId("disc")).toBeInTheDocument();
  });

  it("is not a selection: the focus ring and the holder ring are different elements", () => {
    setup();
    const o1 = piece("Offense 1");
    expect(ringOf(o1)).not.toBe(o1.querySelector(".fv-piece-focus-ring"));
    expect(PIECE_TOKENS.holder.stroke).not.toBe(PIECE_TOKENS.focusRing.stroke);
  });
});

describe("the mark follows geometry", () => {
  it("is heavy-ringed while a defender is within 10 ft of the holder, and drops off past it", async () => {
    const store = setup();
    await rAF();
    expect(bodyOf(piece("Defense 1")).getAttribute("stroke-width")).toBe(String(PIECE_TOKENS.special.strokeWidth));
    expect(bodyOf(piece("Defense 2")).getAttribute("stroke-width")).toBe(String(PIECE_TOKENS.defense.strokeWidth));

    const o1 = store.getScene().players.find((p) => p.id === "o1")!.pos;
    store.mutate((d) => {
      d.players.find((p) => p.id === "d1")!.pos = { x: o1.x + 6, y: o1.y };
      normalize(d);
    });
    await rAF();
    // Nobody left in range (the next closest defender is further out).
    expect(bodyOf(piece("Defense 1")).getAttribute("stroke-width")).toBe(String(PIECE_TOKENS.defense.strokeWidth));
    expect(store.getScene().players.some((p) => p.role === "mark")).toBe(false);

    store.mutate((d) => {
      d.players.find((p) => p.id === "d1")!.pos = { x: o1.x + 2, y: o1.y };
      normalize(d);
    });
    await rAF();
    expect(bodyOf(piece("Defense 1")).getAttribute("stroke-width")).toBe(String(PIECE_TOKENS.special.strokeWidth));
  });

  it("hides the mark direction line when there is no mark", async () => {
    const store = setup();
    await rAF();
    const line = screen.getByTestId("mark-direction");
    expect(line.getAttribute("display")).toBe("inline");
    const o1 = store.getScene().players.find((p) => p.id === "o1")!.pos;
    store.mutate((d) => {
      d.players.find((p) => p.id === "d1")!.pos = { x: o1.x + 8, y: o1.y };
      normalize(d);
    });
    await rAF();
    expect(line.getAttribute("display")).toBe("none");
  });
});

describe("piece size per device", () => {
  it("scales the whole body (rings, disc, strokes) and the title by one variable", () => {
    setup();
    for (const el of screen.getAllByRole("button")) {
      expect(el.querySelector(".fv-piece-body")).not.toBeNull();
      expect(titleOf(el).parentElement?.classList.contains("fv-piece-body")).toBe(true);
    }
    // The disc dock is inside a scaled body too, so it stays beside the piece.
    expect(screen.getByTestId("disc").querySelector(".fv-piece-body")).not.toBeNull();
    expect(css).toMatch(/\.fv-piece-body\s*\{\s*transform:\s*scale\(var\(--fv-piece-scale/);
  });

  it("is 85% on a phone, 70% from 1000 px and 50% at the desktop breakpoint", () => {
    expect(css).toMatch(/:root\s*\{\s*--fv-piece-scale:\s*0\.85;/);
    expect(css).toMatch(/@media \(min-width: 1000px\)\s*\{\s*:root\s*\{\s*--fv-piece-scale:\s*0\.7;/);
    expect(css).toMatch(
      /@media \(min-width: 1280px\) and \(min-height: 640px\)\s*\{\s*:root\s*\{\s*--fv-piece-scale:\s*0\.5;/,
    );
  });

  it("keeps the title legible: it scales no lower than 0.65 of the original", () => {
    expect(css).toMatch(/\.fv-piece-title\s*\{[^}]*max\(var\(--fv-piece-scale, 1\), 0\.65\)/);
  });
});
