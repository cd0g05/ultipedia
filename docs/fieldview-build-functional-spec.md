# Field View — Build (play designer): functional spec

Draft 2026-10-05. **Function before design**: this fixes what Build does and what the data looks like.
The UI design (mockups) comes next; this document is also the source for the Cicadas PRD/tech-design when
Build is kicked off. Decisions are the Builder's (see `docs/fieldview-backlog.md` → Decided); anything not
decided is in §9.

## 1. Principles

1. A **play is a list of frames**; a **frame is a still state of the field**. Presets (setups) are just
   one-frame plays — one saved list, one format.
2. **Build is Explore with frame controls.** The user drags players, sets who holds the disc and names
   players. All animation is automatic.
3. **Plays are single paths**, straight-line moves, **always 14 players, no turnovers**.
4. **Everyone starts and arrives together** in a transition (fixed time, v1).
5. **The mark is geometry**, not a stored assignment (§4).
6. **Defense is placed by hand**, exactly like offense.

## 2. The document

```
Play
  name, description?
  players[14]: { id, team: "offense"|"defense", title?: string(≤2) }     // identity, constant across frames
  frames[1..N]: Frame

Frame
  label?: string                      // short name, doubles as the caption later
  moved:  { [playerId]: {x,y} }       // ONLY the players placed in this frame (explicit positions)
  holder?: playerId                   // set when "Give disc" was used in this frame; absent = inherit
```

**Resolution** (pure function, `resolve(play, i)` → a full scene for frame *i*):

- Frame 0 must place all 14 players and name a holder. (Fully explicit.)
- For frame *i* > 0: each player's position is `moved[id]` if present, otherwise **their resolved position in
  frame *i−1***. The holder is `holder` if present, otherwise inherited the same way.
- Everything else — roles, the mark, the force reading — is derived from the resolved scene (§4).

Consequences, all intended:

- Editing an earlier frame moves everyone who inherits from it, up to the frame where they were placed.
- A new frame starts empty (`moved = {}`), i.e. identical to the previous frame.
- **Duplicate frame** = insert an empty frame after it. **Delete frame** = remove it; later frames now inherit
  from what is before them (its changes disappear from everything after). **Reset frame** = clear `moved` and
  `holder`. **Reset player** = remove that player's `moved` entry. (Reorder: out of v1.)
- Dragging a player in frame *i* writes `moved[id]` (even if dropped back on the same spot — "placed" is a
  user action, not a comparison).
- Titles are identity (play level), so they never change with frames or throws.

### Format v3 (clean break)

`formatVersion: 3`. The validator accepts v3 only; the v1/v2 readers, `backfill.ts` and the v2 migration
tests are removed (the Builder confirmed nothing older is relevant). Validation at the boundary as today:
unknown keys dropped, ranges clamped, ≤ N frames (suggest 30), title ≤ 2 chars, frame 0 complete, holder is an
offensive player. `matchups`, `role` and per-entity thrower/mark are **not** stored. The live `Scene` keeps
`matchups` only because the (deferred) motion engine reads it; it is rebuilt with `autoAssign` at load.

## 3. Transitions (playback)

- Between frame *i* and *i+1*, every piece moves in a **straight line** from its resolved position in *i* to
  its resolved position in *i+1* over one fixed `TRANSITION_SECONDS` (existing placeholder, 1.2 s); all start
  and finish together.
- **Disc:** if the holder changes, the disc flies a straight line from the old holder's start position to the
  **new holder's end position** over the same time, so it lands exactly as the receiver arrives. Possession
  flips at the end (the existing rule: the old holder keeps it for the whole flight). If the holder does not
  change, the disc rides with them.
- Same engine in Watch and in Build's preview (`ui/playback`), extended with partial-frame resolution and the
  disc flight (reusing `motion/disc.ts` and the airborne-disc drawing already in `pieceLayer`).
- Future (backlog): distance-derived durations, easing, physically plausible paths.

## 4. The mark

- `MARK_RADIUS_YD = 10/3` (10 ft), a single constant in `space/constants.ts`.
- **Mark = the defender closest to the disc holder, if within `MARK_RADIUS_YD`** (centre to centre; ties break on
  id). **None within range → no mark.** All other defenders are standard defenders.
