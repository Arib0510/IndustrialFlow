/**
 * EditorToolbar.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 1 + 4 + 5 + 6: Full toolbar.
 *
 * New additions vs original:
 *   • Undo / Redo wired up (Phase 5)
 *   • Cut / Copy / Paste / Duplicate wired up (Phase 6)
 *   • Text Label, Polygon, Image draw tools (Phase 1)
 *   • Z-Order buttons: Bring to Front / Forward / Backward / Back (Phase 4)
 *   • 3-way sidebar tab bar: Explorer | Nodes | Layers (Phase 4)
 *   • Multi-select visual feedback (italic count label when >1 selected)
 */

import React from 'react';
import {
  Grid, Magnet, Undo2, Redo2, Scissors,
  Copy, ClipboardPaste, Save, FolderOpen, FileDown,
  Square, Circle, Minus, Hand, Type, Pentagon,
  ImagePlus, ChevronsUp, ChevronUp, ChevronDown, ChevronsDown,
  Layers, Trash2, Pencil,
} from 'lucide-react';
import { ScadaIcons } from '../utils/iconUtils.jsx';

export const EditorToolbar = ({
  // Tab state
  activeTab, setActiveTab,
  // Interaction modes
  isPanMode, setIsPanMode,
  activeDrawTool, setActiveDrawTool,
  // Grid
  gridVisible, setGridVisible,
  snapEnabled, setSnapEnabled,
  // History (Phase 5)
  canUndo, canRedo,
  onUndo, onRedo,
  // Clipboard (Phase 6)
  onCopy, onPaste, onDuplicate, onCut,
  // Z-Order (Phase 4)
  onBringToFront, onBringForward, onSendBackward, onSendToBack,
  // Grouping (Phase 3 ext.)
  onGroup, onUngroup,
  // File ops
  saveGraph, loadGraph, exportGraph, resetCanvas,
  // Simulation
  isSimulating,
  // Selection info
  selectedCount,
  selectedCellIds,
}) => {
  // ── Style helpers ────────────────────────────────────────────────────────
  const btn = (active, accentColor = 'var(--accent)', disabled = false) => ({
    padding: '5px 7px',
    borderRadius: 7,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 700, letterSpacing: 1,
    backgroundColor: active ? `rgba(59,130,246,0.15)` : 'transparent',
    color: disabled ? 'var(--text-muted)' : active ? accentColor : 'var(--text-secondary)',
    border: 'none', outline: 'none',
    transition: 'all 0.15s',
    opacity: disabled ? 0.4 : 1,
  });

  const Sep = () => <div className="w-px h-5 mx-0.5 shrink-0" style={{ backgroundColor: 'var(--border)' }} />;

  const drawBtn = (tool, Icon, title) => (
    <button
      style={btn(activeDrawTool === tool, '#8B5CF6')}
      title={title}
      onClick={() => { setActiveDrawTool(activeDrawTool === tool ? null : tool); setIsPanMode(false); }}
    >
      <Icon size={14} />
    </button>
  );

  return (
    <div className="flex shrink-0 theme-transition" style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border)' }}>

      {/* ── Sidebar Tabs (hidden during simulation) ─────────────────────── */}
      {!isSimulating && (
        <div className="flex shrink-0" style={{ width: 320, borderRight: '1px solid var(--border)' }}>
          {[
            { id: 'explorer', icon: ScadaIcons.DatabaseTag, label: 'Explorer' },
            { id: 'nodes',    icon: ScadaIcons.LayersHMI,  label: 'Nodes'    },
            { id: 'layers',   icon: ({ size, color }) => <Layers size={size} color={color} />, label: 'Layers' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold uppercase tracking-widest transition-colors"
              style={
                activeTab === id
                  ? { backgroundColor: 'var(--bg-panel)', color: 'var(--accent)', borderBottom: '2px solid var(--accent)' }
                  : { color: 'var(--text-secondary)', borderBottom: '2px solid transparent' }
              }
            >
              <Icon size={14} color="currentColor" /> {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Main Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center gap-0.5 px-2 py-1.5 overflow-x-auto">

        {/* Title */}
        <span className="text-sm font-bold mr-3 shrink-0" style={{ color: 'var(--accent)' }}>
          Plant Layout
        </span>

        {/* Undo / Redo */}
        <button style={btn(false, 'var(--accent)', !canUndo)} onClick={onUndo} title="Undo (Ctrl+Z)" disabled={!canUndo}>
          <Undo2 size={14} />
        </button>
        <button style={btn(false, 'var(--accent)', !canRedo)} onClick={onRedo} title="Redo (Ctrl+Y)" disabled={!canRedo}>
          <Redo2 size={14} />
        </button>
        <Sep />

        {/* Clipboard */}
        <button style={btn(false)} onClick={onCut}       title="Cut (Ctrl+X)">      <Scissors      size={14} /></button>
        <button style={btn(false)} onClick={onCopy}      title="Copy (Ctrl+C)">     <Copy          size={14} /></button>
        <button style={btn(false)} onClick={onPaste}     title="Paste (Ctrl+V)">    <ClipboardPaste size={14} /></button>
        <button style={btn(false)} onClick={onDuplicate} title="Duplicate (Ctrl+D)">
          <Copy size={14} /> <span style={{ fontSize: 9 }}>D</span>
        </button>
        <Sep />

        {/* Pan mode */}
        <button style={btn(isPanMode, '#22C55E')} onClick={() => { setIsPanMode(!isPanMode); setActiveDrawTool(null); }} title="Pan (Space+drag)">
          <Hand size={14} />
        </button>
        <Sep />

        {/* Drawing tools */}
        {drawBtn('rectangle', Square,   'Draw Rectangle'  )}
        {drawBtn('ellipse',   Circle,   'Draw Ellipse'    )}
        {drawBtn('line',      Minus,    'Draw Line / Pipe')}
        {drawBtn('polygon',   Pentagon, 'Draw Polygon (click vertices, dbl-click/Enter/right-click to close)')}
        {drawBtn('text',      Type,     'Text Label'      )}
        {drawBtn('image',     ImagePlus,'Insert Image'    )}
        {drawBtn('freeDraw',  Pencil,   'Free Draw (Pencil)'  )}
        <Sep />

        {/* Z-Order */}
        <button style={btn(false)} onClick={onBringToFront} title="Bring to Front"><ChevronsUp   size={14} /></button>
        <button style={btn(false)} onClick={onBringForward} title="Bring Forward"> <ChevronUp    size={14} /></button>
        <button style={btn(false)} onClick={onSendBackward} title="Send Backward"> <ChevronDown  size={14} /></button>
        <button style={btn(false)} onClick={onSendToBack}   title="Send to Back">  <ChevronsDown size={14} /></button>
        <Sep />

        {/* Fix 3: Group / Ungroup — visible when multi-select active */}
        <button
          style={btn(false, '#8B5CF6', !selectedCellIds?.length || selectedCellIds.length < 2)}
          onClick={onGroup}
          title={`Group selected (${selectedCellIds?.length ?? 0} items) — rubber-band select 2+ items first`}
          disabled={!selectedCellIds?.length || selectedCellIds.length < 2}
        >
          <Layers size={14} />
          <span style={{ fontSize: 10, fontWeight: 700 }}>Group</span>
        </button>
        <button
          style={btn(false, '#06B6D4', selectedCount === 0)}
          onClick={onUngroup}
          title="Ungroup selected group"
          disabled={selectedCount === 0}
        >
          <Layers size={14} />
          <span style={{ fontSize: 10, fontWeight: 700 }}>Ungroup</span>
        </button>
        <Sep />

        {/* Grid / Snap */}
        <button style={btn(gridVisible)}             onClick={() => setGridVisible(!gridVisible)}   title="Toggle Grid">  <Grid   size={14} /></button>
        <button style={btn(snapEnabled, '#F59E0B')}  onClick={() => setSnapEnabled(!snapEnabled)}   title="Snap to Grid"> <Magnet size={14} /></button>
        <Sep />

        {/* Persist */}
        <button style={btn(false)} onClick={saveGraph}   title="Save Layout"  className="flex gap-1 items-center">
          <Save     size={13} /><span style={{ fontSize: 10, color: 'var(--status-ok)', fontWeight: 700 }}>Save</span>
        </button>
        <button style={btn(false)} onClick={loadGraph}   title="Load Layout"  className="flex gap-1 items-center">
          <FolderOpen size={13} /><span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>Load</span>
        </button>
        <button style={btn(false)} onClick={exportGraph} title="Export JSON"  className="flex gap-1 items-center">
          <FileDown size={13} /><span style={{ fontSize: 10, color: '#06B6D4', fontWeight: 700 }}>Export</span>
        </button>

        {/* Delete shortcut when something is selected */}
        {selectedCount > 0 && (
          <>
            <Sep />
            <span className="text-[10px] italic mx-1 shrink-0" style={{ color: 'var(--text-muted)' }}>
              {selectedCount} selected
            </span>
          </>
        )}
      </div>
    </div>
  );
};
