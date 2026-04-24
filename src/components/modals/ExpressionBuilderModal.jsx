/**
 * ExpressionBuilderModal.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 3: A modal for building an expression-based tag binding.
 * Lets the user choose:
 *   • Which visual PROPERTY to drive (fill, stroke, opacity, text, visible, rotation)
 *   • Which TAG key to read the value from
 *   • An optional EXPRESSION (expr-eval syntax) to transform the value
 * Live-previews the expression result against the current tag value.
 */

import React, { useState, useEffect } from 'react';
import { X, FlaskConical, CheckCircle, AlertCircle } from 'lucide-react';
import { CustomDropdown } from '../ui/CustomDropdown';
import { BINDABLE_PROPERTIES, safeEval } from '../../features/editor/utils/bindingUtils';

const EXPRESSION_EXAMPLES = {
  fill:     "value ? '#22C55E' : '#EF4444'",
  stroke:   "value > 80 ? '#EF4444' : '#22C55E'",
  opacity:  'value / 100',
  text:     '"Level: " + round(value, 1) + "%"',
  visible:  'value > 0',
  rotation: 'value * 3.6',
};

export const ExpressionBuilderModal = ({ tagOptions, tags, existingBinding, onConfirm, onClose }) => {
  const [property,   setProperty]   = useState(existingBinding?.property   || 'fill');
  const [tagKey,     setTagKey]      = useState(existingBinding?.tagKey     || '');
  const [expression, setExpression]  = useState(existingBinding?.expression || '');
  const [preview,    setPreview]     = useState(null);
  const [error,      setError]       = useState('');

  // Live preview whenever inputs change
  useEffect(() => {
    if (!tagKey || !tags[tagKey]) { setPreview(null); setError(''); return; }
    const tagValue = tags[tagKey].value;
    try {
      const result = safeEval(expression, { value: tagValue });
      setPreview(result);
      setError('');
    } catch (e) {
      setPreview(null);
      setError(e.message);
    }
  }, [tagKey, expression, tags]);

  const propertyOptions = BINDABLE_PROPERTIES.map(p => ({ label: p.label, value: p.value }));

  const inputSt = {
    backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', borderRadius: 6, padding: '6px 10px', fontSize: 12,
    outline: 'none', width: '100%',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl flex flex-col gap-4 p-6 theme-transition"
        style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical size={16} style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Expression Binding
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-60 transition-opacity">
            <X size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Property */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
            Visual Property
          </label>
          <CustomDropdown
            value={property}
            options={propertyOptions}
            onChange={v => { setProperty(v); setExpression(EXPRESSION_EXAMPLES[v] || ''); }}
            placeholder="Select property..."
          />
        </div>

        {/* Tag Key */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
            Data Tag
          </label>
          <CustomDropdown
            value={tagKey}
            options={tagOptions}
            onChange={setTagKey}
            placeholder="-- Select Tag --"
          />
          {tagKey && tags[tagKey] && (
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Current value: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                {String(tags[tagKey].value)}
              </span>
            </div>
          )}
        </div>

        {/* Expression */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
            Expression <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(uses <code>value</code> variable, expr-eval syntax)</span>
          </label>
          <textarea
            value={expression}
            onChange={e => setExpression(e.target.value)}
            placeholder={`e.g. ${EXPRESSION_EXAMPLES[property]}`}
            rows={3}
            style={{ ...inputSt, fontFamily: 'monospace', resize: 'vertical' }}
          />
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Leave blank to use the raw tag value directly.
          </div>
        </div>

        {/* Live preview */}
        {tagKey && (
          <div
            className="p-3 rounded-xl flex items-center gap-2 text-xs"
            style={{
              backgroundColor: error ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
              border: `1px solid ${error ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
            }}
          >
            {error
              ? <AlertCircle size={13} style={{ color: '#EF4444', flexShrink: 0 }} />
              : <CheckCircle size={13} style={{ color: '#22C55E', flexShrink: 0 }} />
            }
            <span style={{ color: error ? '#EF4444' : '#22C55E', fontFamily: 'monospace' }}>
              {error || `Result → ${String(preview)}`}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-colors"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Cancel
          </button>
          <button
            disabled={!tagKey || !property}
            onClick={() => onConfirm({ property, tagKey, expression })}
            className="flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-colors disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, var(--accent), #8B5CF6)', color: '#fff', border: 'none' }}
          >
            Add Binding
          </button>
        </div>
      </div>
    </div>
  );
};
