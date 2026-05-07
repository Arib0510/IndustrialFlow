import React, { useState, useContext } from 'react';
import {
  Trash2, Plus, X,
  AlignLeft, AlignCenter, AlignRight,
  Layers, ChevronRight, ChevronDown, Lock, Unlock,
} from 'lucide-react';
import { CustomDropdown }    from '../../../components/ui/CustomDropdown';
import { CustomColorPicker } from '../../../components/ui/CustomColorPicker';
import { ExpressionBuilderModal } from '../../../components/modals/ExpressionBuilderModal';
import { BINDABLE_PROPERTIES }   from '../utils/bindingUtils';
import { DASH_PATTERNS, ARROW_MARKERS } from '../utils/drawingUtils';
import { SCADAContext } from '../../../context/SCADAContext';

// ── Type sets ─────────────────────────────────────────────────────────────────
const PIPE_TYPES    = new Set(['pipe_horz','pipe_vert','elbow_br','elbow_bl','elbow_tr','elbow_tl','pipe_tee_h','pipe_tee_v','pipe_cross']);
const ELEC_TYPES    = new Set(['breaker_symbol','disconnector_symbol','ground_symbol','transformer_symbol','fuse_symbol','bus_bar','scadavis_symbol']);
const NUMERIC_TYPES = new Set(['tank_level','gauge_dial','digital_readout','temp_display','value_control','progress_bar','battery_level']);
const NO_BIND_TYPES = new Set(['tagNode','header_text',...PIPE_TYPES,...ELEC_TYPES]);

// ── Shared style tokens ────────────────────────────────────────────────────────
const labelSt = {
  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'var(--text-secondary)',
};
const inputSt = {
  backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', borderRadius: 5, padding: '5px 8px', fontSize: 11,
  outline: 'none', width: '100%',
};

// ── Dropdown option lists ──────────────────────────────────────────────────────
const dashOptions  = Object.values(DASH_PATTERNS).map(p => ({ label: p.label, value: p.value }));
const arrowOptions = [
  { label: 'None',   value: 'none'   },
  { label: 'Open',   value: 'open'   },
  { label: 'Filled', value: 'filled' },
  { label: 'Circle', value: 'circle' },
];
const fontOptions = [
  { label: 'Inter',   value: 'Inter, sans-serif'     },
  { label: 'Roboto',  value: 'Roboto, sans-serif'    },
  { label: 'Courier', value: 'Courier New, monospace' },
  { label: 'Arial',   value: 'Arial, sans-serif'     },
  { label: 'Georgia', value: 'Georgia, serif'         },
];

// ── Accordion ─────────────────────────────────────────────────────────────────
const Accordion = ({ title, accentColor = 'var(--accent)', defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 transition-colors"
        style={{
          height: 28, paddingLeft: 10, paddingRight: 10,
          backgroundColor: 'var(--bg-subtle)',
          border: 'none', borderLeft: `3px solid ${accentColor}`,
          cursor: 'pointer',
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}
      >
        {open
          ? <ChevronDown  size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          : <ChevronRight size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
        <span style={{ ...labelSt, color: accentColor }}>{title}</span>
      </button>
      {open && (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 9, backgroundColor: 'var(--bg-panel)' }}>
          {children}
        </div>
      )}
    </div>
  );
};

// ── Field row ─────────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={labelSt}>{label}</span>
    {children}
  </div>
);

