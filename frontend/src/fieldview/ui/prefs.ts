// Overlay preferences persist; the scene does not. A coach who works with
// the map on and `markStr` turned down should find it that way tomorrow —
// but should not find yesterday's half-dragged formation, which would be
// indistinguishable from a bug.

import { useCallback, useSyncExternalStore } from "react";
import { ALL_LAYERS, DEFAULT_PARAMS, SLIDER_RANGES, degToRad } from "../space/constants";
import type { LayerFlags, Lens, SpaceParams } from "../space/types";

const STORAGE_KEY = "fieldview.overlayPrefs";

export interface TeamVisibility {
  offense: boolean;
  defense: boolean;
}

export interface OverlayPrefs {
  on: boolean;
  lens: Lens;
  layers: LayerFlags;
  params: SpaceParams;
  advancedExpanded: boolean;
  // Which teams are drawn on the diagram. Display-only — a coach showing one
  // side of a formation should not silently be shown a different map.
  visible: TeamVisibility;
}

export const DEFAULT_PREFS: OverlayPrefs = {
  on: false,
  lens: "offense",
  layers: { ...ALL_LAYERS },
  params: { ...DEFAULT_PARAMS },
  advancedExpanded: false,
  visible: { offense: true, defense: true },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampToRange(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

// localStorage is untrusted input in exactly the way an imported file is —
// hand-edited, version-skewed, or written by an older build. A bad entry
// falls back to defaults rather than producing a map nobody can explain.
export function parsePrefs(raw: unknown): OverlayPrefs {
  if (!isRecord(raw)) {
    return {
      ...DEFAULT_PREFS,
      layers: { ...DEFAULT_PREFS.layers },
      visible: { ...DEFAULT_PREFS.visible },
    };
  }

  const layers = isRecord(raw.layers) ? raw.layers : {};
  const visible = isRecord(raw.visible) ? raw.visible : {};
  const params = isRecord(raw.params) ? raw.params : {};
  const markWRad = degToRad(
    clampToRange(
      typeof params.markW === "number" ? (params.markW * 180) / Math.PI : undefined,
      SLIDER_RANGES.markWDeg.min,
      SLIDER_RANGES.markWDeg.max,
      (DEFAULT_PARAMS.markW * 180) / Math.PI,
    ),
  );

  return {
    on: typeof raw.on === "boolean" ? raw.on : DEFAULT_PREFS.on,
    lens: raw.lens === "defense-only" ? "defense-only" : "offense",
    // Was `tuningExpanded` before the panel grew to hold the lens and layers
    // too. The old key is still honoured so a returning coach's disclosure
    // state survives the rename rather than silently snapping shut.
    advancedExpanded:
      typeof raw.advancedExpanded === "boolean"
        ? raw.advancedExpanded
        : typeof raw.tuningExpanded === "boolean"
          ? raw.tuningExpanded
          : DEFAULT_PREFS.advancedExpanded,
    visible: {
      offense: typeof visible.offense === "boolean" ? visible.offense : true,
      defense: typeof visible.defense === "boolean" ? visible.defense : true,
    },
    layers: {
      markForce: typeof layers.markForce === "boolean" ? layers.markForce : true,
      coverage: typeof layers.coverage === "boolean" ? layers.coverage : true,
      lanes: typeof layers.lanes === "boolean" ? layers.lanes : true,
      value: typeof layers.value === "boolean" ? layers.value : true,
    },
    params: {
      vmax: clampToRange(params.vmax, SLIDER_RANGES.vmax.min, SLIDER_RANGES.vmax.max, DEFAULT_PARAMS.vmax),
      react: clampToRange(params.react, SLIDER_RANGES.react.min, SLIDER_RANGES.react.max, DEFAULT_PARAMS.react),
      head: clampToRange(params.head, SLIDER_RANGES.head.min, SLIDER_RANGES.head.max, DEFAULT_PARAMS.head),
      hang: clampToRange(params.hang, SLIDER_RANGES.hang.min, SLIDER_RANGES.hang.max, DEFAULT_PARAMS.hang),
      markStr: clampToRange(
        params.markStr,
        SLIDER_RANGES.markStr.min,
        SLIDER_RANGES.markStr.max,
        DEFAULT_PARAMS.markStr,
      ),
      markW: markWRad,
    },
  };
}

export function loadPrefs(): OverlayPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return parsePrefs(raw ? JSON.parse(raw) : null);
  } catch {
    return parsePrefs(null);
  }
}

