import React, { useState, useContext } from 'react';
import {
  ChevronDown, ChevronRight, Plus, Wrench, Layers, Search, X,
  PanelLeftClose, PanelLeftOpen, Database,
} from 'lucide-react';
import { ICON_MAP } from '../../../constants/config';
import { LayersPanel } from './LayersPanel';
import { SCADAContext } from '../../../context/SCADAContext';

// Tabs — id must match EditorPage's activeTab state values
const TABS = [
  { id: 'nodes',    label: 'Components' },
  { id: 'explorer', label: 'Explorer'   },
  { id: 'layers',   label: 'Layers'     },
];

// Compact type chip
const TypeChip = ({ type }) => {
  const label = type === 'number' ? 'NUM' : type === 'boolean' ? 'BOOL' : 'STR';
  const color = type === 'number' ? '#3B82F6' : type === 'boolean' ? '#8B5CF6' : '#10B981';
  return (
    <span style={{
      fontSize: 8,
      fontFamily: 'JetBrains Mono, Geist Mono, monospace',
      fontWeight: 700,
      letterSpacing: '0.04em',
      padding: '1px 4px',
      borderRadius: 3,
      backgroundColor: color + '18',
      color,
      flexShrink: 0,
    }}>
      {label}
    </span>
  );
};

// ── Drag ghost helper ─────────────────────────────────────────────────────────
// Creates a small pill label that replaces the browser's default drag image
// (which would otherwise show the full DOM element as a "stock" screenshot).
const makeDragGhost = (label) => {
  const el = document.createElement('div');
  el.textContent = label;
  el.style.cssText = [
    'position:fixed', 'top:-9999px', 'left:-9999px',
    'padding:3px 10px',
    'background:#2563EB', 'color:#fff',
    'border-radius:4px',
    'font-size:11px', 'font-weight:600',
    'font-family:Inter,system-ui,sans-serif',
    'white-space:nowrap', 'pointer-events:none',
    'box-shadow:0 2px 8px rgba(0,0,0,0.25)',
  ].join(';');
  document.body.appendChild(el);
  return el;
};

// ─────────────────────────────────────────────────────────────────────────────

