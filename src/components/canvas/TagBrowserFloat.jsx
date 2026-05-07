/**
 * TagBrowserFloat — floating tag-browser panel anchored to the bottom-left
 * of the canvas area, styled after Ignition Maker's tag browser overlay.
 *
 * • Collapsible (click header)
 * • Live tag values from SCADAContext
 * • Drag any tag row → drops a tagNode widget on the canvas
 * • Visible during both edit and simulation modes
 */
import React, { useState, useContext } from 'react';
import {
  ChevronDown, ChevronRight, Search, X, Database,
  Tag,
} from 'lucide-react';
import { SCADAContext } from '../../context/SCADAContext';
import { ICON_MAP }     from '../../constants/config';

// ── Drag ghost (matches the one in EditorSidebar) ────────────────────────────
const makeDragGhost = (label) => {
  const el = document.createElement('div');
  el.textContent = label;
  el.style.cssText = [
    'position:fixed', 'top:-9999px', 'left:-9999px',
    'padding:3px 10px', 'background:#2563EB', 'color:#fff',
    'border-radius:4px', 'font-size:11px', 'font-weight:600',
    'font-family:Inter,system-ui,sans-serif',
    'white-space:nowrap', 'pointer-events:none',
    'box-shadow:0 2px 8px rgba(0,0,0,0.25)',
  ].join(';');
  document.body.appendChild(el);
  return el;
};

