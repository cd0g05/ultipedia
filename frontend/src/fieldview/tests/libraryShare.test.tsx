// Library and sharing end to end (fieldview-build P4): autosave and its states,
// My plays, the Share dialog, files, Watch opening a shared link, and Explore
// offering saved setups.

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { MemoryRouter, useLocation, useRoutes } from "react-router-dom";
import { routes } from "../../router";
import { library } from "../play/library";
import { BUILTIN_PLAYS, BUILTIN_SETUPS } from "../play/plays";
import { decodePlay, encodePlay, playToFileText } from "../play/share";
import { getStageViewBox, yardToPixel } from "../render/coords";
import { FIELD_PX_HEIGHT, FIELD_PX_WIDTH } from "../render/fieldLayer";
import { resolve } from "../play/model";

const viewBox = getStageViewBox(FIELD_PX_WIDTH, FIELD_PX_HEIGHT);
const rAF = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

function Where() {
  const { pathname, hash } = useLocation();
  return <output data-testid="where">{pathname + hash}</output>;
}
function AppRoutes() {
  return (
    <>
      <Where />
      {useRoutes(routes)}
    </>
  );
}
function renderAt(path: string) {
  const out = render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
  const svg = screen.queryByRole("group", { name: /ultimate field/i }) as unknown as SVGSVGElement | null;
  if (svg) {
    vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
      left: 0, top: 0, width: viewBox.width, height: viewBox.height, right: viewBox.width, bottom: viewBox.height, x: 0, y: 0,
      toJSON: () => ({}),
    });
  }
  return { ...out, svg: svg as SVGSVGElement };
}
const where = () => screen.getByTestId("where").textContent!;
const clientFor = (yard: { x: number; y: number }) => {
  const px = yardToPixel(yard);
  return { clientX: px.x - viewBox.x, clientY: px.y - viewBox.y };
};
const first = (name: string | RegExp) => screen.getAllByRole("button", { name })[0];
const click = (name: string | RegExp) => fireEvent.click(first(name));
const saveStatus = () => screen.getAllByTestId("save-status")[0].getAttribute("data-status");

async function dragO2(svg: SVGSVGElement, to = { x: 60, y: 8 }) {
  fireEvent.pointerDown(svg, { pointerId: 1, ...clientFor({ x: 50, y: 20 }) });
  fireEvent.pointerMove(svg, { pointerId: 1, ...clientFor(to) });
  fireEvent.pointerUp(svg, { pointerId: 1, ...clientFor(to) });
  await act(async () => {
    await rAF();
  });
}

function resetLibrary() {
  for (const e of library.list().slice()) library.remove(e.id);
}

beforeEach(() => {
  localStorage.clear();
  resetLibrary();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("autosave", () => {
  it("a new play says so, saves as you edit, and gets its own address", async () => {
    const { svg } = renderAt("/fieldview/build");
    expect(saveStatus()).toBe("new");
    expect(where()).toBe("/fieldview/build");

    await dragO2(svg);
    expect(saveStatus()).toBe("saving");
    await waitFor(() => expect(saveStatus()).toBe("saved"), { timeout: 3000 });
    expect(library.list()).toHaveLength(1);
    expect(where()).toBe(`/fieldview/build/${library.list()[0].id}`);
    expect(JSON.parse(localStorage.getItem("fieldview.plays.v3")!).plays).toHaveLength(1);
  });

  it("reopening the address brings the play back, edits included", async () => {
    const first1 = renderAt("/fieldview/build");
    await dragO2(first1.svg);
    await waitFor(() => expect(saveStatus()).toBe("saved"), { timeout: 3000 });
    const id = library.list()[0].id;
    first1.unmount();

    renderAt(`/fieldview/build/${id}`);
    expect(saveStatus()).toBe("saved");
    const o2 = screen.getByRole("button", { name: "Offense 2" }).getAttribute("transform");
    const at = yardToPixel({ x: 60, y: 8 });
    expect(o2).toBe(`translate(${at.x}, ${at.y})`);
  });

  it("leaving Build flushes the last edit (nothing waits on the timer)", async () => {
    const { svg, unmount } = renderAt("/fieldview/build");
    await dragO2(svg);
    expect(library.list()).toHaveLength(0); // still inside the debounce
    unmount();
    expect(library.list()).toHaveLength(1);
  });

  it("a full storage shows the error state and never loses the play on screen", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw Object.assign(new Error("full"), { name: "QuotaExceededError" });
    });
    const { svg } = renderAt("/fieldview/build");
    await dragO2(svg);
    await waitFor(() => expect(saveStatus()).toBe("error"), { timeout: 3000 });
    expect(screen.getAllByTestId("save-status")[0]).toHaveTextContent(/couldn't save/i);
    // The play is still there and still editable.
    const at = yardToPixel({ x: 60, y: 8 });
    expect(screen.getByRole("button", { name: "Offense 2" }).getAttribute("transform")).toBe(`translate(${at.x}, ${at.y})`);
    expect(library.list()).toHaveLength(1);
  });

  it("an unknown play id falls back to a new play", async () => {
    renderAt("/fieldview/build/does-not-exist");
    await waitFor(() => expect(where()).toBe("/fieldview/build"));
    expect(saveStatus()).toBe("new");
  });
});

