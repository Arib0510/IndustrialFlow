/**
 * EditorSidebar.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 4: Updated sidebar with 3 tabs — Explorer | Nodes | Layers.
 * The Layers tab renders the LayersPanel component.
 */

import React from 'react';
import { ChevronDown, ChevronRight, Plus, Pencil, Activity, Wrench, Layers } from 'lucide-react';
import { ICON_MAP } from '../../../constants/config';
import TagBadge from '../../../components/ui/TagBadge';
import { LayersPanel } from './LayersPanel';

export const EditorSidebar = ({
  activeTab,
  isSimulating,
  isDarkMode,
  devices,
  collapsedCategories,
  setCollapsedCategories,
  setShowAddDevice,
  setShowBuildModal,
  toolbox,
  // Phase 4 props
  graph,
  cellData,
  selectedCellId,
  onSelectCell,
}) => {
  if (isSimulating) return null;

  return (
    <div
      className="overflow-y-auto custom-scrollbar shrink-0 flex flex-col min-h-0 theme-transition"
      style={{ width: 320, backgroundColor: 'var(--bg-panel)', borderRight: '1px solid var(--border)' }}
    >
      {/* ── EXPLORER TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'explorer' && (
        <div className="flex flex-col gap-0 p-0">
          <div className="flex gap-2 p-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => setShowAddDevice(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
              style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              <Plus size={12} /> Tag
            </button>
            <button
              onClick={() => setShowAddDevice(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
              style={{ backgroundColor: 'rgba(37,99,235,0.15)', color: 'var(--accent)', border: '1px solid rgba(37,99,235,0.3)' }}
            >
              <Plus size={12} /> Device
            </button>
          </div>

          {devices.map((cat, i) => {
            const isCollapsed = collapsedCategories[cat.category];
            return (
              <div key={i} className="border-b" style={{ borderColor: 'var(--border)' }}>
                <button
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left"
                  onClick={() => setCollapsedCategories(p => ({ ...p, [cat.category]: !p[cat.category] }))}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
                  <span className="text-[10px] font-bold uppercase tracking-widest flex-1" style={{ color: 'var(--text-secondary)' }}>
                    {cat.category}
                  </span>
                  {isCollapsed
                    ? <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
                    : <ChevronDown  size={12} style={{ color: 'var(--text-muted)' }} />}
                </button>

                {!isCollapsed && cat.devices.map(dev => {
                  const DevIcon = ICON_MAP[dev.iconKey] || Activity;
                  return (
                    <div key={dev.id} className="mx-3 mb-2 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                      <div
                        draggable
                        onDragStart={e => e.dataTransfer.setData('application/scada', JSON.stringify({ t: 'tagNode', props: { name: dev.name } }))}
                        className="flex items-center gap-3 p-3 cursor-grab"
                        style={{ backgroundColor: 'var(--bg-subtle)' }}
                      >
                        <div className="shrink-0"><DevIcon size={24} color="var(--accent)" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{dev.name}</div>
                          {dev.location && (
                            <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>{dev.location}</div>
                          )}
                        </div>
                        <button className="p-1 rounded opacity-60 hover:opacity-100 shrink-0">
                          <Pencil size={11} style={{ color: 'var(--text-secondary)' }} />
                        </button>
                      </div>

                      {dev.props && dev.props.map((prop, pi) => (
                        <div
                          key={pi}
                          draggable
                          onDragStart={e => e.dataTransfer.setData('application/scada', JSON.stringify({ t: 'tagNode', props: { tagKey: prop.key, name: prop.name } }))}
                          className="flex items-center justify-between px-4 py-2 cursor-grab border-t"
                          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-panel)' }}
                        >
                          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{prop.name}</span>
                          <TagBadge type={prop.type} />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ── NODES TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'nodes' && (
        <div className="p-3 flex flex-col gap-4">
          <button
            onClick={() => setShowBuildModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors"
            style={{ background: 'linear-gradient(135deg, var(--accent), #8B5CF6)', color: '#FFFFFF', border: 'none' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Wrench size={14} /> Build Custom Node
          </button>

          {toolbox.map(group => (
            <div key={group.cat}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                  {group.cat}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {group.items.map(tool => {
                  const CustomIcon = tool.i;
                  return (
                    <div
                      key={tool.t}
                      draggable
                      onDragStart={e => e.dataTransfer.setData('application/scada', JSON.stringify({ t: tool.t, props: tool.props }))}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl border cursor-grab text-center transition-all hover:opacity-80"
                      style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border)' }}
                    >
                      <CustomIcon size={32} color={tool.props.color || 'var(--text-secondary)'} />
                      <span className="text-[9px] font-bold" style={{ color: 'var(--text-secondary)' }}>{tool.l}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── LAYERS TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'layers' && (
        <div className="flex flex-col">
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <Layers size={13} style={{ color: 'var(--accent)' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
              Canvas Layers
            </span>
            <span className="ml-auto text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
              {cellData.length} element{cellData.length !== 1 ? 's' : ''}
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
  );
};