// ── Type chip ─────────────────────────────────────────────────────────────────
const TypeChip = ({ type }) => {
  const label = type === 'number' ? 'NUM' : type === 'boolean' ? 'BOOL' : 'STR';
  const color = type === 'number' ? '#3B82F6' : type === 'boolean' ? '#8B5CF6' : '#10B981';
  return (
    <span style={{
      fontSize: 8, fontFamily: 'JetBrains Mono, Geist Mono, monospace',
      fontWeight: 700, letterSpacing: '0.04em',
      padding: '1px 4px', borderRadius: 3,
      backgroundColor: color + '18', color, flexShrink: 0,
    }}>
      {label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const TagBrowserFloat = ({ isDarkMode }) => {
  const { tags, devices } = useContext(SCADAContext);

  const [expanded,        setExpanded]        = useState(true);
  const [search,          setSearch]          = useState('');
  const [collapsedCats,   setCollapsedCats]   = useState({});
  const [collapsedDevs,   setCollapsedDevs]   = useState({});

  const searchLower = search.toLowerCase();

  const filtered = searchLower
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

  const tagCount = devices.reduce((n, cat) =>
    n + cat.devices.reduce((m, dev) => m + (dev.props?.length ?? 0), 0), 0);

  const formatVal = (key, type) => {
    const tag = tags[key];
    if (!tag) return '—';
    const v = tag.value;
    if (type === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (type === 'number')  return typeof v === 'number' ? v.toFixed(1) : String(v);
    return String(v);
  };

  // ── Panel dimensions ────────────────────────────────────────────────────────
  const PANEL_W      = 216;
  const HEADER_H     = 32;
  const SEARCH_H     = 36;
  const MAX_LIST_H   = 260;

  return (
    <div
      style={{
        position:  'absolute',
        bottom:    16,
        left:      16,
        width:     PANEL_W,
        zIndex:    40,
        borderRadius:     'var(--radius-lg)',
        border:           '1px solid var(--border)',
        backgroundColor:  isDarkMode
          ? 'rgba(17,17,19,0.93)'
          : 'rgba(250,250,250,0.93)',
        backdropFilter: 'blur(10px) saturate(160%)',
        boxShadow:      'var(--shadow-md)',
        overflow:       'hidden',
        display:        'flex',
        flexDirection:  'column',
        // animate height between collapsed and expanded
        maxHeight:   expanded ? HEADER_H + SEARCH_H + MAX_LIST_H : HEADER_H,
        transition: 'max-height 0.22s cubic-bezier(0.4,0,0.2,1)',
        // must capture pointer events inside itself
        pointerEvents: 'auto',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          height: HEADER_H, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 6,
          paddingLeft: 10, paddingRight: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
          width: '100%',
        }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <Tag size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span style={{
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.07em', color: 'var(--text-secondary)',
          flex: 1, textAlign: 'left',
        }}>
          Tag Browser
        </span>
        {/* Total tag count badge */}
        <span style={{
          fontSize: 9, padding: '1px 5px', borderRadius: 9,
          backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)',
          fontFamily: 'monospace', flexShrink: 0,
        }}>
          {tagCount}
        </span>
        {expanded
          ? <ChevronDown  size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          : <ChevronRight size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        }
      </button>

      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      {expanded && (
        <div style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 5, padding: '3px 7px',
          }}>
            <Search size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter tags…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 10, color: 'var(--text-primary)', minWidth: 0,
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <X size={9} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Tag tree ───────────────────────────────────────────────────────── */}
      {expanded && (
        <div
          className="custom-scrollbar"
          style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
        >
          {filtered.map((cat, ci) => {
            const catCollapsed = collapsedCats[cat.category];
            return (
              <div key={ci}>
                {/* Category row */}
                <button
                  style={{
                    width: '100%', height: 24,
                    display: 'flex', alignItems: 'center', gap: 4,
                    paddingLeft: 6, paddingRight: 8,
                    background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                  }}
                  onClick={() => setCollapsedCats(p => ({ ...p, [cat.category]: !p[cat.category] }))}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {catCollapsed
                    ? <ChevronRight size={9} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    : <ChevronDown  size={9} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                  <span style={{
                    fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em', color: 'var(--text-secondary)',
                    flex: 1, textAlign: 'left',
                  }}>
                    {cat.category}
                  </span>
                  <span style={{
                    fontSize: 8, padding: '0 4px', borderRadius: 8,
                    backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)',
                    fontFamily: 'monospace',
                  }}>
                    {cat.devices.length}
                  </span>
                </button>

                {/* Device rows */}
                {!catCollapsed && cat.devices.map(dev => {
                  const DevIcon    = ICON_MAP[dev.iconKey] || Database;
                  const devCollapsed = collapsedDevs[dev.id];
                  return (
                    <div key={dev.id} style={{ position: 'relative' }}>
                      {/* category-level indent guide */}
                      <div style={{ position: 'absolute', left: 12, top: 0, bottom: 0, width: 1, backgroundColor: 'var(--border)', pointerEvents: 'none' }} />

                      {/* Device header */}
                      <button
                        style={{
                          width: '100%', height: 26,
                          display: 'flex', alignItems: 'center', gap: 5,
                          paddingLeft: 20, paddingRight: 8,
                          background: 'none', border: 'none', cursor: 'pointer',
                          borderBottom: '1px solid var(--border)',
                        }}
                        onClick={() => setCollapsedDevs(p => ({ ...p, [dev.id]: !p[dev.id] }))}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        {devCollapsed
                          ? <ChevronRight size={9} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          : <ChevronDown  size={9} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                        <DevIcon size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: 'var(--text-primary)',
                          flex: 1, textAlign: 'left',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {dev.name}
                        </span>
                        {dev.location && (
                          <span style={{ fontSize: 8, color: 'var(--text-muted)', flexShrink: 0 }}>
                            {dev.location}
                          </span>
                        )}
                      </button>

                      {/* Tag rows */}
                      {!devCollapsed && dev.props?.map((prop, pi) => {
                        const hasTag  = tags[prop.key] !== undefined;
                        const liveVal = formatVal(prop.key, prop.type);
                        const isBool  = prop.type === 'boolean';
                        const boolVal = tags[prop.key]?.value;

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
                            style={{
                              height: 22, position: 'relative',
                              display: 'flex', alignItems: 'center', gap: 4,
                              paddingLeft: 32, paddingRight: 6,
                              borderBottom: '1px solid var(--border)',
                              cursor: 'grab',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            {/* Indent guides */}
                            <div style={{ position: 'absolute', left: 12, top: 0, bottom: 0, width: 1, backgroundColor: 'var(--border)', pointerEvents: 'none' }} />
                            <div style={{ position: 'absolute', left: 22, top: 0, bottom: 0, width: 1, backgroundColor: 'var(--border)', pointerEvents: 'none' }} />

                            {/* Tag name */}
                            <span style={{
                              fontSize: 9, color: 'var(--text-secondary)', flex: 1,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
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
                              fontSize: 9,
                              fontFamily: 'JetBrains Mono, Geist Mono, monospace',
                              minWidth: 32, textAlign: 'right', flexShrink: 0,
                              color: isBool
                                ? (boolVal ? 'var(--status-ok)' : 'var(--status-error)')
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

          {filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 10 }}>
              {search ? `No tags match "${search}"` : 'No tags configured'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TagBrowserFloat;
