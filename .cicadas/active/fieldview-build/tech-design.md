---
summary: "Technical approach for fieldview-build. A pure play-model library (play/model.ts: Play, Frame, resolve, operations, undo history) with a clean v3 format replaces every older play representation; the live SceneStore becomes a VIEW of the current resolved frame while a BuildSession owns the document, commits placements at gesture end (ADR-2 intact) and keeps undo snapshots. The mark becomes geometry in scene/possession.ts (MARK_RADIUS_YD) and the space model tolerates no mark. The playback controller works on resolved frames, adds a per-frame holder and an animated pass using the existing airborne-disc mechanism. Piece scale per device is a CSS variable applied to a scaled piece body. Library = LocalPlayStore (localStorage, validated on read); sharing = deflate (fflate) + base64url in the URL fragment, QR via qrcode-generator, file export/import. New ADRs 36–43 continue the numbering after the ui-rework's 28–35."
phase: "tech"
when_to_load:
  - "When implementing or reviewing the play model, v3 format, mark rule, playback changes, Build state, library or sharing."
depends_on:
  - "prd.md"
  - "ux.md"
  - "docs/fieldview-build-functional-spec.md"
  - ".cicadas/active/fieldview-ui-rework/tech-design.md"
modules:
  - "frontend/src/fieldview/play"
  - "frontend/src/fieldview/scene"
  - "frontend/src/fieldview/space"
  - "frontend/src/fieldview/render"
  - "frontend/src/fieldview/ui"
  - "frontend/src/fieldview/pages"
  - "frontend/package.json"
index:
  overview: "## Overview & Context"
  stack: "## Tech Stack & Dependencies"
  structure: "## Project / Module Structure"
  adrs: "## Architecture Decisions (ADRs)"
  data_models: "## Data Models"
  interfaces: "## API & Interface Design"
  conventions: "## Implementation Patterns & Conventions"
  security_performance: "## Security & Performance"
  implementation_sequence: "## Implementation Sequence"
next_section: "Overview & Context"
---

# Tech Design: fieldview-build

## Progress

- [x] Overview & Context
- [x] Tech Stack & Dependencies
- [x] Project / Module Structure
- [x] Architecture Decisions (ADRs)
- [x] Data Models
- [x] API & Interface Design
- [x] Implementation Patterns & Conventions
- [x] Security & Performance
- [x] Implementation Sequence

---

## Overview & Context

**Summary:** Separate **the document** (a `Play`) from **the view** (the `SceneStore` the canvas draws). The document is a small immutable value edited by pure operations with undo snapshots; the store is loaded from `resolve(play, i)` whenever the frame or the document changes, and mutated imperatively during a drag exactly as Explore does today. Playback, the library and sharing all consume the same `Play`.

### Cross-Cutting Concerns

1. **Canon ADR-2 (React never in the pointer/animation path).** Drags write the store imperatively; the document is updated once, at gesture end; playback writes positions imperatively.
2. **One format.** v3 is the only play representation: setups, curated plays, library entries, shared links and files.
3. **Orientation-agnostic.** The model is in yards; nothing here knows the field's screen orientation (ADR-28).
4. **Untrusted input.** Links and files are validated at the boundary before they become a `Play`.
5. **Everything undoable** that changes the document.

### Brownfield Notes

- Stacked on `initiative/fieldview-ui-rework`: the frame (`FieldViewFrame`, `FieldViewApp`), Explore/Watch, `ui/playback/playback.ts`, the airborne-disc drawing in `render/pieceLayer.tsx` (`getFlightPos`), the palette/legend, touch lift and the audit tests all exist there.
- Today: possession and matchups are play-level; the mark is `markFor()` = the defender matched to the holder, else the nearest defender; `space/layers.ts` and `space/score.ts` `requireRole(scene, "mark")` and throw without one; labels are `T`/`M`/`1..6`; pieces use one radius; `Scene` keeps `matchups` for the (deferred) motion engine.
- Must NOT change: the space model's output whenever a mark exists; `motion/*`; `scene/matchups.ts`/`force.ts` (kept for later, catalogued in the backlog); ADR-17 (`normalize()` is the only writer of `Player.role`).

---

## Tech Stack & Dependencies

