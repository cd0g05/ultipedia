// Overlay preferences persist; the scene does not. A coach who works with
// the map on and `markStr` turned down should find it that way tomorrow —
// but should not find yesterday's half-dragged formation, which would be
// indistinguishable from a bug.

import { useCallback, useEffect, useState } from "react";
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

export function useOverlayState(): OverlayState {
  const [prefs, setPrefs] = useState<OverlayPrefs>(loadPrefs);

  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  const setOn = useCallback((on: boolean) => setPrefs((p) => ({ ...p, on })), []);
  const setLens = useCallback((lens: Lens) => setPrefs((p) => ({ ...p, lens })), []);
  const setAdvancedExpanded = useCallback(
    (advancedExpanded: boolean) => setPrefs((p) => ({ ...p, advancedExpanded })),
    [],
  );
  const setVisible = useCallback(
    (team: keyof TeamVisibility, shown: boolean) =>
      setPrefs((p) => ({ ...p, visible: { ...p.visible, [team]: shown } })),
    [],
  );
  const setLayer = useCallback(
    (layer: keyof LayerFlags, enabled: boolean) =>
      setPrefs((p) => ({ ...p, layers: { ...p.layers, [layer]: enabled } })),
    [],
  );
  const setParam = useCallback(
    (param: keyof SpaceParams, value: number) =>
      setPrefs((p) => ({ ...p, params: { ...p.params, [param]: value } })),
    [],
  );
  const resetParams = useCallback(
    () => setPrefs((p) => ({ ...p, params: { ...DEFAULT_PARAMS } })),
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
