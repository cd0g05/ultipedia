import { describe, expect, it } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { createSceneStore } from "../scene/store";
import { getPreset } from "../scene/presets";
import { useSelection } from "../ui/shell/useSelection";
import type { SceneStore } from "../scene/store";

function Probe({ store }: { store: SceneStore }) {
  const selection = useSelection(store);
  return <div data-testid="kind">{selection.kind}</div>;
}

describe("useSelection", () => {
  it("reads the store's current selection on mount", () => {
    const store = createSceneStore(getPreset("vertStackForceSide"));
    render(<Probe store={store} />);
    expect(screen.getByTestId("kind")).toHaveTextContent("none");
  });

  it("re-renders when the store's selection changes, without a scene mutation", () => {
    const store = createSceneStore(getPreset("vertStackForceSide"));
    render(<Probe store={store} />);

    act(() => {
      store.setSelection({ kind: "offense", id: store.getScene().players[0].id });
    });

    expect(screen.getByTestId("kind")).toHaveTextContent("offense");
  });
});
