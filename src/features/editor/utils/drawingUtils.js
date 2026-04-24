/**
 * drawingUtils.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Factory functions for creating JointJS elements from the draw-tool palette.
 * Each factory receives the common configuration (start position, colors,
 * dark-mode flag) and returns a fully configured JointJS cell ready to be
 * added to the graph.
 */

import * as joint from 'jointjs';
import { v4 as uuidv4 } from 'uuid';

// ── Port config shared by all drawable shapes ─────────────────────────────────
const makePortMarkup = () => [
  {
    tagName: 'circle',
    selector: 'portBody',
    attributes: {
      r: 7, fill: '#22D3EE', stroke: '#0e7490', strokeWidth: 2,
      cursor: 'crosshair', magnet: 'true',
    },
  },
];

export const makePortsConfig = () => {
  const markup = makePortMarkup();
  return {
    groups: {
      top:    { position: 'top',    markup, attrs: { portBody: { magnet: true } } },
      bottom: { position: 'bottom', markup, attrs: { portBody: { magnet: true } } },
      left:   { position: 'left',   markup, attrs: { portBody: { magnet: true } } },
      right:  { position: 'right',  markup, attrs: { portBody: { magnet: true } } },
    },
    items: [{ group: 'top' }, { group: 'bottom' }, { group: 'left' }, { group: 'right' }],
  };
};

// ── Default drawn-shape data payload ─────────────────────────────────────────
const defaultShapeData = (overrides = {}) => ({
  category:    'drawn_shape',
  name:        '',
  stroke:      overrides.stroke || '#CBD5E1',
  fill:        'transparent',
  strokeWidth: 2,
  dashPattern: '',    // '' | '8 4' | '2 4' | '8 4 2 4'
  opacity:     1,
  bindings:    [],    // [{ property, tagKey, expression }]
  locked:      false,
  ...overrides,
});

// ── Individual shape factories ────────────────────────────────────────────────

export const createRectangle = ({ x, y, isDarkMode }) => {
  const stroke = isDarkMode ? '#CBD5E1' : '#1e293b';
  return new joint.shapes.standard.Rectangle({
    id: uuidv4(),
    position: { x, y },
    size: { width: 1, height: 1 },
    attrs: {
      body:  { fill: 'transparent', stroke, strokeWidth: 2, rx: 0, ry: 0 },
      label: { text: '', fill: stroke, fontSize: 13, fontFamily: 'Inter, sans-serif' },
    },
    ports: makePortsConfig(),
    data: defaultShapeData({ stroke }),
  });
};

export const createEllipse = ({ x, y, isDarkMode }) => {
  const stroke = isDarkMode ? '#CBD5E1' : '#1e293b';
  return new joint.shapes.standard.Ellipse({
    id: uuidv4(),
    position: { x, y },
    size: { width: 1, height: 1 },
    attrs: {
      body:  { fill: 'transparent', stroke, strokeWidth: 2 },
      label: { text: '', fill: stroke, fontSize: 13, fontFamily: 'Inter, sans-serif' },
    },
    ports: makePortsConfig(),
    data: defaultShapeData({ stroke }),
  });
};

export const createLine = ({ x, y, isDarkMode }) => {
  const stroke = isDarkMode ? '#CBD5E1' : '#1e293b';
  return new joint.shapes.standard.Link({
    id: uuidv4(),
    source: { x, y },
    target: { x: x + 1, y: y + 1 },
    attrs: {
      line: {
        stroke,
        strokeWidth: 2,
        targetMarker: { type: 'none' },
        sourceMarker: { type: 'none' },
      },
    },
    data: defaultShapeData({ stroke }),
  });
};

export const createTextLabel = ({ x, y, isDarkMode }) => {
  const textColor = isDarkMode ? '#CBD5E1' : '#1e293b';
  return new joint.shapes.standard.Rectangle({
    id: uuidv4(),
    position: { x, y },
    size: { width: 160, height: 40 },
    attrs: {
      body:  { fill: 'transparent', stroke: 'none', strokeWidth: 0 },
      label: { text: 'Label', fill: textColor, fontSize: 18, fontFamily: 'Inter, sans-serif', fontWeight: 'bold' },
    },
    ports: makePortsConfig(),
    data: defaultShapeData({ stroke: 'none', category: 'drawn_text', textColor, fontSize: 18, fontFamily: 'Inter, sans-serif', fontWeight: 'bold', textAlign: 'middle' }),
  });
};

// ── Utility: build SVG path string from polygon vertices ─────────────────────
export const buildPolyPath = (vertices, closed = true) => {
  if (!vertices || vertices.length < 2) return 'M 0 0';
  const pts = vertices.map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x} ${v.y}`).join(' ');
  return closed ? `${pts} Z` : pts;
};

export const createPolygon = ({ vertices, isDarkMode }) => {
  const stroke = isDarkMode ? '#CBD5E1' : '#1e293b';
  // Compute bounding box to set the JointJS element position + size
  const xs = vertices.map(v => v.x);
  const ys = vertices.map(v => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);

  // Translate vertices relative to top-left bounding corner (JointJS Path uses refX/refY)
  const relVerts = vertices.map(v => ({ x: v.x - minX, y: v.y - minY }));
  const d = buildPolyPath(relVerts, true);

  return new joint.shapes.standard.Path({
    id: uuidv4(),
    position: { x: minX, y: minY },
    size: { width: w, height: h },
    attrs: {
      body:  { d, fill: 'transparent', stroke, strokeWidth: 2, refX: 0, refY: 0 },
      label: { text: '', fill: stroke, fontSize: 13, fontFamily: 'Inter, sans-serif' },
    },
    ports: makePortsConfig(),
    data: defaultShapeData({ stroke, shapeType: 'polygon', vertices }),
  });
};

// ── Arrow / marker presets ────────────────────────────────────────────────────
export const ARROW_MARKERS = {
  none:   { type: 'none' },
  open:   { type: 'path', d: 'M 10 -5 0 0 10 5', fill: 'none', 'stroke-width': 1.5 },
  filled: { type: 'path', d: 'M 10 -5 0 0 10 5 z' },
  circle: { type: 'circle', r: 5 },
};

// ── Stroke dash presets ───────────────────────────────────────────────────────
export const DASH_PATTERNS = {
  solid:   { label: 'Solid',    value: '' },
  dashed:  { label: 'Dashed',   value: '8 4' },
  dotted:  { label: 'Dotted',   value: '2 4' },
  dashdot: { label: 'Dash-Dot', value: '8 4 2 4' },
};

// ── Image shape from base64 ───────────────────────────────────────────────────
export const createImageShape = ({ x, y, dataUrl, width = 120, height = 120 }) =>
  new joint.shapes.standard.Image({
    id: uuidv4(),
    position: { x, y },
    size: { width, height },
    attrs: {
      image: { 'xlink:href': dataUrl, preserveAspectRatio: 'xMidYMid meet' },
      label: { text: '', fill: '#CBD5E1', refY: '100%', refY2: 15, textAnchor: 'middle' },
    },
    ports: makePortsConfig(),
    data: defaultShapeData({ category: 'drawn_image', stroke: 'none' }),
  });