export const EditorSidebar = ({
  activeTab, setActiveTab,
  isSimulating,
  devices,
  collapsedCategories, setCollapsedCategories,
  setShowAddDevice,
  setShowBuildModal,
  toolbox,
  graph,
  cellData,
  selectedCellId,
  onSelectCell,
}) => {
  const { tags } = useContext(SCADAContext);
  const [collapsed, setCollapsed]           = useState(false);
  const [search, setSearch]                 = useState('');
  const [collapsedDevices, setCollapsedDevices] = useState({});

  if (isSimulating) return null;

  const searchLower = search.toLowerCase();

  const filteredDevices = searchLower
    ? devices
        .map(cat => ({
          ...cat,
          devices: cat.devices.filter(dev =>
            dev.name.toLowerCase().includes(searchLower) ||
            dev.props?.some(p =>
              p.name.toLowerCase().includes(searchLower) ||
              p.key.toLowerCase().includes(searchLower)
            )
          ),
        }))
        .filter(cat => cat.devices.length > 0)
    : devices;

  const toggleDevice = id => setCollapsedDevices(p => ({ ...p, [id]: !p[id] }));

  const formatTagValue = (key, type) => {
    const tag = tags[key];
    if (!tag) return '—';
    const v = tag.value;
    if (type === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (type === 'number')  return typeof v === 'number' ? v.toFixed(1) : String(v);
    return String(v);
  };

  // ── Collapsed icon rail ────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center shrink-0 theme-transition"
        style={{
          width: 48,
          backgroundColor: 'var(--bg-panel)',
          borderRight: '1px solid var(--border)',
          paddingTop: 6,
          gap: 2,
        }}
      >
        <button
          onClick={() => setCollapsed(false)}
          title="Expand sidebar"
          style={railBtn(false)}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <PanelLeftOpen size={15} strokeWidth={1.5} />
        </button>

        <div style={{ height: 1, width: 24, backgroundColor: 'var(--border)', margin: '2px 0' }} />

        {TABS.map(({ id, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setCollapsed(false); }}
              title={label}
              style={railBtn(active)}
              onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = active ? 'var(--accent-subtle)' : 'transparent'; }}
            >
              {id === 'nodes'    && <Wrench   size={15} strokeWidth={1.5} />}
              {id === 'explorer' && <Database size={15} strokeWidth={1.5} />}
              {id === 'layers'   && <Layers   size={15} strokeWidth={1.5} />}
            </button>
          );
        })}
      </div>
    );
  }

  // ── Expanded panel ─────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col shrink-0 theme-transition"
      style={{ width: 280, backgroundColor: 'var(--bg-panel)', borderRight: '1px solid var(--border)' }}
    >
      {/* ── Header: segmented control + collapse btn ───────────────────── */}
      <div
        className="flex items-center shrink-0 theme-transition"
        style={{ height: 40, paddingLeft: 8, paddingRight: 6, borderBottom: '1px solid var(--border)', gap: 1 }}
      >
        <div
          className="flex flex-1 items-center"
          style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: 6, padding: 2, gap: 1 }}
        >
          {TABS.map(({ id, label }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  flex: 1, height: 26, borderRadius: 4,
                  border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 500,
                  transition: 'background-color 0.1s, color 0.1s, box-shadow 0.1s',
                  backgroundColor: active ? 'var(--bg-panel)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: active ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setCollapsed(true)}
          title="Collapse sidebar"
          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--text-muted)', flexShrink: 0, marginLeft: 4 }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <PanelLeftClose size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* ── Panel content ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* ══ EXPLORER — Ignition-style Tag Browser ═══════════════════════ */}
        {activeTab === 'explorer' && (
          <div className="flex flex-col flex-1 min-h-0">

            {/* Search bar */}
            <div style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div
                className="flex items-center gap-2"
                style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px' }}
              >
                <Search size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tags..."
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 11, color: 'var(--text-primary)', minWidth: 0 }}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* Tag tree */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
              {filteredDevices.map((cat, ci) => {
                const isCatCollapsed = collapsedCategories[cat.category];
                return (
                  <div key={ci}>
                    {/* Category header */}
                    <button
                      className="w-full flex items-center gap-1.5"
                      style={{
                        height: 28, paddingLeft: 8, paddingRight: 10,
                        background: 'none', border: 'none', cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                      }}
                      onClick={() => setCollapsedCategories(p => ({ ...p, [cat.category]: !p[cat.category] }))}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {isCatCollapsed
                        ? <ChevronRight size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        : <ChevronDown  size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-secondary)', flex: 1, textAlign: 'left' }}>
                        {cat.category}
                      </span>
                      <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 9, backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {cat.devices.length}
                      </span>
                    </button>

                    {/* Devices */}
                    {!isCatCollapsed && cat.devices.map(dev => {
                      const DevIcon = ICON_MAP[dev.iconKey] || Database;
                      const isDevCollapsed = collapsedDevices[dev.id];
                      return (
                        <div key={dev.id} style={{ position: 'relative' }}>
                          {/* Category-level indent guide */}
                          <div style={{ position: 'absolute', left: 16, top: 0, bottom: 0, width: 1, backgroundColor: 'var(--border)', pointerEvents: 'none' }} />

                          {/* Device row */}
                          <button
                            className="w-full flex items-center gap-2"
                            style={{
                              height: 30, paddingLeft: 26, paddingRight: 10,
                              background: 'none', border: 'none', cursor: 'pointer',
                              borderBottom: '1px solid var(--border)',
                            }}
                            onClick={() => toggleDevice(dev.id)}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            {isDevCollapsed
                              ? <ChevronRight size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                              : <ChevronDown  size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                            <DevIcon size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {dev.name}
                            </span>
                            {dev.location && (
                              <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>
                                {dev.location}
                              </span>
                            )}
                          </button>

                          {/* Tag rows */}
                          {!isDevCollapsed && dev.props?.map((prop, pi) => {
                            const liveVal  = formatTagValue(prop.key, prop.type);
                            const hasTag   = tags[prop.key] !== undefined;
                            const isBool   = prop.type === 'boolean';
                            const boolLive = tags[prop.key]?.value;
                            return (
                              <div
                                key={pi}
                                draggable
                                onDragStart={e => {
                                  e.dataTransfer.setData(
                                    'application/scada',
                                    JSON.stringify({ t: 'tagNode', props: { tagKey: prop.key, name: prop.name } })
                                  );
                                  const ghost = makeDragGhost(prop.name);
                                  e.dataTransfer.setDragImage(ghost, 0, 0);
                                  setTimeout(() => document.body.removeChild(ghost), 0);
                                }}
                                className="flex items-center gap-2 cursor-grab"
                                style={{ height: 26, paddingLeft: 38, paddingRight: 10, borderBottom: '1px solid var(--border)', position: 'relative' }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                {/* Two-level indent guides */}
                                <div style={{ position: 'absolute', left: 16, top: 0, bottom: 0, width: 1, backgroundColor: 'var(--border)', pointerEvents: 'none' }} />
                                <div style={{ position: 'absolute', left: 28, top: 0, bottom: 0, width: 1, backgroundColor: 'var(--border)', pointerEvents: 'none' }} />

                                {/* Tag name */}
                                <span style={{ fontSize: 10, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {prop.name}
                                </span>

                                {/* Type chip */}
                                <TypeChip type={prop.type} />

                                {/* Quality dot */}
                                <span style={{
                                  width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                                  backgroundColor: hasTag ? 'var(--status-ok)' : 'var(--text-muted)',
                                }} />

                                {/* Live value */}
                                <span style={{
                                  fontSize: 10,
                                  fontFamily: 'JetBrains Mono, Geist Mono, monospace',
                                  minWidth: 38, textAlign: 'right', flexShrink: 0,
                                  color: isBool
                                    ? (boolLive ? 'var(--status-ok)' : 'var(--status-error)')
                                    : 'var(--text-secondary)',
                                }}>
                                  {liveVal}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {filteredDevices.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                  No tags match "{search}"
                </div>
              )}
            </div>

            {/* Bottom actions */}
            <div className="flex gap-2 shrink-0" style={{ padding: '7px 10px', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setShowAddDevice(true)}
                className="flex-1 flex items-center justify-center gap-1 rounded"
                style={{ height: 27, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'; }}
              >
                <Plus size={11} /> Tag
              </button>
              <button
                onClick={() => setShowAddDevice(true)}
                className="flex-1 flex items-center justify-center gap-1 rounded"
                style={{ height: 27, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: 'rgba(37,99,235,0.08)', color: 'var(--accent)', border: '1px solid rgba(37,99,235,0.22)', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                <Plus size={11} /> Device
              </button>
            </div>
          </div>
        )}

        {/* ══ COMPONENTS TAB ══════════════════════════════════════════════ */}
        {activeTab === 'nodes' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <button
                onClick={() => setShowBuildModal(true)}
                className="w-full flex items-center justify-center gap-2 rounded"
                style={{ height: 30, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'linear-gradient(135deg, var(--accent), #8B5CF6)', color: '#fff', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                <Wrench size={12} /> Build Custom Node
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
              {toolbox.map(group => (
                <div key={group.cat}>
                  {/* Sticky section label */}
                  <div style={{
                    position: 'sticky', top: 0, zIndex: 1,
                    fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: 'var(--text-muted)', padding: '8px 12px 5px',
                    backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border)',
                  }}>
                    {group.cat}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5" style={{ padding: '8px 10px' }}>
                    {group.items.map(tool => {
                      const CustomIcon = tool.i;
                      return (
                        <div
                          key={tool.t}
                          draggable
                          onDragStart={e => {
                            e.dataTransfer.setData('application/scada', JSON.stringify({ t: tool.t, props: tool.props }));
                            const ghost = makeDragGhost(tool.l);
                            e.dataTransfer.setDragImage(ghost, 0, 0);
                            setTimeout(() => document.body.removeChild(ghost), 0);
                          }}
                          className="flex flex-col items-center gap-1.5 p-2 rounded cursor-grab"
                          style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border)', transition: 'opacity 0.1s' }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                        >
                          <CustomIcon size={28} color={tool.props.color || 'var(--text-secondary)'} />
                          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.2 }}>
                            {tool.l}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ LAYERS TAB ══════════════════════════════════════════════════ */}
        {activeTab === 'layers' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div
              className="flex items-center gap-2 shrink-0"
              style={{ height: 32, paddingLeft: 12, paddingRight: 12, borderBottom: '1px solid var(--border)' }}
            >
              <Layers size={11} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
                Canvas Layers
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                {cellData.length} el
              </span>
            </div>
            <LayersPanel
              graph={graph}
              cellData={cellData}
              selectedCellId={selectedCellId}
              onSelectCell={onSelectCell}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const railBtn = (active) => ({
  width: 32, height: 32,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 6, border: 'none', cursor: 'pointer',
  backgroundColor: active ? 'var(--accent-subtle)' : 'transparent',
  color: active ? 'var(--accent)' : 'var(--text-muted)',
});