export function savePrefs(prefs: OverlayPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // A full or unavailable localStorage costs persistence, not the session.
  }
}

export function paramsAreDefault(params: SpaceParams): boolean {
  return (Object.keys(DEFAULT_PARAMS) as (keyof SpaceParams)[]).every(
    (key) => Math.abs(params[key] - DEFAULT_PARAMS[key]) < 1e-9,
  );
}

export interface OverlayState extends OverlayPrefs {
  setOn: (on: boolean) => void;
  setLens: (lens: Lens) => void;
  setLayer: (layer: keyof LayerFlags, enabled: boolean) => void;
  setParam: (param: keyof SpaceParams, value: number) => void;
  setAdvancedExpanded: (expanded: boolean) => void;
  setVisible: (team: keyof TeamVisibility, shown: boolean) => void;
  resetParams: () => void;
}

// A single module-level store rather than one `useState` per call site.
//
// Integration discovery: once the shell composes `Whiteboard.tsx` (which
// needs `overlay.on`/`overlay.visible`/etc. to actually drive `FieldCanvas`)
// alongside `ToolRibbon`/`DefaultVisibilityPanel`/`AdvancedSettingsPanel`
// (which the Panels and Desktop partitions' own notes flagged as *each*
// calling `useOverlayState()` independently — "redundant-but-consistent,
// since they share one localStorage key"), those hook calls are no longer
// consistent: they are all mounted *at the same time* on the same page, not
// sequentially across a reload. A plain `useState(loadPrefs)` per call site
// only reads localStorage once, at that instance's own mount — so toggling
// "Space" in the shell ribbon updated the ribbon's own copy and localStorage,
// but `Whiteboard.tsx`'s separate copy (the one actually threaded into
// `FieldCanvas`) never re-rendered, and the heatmap never turned on. Sharing
// one external store, read via `useSyncExternalStore` exactly like
// `SceneStore`'s selection field (scene/store.ts, ADR-1), is what makes every
// simultaneously-mounted consumer see the same live value instead of a
// snapshot from its own mount time.
let prefsState: OverlayPrefs = loadPrefs();
const listeners = new Set<() => void>();

function setPrefsState(update: (prefs: OverlayPrefs) => OverlayPrefs): void {
  prefsState = update(prefsState);
  savePrefs(prefsState);
  for (const cb of listeners) cb();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): OverlayPrefs {
  return prefsState;
}

export function useOverlayState(): OverlayState {
  // Re-seed from localStorage whenever nothing is currently subscribed. In
  // the running app this only ever happens once, at the very first mount (or
  // after navigating away from every fieldview page and back) — while any
  // consumer is mounted, `listeners` is never empty, so the shared value
  // never resets under it. In tests, RTL's automatic `cleanup()` between
  // cases unmounts every consumer (running each one's unsubscribe), so the
  // next `render()` after a `localStorage.clear()` starts from defaults again
  // exactly like the old per-instance `useState(loadPrefs)` did.
  if (listeners.size === 0) {
    prefsState = loadPrefs();
  }
  const prefs = useSyncExternalStore(subscribe, getSnapshot);

  const setOn = useCallback((on: boolean) => setPrefsState((p) => ({ ...p, on })), []);
  const setLens = useCallback((lens: Lens) => setPrefsState((p) => ({ ...p, lens })), []);
  const setAdvancedExpanded = useCallback(
    (advancedExpanded: boolean) => setPrefsState((p) => ({ ...p, advancedExpanded })),
    [],
  );
  const setVisible = useCallback(
    (team: keyof TeamVisibility, shown: boolean) =>
      setPrefsState((p) => ({ ...p, visible: { ...p.visible, [team]: shown } })),
    [],
  );
  const setLayer = useCallback(
    (layer: keyof LayerFlags, enabled: boolean) =>
      setPrefsState((p) => ({ ...p, layers: { ...p.layers, [layer]: enabled } })),
    [],
  );
  const setParam = useCallback(
    (param: keyof SpaceParams, value: number) =>
      setPrefsState((p) => ({ ...p, params: { ...p.params, [param]: value } })),
    [],
  );
  const resetParams = useCallback(
    () => setPrefsState((p) => ({ ...p, params: { ...DEFAULT_PARAMS } })),
    [],
  );

  return {
    ...prefs,
    setOn,
    setLens,
    setLayer,
    setParam,
    setAdvancedExpanded,
    setVisible,
    resetParams,
  };
}
