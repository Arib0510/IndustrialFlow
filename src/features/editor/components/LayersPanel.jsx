/**
 * LayersPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 4: Layer management panel (shown in the Layers tab of the sidebar).
 *
 * Features:
 *   • List all cells in the current graph (newest on top)
 *   • Click a row to select that cell
 *   • Eye icon  → toggle visibility
 *   • Lock icon → toggle interaction lock
 *   • Bring to Front / Send to Back via drag-reorder (simplified: up/down arrows)
 *   • Z-order up / down arrows per row
 */

import React from 'react';
import {
  Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown,
  Square, Circle, Minus, Type, Image, Hexagon,
} from 'lucide-react';

// Returns a short label for a cell
const getCellLabel = (data, cellType, isLink) => {
  if (isLink)  return data.name || 'Connection';
  if (!data)   return 'Shape';
  if (data.name) return data.name;
  const typeMap = {
    drawn_shape: 'Shape',
    drawn_text:  'Text Label',
    drawn_image: 'Image',
    tank_level:  'Tank', motor_status: 'Pump', valve_control: 'Valve',
    breaker_symbol: 'Breaker', ground_symbol: 'Ground',
    tagNode: 'Tag Display',
  };
  return typeMap[data.category] || data.category || 'Element';
};

// Returns an icon component for the cell type
const getCellIcon = (data, isLink) => {
  if (isLink) return Minus;
  const cat = data?.category || '';
  if (cat === 'drawn_text')  return Type;
  if (cat === 'drawn_image') return Image;
  if (cat === 'drawn_shape') return Square;
  if (cat.includes('ellipse')) return Circle;
  return Hexagon;
};

export const LayersPanel = ({
  graph,
  cellData,         // the synced cell data array from EditorPage
  selectedCellId,
  onSelectCell,
}) => {
  if (!graph) return null;

  // Reverse so newest elements appear at the top (Ignition convention)
  const cells = [...cellData].reverse();

  const toggleVisibility = (e, id) => {
    e.stopPropagation();
    const cell = graph.getCell(id);
    if (!cell) return;
    const data = cell.get('data') || {};
    const hidden = data._hidden;
    if (hidden) {
      cell.attr('root/display', '');
      cell.set('data', { ...data, _hidden: false });
    } else {
      cell.attr('root/display', 'none');
      cell.set('data', { ...data, _hidden: true });
    }
  };

  const toggleLock = (e, id) => {
    e.stopPropagation();
    const cell = graph.getCell(id);
    if (!cell) return;
    const data = cell.get('data') || {};
    cell.set('data', { ...data, locked: !data.locked });
  };

  const moveUp = (e, id) => {
    e.stopPropagation();
    graph.getCell(id)?.toFront();
  };

  const moveDown = (e, id) => {
    e.stopPropagation();
    graph.getCell(id)?.toBack();
  };

  if (cells.length === 0) {
    return (
      <div className="p-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
        No elements on canvas yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {cells.map((c, idx) => {
        const isSelected = c.id === selectedCellId;
        const data = c;
        const hidden = data._hidden;
        const locked = data.locked;
        const CellIcon = getCellIcon(data, c.isLink);
        const label = getCellLabel(data, c.customType, c.isLink);

        return (
          <div
            key={c.id}
            onClick={() => onSelectCell(c.id)}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
            style={{
              backgroundColor: isSelected ? 'rgba(59,130,246,0.12)' : 'transparent',
              borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
              borderBottom: '1px solid var(--border)',
            }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {/* Type icon */}
            <CellIcon size={13} style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />

            {/* Label */}
            <span className="flex-1 min-w-0 text-[11px] truncate"
              style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)', fontWeight: isSelected ? 700 : 400 }}>
              {label}
            </span>

            {/* Action icons */}
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={e => moveUp(e, c.id)} title="Bring Forward"
                className="p-0.5 rounded opacity-50 hover:opacity-100 transition-opacity">
                <ChevronUp size={11} style={{ color: 'var(--text-secondary)' }} />
              </button>
              <button onClick={e => moveDown(e, c.id)} title="Send Backward"
                className="p-0.5 rounded opacity-50 hover:opacity-100 transition-opacity">
                <ChevronDown size={11} style={{ color: 'var(--text-secondary)' }} />
              </button>
              <button onClick={e => toggleVisibility(e, c.id)} title={hidden ? 'Show' : 'Hide'}
                className="p-0.5 rounded opacity-50 hover:opacity-100 transition-opacity">
                {hidden
                  ? <EyeOff size={11} style={{ color: '#EF4444' }} />
                  : <Eye    size={11} style={{ color: 'var(--text-secondary)' }} />}
              </button>
              <button onClick={e => toggleLock(e, c.id)} title={locked ? 'Unlock' : 'Lock'}
                className="p-0.5 rounded opacity-50 hover:opacity-100 transition-opacity">
                {locked
                  ? <Lock   size={11} style={{ color: '#F59E0B' }} />
                  : <Unlock size={11} style={{ color: 'var(--text-secondary)' }} />}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