- Applies to the whole scene model (Explore, Watch, Build alike) and replaces matchup-driven marks
  (`scene/possession.ts` `markFor`; `normalize()` stays the only writer of `Player.role`, ADR-17).
- **Space model change (small, necessary):** `space/layers.ts` / `space/score.ts` currently
  `requireRole(scene, "mark")` and throw without one. With no mark the mark-force layer contributes 1 (no
  force); coverage/lanes/value are unchanged. Behaviour is identical whenever a mark exists.
- No holder (never in a valid play) leaves the grid blank rather than throwing.
- Visual: the mark keeps its heavy ring; optional faint 10 ft circle around the holder while dragging (§9).
- Known property: the mark's effect switches on/off at the boundary, so the heat visibly changes there.

## 5. Players and the disc

- **Unnamed by default.** Selecting a player offers a **title (≤ 2 chars)**, drawn inside the piece (fits at the
  current size). Titles are uppercased and trimmed; duplicates are fine (ids are identity).
- **Give disc:** select an offensive player → "Give disc" sets `holder` for this frame. Disabled for defenders.
- **Holder look:** disc icon (as today) plus a coloured border — green for now (one token; selection stays pink).
- Accessible names must not depend on titles (unnamed players): use a stable "Offense 3" / "Defense 5" fallback.
- The same "Give disc" and title controls are useful in Explore (no frames), via the selected-player panel.

## 6. Editing surface (what Build must offer)

| Area | Behaviour |
|---|---|
| Frame list | thumbnails (reuse the filmstrip); select, add (empty), duplicate, delete; label each frame |
| Canvas | drag (single and marquee group), selection, keyboard nudge — Explore's engine, writes `moved` |
| Change indicators | **faint ghost** of each moved player's inherited position + an arrow to the new one (reuse the trails layer); a small marker on players placed in this frame |
| Selected-player panel | title, Give disc, Reset player, "placed in this frame" status |
| Frame actions | Reset frame; (later) apply-to-following |
| Preview | play from the selected frame / whole play; the same transitions as Watch |
| Undo / redo | snapshots of the play document, one step per completed gesture (drag, give disc, rename, add/delete/reset); capped (~100) |
| Library | one list: new / open / duplicate / delete / rename; save as you go to this device |
| Share | link (deflate + base64url in the URL fragment), QR code, file export/import |

## 7. Persistence and sharing

- `PlayStore` interface already exists (ADR-8): add `LocalPlayStore` (localStorage) beside `FilePlayStore`.
- **Link sharing:** the play is encoded in the link, so a coach on a laptop can open it on a phone with no
  accounts. A link is a snapshot (it cannot be updated after sending); opening one offers "Save to my plays".
  Size is small: 14 players × frames × two coordinates (plus partial frames shrink it further) ≈ a few KB.
- QR code for the huddle; file export as the backup path.
- Later: accounts/saved library across devices (not in scope).

## 8. Work this implies (rough partitions, for the eventual Cicadas plan)

0. **Clear the decks:** delete the dormant old shell, `Whiteboard.tsx`, `PresetMenu`, the old `Designer` +
   `Timeline` + `OverlayRail`, v1/v2 format code and its tests; regenerate the toy plays as v3.
1. **Model + format (pure):** `Play`/`Frame` types, `resolve()`, v3 validator, frame operations (add, duplicate,
   delete, reset), undo history; `MARK_RADIUS_YD`, new `markFor`, space model "no mark"; exhaustive unit tests.
2. **Disc and titles in Explore/Watch:** per-frame holder in playback with disc flight; title and Give disc in
   the selected-player panel; new piece rendering (titles inside, holder ring, unnamed default); presets
   re-expressed as one-frame plays with no T/M/1–6 labels; accessible-name fallback.
3. **Build UI** (after UI design): frame list, canvas with change indicators, panels, preview.
4. **Persistence + sharing:** local library, link + QR, file import/export.

## 9. Still open (small)

- Max frames (suggest 30) and which characters a title may contain (suggest any letter/digit/symbol, 2 max).
- Ship the faint 10 ft circle around the holder (teaches the mark rule) — default off or on while dragging?
- Frame reordering — assumed out of v1.
- Whether a frame label doubles as the on-screen caption in Watch (assumed yes).
