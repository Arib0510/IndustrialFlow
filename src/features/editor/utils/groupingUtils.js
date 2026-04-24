/**
 * groupingUtils.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 3 extension: Group / Ungroup selected canvas elements.
 *
 * Groups use JointJS's native embed system so the parent element automatically
 * carries children when moved.  The group wrapper is a dashed rectangle that
 * sits behind its children in z-order.
 *
 * Usage:
 *   import { groupCells, ungroupCells } from '../utils/groupingUtils';
 *   const group = groupCells(graph, selectedIds);
 *   const released = ungroupCells(graph, groupId);
 */

import * as joint from 'jointjs';
import { v4 as uuidv4 } from 'uuid';

const GROUP_PADDING = 24;

/**
 * Wrap a set of element IDs inside a new group parent cell.
 *
 * @param {joint.dia.Graph} graph
 * @param {string[]}        cellIds  IDs of elements to group (links are ignored)
 * @param {boolean}         isDarkMode
 * @returns {joint.dia.Element|null}  The created group cell, or null if < 2 nodes
 */
export const groupCells = (graph, cellIds, isDarkMode = true) => {
  const cells = cellIds
    .map(id => graph.getCell(id))
    .filter(c => c && !c.isLink());

  if (cells.length < 2) return null;

  // ── Compute union bounding box ────────────────────────────────────────────
  const bboxes = cells.map(c => c.getBBox()).filter(Boolean);
  if (!bboxes.length) return null;

  const minX = Math.min(...bboxes.map(b => b.x));
  const minY = Math.min(...bboxes.map(b => b.y));
  const maxX = Math.max(...bboxes.map(b => b.x + b.width));
  const maxY = Math.max(...bboxes.map(b => b.y + b.height));

  const strokeColor  = isDarkMode ? '#8B5CF6' : '#6D28D9';
  const fillColor    = isDarkMode ? 'rgba(139,92,246,0.05)' : 'rgba(109,40,217,0.04)';

  // ── Create the group rectangle ────────────────────────────────────────────
  const group = new joint.shapes.standard.Rectangle({
    id: uuidv4(),
    position: { x: minX - GROUP_PADDING, y: minY - GROUP_PADDING },
    size: {
      width:  maxX - minX + GROUP_PADDING * 2,
      height: maxY - minY + GROUP_PADDING * 2,
    },
    attrs: {
      body: {
        fill:            fillColor,
        stroke:          strokeColor,
        strokeWidth:     1.5,
        strokeDasharray: '10 5',
        rx: 10, ry: 10,
      },
      label: {
        text:        'Group',
        fill:        strokeColor,
        fontSize:    10,
        fontWeight:  700,
        fontFamily:  'Inter, sans-serif',
        refX:        '50%',
        refY:        8,
        textAnchor:  'middle',
        yAlignment:  'top',
      },
    },
    // Group sits behind its children
    z: Math.min(...cells.map(c => c.get('z') ?? 0), 0) - 1,
    data: {
      category: 'group',
      name:     'Group',
      bindings: [],
    },
  });

  // Add group first, then embed children
  graph.addCell(group);
  cells.forEach(cell => group.embed(cell));

  return group;
};

/**
 * Remove a group wrapper and release its embedded children back to the canvas.
 *
 * @param {joint.dia.Graph} graph
 * @param {string}          groupId  ID of the group cell to dismantle
 * @returns {string[]}               IDs of the released children
 */
export const ungroupCells = (graph, groupId) => {
  const group = graph.getCell(groupId);
  if (!group || group.get('data')?.category !== 'group') return [];

  const children = group.getEmbeddedCells();
  children.forEach(child => group.unembed(child));
  group.remove();

  return children.map(c => c.id);
};

/**
 * Propagate a resolved tag-binding value to all embedded children of a group.
 * Called from bindingUtils.syncAllBindings when the cell is a group.
 *
 * @param {joint.dia.Graph}  graph
 * @param {joint.dia.Cell}   groupCell
 * @param {string}           property   fill | stroke | opacity | text | visible
 * @param {*}                result     The resolved value from safeEval
 * @param {Function}         applyFn    The applyBinding function from bindingUtils
 */
export const propagateGroupBinding = (graph, groupCell, property, result, applyFn) => {
  groupCell.getEmbeddedCells().forEach(child => {
    applyFn(child, property, result);
  });
};
