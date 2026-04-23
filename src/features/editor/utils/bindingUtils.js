/**
 * bindingUtils.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 3: Tag Expression Binding
 * Safely evaluates expr-eval expressions and dispatches the result to the
 * correct JointJS attribute on the target cell.
 */

import { Parser } from 'expr-eval';

const parser = new Parser();

/**
 * Safely evaluate an expression string with the given variable scope.
 * Uses expr-eval so no arbitrary JS execution occurs.
 *
 * @param {string} expression  e.g. "value > 50 ? '#22C55E' : '#EF4444'"
 * @param {object} scope       { value: <tag value> }
 * @returns {*}                The evaluated result, or null on error.
 */
export const safeEval = (expression, scope) => {
  if (!expression || expression.trim() === '') return scope.value;
  try {
    return parser.evaluate(expression, scope);
  } catch (e) {
    console.warn('[bindingUtils] Expression error:', expression, e.message);
    return null;
  }
};

/**
 * Apply a resolved binding value to a JointJS cell.
 *
 * @param {joint.dia.Cell} cell
 * @param {'fill'|'stroke'|'opacity'|'text'|'visible'|'rotation'} property
 * @param {*} result  The resolved value from safeEval.
 */
export const applyBinding = (cell, property, result) => {
  if (result === null || result === undefined) return;

  const isLink = cell.isLink?.();

  const dispatch = {
    fill:     () => {
      if (!isLink) cell.attr('body/fill', String(result));
    },
    stroke:   () => {
      if (isLink) cell.attr('line/stroke', String(result));
      else        cell.attr('body/stroke', String(result));
    },
    opacity:  () => {
      cell.attr('root/opacity', Math.max(0, Math.min(1, Number(result))));
    },
    text:     () => {
      cell.attr('label/text', String(result));
    },
    visible:  () => {
      // result truthy → show, falsy → hide
      cell.attr('root/display', result ? '' : 'none');
    },
    rotation: () => {
      const angle = Number(result) || 0;
      cell.rotate(angle, true);
      cell.set('angle', angle);
    },
  };

  dispatch[property]?.();
};

/**
 * Process all bindings on every drawn_shape cell in the graph.
 * Called from the tags useEffect in EditorPage.
 *
 * @param {joint.dia.Graph} graph
 * @param {object} tags  The SCADA tags object from context.
 */
export const syncAllBindings = (graph, tags) => {
  graph.getCells().forEach(cell => {
    const data = cell.get('data') || {};
    if (!data.bindings || data.bindings.length === 0) return;

    data.bindings.forEach(({ property, tagKey, expression }) => {
      if (!tagKey || tags[tagKey] === undefined) return;
      const tagValue = tags[tagKey].value;
      const result   = safeEval(expression, { value: tagValue });
      applyBinding(cell, property, result);
    });
  });
};

// The bindable visual properties (shown in the UI as a dropdown)
export const BINDABLE_PROPERTIES = [
  { value: 'fill',     label: 'Fill Color' },
  { value: 'stroke',   label: 'Stroke / Line Color' },
  { value: 'opacity',  label: 'Opacity (0–1)' },
  { value: 'text',     label: 'Text / Label' },
  { value: 'visible',  label: 'Visibility (bool)' },
  { value: 'rotation', label: 'Rotation (deg)' },
];
