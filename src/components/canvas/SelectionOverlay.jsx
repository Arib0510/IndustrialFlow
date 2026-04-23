/**
 * SelectionOverlay.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 6: Rubber-band multi-select overlay.
 * Renders a dashed selection rectangle while the user drags on blank canvas.
 * The parent (EditorPage) drives the props; this component is purely visual.
 */

import React from 'react';

/**
 * @param {{ active: bool, rect: {x,y,w,h} }} props
 *   active - whether the rubber band is currently being drawn
 *   rect   - { x, y, w, h } in canvas-relative pixels (may be negative w/h)
 */
export const SelectionOverlay = ({ active, rect }) => {
  if (!active || !rect) return null;

  const left   = rect.w < 0 ? rect.x + rect.w : rect.x;
  const top    = rect.h < 0 ? rect.y + rect.h : rect.y;
  const width  = Math.abs(rect.w);
  const height = Math.abs(rect.h);

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        border: '1.5px dashed #3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        borderRadius: 2,
        pointerEvents: 'none',
        zIndex: 20,
      }}
    />
  );
};
