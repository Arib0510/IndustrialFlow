/**
 * historyUtils.js
 * ─────────────────────────────────────────────────────────────────────────────
 * JointJS graph undo / redo manager.
 * Snapshots the full graph JSON after every add / remove / change event and
 * restores it on undo/redo.  Uses a simple cursor-based stack model.
 */

const MAX_HISTORY_STEPS = 60;

export class HistoryManager {
  /**
   * @param {joint.dia.Graph} graph  The JointJS graph to track.
   */
  constructor(graph) {
    this._graph   = graph;
    this._stack   = [];
    this._cursor  = -1;
    this._paused  = false;  // prevent re-entrant recording during restore

    // Take an initial snapshot of whatever is already on the canvas
    this._push(graph.toJSON());

    // Listen for every structural or attribute change
    graph.on(
      'add remove change:position change:size change:angle change:attrs change:data change:source change:target',
      this._onGraphChange
    );
  }

  _onGraphChange = () => {
    if (this._paused) return;
    this._push(this._graph.toJSON());
  };

  _push(snapshot) {
    // Discard any redo steps ahead of current cursor
    this._stack = this._stack.slice(0, this._cursor + 1);
    this._stack.push(snapshot);
    // Enforce maximum steps
    if (this._stack.length > MAX_HISTORY_STEPS) {
      this._stack.shift();
    } else {
      this._cursor++;
    }
  }

  /** Undo the last action. Returns true if successful. */
  undo() {
    if (!this.canUndo()) return false;
    this._cursor--;
    this._restore(this._stack[this._cursor]);
    return true;
  }

  /** Redo the previously undone action. Returns true if successful. */
  redo() {
    if (!this.canRedo()) return false;
    this._cursor++;
    this._restore(this._stack[this._cursor]);
    return true;
  }

  /** Restore graph from a JSON snapshot silently (no new history entry). */
  _restore(snapshot) {
    this._paused = true;
    try {
      this._graph.fromJSON(snapshot);
    } finally {
      this._paused = false;
    }
  }

  canUndo() { return this._cursor > 0; }
  canRedo() { return this._cursor < this._stack.length - 1; }

  /** Clean up event listeners when the component unmounts. */
  destroy() {
    this._graph.off(
      'add remove change:position change:size change:angle change:attrs change:data change:source change:target',
      this._onGraphChange
    );
  }
}
