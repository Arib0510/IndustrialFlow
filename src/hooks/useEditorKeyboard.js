/**
 * useEditorKeyboard.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 5 & 6: Keyboard shortcut hook for the SCADA editor.
 *
 * Handles:
 *   Ctrl+Z          → Undo
 *   Ctrl+Y / Ctrl+Shift+Z → Redo
 *   Ctrl+C          → Copy selection
 *   Ctrl+V          → Paste clipboard
 *   Ctrl+D          → Duplicate selection
 *   Delete/Backspace→ Delete selected cell(s)
 *   Escape          → Deselect / cancel draw tool
 */

import { useEffect } from 'react';

/**
 * @param {object} options
 * @param {React.RefObject} options.historyRef     HistoryManager instance ref
 * @param {Function}        options.onUndo
 * @param {Function}        options.onRedo
 * @param {Function}        options.onCopy
 * @param {Function}        options.onPaste
 * @param {Function}        options.onDuplicate
 * @param {Function}        options.onDelete
 * @param {Function}        options.onEscape
 */
export const useEditorKeyboard = ({
  historyRef,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
  onEscape,
  onCommitPolygon,
}) => {
  useEffect(() => {
    const handler = (e) => {
      // Don't fire when user is typing inside an input/textarea
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        historyRef.current?.undo();
        return;
      }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        historyRef.current?.redo();
        return;
      }
      if (ctrl && e.key === 'c') { e.preventDefault(); onCopy?.(); return; }
      if (ctrl && e.key === 'v') { e.preventDefault(); onPaste?.(); return; }
      if (ctrl && e.key === 'd') { e.preventDefault(); onDuplicate?.(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { onDelete?.(); return; }
      if (e.key === 'Escape') { onEscape?.(); return; }
      if (e.key === 'Enter') { e.preventDefault(); onCommitPolygon?.(); return; }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCopy, onPaste, onDuplicate, onDelete, onEscape, onCommitPolygon]);
};
