// Build's document session (fieldview-build ADR-40): the Play document, its
// undo history, and which frame is showing. The SceneStore is only a VIEW of the
// current frame — the session loads `toScene(play, frame)` into it whenever the
// frame or the document changes, and reads positions back out of it once, at the
// end of a gesture (a drag, a group drag, a nudge burst), as ONE placement and
// ONE undo step. React sees structural state only, through getState()/subscribe();
// nothing here runs per pointer move (canon ADR-2).

import type { SceneStore } from "../../scene/store";
import type { Scene, Vec2 } from "../../scene/types";
import type { Play } from "../../play/format";
import { placePlayers, toScene } from "../../play/model";
import { canRedo, canUndo, createHistory, push, redo, undo } from "../../play/history";
import type { History } from "../../play/history";

// "new" = a play nobody has edited yet (nothing to save).
export type SaveStatus = "new" | "saved" | "saving" | "unsaved" | "error";

export interface BuildState {
  play: Play;
  frameIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  save: SaveStatus;
  // Bumped on every committed change to the document, so memoised views
  // (thumbnails) have a cheap key.
  version: number;
}

export interface BuildSessionOptions {
  // Puts a scene into the store AND refreshes the piece identity list (the app's
  // loadScene). Called on every frame/document change — all discrete events.
  loadScene: (scene: Scene) => void;
  // The save state to start in ("new" for a play nobody has edited yet).
  initialSave?: SaveStatus;
}

export class BuildSession {
  private history: History<Play>;
  private frameIndex = 0;
  private save: SaveStatus;
  private version = 0;
  private state: BuildState;
  private readonly listeners = new Set<() => void>();
  private readonly docListeners = new Set<(play: Play) => void>();

  constructor(
    private readonly store: SceneStore,
    private readonly options: BuildSessionOptions,
    initial: Play,
  ) {
    this.history = createHistory(initial);
    this.save = options.initialSave ?? "saved";
    this.state = this.snapshot();
    // Not synced here: constructing happens during a React render, and loading
    // a scene updates app state. The owner calls resync() once mounted.
  }

  // ── reading ───────────────────────────────────────────────────────────────

  getState = (): BuildState => this.state;

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  // Called with the new document after every committed change (P4's autosave).
  subscribeDocument(cb: (play: Play) => void): () => void {
    this.docListeners.add(cb);
    return () => this.docListeners.delete(cb);
  }

  get play(): Play {
    return this.history.present;
  }

  // ── navigation ────────────────────────────────────────────────────────────

  selectFrame(i: number): void {
    const next = Math.max(0, Math.min(this.play.frames.length - 1, Math.round(i)));
    if (next === this.frameIndex) return;
    this.frameIndex = next;
    this.syncStore();
    this.emit();
  }

  // Re-shows the current frame (after a preview moved the pieces around).
  resync(): void {
    this.syncStore();
  }

  // ── editing ───────────────────────────────────────────────────────────────

  // The end of a gesture: read where those players ended up and place them.
  commitGesture(movedIds: readonly string[]): void {
    if (movedIds.length === 0) return;
    const positions: Record<string, Vec2> = {};
    for (const p of this.store.getScene().players) {
      if (movedIds.includes(p.id)) positions[p.id] = { x: p.pos.x, y: p.pos.y };
    }
    this.apply((play, i) => placePlayers(play, i, positions), { sync: false });
  }

  // Any pure operation on the document, as one undo step. `sync: false` is for
  // gestures whose result is already on the field.
  apply(op: (play: Play, frameIndex: number) => Play, options: { sync?: boolean } = {}): void {
    const before = this.history.present;
    const next = op(before, this.frameIndex);
    if (next === before) return;
    this.history = push(this.history, next);
    this.afterDocumentChange(options.sync !== false);
  }

  undo(): void {
    if (!canUndo(this.history)) return;
    this.history = undo(this.history);
    this.afterDocumentChange(true);
  }

  redo(): void {
    if (!canRedo(this.history)) return;
    this.history = redo(this.history);
    this.afterDocumentChange(true);
  }

  // Opens a different play: a fresh history and the first frame.
  loadPlay(play: Play): void {
    this.history = createHistory(play);
    this.frameIndex = 0;
    this.save = "saved";
    this.version += 1;
    this.syncStore();
    this.emit();
  }

  setSaveStatus(status: SaveStatus): void {
    if (this.save === status) return;
    this.save = status;
    this.emit();
  }

  // ── internals ─────────────────────────────────────────────────────────────

  private afterDocumentChange(sync: boolean): void {
    this.version += 1;
    // An undo or a delete can leave the frame index past the end.
    this.frameIndex = Math.min(this.frameIndex, this.play.frames.length - 1);
    this.save = "unsaved";
    if (sync) this.syncStore();
    this.emit();
    for (const cb of this.docListeners) cb(this.play);
  }

  private syncStore(): void {
    this.options.loadScene(toScene(this.play, this.frameIndex));
  }

  private snapshot(): BuildState {
    return {
      play: this.history.present,
      frameIndex: this.frameIndex,
      canUndo: canUndo(this.history),
      canRedo: canRedo(this.history),
      save: this.save,
      version: this.version,
    };
  }

  private emit(): void {
    this.state = this.snapshot();
    for (const cb of this.listeners) cb();
  }
}
