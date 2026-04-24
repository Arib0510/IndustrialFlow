/**
 * NodeInspector.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 2 + 3: Comprehensive property inspector panel (right sidebar).
 *
 * Sections (shown conditionally based on selected cell type):
 *   1. Expression Bindings  (all drawn_shape / drawn_text / drawn_image cells)
 *   2. Tag Binding (simple)  (widget nodes that don't use expression bindings)
 *   3. Shape Style           (stroke, fill, opacity, dash, corner radius, arrows)
 *   4. Text / Font           (drawn_text only)
 *   5. Geometry & Transform  (width, height, rotation)
 *   6. Canvas Properties     (when nothing selected)
 */

import React, { useState, useContext } from 'react';
import {
  Settings, Trash2, FlaskConical, Plus, X,
  AlignLeft, AlignCenter, AlignRight,
  Layers, Minus,
} from 'lucide-react';
import { CustomDropdown }   from '../../../components/ui/CustomDropdown';
import { CustomColorPicker } from '../../../components/ui/CustomColorPicker';
import { ScadaIcons }        from '../utils/iconUtils.jsx';
import { ExpressionBuilderModal } from '../../../components/modals/ExpressionBuilderModal';
import { BINDABLE_PROPERTIES }   from '../utils/bindingUtils';
import { DASH_PATTERNS, ARROW_MARKERS } from '../utils/drawingUtils';
import { SCADAContext } from '../../../context/SCADAContext';

// ── Shared styles ──────────────────────────────────────────────────────────────
const sectionSt = (accentColor = 'var(--border)') => ({
  padding: 16, borderRadius: 12, border: `1px solid var(--border)`,
  borderLeft: `3px solid ${accentColor}`,
  backgroundColor: 'var(--bg-panel)',
  display: 'flex', flexDirection: 'column', gap: 10,
});
const labelSt = {
  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'var(--text-secondary)',
};
const inputSt = {
  backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', borderRadius: 6, padding: '5px 9px', fontSize: 11,
  outline: 'none',
};

