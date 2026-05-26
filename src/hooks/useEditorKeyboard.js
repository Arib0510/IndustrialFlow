/**
 * useEditorKeyboard.js
 * Keyboard shortcut hook for the SCADA editor.
 *
 * Tool shortcuts (no modifier):
 *   V → Select   H → Pan
 *   R → Rectangle  E → Ellipse  L → Line  P → Polygon
 *   T → Text  I → Image  F → Free Draw
 *   + / =  → Zoom In   -  → Zoom Out   0 → Fit view
 *
 * Edit shortcuts (Ctrl / ⌘):
 *   Z → Undo   Y / Shift+Z → Redo
 *   C → Copy   V → Paste   D → Duplicate   X → Cut
 *   S → Save
 *   G → Group   Shift+G → Ungroup
 *   ] → Bring Forward   Shift+] → Bring to Front
 *   [ → Send Backward   Shift+[ → Send to Back
 *
 * Other:
 *   Delete / Backspace → Delete selected
 *   Escape → Deselect / cancel draw
 *   Enter  → Commit polygon
 */

import { useEffect } from 'react';

export const useEditorKeyboard = ({
  historyRef,
  onCopy,
  onPaste,
  onDuplicate,
  onCut,
  onDelete,
  onEscape,
  onCommitPolygon,
  // Tool mode
  onSelectMode,
  onPanMode,
  onDrawTool,
  // Actions
  onGroup,
  onUngroup,
  onSave,
  onBringToFront,
  onBringForward,
  onSendBackward,
  onSendToBack,
  // Zoom
  onZoomIn,
  onZoomOut,
  onZoomFit,
}) => {
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const ctrl = e.ctrlKey || e.metaKey;

      // ── Ctrl / ⌘ shortcuts ─────────────────────────────────────────────
      if (ctrl) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) historyRef.current?.redo();
            else            historyRef.current?.undo();
            return;
          case 'y':
            e.preventDefault();
            historyRef.current?.redo();
            return;
          case 'c': e.preventDefault(); onCopy?.();      return;
          case 'v': e.preventDefault(); onPaste?.();     return;
          case 'd': e.preventDefault(); onDuplicate?.(); return;
          case 'x': e.preventDefault(); onCut?.();       return;
          case 's': e.preventDefault(); onSave?.();      return;
          case 'g':
            e.preventDefault();
            if (e.shiftKey) onUngroup?.();
            else            onGroup?.();
            return;
          case ']':
            e.preventDefault();
            if (e.shiftKey) onBringToFront?.();
            else            onBringForward?.();
            return;
          case '[':
            e.preventDefault();
            if (e.shiftKey) onSendToBack?.();
            else            onSendBackward?.();
            return;
          default: break;
        }
        return;
      }

      // ── No-modifier shortcuts ──────────────────────────────────────────
      if (!e.altKey) {
        switch (e.key) {
          case 'Delete':
          case 'Backspace': onDelete?.();                         return;
          case 'Escape':    onEscape?.();                         return;
          case 'Enter':     e.preventDefault(); onCommitPolygon?.(); return;
          case 'v': case 'V': onSelectMode?.();                   return;
          case 'h': case 'H': onPanMode?.();                      return;
          case 'r': case 'R': onDrawTool?.('rectangle');          return;
          case 'e': case 'E': onDrawTool?.('ellipse');            return;
          case 'l': case 'L': onDrawTool?.('line');               return;
          case 'p': case 'P': onDrawTool?.('polygon');            return;
          case 't': case 'T': onDrawTool?.('text');               return;
          case 'i': case 'I': onDrawTool?.('image');              return;
          case 'f': case 'F': onDrawTool?.('freeDraw');           return;
          case '+': case '=': onZoomIn?.();                       return;
          case '-': case '_': onZoomOut?.();                      return;
          case '0':           onZoomFit?.();                      return;
          default: break;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    onCopy, onPaste, onDuplicate, onCut, onDelete, onEscape, onCommitPolygon,
    onSelectMode, onPanMode, onDrawTool,
    onGroup, onUngroup, onSave,
    onBringToFront, onBringForward, onSendBackward, onSendToBack,
    onZoomIn, onZoomOut, onZoomFit,
  ]);
};
