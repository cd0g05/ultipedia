// ADR-3: the panel registry must have an entry for every SelectionStateKind
// — a downstream initiative registering a panel for a kind outside the
// union fails to compile, but this guard is what proves the registry itself
// starts complete, not just that TypeScript would catch a future gap.

import { describe, expect, it } from "vitest";
import { panelRegistry, registerPanel } from "../ui/shell/panelRegistry";
import type { SelectionStateKind } from "../ui/shell/panelRegistry";
import { DefaultVisibilityPanel } from "../ui/shell/panels/DefaultVisibilityPanel";
import { OffensePlayerPanel } from "../ui/shell/panels/OffensePlayerPanel";
import { DefensePlayerPanel } from "../ui/shell/panels/DefensePlayerPanel";
import { MarkPanel } from "../ui/shell/panels/MarkPanel";

const ALL_KINDS: SelectionStateKind[] = ["none", "multi", "offense", "defense", "mark"];

describe("panelRegistry (ADR-3)", () => {
  it("has an entry for every SelectionStateKind", () => {
    for (const kind of ALL_KINDS) {
      expect(panelRegistry[kind]).toBeDefined();
    }
  });

  it("uses DefaultVisibilityPanel for both none and multi", () => {
    expect(panelRegistry.none).toBe(DefaultVisibilityPanel);
    expect(panelRegistry.multi).toBe(DefaultVisibilityPanel);
  });

  it("uses distinct placeholder panels for offense, defense, and mark", () => {
    expect(panelRegistry.offense).toBe(OffensePlayerPanel);
    expect(panelRegistry.defense).toBe(DefensePlayerPanel);
    expect(panelRegistry.mark).toBe(MarkPanel);
  });

  it("registerPanel lets a downstream initiative override an entry without editing this file", () => {
    const original = panelRegistry.mark;
    function StubMatchupPanel() {
      return null;
    }
    registerPanel("mark", StubMatchupPanel);
    expect(panelRegistry.mark).toBe(StubMatchupPanel);
    // Restore, since panelRegistry is a module-level singleton shared across tests.
    registerPanel("mark", original);
  });
});