| Category | Selection | Rationale |
|---|---|---|
| Language/Runtime | TypeScript, React 18, Vite | Existing |
| State | pure model + a small external store (`useSyncExternalStore`) | Same pattern as prefs/selection; no new state library |
| Persistence | `localStorage`, validated on read | No backend; matches "no accounts" |
| **New:** compression | `fflate` | ~8 KB, MIT, no dependencies, sync deflate/inflate with output cap; keeps links short |
| **New:** QR | `qrcode-generator` | ~10 KB, MIT, no dependencies; returns a module matrix we draw as SVG |
| Testing | Vitest + Testing Library; axe | Existing |

Both new libraries are wrapped by one tiny module each (`play/share.ts`, `ui/content/QrCode.tsx`) so they can be swapped.

---

## Project / Module Structure

```
frontend/src/fieldview/
  play/
    model.ts           Play, Frame, PlayerRef; resolve(); resolveAll(); operations (pure)       (NEW)
    history.ts         generic undo/redo over immutable snapshots (cap 100)                     (NEW)
    format.ts          v3 types + constants (MAX_FRAMES, MAX_TITLE)                              (REWRITE)
    validate.ts        v3 validator (only version)                                               (REWRITE)
    share.ts           encodePlay/decodePlay (deflate + base64url), size caps                    (NEW)
    library.ts         PlayStore interface + LocalPlayStore + useLibrary()                       (NEW)
    plays.ts           built-in examples (v3 JSON in builtin/) read-only                         (MODIFY)
    builtin/*.json     regenerated toy plays AND toy setups, v3                                  (REGENERATE)
    backfill.ts · tween.ts (continuous) · serialize.ts · modeHandoff.ts                          (DELETE)
  scene/
    possession.ts      markFor() = geometry; normalize() unchanged contract                      (MODIFY)
    presets.ts         kept as TS fixtures + generator of the toy setups; labels removed         (MODIFY)
    presetFormat.ts · presetRegistry.ts                                                          (DELETE)
  space/               constants.ts (+MARK_RADIUS_YD) · score.ts/layers.ts (no-mark tolerant)    (MODIFY)
  render/              pieceLayer.tsx (titles, holder ring, scaled body) · tokens.ts              (MODIFY)
  ui/
    build/             BuildSession.ts (document + history + current frame + sync)
                       useBuildSession.ts · FrameStrip · FrameCard · SelectedPlayerCard(+title/disc)
                       PreviewCard · LibraryList · PlayMeta · ShareDialog · GhostLayer          (NEW)
    content/QrCode.tsx                                                                           (NEW)
    playback/playback.ts   works on resolved frames; per-frame holder; disc flight               (MODIFY)
    FieldCanvas.tsx        onGestureEnd hook; no-holder clears heat                              (MODIFY)
    app/FieldViewFrame     Build slots; piece-scale CSS vars                                     (MODIFY)
    shell/* · PresetMenu · Timeline · PlayMeta(old) · OverlayRail · playModel(?)                 (DELETE what is unused)
    AdvancedPanel.tsx · motion/* · shell/throwMode.ts · shell/sceneStore.tsx · useSelection.ts   (KEEP)
  pages/               Build.tsx (real page) · Explore.tsx (picker from library) · Watch.tsx (shared links, library)
                       Whiteboard · Designer · FieldStage                                       (DELETE)
```

---

## Architecture Decisions (ADRs)

Numbering continues after the ui-rework's ADR-28…35.

### ADR-36 — A play is an immutable document of frames that inherit
`Play { players[14], frames[] }`, `Frame { label?, moved, holder? }`. `resolve(play, i)` is pure and total: frame 0 is complete; later frames take `moved[id]` else the previous resolved position; the holder inherits the same way. Operations return new `Play` values (structural sharing is fine). **Deleting** a frame removes it and its changes (no baking); **duplicate** inserts an empty frame; **reset** removes `moved` entries. The live `SceneStore` is a view loaded from `resolve()`; it is never the source of truth for a Build play.

### ADR-37 — Format v3 is a clean break
`formatVersion: 3` only. The validator rejects every other version with a clear message; `backfill.ts`, the v1/v2 readers, the continuous-time `tween`, `serialize`, `modeHandoff` and their tests are deleted. `matchups`, per-entity `role`, and play-level `possession` are not stored (the live `Scene` keeps `matchups`, rebuilt by `autoAssign` at load, only for the deferred motion engine). Boundary rules as before (ADR-7): unknown keys dropped, ranges clamped, ≤ 30 frames, ≤ 2-char titles, frame 0 complete with an offensive holder.