// ── Inline toggle ─────────────────────────────────────────────────────────────
const ToggleRow = ({ label, value, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <span style={labelSt}>{label}</span>
    <div
      onClick={onChange}
      style={{
        width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
        backgroundColor: value ? 'var(--accent)' : 'var(--bg-subtle)',
        border: `1px solid ${value ? 'var(--accent)' : 'var(--border)'}`,
        position: 'relative', transition: 'background-color 0.2s, border-color 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 2,
        left: value ? 18 : 2,
        width: 14, height: 14, borderRadius: 7,
        backgroundColor: 'white', boxShadow: 'var(--shadow-sm)',
        transition: 'left 0.2s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </div>
  </div>
);

// ── Inspector tabs ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'properties', label: 'Properties' },
  { id: 'bindings',   label: 'Bindings'   },
  { id: 'style',      label: 'Style'      },
];

// ─────────────────────────────────────────────────────────────────────────────

export const NodeInspector = ({
  isSimulating,
  selectedCell,
  updateSelectedCell,
  tagOptions,
  updateSelectedCellSize,
  deleteSelected,
  activeDrawTool,
  canvasBg, setCanvasBg,
  totalNodes, totalLinks,
}) => {
  const { tags } = useContext(SCADAContext);
  const [inspTab,           setInspTab]           = useState('properties');
  const [showExprModal,     setShowExprModal]     = useState(false);
  const [editingBindingIdx, setEditingBindingIdx] = useState(null);

  if (isSimulating) return null;

  // ── Derived flags ──────────────────────────────────────────────────────────
  const data      = selectedCell?.get('data') || {};
  const isDrawn   = ['drawn_shape','drawn_text','drawn_image'].includes(data.category);
  const isLink    = selectedCell?.isLink?.() ?? false;
  const isText    = data.category === 'drawn_text';
  const isRect    = selectedCell?.attributes?.type === 'standard.Rectangle';
  const isWidget  = selectedCell && !isDrawn && !isLink;
  const isGroup   = data.category === 'group';
  const isPipe    = PIPE_TYPES.has(data.category);
  const isElec    = ELEC_TYPES.has(data.category);
  const isNumeric = NUMERIC_TYPES.has(data.category);
  const isPath    = isPipe || isElec;
  const bindings  = data.bindings || [];

  const boundTag  = data.boundTag || '';
  const liveTag   = boundTag ? tags[boundTag] : null;

  // ── Binding helpers ────────────────────────────────────────────────────────
  const openAddBinding   = () => { setEditingBindingIdx(null); setShowExprModal(true); };
  const openEditBinding  = idx => { setEditingBindingIdx(idx); setShowExprModal(true); };
  const removeBinding    = idx => updateSelectedCell('bindings', bindings.filter((_, i) => i !== idx));
  const handleBindingConfirm = binding => {
    const next = editingBindingIdx !== null
      ? bindings.map((b, i) => i === editingBindingIdx ? binding : b)
      : [...bindings, binding];
    updateSelectedCell('bindings', next);
    setShowExprModal(false);
  };

  // ── Arrow helper ───────────────────────────────────────────────────────────
  const updateArrow = (end, markerKey) => {
    if (!isLink || !selectedCell) return;
    const marker = ARROW_MARKERS[markerKey] || ARROW_MARKERS.none;
    selectedCell.attr(`line/${end}Marker`, marker);
    updateSelectedCell(end === 'target' ? 'targetMarker' : 'sourceMarker', markerKey);
  };

  // ── Delete button ──────────────────────────────────────────────────────────
  const DeleteBtn = () => (
    <button
      onClick={deleteSelected}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        width: '100%', padding: '7px 0', borderRadius: 5,
        border: '1px solid rgba(239,68,68,0.3)',
        backgroundColor: 'rgba(239,68,68,0.08)',
        color: '#EF4444', fontSize: 10, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer',
      }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.15)'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'}
    >
      <Trash2 size={12} /> Delete
    </button>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="theme-transition"
      style={{
        width: 270, display: 'flex', flexDirection: 'column',
        backgroundColor: 'var(--bg-panel)', borderLeft: '1px solid var(--border)',
      }}
    >
      {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexShrink: 0, borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-subtle)' }}>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setInspTab(id)}
            style={{
              flex: 1, height: 34, border: 'none', outline: 'none', cursor: 'pointer',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
              ...(inspTab === id
                ? { backgroundColor: 'var(--bg-panel)', color: 'var(--accent)', borderBottom: '2px solid var(--accent)' }
                : { backgroundColor: 'transparent', color: 'var(--text-muted)', borderBottom: '2px solid transparent' })
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Panel content ───────────────────────────────────────────────── */}
      <div
        className="custom-scrollbar"
        style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}
      >

        {/* ════ PROPERTIES TAB ════════════════════════════════════════════ */}
        {inspTab === 'properties' && (
          <>
            {/* Draw mode hint */}
            {!selectedCell && activeDrawTool && (
              <div style={{ padding: '8px 10px', borderRadius: 6, border: '1px dashed #8B5CF6', backgroundColor: 'rgba(139,92,246,0.07)' }}>
                <p style={{ fontSize: 10, color: '#8B5CF6', margin: 0, lineHeight: 1.6 }}>
                  {activeDrawTool === 'rectangle' && 'Click & drag to draw a Rectangle. Escape to cancel.'}
                  {activeDrawTool === 'ellipse'   && 'Click & drag to draw an Ellipse. Escape to cancel.'}
                  {activeDrawTool === 'line'      && 'Click & drag to draw a Line / Pipe.'}
                  {activeDrawTool === 'text'      && 'Click on canvas to place a Text Label.'}
                  {activeDrawTool === 'polygon'   && 'Click vertices, double-click to close.'}
                  {activeDrawTool === 'image'     && 'Click on canvas to choose an image.'}
                </p>
              </div>
            )}

            {selectedCell && (
              <>
                {/* Identity */}
                <Accordion title="Identity" accentColor="var(--accent)">
                  <Field label="Display Name">
                    <input
                      value={data.name || ''}
                      onChange={e => updateSelectedCell('name', e.target.value)}
                      style={inputSt}
                      placeholder="Name…"
                    />
                  </Field>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={labelSt}>Type</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {isLink ? 'Link' : data.category || selectedCell?.attributes?.type || '—'}
                    </span>
                  </div>
                </Accordion>

                {/* Geometry */}
                {!isLink && (
                  <Accordion title="Geometry" accentColor="#8B5CF6">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <Field label="Width">
                        <input
                          type="number" min="10" style={inputSt}
                          value={selectedCell.get('size')?.width || 0}
                          onChange={e => updateSelectedCellSize(parseInt(e.target.value) || 120, selectedCell.get('size')?.height || 80)}
                        />
                      </Field>
                      <Field label="Height">
                        <input
                          type="number" min="10" style={inputSt}
                          value={selectedCell.get('size')?.height || 0}
                          onChange={e => updateSelectedCellSize(selectedCell.get('size')?.width || 120, parseInt(e.target.value) || 80)}
                        />
                      </Field>
                    </div>
                    <Field label={`Rotation — ${selectedCell.angle() || 0}°`}>
                      <input
                        type="range" min="0" max="359"
                        value={selectedCell.angle() || 0}
                        onChange={e => { const v = parseInt(e.target.value); selectedCell.rotate(v, true); selectedCell.set('angle', v); }}
                        className="w-full"
                      />
                    </Field>
                    <ToggleRow
                      label="Lock Position"
                      value={!!data.locked}
                      onChange={() => updateSelectedCell('locked', !data.locked)}
                    />
                  </Accordion>
                )}

                {/* Link routing */}
                {isLink && (
                  <Accordion title="Connection" accentColor="#06B6D4">
                    <Field label="Routing Mode">
                      <CustomDropdown
                        value={data.routerMode || 'orthogonal'}
                        options={[
                          { label: 'Orthogonal', value: 'orthogonal' },
                          { label: 'Manhattan',  value: 'manhattan'  },
                          { label: 'Straight',   value: 'normal'     },
                        ]}
                        onChange={v => {
                          updateSelectedCell('routerMode', v);
                          selectedCell.router({ name: v, args: v === 'orthogonal' ? { padding: 10 } : {} });
                        }}
                        placeholder="Orthogonal"
                      />
                    </Field>
                    <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: 0 }}>
                      Click link on canvas for vertex drag handles.
                    </p>
                  </Accordion>
                )}

                {/* Group info */}
                {isGroup && (
                  <Accordion title="Group" accentColor="#8B5CF6">
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
                      {selectedCell?.getEmbeddedCells?.()?.length ?? 0} element(s) embedded. Move group to move all.
                    </p>
                  </Accordion>
                )}

                {/* ── Widget-specific properties ─────────────────────────────── */}
                {isWidget && (
                  <Accordion title="Component Settings" accentColor="#06B6D4">

                    {/* Unit label */}
                    {isNumeric && (
                      <Field label="Unit">
                        <input
                          value={data.unit || ''}
                          onChange={e => updateSelectedCell('unit', e.target.value)}
                          style={inputSt}
                          placeholder="%, °C, PSI, kW…"
                        />
                      </Field>
                    )}

                    {/* Min / Max / Step for adjustable widgets */}
                    {(data.category === 'value_control' || data.category === 'gauge_dial') && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          <Field label="Min">
                            <input
                              type="number" style={inputSt}
                              value={data.min ?? 0}
                              onChange={e => updateSelectedCell('min', Number(e.target.value))}
                            />
                          </Field>
                          <Field label="Max">
                            <input
                              type="number" style={inputSt}
                              value={data.max ?? 100}
                              onChange={e => updateSelectedCell('max', Number(e.target.value))}
                            />
                          </Field>
                        </div>
                        {data.category === 'value_control' && (
                          <Field label={`Step — ${data.step ?? 1}`}>
                            <input
                              type="range" min="0.1" max="100" step="0.1"
                              value={data.step ?? 1}
                              onChange={e => updateSelectedCell('step', parseFloat(e.target.value))}
                              className="w-full"
                            />
                          </Field>
                        )}
                      </>
                    )}

                    {/* Decimal places */}
                    {(data.category === 'digital_readout' || data.category === 'temp_display') && (
                      <Field label="Decimal Places">
                        <CustomDropdown
                          value={String(data.decimals ?? 1)}
                          options={['0','1','2','3'].map(v => ({ label: v, value: v }))}
                          onChange={v => updateSelectedCell('decimals', parseInt(v))}
                          placeholder="1"
                        />
                      </Field>
                    )}

                    {/* Default state for toggle switch */}
                    {data.category === 'toggle_switch' && (
                      <Field label="Default State">
                        <div style={{ display: 'flex', gap: 4 }}>
                          {['OFF','ON'].map(s => {
                            const active = (data.defaultVal ?? false) === (s === 'ON');
                            return (
                              <button key={s}
                                style={{
                                  flex: 1, padding: '4px 0', borderRadius: 4,
                                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                                  backgroundColor: active ? 'var(--accent-subtle2)' : 'var(--bg-subtle)',
                                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                                  fontSize: 10, fontWeight: 700, cursor: 'pointer',
                                }}
                                onClick={() => updateSelectedCell('defaultVal', s === 'ON')}
                              >
                                {s}
                              </button>
                            );
                          })}
                        </div>
                      </Field>
                    )}

                    {/* Alert message */}
                    {data.category === 'alert_banner' && (
                      <Field label="Alert Message">
                        <input
                          value={data.alertMsg || ''}
                          onChange={e => updateSelectedCell('alertMsg', e.target.value)}
                          style={inputSt}
                          placeholder="Hazard detected…"
                        />
                      </Field>
                    )}
                  </Accordion>
                )}
              </>
            )}

            {/* Nothing selected */}
            {!selectedCell && (
              <>
                <Accordion title="Canvas" accentColor="var(--accent)">
                  <Field label="Background Color">
                    <CustomColorPicker value={canvasBg} onChange={setCanvasBg} />
                  </Field>
                </Accordion>

                <Accordion title="Statistics" accentColor="var(--text-secondary)">
                  {[
                    { label: 'Nodes', value: totalNodes },
                    { label: 'Links', value: totalLinks },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{label}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </Accordion>
              </>
            )}
          </>
        )}

        {/* ════ BINDINGS TAB ══════════════════════════════════════════════ */}
        {inspTab === 'bindings' && (
          <>
            {!selectedCell && (
              <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 28 }}>
                Select an element to view its bindings.
              </p>
            )}

            {selectedCell && isLink && (
              <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 28 }}>
                Links do not support expression bindings.
              </p>
            )}

            {selectedCell && !isLink && (
              <>
                {/* Expression bindings (drawn shapes) */}
                {isDrawn && (
                  <Accordion title="Expression Bindings" accentColor="var(--accent)">
                    {bindings.length === 0 && (
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
                        No bindings. Add one to link a tag to a visual property.
                      </p>
                    )}
                    {bindings.map((b, idx) => {
                      const propLabel = BINDABLE_PROPERTIES.find(p => p.value === b.property)?.label || b.property;
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 5, backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{propLabel}</div>
                            <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {b.tagKey}{b.expression ? ` → ${b.expression}` : ''}
                            </div>
                          </div>
                          <button onClick={() => openEditBinding(idx)} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, border: '1px solid var(--accent)', color: 'var(--accent)', backgroundColor: 'transparent', cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => removeBinding(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                            <X size={11} style={{ color: '#EF4444' }} />
                          </button>
                        </div>
                      );
                    })}
                    <button
                      onClick={openAddBinding}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '6px 0', borderRadius: 5, border: '1px dashed var(--accent)', color: 'var(--accent)', backgroundColor: 'rgba(59,130,246,0.05)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                    >
                      <Plus size={11} /> Add Binding
                    </button>
                  </Accordion>
                )}

                {/* Tag binding for widgets */}
                {isWidget && !NO_BIND_TYPES.has(data.category) && (
                  <Accordion title="Tag Binding" accentColor="var(--accent)">
                    <CustomDropdown
                      value={boundTag}
                      options={tagOptions}
                      onChange={v => updateSelectedCell('boundTag', v)}
                      placeholder="-- Select Data Tag --"
                    />

                    {/* Live value display */}
                    {liveTag && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 5, backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Live Value</span>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, Geist Mono, monospace', color: 'var(--accent)' }}>
                          {typeof liveTag.value === 'boolean'
                            ? (liveTag.value ? 'TRUE' : 'FALSE')
                            : String(liveTag.value)}{' '}
                          <span style={{ fontSize: 9, fontWeight: 400 }}>{data.unit || ''}</span>
                        </span>
                      </div>
                    )}

                    {/* Write mode indicator */}
                    {(data.category === 'toggle_switch' || data.category === 'value_control') && (
                      <p style={{ fontSize: 9, color: 'var(--status-ok)', margin: 0, fontWeight: 700 }}>
                        ✓ Read/Write — this widget writes back to the tag.
                      </p>
                    )}
                  </Accordion>
                )}

                {/* Value Transform for numeric widgets */}
                {isWidget && isNumeric && (
                  <Accordion title="Value Transform" accentColor="#F59E0B" defaultOpen={false}>
                    <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: 0 }}>
                      Display = (tag × scale) + offset
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <Field label="Scale (×)">
                        <input
                          type="number" step="0.01" style={inputSt}
                          value={data.tagScale ?? 1}
                          onChange={e => updateSelectedCell('tagScale', parseFloat(e.target.value) || 1)}
                        />
                      </Field>
                      <Field label="Offset (+)">
                        <input
                          type="number" step="0.1" style={inputSt}
                          value={data.tagOffset ?? 0}
                          onChange={e => updateSelectedCell('tagOffset', parseFloat(e.target.value) || 0)}
                        />
                      </Field>
                    </div>
                  </Accordion>
                )}

                {/* Group binding */}
                {isGroup && (
                  <Accordion title="Group Tag Binding" accentColor="#8B5CF6">
                    <CustomDropdown
                      value={boundTag}
                      options={[]}
                      onChange={v => updateSelectedCell('boundTag', v)}
                      placeholder="-- Bind Group to Tag --"
                    />
                    <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: 0 }}>
                      Propagates to all children via expression bindings.
                    </p>
                  </Accordion>
                )}

                {!isDrawn && !isWidget && !isGroup && (
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 28 }}>
                    No bindings available for this element type.
                  </p>
                )}
              </>
            )}
          </>
        )}

        {/* ════ STYLE TAB ═════════════════════════════════════════════════ */}
        {inspTab === 'style' && (
          <>
            {!selectedCell && (
              <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 28 }}>
                Select an element to edit its style.
              </p>
            )}

            {selectedCell && (
              <>
                {/* Link appearance */}
                {isLink && (
                  <Accordion title="Line Appearance" accentColor="#06B6D4">
                    <Field label="Line Color">
                      <CustomColorPicker
                        value={data.stroke || '#3B82F6'}
                        onChange={v => { updateSelectedCell('stroke', v); selectedCell.attr('line/stroke', v); }}
                      />
                    </Field>
                    <Field label={`Width — ${data.strokeWidth || 2}px`}>
                      <input
                        type="range" min="1" max="12" value={data.strokeWidth || 2}
                        onChange={e => { const w = parseInt(e.target.value); updateSelectedCell('strokeWidth', w); selectedCell.attr('line/strokeWidth', w); }}
                        className="w-full"
                      />
                    </Field>
                    <Field label="Dash Pattern">
                      <CustomDropdown
                        value={data.dashPattern ?? ''}
                        options={dashOptions}
                        onChange={v => { updateSelectedCell('dashPattern', v); selectedCell.attr('line/strokeDasharray', v); }}
                        placeholder="Solid"
                      />
                    </Field>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <Field label="Source Arrow">
                        <CustomDropdown
                          value={data.sourceMarker || 'none'}
                          options={arrowOptions}
                          onChange={v => updateArrow('source', v)}
                          placeholder="None"
                        />
                      </Field>
                      <Field label="Target Arrow">
                        <CustomDropdown
                          value={data.targetMarker || 'filled'}
                          options={arrowOptions}
                          onChange={v => updateArrow('target', v)}
                          placeholder="Filled"
                        />
                      </Field>
                    </div>
                  </Accordion>
                )}

                {/* Shape appearance (drawn non-link) */}
                {isDrawn && !isLink && (
                  <Accordion title="Appearance" accentColor="#8B5CF6">
                    {!['header_text','tagNode'].includes(data.category) && (
                      <Field label="Stroke Color">
                        <CustomColorPicker
                          value={data.stroke || data.color || '#3B82F6'}
                          onChange={v => { updateSelectedCell('stroke', v); updateSelectedCell('color', v); }}
                        />
                      </Field>
                    )}
                    <Field label="Fill Color">
                      <CustomColorPicker
                        value={data.fill || 'transparent'}
                        onChange={v => updateSelectedCell('fill', v)}
                      />
                    </Field>
                    <Field label={`Stroke Width — ${data.strokeWidth || 2}px`}>
                      <input
                        type="range" min="1" max="20" value={data.strokeWidth || 2}
                        onChange={e => { const w = parseInt(e.target.value); updateSelectedCell('strokeWidth', w); selectedCell.attr('body/strokeWidth', w); }}
                        className="w-full"
                      />
                    </Field>
                    <Field label="Dash Pattern">
                      <CustomDropdown
                        value={data.dashPattern ?? ''}
                        options={dashOptions}
                        onChange={v => { updateSelectedCell('dashPattern', v); selectedCell.attr('body/strokeDasharray', v); }}
                        placeholder="Solid"
                      />
                    </Field>
                    {isRect && (
                      <Field label={`Corner Radius — ${data.cornerRadius ?? 0}px`}>
                        <input
                          type="range" min="0" max="60" value={data.cornerRadius ?? 0}
                          onChange={e => { const r = parseInt(e.target.value); updateSelectedCell('cornerRadius', r); selectedCell.attr('body/rx', r); selectedCell.attr('body/ry', r); }}
                          className="w-full"
                        />
                      </Field>
                    )}
                    <Field label={`Opacity — ${Math.round((data.opacity ?? 1) * 100)}%`}>
                      <input
                        type="range" min="0" max="100" value={Math.round((data.opacity ?? 1) * 100)}
                        onChange={e => { const pct = parseInt(e.target.value) / 100; updateSelectedCell('opacity', pct); selectedCell.attr('root/opacity', pct); }}
                        className="w-full"
                      />
                    </Field>
                  </Accordion>
                )}

                {/* Font & Text (drawn_text only) */}
                {isText && (
                  <Accordion title="Font & Text" accentColor="#F59E0B">
                    <Field label="Content">
                      <input
                        value={selectedCell.attr('label/text') || ''}
                        onChange={e => selectedCell.attr('label/text', e.target.value)}
                        style={inputSt}
                        placeholder="Label text…"
                      />
                    </Field>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <Field label="Size">
                        <input
                          type="number" min="8" max="120"
                          value={data.fontSize || 18}
                          onChange={e => { const sz = parseInt(e.target.value); updateSelectedCell('fontSize', sz); selectedCell.attr('label/fontSize', sz); }}
                          style={inputSt}
                        />
                      </Field>
                      <Field label="Family">
                        <CustomDropdown
                          value={data.fontFamily || 'Inter, sans-serif'}
                          options={fontOptions}
                          onChange={v => { updateSelectedCell('fontFamily', v); selectedCell.attr('label/fontFamily', v); }}
                          placeholder="Inter"
                        />
                      </Field>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {[
                        { key: 'bold',   label: 'B', dataProp: 'fontWeight', onVal: 'bold',   offVal: 'normal', style: { fontWeight: 700 } },
                        { key: 'italic', label: 'I', dataProp: 'fontStyle',  onVal: 'italic', offVal: 'normal', style: { fontStyle: 'italic' } },
                      ].map(({ key, label, dataProp, onVal, offVal, style: extraStyle }) => {
                        const active = data[dataProp] === onVal;
                        return (
                          <button key={key}
                            style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer', ...extraStyle, backgroundColor: active ? 'rgba(245,158,11,0.2)' : 'var(--bg-subtle)', color: active ? '#F59E0B' : 'var(--text-secondary)', border: `1px solid ${active ? '#F59E0B' : 'var(--border)'}` }}
                            onClick={() => { const n = active ? offVal : onVal; updateSelectedCell(dataProp, n); selectedCell.attr(`label/${dataProp}`, n); }}
                          >{label}</button>
                        );
                      })}
                      {[
                        { align: 'start',  Icon: AlignLeft   },
                        { align: 'middle', Icon: AlignCenter  },
                        { align: 'end',    Icon: AlignRight   },
                      ].map(({ align, Icon }) => {
                        const active = (data.textAlign || 'middle') === align;
                        return (
                          <button key={align}
                            style={{ padding: '3px 6px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', backgroundColor: active ? 'rgba(245,158,11,0.2)' : 'var(--bg-subtle)', color: active ? '#F59E0B' : 'var(--text-secondary)', border: `1px solid ${active ? '#F59E0B' : 'var(--border)'}` }}
                            onClick={() => { updateSelectedCell('textAlign', align); selectedCell.attr('label/textAnchor', align); }}
                          ><Icon size={12} /></button>
                        );
                      })}
                    </div>
                    <Field label="Text Color">
                      <CustomColorPicker
                        value={data.textColor || '#CBD5E1'}
                        onChange={v => { updateSelectedCell('textColor', v); selectedCell.attr('label/fill', v); }}
                      />
                    </Field>
                  </Accordion>
                )}

                {/* Widget style */}
                {isWidget && !isDrawn && !isPath && (
                  <Accordion title="Widget Style" accentColor="#8B5CF6">
                    <ToggleRow
                      label="Show Label"
                      value={data.showLabel !== false}
                      onChange={() => updateSelectedCell('showLabel', data.showLabel === false)}
                    />
                    <ToggleRow
                      label="Show Border"
                      value={data.showBorder !== false}
                      onChange={() => updateSelectedCell('showBorder', data.showBorder === false)}
                    />
                    {!['header_text','tagNode'].includes(data.category) && (
                      <Field label="Accent Color">
                        <CustomColorPicker
                          value={data.color || '#3B82F6'}
                          onChange={v => updateSelectedCell('color', v)}
                        />
                      </Field>
                    )}
                    <Field label="Background Override">
                      <CustomColorPicker
                        value={data.bgColor || ''}
                        onChange={v => updateSelectedCell('bgColor', v)}
                      />
                    </Field>
                    <Field label={`Opacity — ${Math.round((data.opacity ?? 1) * 100)}%`}>
                      <input
                        type="range" min="0" max="100"
                        value={Math.round((data.opacity ?? 1) * 100)}
                        onChange={e => { const pct = parseInt(e.target.value) / 100; updateSelectedCell('opacity', pct); selectedCell.attr('root/opacity', pct); }}
                        className="w-full"
                      />
                    </Field>
                  </Accordion>
                )}

                {/* Pipe / Electrical symbol style */}
                {isPath && (
                  <Accordion title="Symbol Style" accentColor="#06B6D4">
                    <Field label="Stroke Color">
                      <CustomColorPicker
                        value={data.stroke || data.color || '#3B82F6'}
                        onChange={v => { updateSelectedCell('stroke', v); selectedCell.attr('body/stroke', v); }}
                      />
                    </Field>
                    <Field label={`Stroke Width — ${data.strokeWidth || 2.5}px`}>
                      <input
                        type="range" min="1" max="12" step="0.5"
                        value={data.strokeWidth || 2.5}
                        onChange={e => { const w = parseFloat(e.target.value); updateSelectedCell('strokeWidth', w); selectedCell.attr('body/strokeWidth', w); }}
                        className="w-full"
                      />
                    </Field>
                    <Field label="Dash Pattern">
                      <CustomDropdown
                        value={data.dashPattern ?? ''}
                        options={dashOptions}
                        onChange={v => { updateSelectedCell('dashPattern', v); selectedCell.attr('body/strokeDasharray', v); }}
                        placeholder="Solid"
                      />
                    </Field>
                    <Field label={`Opacity — ${Math.round((data.opacity ?? 1) * 100)}%`}>
                      <input
                        type="range" min="0" max="100"
                        value={Math.round((data.opacity ?? 1) * 100)}
                        onChange={e => { const pct = parseInt(e.target.value) / 100; updateSelectedCell('opacity', pct); selectedCell.attr('root/opacity', pct); }}
                        className="w-full"
                      />
                    </Field>
                  </Accordion>
                )}

                <DeleteBtn />
              </>
            )}
          </>
        )}
      </div>

      {/* Expression Builder Modal */}
      {showExprModal && (
        <ExpressionBuilderModal
          tagOptions={tagOptions}
          tags={tags}
          existingBinding={editingBindingIdx !== null ? bindings[editingBindingIdx] : null}
          onConfirm={handleBindingConfirm}
          onClose={() => setShowExprModal(false)}
        />
      )}
    </div>
  );
};
