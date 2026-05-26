import React, { useState, useRef, useEffect } from 'react';
import {
  MousePointer2, Hand, Square, Circle, Minus, Type, Pentagon, ImagePlus, Pencil,
  Undo2, Redo2, AlignLeft, AlignCenterHorizontal, AlignRight,
  MoreHorizontal, Grid, Magnet, ChevronsUp, ChevronUp, ChevronDown,
  ChevronsDown, Layers, Save, FolderOpen, FileDown,
} from 'lucide-react';

// ── Icon button ────────────────────────────────────────────────────────────────
const Btn = ({ active, onClick, title, disabled, children }) => (
  <button
    onClick={onClick}
    title={title}
    disabled={disabled}
    style={{
      width: 30, height: 30,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 'var(--radius-sm)',
      border: 'none', outline: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      backgroundColor: active ? 'var(--accent-subtle)' : 'transparent',
      color: disabled ? 'var(--text-muted)' : active ? 'var(--accent)' : 'var(--text-secondary)',
      opacity: disabled ? 0.4 : 1,
      transition: 'background-color 0.15s, color 0.15s',
      flexShrink: 0,
    }}
    onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
  >
    {children}
  </button>
);

// ── Separator ──────────────────────────────────────────────────────────────────
const Sep = () => (
  <div style={{ width: 1, height: 14, backgroundColor: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
);

// ── Overflow menu item ─────────────────────────────────────────────────────────
const MenuItem = ({ label, Icon, onClick, active, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 9,
      padding: '6px 10px', borderRadius: 'var(--radius-sm)',
      border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      backgroundColor: active ? 'var(--accent-subtle)' : 'transparent',
      color: disabled ? 'var(--text-muted)' : active ? 'var(--accent)' : 'var(--text-primary)',
      fontSize: 13, fontFamily: 'inherit', textAlign: 'left',
      opacity: disabled ? 0.5 : 1,
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.backgroundColor = active ? 'var(--accent-subtle2)' : 'var(--bg-hover)'; }}
    onMouseLeave={e => { e.currentTarget.style.backgroundColor = active ? 'var(--accent-subtle)' : 'transparent'; }}
  >
    <Icon size={14} strokeWidth={1.5} style={{ flexShrink: 0, color: active ? 'var(--accent)' : 'var(--text-secondary)' }} />
    {label}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────

export const EditorToolbar = ({
  isPanMode, setIsPanMode,
  activeDrawTool, setActiveDrawTool,
  gridVisible, setGridVisible,
  snapEnabled, setSnapEnabled,
  canUndo, canRedo,
  onUndo, onRedo,
  onCopy, onPaste, onDuplicate, onCut,
  onBringToFront, onBringForward, onSendBackward, onSendToBack,
  onGroup, onUngroup,
  saveGraph, loadGraph, exportGraph,
  isSimulating,
  selectedCount,
  selectedCellIds,
}) => {
  const [showOverflow, setShowOverflow] = useState(false);
  const overflowRef = useRef(null);

  useEffect(() => {
    const handler = e => {
      if (overflowRef.current && !overflowRef.current.contains(e.target)) {
        setShowOverflow(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (isSimulating) return null;

  const drawBtn = (tool, Icon, title) => (
    <Btn
      active={activeDrawTool === tool}
      onClick={() => { setActiveDrawTool(activeDrawTool === tool ? null : tool); setIsPanMode(false); }}
      title={title}
    >
      <Icon size={15} strokeWidth={1.5} />
    </Btn>
  );

  const close = fn => () => { fn(); setShowOverflow(false); };

  return (
    /* Centered row */
    <div
      className="flex items-center justify-center shrink-0 theme-transition"
      style={{
        paddingTop: 6,
        paddingBottom: 6,
        position: 'relative',
        backgroundColor: 'var(--bg-main)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Floating pill */}
      <div
        className="flex items-center theme-transition"
        style={{
          gap: 1,
          padding: '3px 8px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-panel)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Select */}
        <Btn
          active={!isPanMode && !activeDrawTool}
          onClick={() => { setIsPanMode(false); setActiveDrawTool(null); }}
          title="Select  [V]"
        >
          <MousePointer2 size={15} strokeWidth={1.5} />
        </Btn>

        {/* Pan */}
        <Btn
          active={isPanMode}
          onClick={() => { setIsPanMode(!isPanMode); setActiveDrawTool(null); }}
          title="Pan  [H]"
        >
          <Hand size={15} strokeWidth={1.5} />
        </Btn>

        <Sep />

        {/* Draw tools */}
        {drawBtn('rectangle', Square,   'Rectangle  [R]')}
        {drawBtn('ellipse',   Circle,   'Ellipse  [E]'  )}
        {drawBtn('line',      Minus,    'Line  [L]'     )}
        {drawBtn('polygon',   Pentagon, 'Polygon  [P]'  )}
        {drawBtn('text',      Type,     'Text  [T]'     )}
        {drawBtn('image',     ImagePlus,'Image  [I]'    )}
        {drawBtn('freeDraw',  Pencil,   'Free Draw — auto-recognizes shapes  [F]')}

        <Sep />

        {/* Undo / Redo */}
        <Btn active={false} disabled={!canUndo} onClick={onUndo} title="Undo  [Ctrl+Z]">
          <Undo2 size={15} strokeWidth={1.5} />
        </Btn>
        <Btn active={false} disabled={!canRedo} onClick={onRedo} title="Redo  [Ctrl+Shift+Z]">
          <Redo2 size={15} strokeWidth={1.5} />
        </Btn>

        {/* Alignment — only when multiple selected */}
        {selectedCount > 1 && (
          <>
            <Sep />
            <Btn active={false} onClick={() => {}} title="Align left edges">
              <AlignLeft size={15} strokeWidth={1.5} />
            </Btn>
            <Btn active={false} onClick={() => {}} title="Align centers horizontally">
              <AlignCenterHorizontal size={15} strokeWidth={1.5} />
            </Btn>
            <Btn active={false} onClick={() => {}} title="Align right edges">
              <AlignRight size={15} strokeWidth={1.5} />
            </Btn>
          </>
        )}

        <Sep />

        {/* Overflow ⋯ */}
        <div style={{ position: 'relative' }} ref={overflowRef}>
          <Btn active={showOverflow} onClick={() => setShowOverflow(o => !o)} title="More options">
            <MoreHorizontal size={15} strokeWidth={1.5} />
          </Btn>

          {showOverflow && (
            <div
              className="theme-transition"
              style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                width: 200,
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                padding: 4,
                zIndex: 200,
              }}
            >
              <MenuItem label="Toggle grid"    Icon={Grid}        onClick={close(() => setGridVisible(!gridVisible))}   active={gridVisible} />
              <MenuItem label="Snap to grid"   Icon={Magnet}      onClick={close(() => setSnapEnabled(!snapEnabled))}   active={snapEnabled} />

              <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '4px 0' }} />

              <MenuItem label="Bring to front  Ctrl+Shift+]" Icon={ChevronsUp}   onClick={close(onBringToFront)} />
              <MenuItem label="Bring forward   Ctrl+]"       Icon={ChevronUp}    onClick={close(onBringForward)} />
              <MenuItem label="Send backward   Ctrl+["       Icon={ChevronDown}  onClick={close(onSendBackward)} />
              <MenuItem label="Send to back    Ctrl+Shift+[" Icon={ChevronsDown} onClick={close(onSendToBack)} />

              <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '4px 0' }} />

              <MenuItem label="Group    Ctrl+G"         Icon={Layers} onClick={close(onGroup)}   disabled={!selectedCellIds?.length || selectedCellIds.length < 2} />
              <MenuItem label="Ungroup  Ctrl+Shift+G"   Icon={Layers} onClick={close(onUngroup)} disabled={selectedCount === 0} />

              <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '4px 0' }} />

              <MenuItem label="Save layout  Ctrl+S" Icon={Save}       onClick={close(saveGraph)}   />
              <MenuItem label="Load layout"          Icon={FolderOpen} onClick={close(loadGraph)}   />
              <MenuItem label="Export JSON"          Icon={FileDown}   onClick={close(exportGraph)} />
            </div>
          )}
        </div>
      </div>

      {/* Selection count — absolute right */}
      {selectedCount > 0 && (
        <div style={{ position: 'absolute', right: 16, fontSize: 11, color: 'var(--text-muted)' }}>
          {selectedCount} selected
        </div>
      )}
    </div>
  );
};