### ADR-38 — The mark is geometry
`MARK_RADIUS_YD = 10/3` in `space/constants.ts` (single source). `markFor(scene, holderId)` returns the closest defender within that radius (centre to centre, id tie-break) or `null`. `normalize()` stays the sole writer of `Player.role` (ADR-17) and now simply calls it. The space model is made tolerant: `extractRoster` records `hasMark`; with no mark the mark layer contributes 1; output is **identical** whenever a mark exists (a test sweeps every preset). With no holder at all, `FieldCanvas` clears the heat canvas instead of computing a grid. Supersedes canon ADR-18/19's matchup-driven mark.

### ADR-39 — Per-frame holder; the pass is the existing airborne-disc mechanism
Playback resolves all frames once (`resolveAll`). A transition between frames *i* and *i+1* moves every piece in a straight line over one fixed `TRANSITION_SECONDS`; if the holder differs, the controller publishes the disc position through the existing `setFlightPos` (drawn by `pieceLayer`'s `getFlightPos()` branch) along the line from the **old holder's start** to the **new holder's end**, and flips possession (`throwTo` semantics + `normalize`) **on arrival** — consistent with canon's "old holder keeps possession for the whole flight". Reduced motion jumps. No React per animation frame (ADR-2).

### ADR-40 — Build edits the document through gestures; the store is imperative
`BuildSession` owns `{ history: History<Play>, frameIndex }`. A gesture (drag, marquee group drag, keyboard nudge burst) mutates the `SceneStore` live exactly as Explore does and tracks which players moved; at gesture end `FieldCanvas` calls `onGestureEnd({ movedIds })` and the session writes `placePlayers(play, frameIndex, positionsOf(movedIds))` as **one** history step. Structural operations (add/duplicate/delete/reset/give disc/title/label) are one step each. After any document change the session re-resolves the current frame into the store (a no-op for the frame just dragged) and React re-renders the structural UI (strip thumbnails, badges, cards). The Profiler 0-commit-during-drag guarantee is retained and tested.

### ADR-41 — Piece scale per device is a CSS variable on a scaled body
`PieceLayer` wraps each piece's visuals in `<g class="fv-piece-body">` with CSS `transform: scale(var(--fv-piece-scale))`; the title text scales by `max(var(--fv-piece-scale), 0.65)` so titles stay legible. `.fv-app` sets `--fv-piece-scale: 0.85` (phone), `0.7` from ~1000 px wide (tablet), `0.5` at the `desktop` screen — the same CSS-only switch as the frame (ADR-30). Strokes, rings, the holder ring, the docked disc and the selection ring live inside the body, so they scale together (this is what keeps small pieces from looking heavy-bordered). The grab radius (`pick.ts`) and the heat do not scale. Supersedes the single radius in `PIECE_TOKENS` from ui-rework P1 (the token stays the 100% size).

### ADR-42 — Sharing: the whole play in the URL fragment
`encodePlay(play)` = `base64url(deflate(JSON(play)))` using `fflate`; the link is `<origin>/fieldview/watch#p=<code>`. The fragment is never sent to a server. `decodePlay` caps the input length and bounds decompression (a zip-bomb fixture is tested) and runs the v3 validator. QR: `qrcode-generator` over the link, drawn as SVG; plays whose link exceeds the QR capacity show the link and file options only. File export/import is the same JSON (`.fieldview.json`).

### ADR-43 — One library; setups are one-frame plays
`PlayStore` (interface, canon ADR-8) gains `LocalPlayStore`: entries `{ id, updatedAt, play }` under `fieldview.plays.v3`, every entry validated on read (invalid ones dropped, not thrown), quota errors returned not thrown, cross-tab `storage` events. Explore's picker lists built-in setups plus the user's one-frame plays; Watch lists built-in examples (read-only) plus the user's multi-frame plays; Build lists everything the user owns. Built-ins are read-only (duplicate to edit).

---

## Data Models

```ts
// play/format.ts
export const PLAY_FORMAT_VERSION = 3;
export const MAX_FRAMES = 30;
export const MAX_TITLE_LENGTH = 2;
export const MAX_LABEL_LENGTH = 24;
export interface PlayerRef { id: string; team: "offense" | "defense"; title?: string }
export interface Frame { label?: string; moved: Record<string, Vec2>; holder?: string }
export interface Play {
  formatVersion: 3;
  name: string;
  description?: string;
  players: PlayerRef[];           // exactly 14, ids stable
  frames: Frame[];                // 1..MAX_FRAMES; frame 0 places everyone and names a holder
}
// play/model.ts
export interface ResolvedFrame { positions: Record<string, Vec2>; holder: string }
export function resolve(play: Play, i: number): ResolvedFrame;
export function resolveAll(play: Play): ResolvedFrame[];
export function toScene(play: Play, i: number): Scene;        // positions + possession + autoAssign + normalize
// play/library.ts
export interface StoredPlay { id: string; updatedAt: number; play: Play }
```

- **`Scene`**: unchanged shape (`players`, `possession`, `matchups`); `Player.label` carries the title.
- **Prefs**: no change (the piece scale is CSS, not a pref).
- **Library key:** `fieldview.plays.v3`; **current play:** the route (`/fieldview/build/:playId`).

---

## API & Interface Design

```ts
// pure operations (play/model.ts) — each returns a new Play
placePlayers(play, i, positions: Record<string, Vec2>): Play
giveDisc(play, i, playerId): Play                 // offense only; sets frames[i].holder
setTitle(play, playerId, title: string): Play     // trimmed, uppercased, ≤ 2
addFrame(play, afterIndex): Play                  // empty frame
duplicateFrame(play, i): Play                     // = addFrame(play, i)
deleteFrame(play, i): Play                        // refuses if it is the only frame
resetFrame(play, i): Play                         // clears moved + holder (not for frame 0)
resetPlayer(play, i, playerId): Play
setFrameLabel(play, i, label: string): Play
renamePlay(play, name, description?): Play

// history
createHistory<T>(initial: T, cap = 100): History<T>
push / undo / redo (pure)

// session (ui/build/BuildSession.ts)
class BuildSession { play, frameIndex, canUndo, canRedo, subscribe(), selectFrame(i),
  commitGesture(movedIds), apply(op), undo(), redo(), loadPlay(play) }

// FieldCanvas
onGestureEnd?: (info: { movedIds: string[] }) => void

// sharing
encodePlay(play): string            // fragment code
decodePlay(code): Play              // throws PlayValidationError
shareLink(play, origin): string
```

Routes: `/fieldview/build/:playId?`; shared links open at `/fieldview/watch#p=…` (Watch reads the fragment on mount and on `hashchange`).

---

## Implementation Patterns & Conventions

- **Resolve is the only place inheritance lives.** Nothing else walks frames to find a position.
- **Operations never mutate**; tests assert input immutability (frozen inputs).
- **Gesture tracking is per-drag state**, not React state (ADR-2): the drag controller already knows which ids it moved.
- **Frame guard test extended:** one canvas, one driver, content imports no frame, no hex literals, **and** no module outside `play/model.ts` implements frame inheritance (grep for `frames[i - 1]` patterns in a guard).
- **Accessible names:** `Offense n` / `Defense n` names from roster order; titles are visual only.
- **Placeholders:** new toy setups/plays, default names and copy use `PLACEHOLDER(fieldview-build)` markers registered in `docs/fieldview-placeholders.md`; the audit test is extended to the new marker.
- **Deletion discipline:** a file is deleted only after `grep` shows no consumer; tests are deleted only when they exercised deleted code.

---

## Security & Performance

- **Security:** link and file payloads are untrusted → decode with bounded inflate (≤ 64 KB), cap the code length (≤ ~12 KB), run `validatePlay`; titles/labels are text-only (React escapes; SVG `<text>` content); nothing is `dangerouslySetInnerHTML`; the fragment never leaves the browser.
- **Performance:** `resolveAll` is O(frames × 14) and cached per document version; thumbnails render once per document change, not per animation frame; heat computation unchanged (≈ 10 ms); undo snapshots are small immutable values (structural sharing).

---

## Implementation Sequence

1. **P0 clean-up** (delete legacy; regenerate toy content as v3 placeholders).
2. **P1 model/format/mark** (pure library + tests; space-model no-mark; presets lose T/M/1–6).
3. **P2 disc/titles/sizes** (playback v3, disc flight, titles, holder ring, piece scale; Explore card gains title + Give disc).
4. **P3 Build UI** (session, page, indicators, panels, undo/redo, preview).
5. **P4 library/sharing** (store, lists, share dialog, link/QR/file, Watch link handling).
6. **P5 QA/cleanup** (real-device pass, audits, canon notes).