// ── Section header helper ─────────────────────────────────────────────────────
const SectionTitle = ({ children, color = 'var(--text-secondary)' }) => (
  <div style={{ ...labelSt, color, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
    {children}
  </div>
);

// ── Dash pattern options for the dropdown ─────────────────────────────────────
const dashOptions = Object.values(DASH_PATTERNS).map(p => ({ label: p.label, value: p.value }));

// ── Arrow marker options ──────────────────────────────────────────────────────
const arrowOptions = [
  { label: 'None',   value: 'none'   },
  { label: 'Open',   value: 'open'   },
  { label: 'Filled', value: 'filled' },
  { label: 'Circle', value: 'circle' },
];

// ── Font families ─────────────────────────────────────────────────────────────
const fontOptions = [
  { label: 'Inter',      value: 'Inter, sans-serif'    },
  { label: 'Roboto',     value: 'Roboto, sans-serif'   },
  { label: 'Courier',    value: 'Courier New, monospace' },
  { label: 'Arial',      value: 'Arial, sans-serif'    },
  { label: 'Georgia',    value: 'Georgia, serif'        },
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
  const [showExprModal, setShowExprModal] = useState(false);
  const [editingBindingIdx, setEditingBindingIdx] = useState(null); // null = adding new

  if (isSimulating) return null;

  // ── Derived flags ──────────────────────────────────────────────────────────
  const data         = selectedCell?.get('data') || {};
  const isDrawn      = data.category === 'drawn_shape' || data.category === 'drawn_text' || data.category === 'drawn_image';
  const isLink       = selectedCell?.isLink?.() ?? false;
  const isText       = data.category === 'drawn_text';
  const isRect       = selectedCell?.attributes?.type === 'standard.Rectangle';
  const isWidget     = selectedCell && !isDrawn && !isLink;
  const isGroup      = data.category === 'group';
  const bindings     = data.bindings || [];

  // ── Expression binding helpers ────────────────────────────────────────────
  const openAddBinding = () => { setEditingBindingIdx(null); setShowExprModal(true); };
  const openEditBinding = (idx) => { setEditingBindingIdx(idx); setShowExprModal(true); };
  const removeBinding = (idx) => {
    const next = bindings.filter((_, i) => i !== idx);
    updateSelectedCell('bindings', next);
  };
  const handleBindingConfirm = (binding) => {
    let next;
    if (editingBindingIdx !== null) {
      next = bindings.map((b, i) => i === editingBindingIdx ? binding : b);
    } else {
      next = [...bindings, binding];
    }
    updateSelectedCell('bindings', next);
    setShowExprModal(false);
  };

  // ── Arrow update helpers ──────────────────────────────────────────────────
  const updateArrow = (end, markerKey) => {
    if (!isLink || !selectedCell) return;
    const marker = ARROW_MARKERS[markerKey] || ARROW_MARKERS.none;
    selectedCell.attr(`line/${end}Marker`, marker);
    updateSelectedCell(end === 'target' ? 'targetMarker' : 'sourceMarker', markerKey);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3 shrink-0 theme-transition"
      style={{ width: 300, backgroundColor: 'var(--bg-panel)', borderLeft: '1px solid var(--border)' }}
    >
      {/* ── INSPECTOR HEADER ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Node Inspector
        </span>
        {selectedCell && (
          <span className="text-[9px] px-2 py-0.5 rounded-full font-mono"
            style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            {isLink ? 'Link' : isDrawn ? data.category : data.category}
          </span>
        )}
      </div>

      {/* ── ALL LINKS: Full connection properties ──────────────────────────── */}
      {selectedCell && isLink && (
        <div style={sectionSt('#06B6D4')}>
          <SectionTitle color="#06B6D4">
            <Minus size={12} /> Connection Link
          </SectionTitle>

          <div>
            <label style={labelSt}>Name</label>
            <input value={data.name || ''}
              onChange={e => updateSelectedCell('name', e.target.value)}
              style={{ ...inputSt, width: '100%', marginTop: 4 }} placeholder="Connection name..." />
          </div>

          <div>
            <label style={labelSt}>Line Color</label>
            <div style={{ marginTop: 6 }}>
              <CustomColorPicker value={data.stroke || '#3B82F6'}
                onChange={v => { updateSelectedCell('stroke', v); selectedCell.attr('line/stroke', v); }} />
            </div>
          </div>

          <div>
            <label style={{ ...labelSt, display: 'flex', justifyContent: 'space-between' }}>
              <span>Line Width</span>
              <span style={{ color: '#06B6D4' }}>{data.strokeWidth || 2}px</span>
            </label>
            <input type="range" min="1" max="12" value={data.strokeWidth || 2}
              onChange={e => { const w = parseInt(e.target.value); updateSelectedCell('strokeWidth', w); selectedCell.attr('line/strokeWidth', w); }}
              className="w-full accent-cyan-500" style={{ marginTop: 6 }} />
          </div>

          <div>
            <label style={labelSt}>Dash Pattern</label>
            <div style={{ marginTop: 4 }}>
              <CustomDropdown value={data.dashPattern ?? ''} options={dashOptions}
                onChange={v => { updateSelectedCell('dashPattern', v); selectedCell.attr('line/strokeDasharray', v); }}
                placeholder="Solid" />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label style={labelSt}>Source Arrow</label>
              <div style={{ marginTop: 4 }}>
                <CustomDropdown value={data.sourceMarker || 'none'} options={arrowOptions}
                  onChange={v => updateArrow('source', v)} placeholder="None" />
              </div>
            </div>
            <div className="flex-1">
              <label style={labelSt}>Target Arrow</label>
              <div style={{ marginTop: 4 }}>
                <CustomDropdown value={data.targetMarker || 'filled'} options={arrowOptions}
                  onChange={v => updateArrow('target', v)} placeholder="Filled" />
              </div>
            </div>
          </div>

          {/* Fix 4: Routing mode selector */}
          <div>
            <label style={labelSt}>Routing Mode</label>
            <div style={{ marginTop: 4 }}>
              <CustomDropdown
                value={data.routerMode || 'orthogonal'}
                options={[
                  { label: 'Auto — Orthogonal', value: 'orthogonal' },
                  { label: 'Smart — Manhattan',  value: 'manhattan'  },
                  { label: 'Straight Lines',      value: 'normal'     },
                ]}
                onChange={v => {
                  updateSelectedCell('routerMode', v);
                  selectedCell.router({ name: v, args: v === 'orthogonal' ? { padding: 10 } : {} });
                }}
                placeholder="Orthogonal"
              />
            </div>
            <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Click link on canvas for vertex drag handles.
            </div>
          </div>

          <button onClick={deleteSelected}
            className="w-full py-2 rounded-xl text-xs font-bold uppercase flex justify-center gap-2 mt-1"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>
            <Trash2 size={12} /> Delete Link
          </button>
        </div>
      )}

      {/* ═══════════════ NON-LINK CELL SELECTED ═════════════════════════════ */}
      {selectedCell && !isLink && (
        <>
          {/* ── 1. EXPRESSION BINDINGS (drawn shapes only) ───────────────── */}
          {isDrawn && (
            <div style={sectionSt('var(--accent)')}>
              <SectionTitle color="var(--accent)">
                <FlaskConical size={12} /> Expression Bindings
              </SectionTitle>

              {bindings.length === 0 && (
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  No bindings. Add one to link a tag to a visual property.
                </div>
              )}

              {bindings.map((b, idx) => {
                const propLabel = BINDABLE_PROPERTIES.find(p => p.value === b.property)?.label || b.property;
                return (
                  <div key={idx}
                    className="flex items-center gap-2 rounded-lg p-2"
                    style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold truncate" style={{ color: 'var(--accent)' }}>
                        {propLabel}
                      </div>
                      <div className="text-[9px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                        {b.tagKey}{b.expression ? ` → ${b.expression}` : ''}
                      </div>
                    </div>
                    <button onClick={() => openEditBinding(idx)}
                      className="shrink-0 text-[9px] px-1.5 py-0.5 rounded border transition-opacity hover:opacity-80"
                      style={{ color: 'var(--accent)', borderColor: 'var(--accent)', backgroundColor: 'transparent' }}>
                      Edit
                    </button>
                    <button onClick={() => removeBinding(idx)} className="shrink-0 hover:opacity-60 transition-opacity">
                      <X size={11} style={{ color: '#EF4444' }} />
                    </button>
                  </div>
                );
              })}

              <button onClick={openAddBinding}
                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-[10px] font-bold uppercase transition-colors"
                style={{ border: '1px dashed var(--accent)', color: 'var(--accent)', backgroundColor: 'rgba(59,130,246,0.05)' }}>
                <Plus size={11} /> Add Binding
              </button>
            </div>
          )}

          {/* ── 1b. GROUP PROPERTIES (group cells) ───────────────────────── */}
          {isGroup && (
            <div style={sectionSt('#8B5CF6')}>
              <SectionTitle color="#8B5CF6">
                <Layers size={12} /> Group
              </SectionTitle>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                This group contains {selectedCell?.getEmbeddedCells?.()?.length ?? 0} element(s).
                Move the group to move all contained elements together.
              </div>
              <div>
                <label style={labelSt}>Group Name</label>
                <input value={data.name || 'Group'}
                  onChange={e => updateSelectedCell('name', e.target.value)}
                  style={{ ...inputSt, width: '100%', marginTop: 4 }} />
              </div>
              {/* Tag binding for the entire group */}
              <div>
                <label style={labelSt}>Group Tag Binding</label>
                <div style={{ marginTop: 4 }}>
                  <CustomDropdown
                    value={data.boundTag || ''}
                    options={[]}
                    onChange={v => updateSelectedCell('boundTag', v)}
                    placeholder="-- Bind Group to Tag --"
                  />
                </div>
                <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  Binding a tag here will propagate to all children via expression bindings.
                </div>
              </div>
            </div>
          )}

          {/* ── 2. SIMPLE TAG BINDING (widget nodes only) ────────────────── */}
          {isWidget && !['tagNode','header_text','pipe_horz','pipe_vert','elbow_br'].includes(data.category) && (
            <div style={sectionSt('var(--accent)')}>
              <SectionTitle color="var(--accent)">
                <ScadaIcons.DatabaseTag size={12} color="var(--accent)" /> Tag Binding
              </SectionTitle>
              <CustomDropdown
                value={data.boundTag || ''}
                options={tagOptions}
                onChange={v => updateSelectedCell('boundTag', v)}
                placeholder="-- Select Data Tag --"
              />
            </div>
          )}


          {/* ── 3. SHAPE STYLE ───────────────────────────────────────────── */}
          <div style={sectionSt('#8B5CF6')}>
            <SectionTitle color="#8B5CF6">Shape Style</SectionTitle>

            {/* Display name (all) */}
            <div>
              <label style={labelSt}>Display Name</label>
              <input
                value={data.name || ''}
                onChange={e => updateSelectedCell('name', e.target.value)}
                style={{ ...inputSt, width: '100%', marginTop: 4 }}
                placeholder="Name"
              />
            </div>

            {/* Stroke / Line Color */}
            {!['header_text','tagNode'].includes(data.category) && (
              <div>
                <label style={labelSt}>{isLink ? 'Line Color' : 'Stroke Color'}</label>
                <div style={{ marginTop: 6 }}>
                  <CustomColorPicker
                    value={data.stroke || data.color || '#3B82F6'}
                    onChange={v => { updateSelectedCell('stroke', v); updateSelectedCell('color', v); }}
                  />
                </div>
              </div>
            )}

            {/* Fill Color (non-link drawn shapes) */}
            {isDrawn && !isLink && (
              <div>
                <label style={labelSt}>Fill Color</label>
                <div style={{ marginTop: 6 }}>
                  <CustomColorPicker
                    value={data.fill || 'transparent'}
                    onChange={v => updateSelectedCell('fill', v)}
                  />
                </div>
              </div>
            )}

            {/* Stroke Width */}
            {isDrawn && (
              <div>
                <label style={{ ...labelSt, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Stroke Width</span>
                  <span style={{ color: '#8B5CF6' }}>{data.strokeWidth || 2}px</span>
                </label>
                <input
                  type="range" min="1" max="20"
                  value={data.strokeWidth || 2}
                  onChange={e => {
                    const w = parseInt(e.target.value);
                    updateSelectedCell('strokeWidth', w);
                    if (isLink) selectedCell.attr('line/strokeWidth', w);
                    else        selectedCell.attr('body/strokeWidth', w);
                  }}
                  className="w-full accent-violet-500"
                  style={{ marginTop: 6 }}
                />
              </div>
            )}

            {/* Dash Pattern */}
            {isDrawn && (
              <div>
                <label style={labelSt}>Dash Pattern</label>
                <div style={{ marginTop: 4 }}>
                  <CustomDropdown
                    value={data.dashPattern ?? ''}
                    options={dashOptions}
                    onChange={v => {
                      updateSelectedCell('dashPattern', v);
                      if (isLink) selectedCell.attr('line/strokeDasharray', v);
                      else        selectedCell.attr('body/strokeDasharray', v);
                    }}
                    placeholder="Solid"
                  />
                </div>
              </div>
            )}

            {/* Arrow markers (link only) */}
            {isLink && isDrawn && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label style={labelSt}>Source Arrow</label>
                  <div style={{ marginTop: 4 }}>
                    <CustomDropdown
                      value={data.sourceMarker || 'none'}
                      options={arrowOptions}
                      onChange={v => updateArrow('source', v)}
                      placeholder="None"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label style={labelSt}>Target Arrow</label>
                  <div style={{ marginTop: 4 }}>
                    <CustomDropdown
                      value={data.targetMarker || 'none'}
                      options={arrowOptions}
                      onChange={v => updateArrow('target', v)}
                      placeholder="None"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Corner Radius (Rectangle only) */}
            {isRect && isDrawn && (
              <div>
                <label style={{ ...labelSt, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Corner Radius</span>
                  <span style={{ color: '#8B5CF6' }}>{data.cornerRadius ?? 0}px</span>
                </label>
                <input
                  type="range" min="0" max="60"
                  value={data.cornerRadius ?? 0}
                  onChange={e => {
                    const r = parseInt(e.target.value);
                    updateSelectedCell('cornerRadius', r);
                    selectedCell.attr('body/rx', r);
                    selectedCell.attr('body/ry', r);
                  }}
                  className="w-full accent-violet-500"
                  style={{ marginTop: 6 }}
                />
              </div>
            )}

            {/* Opacity */}
            {isDrawn && (
              <div>
                <label style={{ ...labelSt, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Opacity</span>
                  <span style={{ color: '#8B5CF6' }}>{Math.round((data.opacity ?? 1) * 100)}%</span>
                </label>
                <input
                  type="range" min="0" max="100"
                  value={Math.round((data.opacity ?? 1) * 100)}
                  onChange={e => {
                    const pct = parseInt(e.target.value) / 100;
                    updateSelectedCell('opacity', pct);
                    selectedCell.attr('root/opacity', pct);
                  }}
                  className="w-full accent-violet-500"
                  style={{ marginTop: 6 }}
                />
              </div>
            )}
          </div>

          {/* ── 4. TEXT / FONT (drawn_text only) ────────────────────────── */}
          {isText && (
            <div style={sectionSt('#F59E0B')}>
              <SectionTitle color="#F59E0B">Font & Text</SectionTitle>

              <div>
                <label style={labelSt}>Text Content</label>
                <input
                  value={selectedCell.attr('label/text') || ''}
                  onChange={e => selectedCell.attr('label/text', e.target.value)}
                  style={{ ...inputSt, width: '100%', marginTop: 4 }}
                  placeholder="Label text..."
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label style={labelSt}>Font Size</label>
                  <input
                    type="number" min="8" max="120"
                    value={data.fontSize || 18}
                    onChange={e => {
                      const sz = parseInt(e.target.value);
                      updateSelectedCell('fontSize', sz);
                      selectedCell.attr('label/fontSize', sz);
                    }}
                    style={{ ...inputSt, width: '100%', marginTop: 4 }}
                  />
                </div>
                <div className="flex-1">
                  <label style={labelSt}>Font Family</label>
                  <div style={{ marginTop: 4 }}>
                    <CustomDropdown
                      value={data.fontFamily || 'Inter, sans-serif'}
                      options={fontOptions}
                      onChange={v => {
                        updateSelectedCell('fontFamily', v);
                        selectedCell.attr('label/fontFamily', v);
                      }}
                      placeholder="Inter"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 items-center">
                {/* Bold */}
                <button
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                  style={{
                    backgroundColor: data.fontWeight === 'bold' ? 'rgba(245,158,11,0.2)' : 'var(--bg-subtle)',
                    color: data.fontWeight === 'bold' ? '#F59E0B' : 'var(--text-secondary)',
                    border: `1px solid ${data.fontWeight === 'bold' ? '#F59E0B' : 'var(--border)'}`,
                  }}
                  onClick={() => {
                    const next = data.fontWeight === 'bold' ? 'normal' : 'bold';
                    updateSelectedCell('fontWeight', next);
                    selectedCell.attr('label/fontWeight', next);
                  }}
                >
                  B
                </button>
                {/* Italic */}
                <button
                  className="px-3 py-1.5 rounded-lg text-xs italic transition-colors"
                  style={{
                    backgroundColor: data.fontStyle === 'italic' ? 'rgba(245,158,11,0.2)' : 'var(--bg-subtle)',
                    color: data.fontStyle === 'italic' ? '#F59E0B' : 'var(--text-secondary)',
                    border: `1px solid ${data.fontStyle === 'italic' ? '#F59E0B' : 'var(--border)'}`,
                  }}
                  onClick={() => {
                    const next = data.fontStyle === 'italic' ? 'normal' : 'italic';
                    updateSelectedCell('fontStyle', next);
                    selectedCell.attr('label/fontStyle', next);
                  }}
                >
                  I
                </button>
                {/* Alignment */}
                {[
                  { align: 'start',  Icon: AlignLeft   },
                  { align: 'middle', Icon: AlignCenter  },
                  { align: 'end',    Icon: AlignRight   },
                ].map(({ align, Icon }) => (
                  <button key={align}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{
                      backgroundColor: (data.textAlign || 'middle') === align ? 'rgba(245,158,11,0.2)' : 'var(--bg-subtle)',
                      color: (data.textAlign || 'middle') === align ? '#F59E0B' : 'var(--text-secondary)',
                      border: `1px solid ${(data.textAlign || 'middle') === align ? '#F59E0B' : 'var(--border)'}`,
                    }}
                    onClick={() => {
                      updateSelectedCell('textAlign', align);
                      selectedCell.attr('label/textAnchor', align);
                    }}
                  >
                    <Icon size={13} />
                  </button>
                ))}
              </div>

              {/* Text color */}
              <div>
                <label style={labelSt}>Text Color</label>
                <div style={{ marginTop: 6 }}>
                  <CustomColorPicker
                    value={data.textColor || '#CBD5E1'}
                    onChange={v => {
                      updateSelectedCell('textColor', v);
                      selectedCell.attr('label/fill', v);
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── 5. GEOMETRY & TRANSFORM ──────────────────────────────────── */}
          {!isLink && (
            <div style={sectionSt('#8B5CF6')}>
              <SectionTitle color="#8B5CF6">Geometry & Transform</SectionTitle>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label style={labelSt}>Width</label>
                  <input
                    type="number" min="10"
                    value={selectedCell.get('size')?.width || 0}
                    onChange={e => updateSelectedCellSize(parseInt(e.target.value) || 120, selectedCell.get('size')?.height || 80)}
                    style={{ ...inputSt, width: '100%', marginTop: 4 }}
                  />
                </div>
                <div className="flex-1">
                  <label style={labelSt}>Height</label>
                  <input
                    type="number" min="10"
                    value={selectedCell.get('size')?.height || 0}
                    onChange={e => updateSelectedCellSize(selectedCell.get('size')?.width || 120, parseInt(e.target.value) || 80)}
                    style={{ ...inputSt, width: '100%', marginTop: 4 }}
                  />
                </div>
              </div>
              <div>
                <label style={{ ...labelSt, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Rotation</span>
                  <span style={{ color: '#8B5CF6' }}>{selectedCell.angle() || 0}°</span>
                </label>
                <input
                  type="range" min="0" max="359"
                  value={selectedCell.angle() || 0}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 0;
                    selectedCell.rotate(val, true);
                    selectedCell.set('angle', val);
                  }}
                  className="w-full accent-violet-500"
                  style={{ marginTop: 6 }}
                />
              </div>
            </div>
          )}

          {/* ── DELETE BUTTON ─────────────────────────────────────────────── */}
          <button
            onClick={deleteSelected}
            className="w-full py-2.5 rounded-xl text-xs font-bold uppercase flex justify-center gap-2 transition-colors"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <Trash2 size={13} /> Delete
          </button>
        </>
      )}

      {/* ═══════════════ NOTHING SELECTED ═══════════════════════════════════ */}
      {!selectedCell && (
        <div className="flex flex-col gap-3">
          {/* Draw mode hint */}
          {activeDrawTool && (
            <div className="p-3 rounded-xl border border-dashed flex items-start gap-2"
              style={{ borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.08)' }}>
              <span className="text-[10px] font-bold leading-relaxed" style={{ color: '#8B5CF6' }}>
                {activeDrawTool === 'rectangle' && 'Click & drag to draw a Rectangle. Double-click to cancel.'}
                {activeDrawTool === 'ellipse'   && 'Click & drag to draw an Ellipse. Double-click to cancel.'}
                {activeDrawTool === 'line'      && 'Click & drag to draw a Line / Pipe. Double-click to cancel.'}
                {activeDrawTool === 'text'      && 'Click on the canvas to place a Text Label.'}
                {activeDrawTool === 'polygon'   && 'Click to place vertices. Double-click to close the polygon.'}
                {activeDrawTool === 'image'     && 'Click on canvas to choose an image file.'}
              </span>
            </div>
          )}

          {/* Canvas properties */}
          <div style={sectionSt()}>
            <SectionTitle><Settings size={11} /> Canvas Properties</SectionTitle>
            <div>
              <label style={labelSt}>Background Color</label>
              <div style={{ marginTop: 6 }}>
                <CustomColorPicker value={canvasBg} onChange={setCanvasBg} />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-col gap-2">
            {[
              { label: 'Total Nodes', value: totalNodes },
              { label: 'Total Links', value: totalLinks },
            ].map(({ label, value }) => (
              <div key={label}
                className="flex items-center justify-between p-3 rounded-lg border theme-transition"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                  {label}
                </span>
                <span className="text-lg font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EXPRESSION BUILDER MODAL ─────────────────────────────────────── */}
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