describe("My plays", () => {
  async function savedPlay() {
    const r = renderAt("/fieldview/build");
    await dragO2(r.svg);
    await waitFor(() => expect(saveStatus()).toBe("saved"), { timeout: 3000 });
    return r;
  }

  it("lists saved plays, opens one, and starts a new one", async () => {
    await savedPlay();
    const list = screen.getAllByTestId("library-list")[0];
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(within(list).getByText("Untitled play")).toBeInTheDocument();

    click("+ New play");
    await waitFor(() => expect(where()).toBe("/fieldview/build"));
    expect(saveStatus()).toBe("new");
    const home = yardToPixel({ x: 50, y: 20 });
    expect(screen.getByRole("button", { name: "Offense 2" }).getAttribute("transform")).toBe(`translate(${home.x}, ${home.y})`);
    expect(library.list()).toHaveLength(1); // the first play was not lost

    fireEvent.click(within(screen.getAllByTestId("library-list")[0]).getAllByRole("button")[0]);
    await waitFor(() => expect(where()).toBe(`/fieldview/build/${library.list()[0].id}`));
    const moved = yardToPixel({ x: 60, y: 8 });
    expect(screen.getByRole("button", { name: "Offense 2" }).getAttribute("transform")).toBe(`translate(${moved.x}, ${moved.y})`);
  });

  it("duplicates, then deletes with an undo", async () => {
    await savedPlay();
    click(/^Duplicate Untitled play$/);
    await waitFor(() => expect(library.list()).toHaveLength(2));
    expect(library.list()[1].play.name).toBe("Untitled play copy");

    const id = library.list()[1].id;
    click("Delete Untitled play copy");
    expect(library.get(id)).toBeUndefined();
    expect(screen.getByText(/Deleted “Untitled play copy”/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo delete" }));
    expect(library.get(id)).toBeDefined();
  });

  it("opens an example only as a copy (Duplicate to edit)", async () => {
    renderAt("/fieldview/build");
    const examples = screen.getAllByTestId("example-list")[0];
    expect(within(examples).getAllByRole("listitem").length).toBe(BUILTIN_PLAYS.length + BUILTIN_SETUPS.length);
    fireEvent.click(within(examples).getByRole("button", { name: `Duplicate ${BUILTIN_PLAYS[0].name} to edit` }));
    await waitFor(() => expect(library.list()).toHaveLength(1));
    expect(library.list()[0].play.name).toBe(`${BUILTIN_PLAYS[0].name} copy`);
    expect(library.list()[0].play.frames).toHaveLength(BUILTIN_PLAYS[0].frames.length);
    expect(where()).toBe(`/fieldview/build/${library.list()[0].id}`);
    expect(screen.getAllByTestId("frame-strip")[0].querySelectorAll("[data-frame]")).toHaveLength(BUILTIN_PLAYS[0].frames.length);
  });

  it("says so when there are no plays yet", () => {
    renderAt("/fieldview/build");
    expect(screen.getAllByText("No plays yet. Start with New play.").length).toBeGreaterThan(0);
  });
});

describe("Share dialog", () => {
  it("shows the link, a QR code, the snapshot note, and closes with Escape", async () => {
    renderAt("/fieldview/build");
    click("Share");
    const dialog = screen.getByRole("dialog", { name: "Share this play" });
    const link = within(dialog).getByRole("textbox", { name: "Link" }) as HTMLInputElement;
    expect(link.value.startsWith(`${window.location.origin}/fieldview/watch#p=`)).toBe(true);
    expect(within(dialog).getByTestId("qr")).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/snapshot/i);
    // The link decodes to the play on screen.
    expect(decodePlay(link.value.split("#p=")[1]).name).toBe("Untitled play");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Share this play" })).toBeNull();
  });

  it("Copy link writes the link to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderAt("/fieldview/build");
    click("Share");
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain("/fieldview/watch#p=");
    await waitFor(() => expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument());
  });

  it("replaces the QR with a clear message when the link is too long for one", () => {
    // A play whose label text makes the link exceed QR capacity.
    const big = {
      ...BUILTIN_PLAYS[0],
      frames: BUILTIN_PLAYS[0].frames.map((f, i) => ({ ...f, label: `Step ${i} ${"q".repeat(10)}` })),
    };
    expect(encodePlay(big).length).toBeLessThan(3000); // normal plays fit
    // Force overflow by testing the component directly with an oversized string.
    return import("../ui/content/QrCode").then(({ QrCode, QR_TOO_LONG }) => {
      const { getByTestId } = render(<QrCode text={"x".repeat(4000)} />);
      expect(getByTestId("qr-fallback")).toHaveTextContent(QR_TOO_LONG);
    });
  });

  it("downloads a file and opens one: a valid play becomes a new play, a non-play is refused", async () => {
    const created = vi.fn(() => "blob:fake");
    URL.createObjectURL = created as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderAt("/fieldview/build");
    click("Share");
    fireEvent.click(screen.getByRole("button", { name: "Download file" }));
    expect(created).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();

    const input = screen.getByLabelText("Open a play file") as HTMLInputElement;
    const bad = new File(["hello"], "x.json", { type: "application/json" });
    fireEvent.change(input, { target: { files: [bad] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/isn't a Field View play/i);
    expect(library.list()).toHaveLength(0);

    const good = new File([playToFileText(BUILTIN_PLAYS[1])], "p.fieldview.json", { type: "application/json" });
    fireEvent.change(input, { target: { files: [good] } });
    await waitFor(() => expect(library.list()).toHaveLength(1));
    expect(library.list()[0].play).toEqual(BUILTIN_PLAYS[1]);
    expect(where()).toBe(`/fieldview/build/${library.list()[0].id}`);
    expect(screen.queryByRole("dialog", { name: "Share this play" })).toBeNull();
  });

  it("has no axe violations (dialog open, and the lists)", async () => {
    const { container } = renderAt("/fieldview/build");
    click("Share");
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
});

describe("Watch opens shared links", () => {
  it("plays the shared play first, offers Save to my plays, then Open in Build", async () => {
    const shared = { ...BUILTIN_PLAYS[2], name: "From a friend" };
    renderAt(`/fieldview/watch#p=${encodePlay(shared)}`);
    const banners = screen.getAllByTestId("shared-banner");
    expect(banners.length).toBeGreaterThan(0);
    expect(screen.getAllByText("From a friend").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("frame-counter")[0]).toHaveTextContent(`1 / ${shared.frames.length}`);

    fireEvent.click(within(banners[0]).getByRole("button", { name: "Save to my plays" }));
    expect(library.list()).toHaveLength(1);
    expect(library.list()[0].play).toEqual(shared);
    const open = within(screen.getAllByTestId("shared-banner")[0]).getByRole("link", { name: "Open in Build" });
    expect(open.getAttribute("href")).toBe(`/fieldview/build/${library.list()[0].id}`);
  });

  it("an invalid link says so and the normal plays still play", () => {
    renderAt("/fieldview/watch#p=this-is-not-a-play");
    expect(screen.getByTestId("link-error")).toHaveTextContent("This link isn't a Field View play.");
    expect(screen.queryByTestId("shared-banner")).toBeNull();
    expect(screen.getAllByTestId("frame-counter")[0]).toHaveTextContent(`1 / ${BUILTIN_PLAYS[0].frames.length}`);
  });

  it("lists multi-frame plays from the library beside the built-ins; setups stay out", () => {
    library.save("m", { ...BUILTIN_PLAYS[0], name: "My own play" });
    library.save("s", { ...BUILTIN_SETUPS[0], name: "My own setup" });
    renderAt("/fieldview/watch");
    const list = screen.getAllByTestId("play-list")[0];
    expect(within(list).getByText("My own play")).toBeInTheDocument();
    expect(within(list).queryByText("My own setup")).toBeNull();
    expect(within(list).getAllByRole("button")).toHaveLength(BUILTIN_PLAYS.length + 1);
  });
});

describe("Explore offers saved setups", () => {
  it("lists one-frame plays from the library after the built-in setups; multi-frame plays stay out", () => {
    library.save("s", { ...BUILTIN_SETUPS[0], name: "My own setup" });
    library.save("m", { ...BUILTIN_PLAYS[0], name: "My own play" });
    renderAt("/fieldview/explore");
    const list = screen.getAllByTestId("setup-list")[0];
    expect(within(list).getByText("My own setup")).toBeInTheDocument();
    expect(within(list).queryByText("My own play")).toBeNull();
    expect(within(list).getAllByRole("button", { hidden: true })).toHaveLength(BUILTIN_SETUPS.length + 1);
  });
});

describe("end to end", () => {
  it("build → share → open the link in Watch → save → open it in Build: the same play", async () => {
    const built = renderAt("/fieldview/build");
    click("Add frame");
    await dragO2(built.svg);
    click("Share");
    const link = (screen.getByRole("textbox", { name: "Link" }) as HTMLInputElement).value;
    const code = link.split("#p=")[1];
    const sent = decodePlay(code);
    expect(sent.frames).toHaveLength(2);
    expect(resolve(sent, 1).positions.o2).toEqual({ x: 60, y: 8 });
    built.unmount();
    resetLibrary();

    const watching = renderAt(`/fieldview/watch#p=${code}`);
    fireEvent.click(within(screen.getAllByTestId("shared-banner")[0]).getByRole("button", { name: "Save to my plays" }));
    const saved = library.list()[0];
    expect(saved.play).toEqual(sent);
    watching.unmount();

    const again = renderAt(`/fieldview/build/${saved.id}`);
    expect(screen.getAllByTestId("frame-strip")[0].querySelectorAll("[data-frame]")).toHaveLength(2);
    click("Frame 2");
    await act(async () => {
      await rAF();
    });
    const at = yardToPixel({ x: 60, y: 8 });
    expect(screen.getByRole("button", { name: "Offense 2" }).getAttribute("transform")).toBe(`translate(${at.x}, ${at.y})`);
    again.unmount();
  });
});
